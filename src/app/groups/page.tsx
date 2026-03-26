'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Copy, Plus, X, Crown, Flame, Dumbbell, Check, Share2, MessageCircle, Mail, Shield, Bell, Trash2, LogOut, Loader2, Pencil } from 'lucide-react';
import {
  getTodayString,
  generateId,
} from '@/lib/database';
import { createClient } from '@/lib/supabase';

interface GroupMember {
  userId: string;
  displayName: string;
  todayCalIn: number;
  todayCalOut: number;
  todayExMin: number;
  todayWeight?: number;
  isOwner: boolean;
}

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
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
  const [displayName, setDisplayName] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

  const supabase = createClient();

  const loadGroups = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberships?.length) {
        setGroups([]);
        return;
      }

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
          .select('user_id, is_owner, display_name')
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

          const memberName = m.user_id === user.id ? 'あなた' : (m.display_name || `メンバー${memberInfos.length + 1}`);

          // 最新の体重を取得
          const { data: weights } = await supabase
            .from('weight_records')
            .select('weight')
            .eq('user_id', m.user_id)
            .order('date', { ascending: false })
            .limit(1);

          memberInfos.push({
            userId: m.user_id,
            displayName: memberName,
            todayCalIn: totalCalIn,
            todayCalOut: totalCalOut,
            todayExMin: totalExMin,
            todayWeight: weights?.[0]?.weight,
            isOwner: m.is_owner,
          });

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
          ownerId: g.owner_id,
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
    if (!groupName.trim() || !displayName.trim()) return;
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
        display_name: displayName.trim(),
      });

      if (memberError) {
        console.error('Member insert error:', memberError);
        setError(`メンバー登録に失敗しました: ${memberError.message}`);
        return;
      }

      setGroupName(''); setDisplayName('');
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
        display_name: displayName.trim() || 'メンバー',
      });

      if (joinError) {
        console.error('Join group error:', joinError);
        setError(`参加に失敗しました: ${joinError.message}`);
        return;
      }

      setJoinCode(''); setDisplayName('');
      setShowJoin(false);
      await loadGroups();
    } catch (err) {
      console.error('Join group error:', err);
      setError('参加に失敗しました');
    }
  };

  // グループ削除（オーナーのみ）
  const handleDeleteGroup = async (groupId: string) => {
    setDeleting(true);
    setError('');
    try {
      // 1. メンバーを全削除
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      if (membersError) {
        console.error('Delete members error:', membersError);
        setError(`メンバー削除に失敗しました: ${membersError.message}`);
        setDeleting(false);
        return;
      }

      // 2. グループを削除
      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (groupError) {
        console.error('Delete group error:', groupError);
        setError(`グループ削除に失敗しました: ${groupError.message}`);
        setDeleting(false);
        return;
      }

      setConfirmDelete(null);
      await loadGroups();
    } catch (err) {
      console.error('Delete group error:', err);
      setError('グループ削除に失敗しました');
    }
    setDeleting(false);
  };

  // 自分の名前の変更
  const handleUpdateName = async (groupId: string) => {
    if (!editName.trim() || !currentUserId) return;
    setUpdatingName(true);
    setError('');
    try {
      const { data, error: updateError } = await supabase
        .from('group_members')
        .update({ display_name: editName.trim() })
        .eq('group_id', groupId)
        .eq('user_id', currentUserId)
        .select();

      if (updateError) {
        console.error('Update name error:', updateError);
        setError(`名前の更新に失敗しました: ${updateError.message}`);
        setUpdatingName(false);
        return;
      }

      if (!data || data.length === 0) {
        setError('名前の更新がブロックされました。権限エラーの可能性があります。');
        setUpdatingName(false);
        return;
      }

      const updatedName = data[0].display_name;
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            members: g.members.map(m =>
              m.userId === currentUserId ? { ...m, displayName: updatedName } : m
            )
          };
        }
        return g;
      }));

      setEditingGroupId(null);
      // バックグラウンドで最新状態を取得し直す
      loadGroups();
    } catch (err) {
      console.error('Update name error:', err);
      setError('名前の更新に失敗しました');
    }
    setUpdatingName(false);
  };

  // グループ脱退（メンバーのみ）
  const handleLeaveGroup = async (groupId: string) => {
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: leaveError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (leaveError) {
        console.error('Leave group error:', leaveError);
        setError(`脱退に失敗しました: ${leaveError.message}`);
        return;
      }

      await loadGroups();
    } catch (err) {
      console.error('Leave group error:', err);
      setError('脱退に失敗しました');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2"><Users size={20} />グループ</h1>
          <p className="text-white/40 text-xs mt-1">仲間と一緒にモチベ維持</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(!showJoin)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 active:scale-95 min-h-[40px]">参加</button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-2 rounded-xl bg-linear-to-r from-emerald-500 to-cyan-500 text-xs text-white font-semibold active:scale-95 min-h-[40px]">
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
            <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg active:bg-white/10"><X size={16} className="text-white/40" /></button>
          </div>
          <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
            placeholder="グループ名" className="input-field text-sm" id="input-group-name" />
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="あなたのニックネーム" className="input-field text-sm" id="input-display-name" />
          <button onClick={handleCreate} disabled={!groupName.trim() || !displayName.trim()}
            className="w-full btn-primary text-sm disabled:opacity-30" id="btn-create-group">作成する</button>
        </div>
      )}

      {/* グループ参加 */}
      {showJoin && (
        <div className="glass-card slide-up space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white/70">招待コードで参加</h3>
            <button onClick={() => setShowJoin(false)} className="p-2 rounded-lg active:bg-white/10"><X size={16} className="text-white/40" /></button>
          </div>
          <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)}
            placeholder="招待コード（例: ABC123）" className="input-field text-sm uppercase" id="input-join-code" />
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="あなたのニックネーム" className="input-field text-sm" id="input-join-display-name" />
          <button onClick={handleJoin} disabled={!joinCode.trim() || !displayName.trim()}
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
                <div className="min-w-0">
                  <div className="text-xs text-white/80 wrap-break-word">
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
      ) : groups.map(group => {
        const isOwner = currentUserId === group.ownerId;
        return (
        <div key={group.id} className="glass-card space-y-3">
          {/* ヘッダー */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 min-w-0 truncate">
              <Users size={14} className="text-emerald-400 shrink-0" /><span className="truncate">{group.name}</span>
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {/* 招待コードコピー */}
              <button onClick={() => copyCode(group.inviteCode)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 text-[10px] text-white/40 active:scale-95 min-h-[32px]">
                {copied ? <><Check size={10} />コピー済</> : <><Copy size={10} />{group.inviteCode}</>}
              </button>
              {/* シェア */}
              <button
                onClick={() => setShowShareMenu(showShareMenu === group.id ? null : group.id)}
                className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 active:scale-95 transition-all"
              >
                <Share2 size={12} />
              </button>
            </div>
          </div>

          {/* メンバー進捗 */}
          <div className="space-y-2">
            {group.members
              .sort((a, b) => (b.todayCalOut - b.todayCalIn) - (a.todayCalOut - a.todayCalIn))
              .map((member, i) => (
              <div key={member.userId} className="bg-white/5 rounded-xl px-3 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/40'}`}>
                      {i === 0 ? '👑' : i + 1}
                    </div>
                    <span className="text-sm font-semibold truncate flex items-center gap-1">
                      {editingGroupId === group.id && member.userId === currentUserId ? (
                        <div className="flex items-center gap-1">
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                            className="bg-black/20 border border-white/20 rounded px-2 py-1 text-xs w-28 text-white focus:outline-hidden"
                            autoFocus
                            placeholder="ニックネーム"
                          />
                          <button onClick={() => handleUpdateName(group.id)} disabled={updatingName || !editName.trim()}
                            className="text-emerald-400 bg-emerald-500/20 rounded p-1.5 active:scale-95 disabled:opacity-50">
                            {updatingName ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          </button>
                          <button onClick={() => setEditingGroupId(null)} disabled={updatingName}
                            className="text-white/40 bg-white/10 rounded p-1.5 active:scale-95 disabled:opacity-50">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          {member.displayName}
                          {member.isOwner && <Crown size={10} className="text-yellow-400 shrink-0" />}
                          {member.userId === currentUserId && (
                            <button onClick={() => { setEditingGroupId(group.id); setEditName(member.displayName); }}
                              className="text-white/30 hover:text-white/60 ml-0.5 p-1 rounded-md hover:bg-white/5 active:scale-95 shrink-0 transition-all">
                              <Pencil size={11} />
                            </button>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  {member.todayWeight && (
                    <span className="text-[11px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full shrink-0">
                      {member.todayWeight}kg
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center bg-orange-500/5 rounded-lg py-1.5">
                    <div className="flex items-center justify-center gap-0.5 text-orange-400">
                      <Flame size={11} />
                      <span className="text-xs font-bold">{member.todayCalIn}</span>
                    </div>
                    <p className="text-[9px] text-white/30 mt-0.5">kcal摂取</p>
                  </div>
                  <div className="text-center bg-green-500/5 rounded-lg py-1.5">
                    <div className="flex items-center justify-center gap-0.5 text-green-400">
                      <Flame size={11} />
                      <span className="text-xs font-bold">{member.todayCalOut}</span>
                    </div>
                    <p className="text-[9px] text-white/30 mt-0.5">kcal消費</p>
                  </div>
                  <div className="text-center bg-cyan-500/5 rounded-lg py-1.5">
                    <div className="flex items-center justify-center gap-0.5 text-cyan-400">
                      <Dumbbell size={11} />
                      <span className="text-xs font-bold">{member.todayExMin}</span>
                    </div>
                    <p className="text-[9px] text-white/30 mt-0.5">分運動</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 削除/脱退ボタン */}
          <div className="pt-1 border-t border-white/5">
            {isOwner ? (
              confirmDelete === group.id ? (
                <div className="flex items-center gap-2 slide-up">
                  <p className="text-[11px] text-red-400 flex-1">本当に削除しますか？</p>
                  <button onClick={() => setConfirmDelete(null)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-[11px] text-white/50 active:scale-95 min-h-[32px]">
                    キャンセル
                  </button>
                  <button onClick={() => handleDeleteGroup(group.id)} disabled={deleting}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-[11px] text-red-400 font-semibold active:scale-95 min-h-[32px] flex items-center gap-1">
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    削除
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(group.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 active:scale-[0.98] transition-all min-h-[36px]">
                  <Trash2 size={12} />グループを削除
                </button>
              )
            ) : (
              <button onClick={() => handleLeaveGroup(group.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] text-white/30 hover:text-white/50 hover:bg-white/5 active:scale-[0.98] transition-all min-h-[36px]">
                <LogOut size={12} />グループを脱退
              </button>
            )}
          </div>
        </div>
      )})}

      {/* シェアシート（モーダル） */}
      {showShareMenu && (() => {
        const shareGroup = groups.find(g => g.id === showShareMenu);
        if (!shareGroup) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowShareMenu(null)}>
            <div className="fixed inset-0 bg-black/50" />
            <div
              className="relative w-full max-w-lg bg-[#131a2e] border-t border-white/10 rounded-t-2xl p-5 pb-8 slide-up"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white mb-1">「{shareGroup.name}」に招待</h3>
              <p className="text-[11px] text-white/40 mb-4">招待コード: {shareGroup.inviteCode}</p>
              <div className="space-y-2">
                <button onClick={() => shareInvite(shareGroup, 'native')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 active:scale-[0.98] transition-all">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center"><Share2 size={16} className="text-blue-400" /></div>
                  共有...
                </button>
                <button onClick={() => shareInvite(shareGroup, 'line')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 active:scale-[0.98] transition-all">
                  <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center"><MessageCircle size={16} className="text-green-400" /></div>
                  LINEで送る
                </button>
                <button onClick={() => shareInvite(shareGroup, 'email')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 active:scale-[0.98] transition-all">
                  <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center"><Mail size={16} className="text-cyan-400" /></div>
                  メールで送る
                </button>
              </div>
              <button onClick={() => setShowShareMenu(null)}
                className="w-full mt-3 py-3 rounded-xl bg-white/5 text-sm text-white/50 active:scale-[0.98] transition-all">
                キャンセル
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
