'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Copy, Plus, X, Crown, Flame, Dumbbell, Check } from 'lucide-react';
import {
  getUserSettingsDB,
  getMealRecordsByDateDB,
  getExerciseRecordsByDateDB,
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

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const loadGroups = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ユーザーが参加しているグループを取得
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

      // 各グループのメンバーを取得
      const loadedGroups: Group[] = [];
      for (const g of groupsData) {
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id, is_owner')
          .eq('group_id', g.id);

        const memberInfos: GroupMember[] = [];
        for (const m of (members || [])) {
          // メンバーのメールを取得（簡易的にuser_idの一部を使用）
          const { data: meals } = await supabase
            .from('meal_records')
            .select('calories')
            .eq('user_id', m.user_id)
            .eq('date', getTodayString());

          const { data: exercises } = await supabase
            .from('exercise_records')
            .select('calories_burned, duration')
            .eq('user_id', m.user_id)
            .eq('date', getTodayString());

          memberInfos.push({
            userId: m.user_id,
            email: m.user_id === user.id ? 'あなた' : `メンバー${memberInfos.length + 1}`,
            todayCalIn: (meals || []).reduce((s: number, r: { calories: number }) => s + r.calories, 0),
            todayCalOut: (exercises || []).reduce((s: number, r: { calories_burned: number }) => s + r.calories_burned, 0),
            todayExMin: (exercises || []).reduce((s: number, r: { duration: number }) => s + r.duration, 0),
            isOwner: m.is_owner,
          });
        }

        loadedGroups.push({
          id: g.id,
          name: g.name,
          inviteCode: g.invite_code,
          members: memberInfos,
        });
      }

      setGroups(loadedGroups);
    } catch (err) {
      console.error('Groups load error:', err);
    }
  }, [supabase]);

  useEffect(() => {
    setMounted(true);
    loadGroups();
  }, [loadGroups]);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const groupId = generateId();

      await supabase.from('groups').insert({
        id: groupId,
        name: groupName,
        invite_code: inviteCode,
        owner_id: user.id,
      });

      await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        is_owner: true,
      });

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
      if (!user) return;

      const { data: group } = await supabase
        .from('groups')
        .select('id')
        .eq('invite_code', joinCode.toUpperCase())
        .single();

      if (!group) {
        setError('招待コードが見つかりません');
        return;
      }

      // 既に参加しているか確認
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

      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        is_owner: false,
      });

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
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-xs text-white font-semibold active:scale-95">
            <Plus size={14} className="inline mr-1" />作成
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 text-center">{error}</div>
      )}

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

      {/* グループ一覧 */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 flex items-center justify-center mb-4">
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
            <button onClick={() => copyCode(group.inviteCode)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-[10px] text-white/40 active:scale-95">
              {copied ? <><Check size={10} />コピー済み</> : <><Copy size={10} />{group.inviteCode}</>}
            </button>
          </div>

          {/* メンバー進捗 */}
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
                  <span className="text-orange-400 flex items-center gap-0.5"><Flame size={10} />{member.todayCalIn}</span>
                  <span className="text-cyan-400 flex items-center gap-0.5"><Dumbbell size={10} />{member.todayExMin}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
