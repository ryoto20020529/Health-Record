'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Copy, Plus, X, Crown, Flame, Dumbbell, Check, Share2, MessageCircle, Mail, Shield, Bell } from 'lucide-react';
import {
  getTodayString,
  generateId,
} from '@/lib/database';
import { createClient } from '@/lib/supabase';

interface GroupMember {
  userId: string;
  email: string;
  todayCalIn: number;
  todayCalOut: number;
  todayExMin: number;
  isOwner: boolean;
}

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  members: GroupMember[];
}

interface ActivityFeedItem {
  id: string;
  userName: string;
  message: string;
  createdAt: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);

  const supabase = createClient();

  const loadGroups = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberships?.length) return;

      const groupIds = memberships.map((m: { group_id: string }) => m.group_id);
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (!groupsData) return;

      const loadedGroups: Group[] = [];
      const feedItems: ActivityFeedItem[] = [];

      for (const g of groupsData) {
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id, is_owner')
          .eq('group_id', g.id);

        const memberInfos: GroupMember[] = [];
        for (const m of (members || [])) {
          const { data: meals } = await supabase
            .from('meal_records')
            .select('calories')
            .eq('user_id', m.user_id)
            .eq('date', getTodayString());

          const { data: exercises } = await supabase
            .from('exercise_records')
            .select('calories_burned, duration, name')
            .eq('user_id', m.user_id)
            .eq('date', getTodayString());

          const totalCalIn = (meals || []).reduce((s: number, r: { calories: number }) => s + r.calories, 0);
          const totalCalOut = (exercises || []).reduce((s: number, r: { calories_burned: number }) => s + r.calories_burned, 0);
          const totalExMin = (exercises || []).reduce((s: number, r: { duration: number }) => s + r.duration, 0);

          const memberName = m.user_id === user.id ? 'あなた' : `メンバー${memberInfos.length + 1}`;

          memberInfos.push({
            userId: m.user_id,
            email: memberName,
            todayCalIn: totalCalIn,
            todayCalOut: totalCalOut,
            todayExMin: totalExMin,
            isOwner: m.is_owner,
          });

          // 運動完了フィードを生成（プライバシー保護: カロリーと種目のみ、体重・目標は非公開）
          if (totalExMin > 0 && m.user_id !== user.id) {
            const exerciseNames = (exercises || []).map((e: { name: string }) => e.name);
            const uniqueNames = [...new Set(exerciseNames)].join('・');
            feedItems.push({
              id: `${m.user_id}-exercise-${getTodayString()}`,
              userName: memberName,
              message: `${uniqueNames}（${totalExMin}分）の運動を完了しました 🎉`,
              createdAt: new Date().toISOString(),
            });
          }
        }

        loadedGroups.push({
          id: g.id,
          name: g.name,
          inviteCode: g.invite_code,
          members: memberInfos,
        });
      }

      setGroups(loadedGroups);
      setActivityFeed(feedItems);
    } catch (err) {
      console.error('Groups load error:', err);
    }
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGroups();
  }, [loadGroups]);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('ログインが必要です');
        return;
      }

      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const groupId = generateId();

      const { error: groupError } = await supabase.from('groups').insert({
        id: groupId,
        name: groupName,
        invite_code: inviteCode,
        owner_id: user.id,
      });

      if (groupError) {
        console.error('Group insert error:', groupError);
        setError(`グループ作成に失敗しました: ${groupError.message}`);
        return;
      }

      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        is_owner: true,
      });

      if (memberError) {
        console.error('Member insert error:', memberError);
        setError(`メンバー登録に失敗しました: ${memberError.message}`);
        return;
      }

      setGroupName('');
      setShowCreate(false);
      await loadGroups();
    } catch (err) {
      console.error('Create group error:', err);
      setError('グループ作成に失敗しました');
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('ログインが必要です');
        return;
      }

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('invite_code', joinCode.toUpperCase())
        .single();

      if (groupError || !group) {
        setError('招待コードが見つかりません');
        return;
      }

      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        setError('すでに参加しています');
        return;
      }

      const { error: joinError } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        is_owner: false,
      });

      if (joinError) {
        console.error('Join group error:', joinError);
        setError(`参加に失敗しました: ${joinError.message}`);
        return;
      }

      setJoinCode('');
      setShowJoin(false);
      await loadGroups();
    } catch (err) {
      console.error('Join group error:', err);
      setError('参加に失敗しました');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // シェア機能
  const shareInvite = async (group: Group, method: 'native' | 'line' | 'email') => {
    const inviteUrl = `${window.location.origin}/groups?join=${group.inviteCode}`;
    const message = `「${group.name}」グループに参加しよう！\n招待コード: ${group.inviteCode}\n${inviteUrl}`;

    if (method === 'native') {
      if (navigator.share) {
        try {
          await navigator.share({ title: `${group.name} - ヘルスケア・トラッカー`, text: message });
        } catch { /* user cancelled */ }
      } else {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else if (method === 'line') {
      const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(message)}`;
      window.open(lineUrl, '_blank');
    } else if (method === 'email') {
      const mailUrl = `mailto:?subject=${encodeURIComponent(`${group.name}に参加しよう`)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailUrl;
    }
    setShowShareMenu(null);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2"><Users size={20} />グループ</h1>
          <p className="text-white/40 text-xs mt-1">仲間と一緒にモチベ維持</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(!showJoin)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 active:scale-95">参加</button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-2 rounded-xl bg-linear-to-r from-emerald-500 to-cyan-500 text-xs text-white font-semibold active:scale-95">
            <Plus size={14} className="inline mr-1" />作成
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 text-center">{error}</div>
      )}

      {/* プライバシーノート */}
      <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2">
        <Shield size={14} className="text-emerald-400 shrink-0" />
        <p className="text-[10px] text-white/50">体重・目標の詳細はプライバシー保護のため非公開です</p>
      </div>

      {/* グループ作成 */}
      {showCreate && (
        <div className="glass-card slide-up space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white/70">新しいグループ</h3>
            <button onClick={() => setShowCreate(false)}><X size={16} className="text-white/40" /></button>
          </div>
          <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
            placeholder="グループ名" className="input-field text-sm" id="input-group-name" />
          <button onClick={handleCreate} disabled={!groupName.trim()}
            className="w-full btn-primary text-sm disabled:opacity-30" id="btn-create-group">作成する</button>
        </div>
      )}

      {/* グループ参加 */}
      {showJoin && (
        <div className="glass-card slide-up space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white/70">招待コードで参加</h3>
            <button onClick={() => setShowJoin(false)}><X size={16} className="text-white/40" /></button>
          </div>
          <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)}
            placeholder="招待コード（例: ABC123）" className="input-field text-sm uppercase" id="input-join-code" />
          <button onClick={handleJoin} disabled={!joinCode.trim()}
            className="w-full btn-primary text-sm disabled:opacity-30" id="btn-join-group">参加する</button>
        </div>
      )}

      {/* 活動フィード */}
      {activityFeed.length > 0 && (
        <div className="glass-card">
          <h3 className="text-xs font-semibold text-white/70 flex items-center gap-2 mb-3">
            <Bell size={14} className="text-yellow-400" />
            最新の活動
          </h3>
          <div className="space-y-2">
            {activityFeed.map(feed => (
              <div key={feed.id} className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Dumbbell size={10} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs text-white/80">
                    <span className="font-semibold text-emerald-400">{feed.userName}</span>が{feed.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* グループ一覧 */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-linear-to-br from-emerald-500/15 to-cyan-500/15 flex items-center justify-center mb-4">
            <Users size={28} className="text-emerald-400/50" />
          </div>
          <p className="text-white/40 text-sm">グループに参加していません</p>
          <p className="text-white/25 text-xs mt-1">グループを作成するか、招待コードで参加しましょう</p>
        </div>
      ) : groups.map(group => (
        <div key={group.id} className="glass-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={14} className="text-emerald-400" />{group.name}
            </h3>
            <div className="flex items-center gap-1.5">
              <button onClick={() => copyCode(group.inviteCode)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-[10px] text-white/40 active:scale-95">
                {copied ? <><Check size={10} />コピー済み</> : <><Copy size={10} />{group.inviteCode}</>}
              </button>
              {/* シェアボタン */}
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(showShareMenu === group.id ? null : group.id)}
                  className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 active:scale-95 transition-all"
                >
                  <Share2 size={12} />
                </button>
                {showShareMenu === group.id && (
                  <div className="absolute right-0 top-9 w-44 bg-[#0f1527] border border-white/15 rounded-xl shadow-xl z-30 slide-up overflow-hidden">
                    <button
                      onClick={() => shareInvite(group, 'native')}
                      className="w-full text-left px-3 py-2.5 text-xs text-white/70 hover:bg-white/5 flex items-center gap-2 border-b border-white/5"
                    >
                      <Share2 size={12} className="text-blue-400" />共有...
                    </button>
                    <button
                      onClick={() => shareInvite(group, 'line')}
                      className="w-full text-left px-3 py-2.5 text-xs text-white/70 hover:bg-white/5 flex items-center gap-2 border-b border-white/5"
                    >
                      <MessageCircle size={12} className="text-green-400" />LINEで送る
                    </button>
                    <button
                      onClick={() => shareInvite(group, 'email')}
                      className="w-full text-left px-3 py-2.5 text-xs text-white/70 hover:bg-white/5 flex items-center gap-2"
                    >
                      <Mail size={12} className="text-cyan-400" />メールで送る
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* メンバー進捗 (プライバシー保護: カロリーと運動時間のみ表示、体重・目標は非公開) */}
          <div className="space-y-1.5">
            {group.members
              .sort((a, b) => (b.todayCalOut - b.todayCalIn) - (a.todayCalOut - a.todayCalIn))
              .map((member, i) => (
              <div key={member.userId} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${i === 0 ? 'text-yellow-400' : 'text-white/30'}`}>
                    {i === 0 ? '👑' : `${i + 1}`}
                  </span>
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-1">
                      {member.email}
                      {member.isOwner && <Crown size={10} className="text-yellow-400" />}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-orange-400 flex items-center gap-0.5" title="摂取カロリー">
                    <Flame size={10} />{member.todayCalIn}kcal
                  </span>
                  <span className="text-cyan-400 flex items-center gap-0.5" title="運動時間">
                    <Dumbbell size={10} />{member.todayExMin}分
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
