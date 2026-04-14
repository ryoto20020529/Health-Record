'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, CheckCircle, LogOut, Heart, Copy, Loader2, AlertCircle } from 'lucide-react';
import { getUserSettingsDB, saveUserSettingsDB } from '@/lib/database';
import { calculateAllFromSettings } from '@/lib/calculations';
import { ACTIVITY_LEVEL_LABELS } from '@/lib/constants';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase';
import type { Gender, ActivityLevel, UserSettings, Phase } from '@/lib/types';

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy}
      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 active:bg-emerald-500/20 transition-all text-[10px] text-white/40 active:text-emerald-400">
      {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {label && <span>{copied ? 'コピー済' : label}</span>}
    </button>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [phase, setPhase] = useState<Phase>('maintain');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Apple Health 連携
  const [syncToken, setSyncToken] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(true);

  const syncUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/health-sync`
      : '/api/health-sync';

  const loadSyncToken = useCallback(async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      const { data } = await createClient().auth.getSession();
      const jwt = data.session?.access_token;
      if (!jwt) { setSyncLoading(false); return; }

      const res = await fetch('/api/health-sync/setup', {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const d = await res.json();
      if (res.ok) {
        setSyncToken(d.token);
      } else {
        setSyncError(d.error ?? 'トークン取得失敗');
      }
    } catch {
      setSyncError('通信エラー');
    }
    setSyncLoading(false);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const s = await getUserSettingsDB();
      if (s) {
        setHeight(s.height.toString());
        setWeight(s.weight.toString());
        setAge(s.age.toString());
        setGender(s.gender);
        setActivityLevel(s.activityLevel);
        if (s.phase) setPhase(s.phase);
      }
    } catch (err) {
      console.error('Settings load error:', err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadSettings();
    loadSyncToken();
  }, [loadSettings, loadSyncToken]);

  const handleSave = async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age);
    if (!h || !w || !a) return;
    setSaving(true);
    try {
      const calculated = calculateAllFromSettings(h, w, a, gender, activityLevel);
      // フェーズに応じてカロリー調整
      const phaseOffset = phase === 'bulk' ? 350 : phase === 'cut' ? -450 : 0;
      const phaseProtein = phase === 'cut' ? w * 2.2 : phase === 'bulk' ? w * 2.0 : w * 1.8;
      const settings: UserSettings = {
        height: h, weight: w, age: a, gender, activityLevel, phase,
        ...calculated,
        targetCalories: Math.max(1200, calculated.targetCalories + phaseOffset),
        targetProtein: Math.round(phaseProtein),
      };
      await saveUserSettingsDB(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <Settings size={20} />基本設定
          </h1>
          <p className="text-white/40 text-xs mt-1">{user?.email}</p>
        </div>
        <button onClick={signOut}
          className="p-2 rounded-xl hover:bg-red-500/15 text-white/40 hover:text-red-400 transition-all active:scale-95"
          id="btn-logout">
          <LogOut size={18} />
        </button>
      </div>

      {/* 入力フォーム */}
      <div className="glass-card space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">身長 (cm)</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" className="input-field" id="input-height" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">体重 (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65" className="input-field" id="input-weight" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">年齢</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" className="input-field" id="input-age" />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">性別</label>
          <div className="flex gap-2">
            {(['male', 'female'] as Gender[]).map((g) => (
              <button key={g} onClick={() => setGender(g)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                  gender === g
                    ? 'bg-linear-to-r from-emerald-500/30 to-cyan-500/30 text-white border border-emerald-500/40'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}>{g === 'male' ? '♂ 男性' : '♀ 女性'}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">活動レベル</label>
          <div className="space-y-1.5">
            {(Object.entries(ACTIVITY_LEVEL_LABELS) as [ActivityLevel, string][]).map(([level, label]) => (
              <button key={level} onClick={() => setActivityLevel(level)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all active:scale-[0.98] ${
                  activityLevel === level
                    ? 'bg-linear-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30'
                    : 'bg-white/3 text-white/50 border border-white/8'
                }`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* フェーズモード */}
      <div className="glass-card space-y-3">
        <h3 className="text-sm font-semibold text-white/80">トレーニングフェーズ</h3>
        <p className="text-[10px] text-white/35 leading-relaxed">選択するとカロリー・タンパク質目標が自動調整されます</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'cut',      label: '減量期', sub: '-450kcal', color: 'from-blue-500/25 to-cyan-500/25 border-blue-500/40 text-blue-300' },
            { value: 'maintain', label: '維持期', sub: '±0kcal',   color: 'from-emerald-500/25 to-teal-500/25 border-emerald-500/40 text-emerald-300' },
            { value: 'bulk',     label: '増量期', sub: '+350kcal', color: 'from-orange-500/25 to-amber-500/25 border-orange-500/40 text-orange-300' },
          ] as { value: Phase; label: string; sub: string; color: string }[]).map(p => (
            <button key={p.value} onClick={() => setPhase(p.value)}
              className={`py-3 rounded-xl text-center border transition-all active:scale-95 bg-linear-to-b ${
                phase === p.value ? p.color : 'bg-white/5 border-white/10 text-white/40'
              }`}>
              <p className="text-xs font-bold">{p.label}</p>
              <p className="text-[9px] mt-0.5 opacity-70">{p.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Apple Health 連携 */}
      <div className="glass-card space-y-4">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-red-400" />
          <h3 className="text-sm font-semibold text-white/80">Apple Health 連携</h3>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">自動同期</span>
        </div>

        {syncLoading ? (
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <Loader2 size={14} className="animate-spin" />設定を読み込み中...
          </div>
        ) : syncError ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs text-amber-300 font-medium">セットアップが必要です</p>
                <p className="text-[10px] text-amber-300/60 leading-relaxed">{syncError}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-2">
              <p className="text-[10px] text-white/50 font-medium">追加手順：</p>
              <ol className="text-[10px] text-white/40 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Supabase Dashboard → Settings → API を開く</li>
                <li><code className="text-emerald-300">service_role</code>（secret）をコピー</li>
                <li><code className="text-cyan-300">.env.local</code> に以下を追加してサーバーを再起動</li>
              </ol>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 text-[10px] bg-black/30 rounded px-2 py-1.5 text-white/50">
                  SUPABASE_SERVICE_ROLE_KEY=eyJ...
                </code>
                <button onClick={loadSyncToken}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/40 active:bg-white/10 transition-all">
                  再読込
                </button>
              </div>
            </div>
          </div>
        ) : syncToken ? (
          <div className="space-y-4">
            {/* トークン */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-white/40">同期トークン</p>
                <CopyButton text={syncToken} label="コピー" />
              </div>
              <code className="block w-full text-[9px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-emerald-300 break-all">
                {syncToken}
              </code>
            </div>

            {/* 同期URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-white/40">同期URL</p>
                <CopyButton text={syncUrl} label="コピー" />
              </div>
              <code className="block w-full text-[9px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 break-all">
                {syncUrl}
              </code>
            </div>

            {/* ショートカット設定ガイド */}
            <div className="border-t border-white/8 pt-4 space-y-3">
              <p className="text-[10px] text-white/50 font-medium">iPhoneショートカット設定</p>

              {[
                {
                  step: '1',
                  label: 'アクションを追加',
                  desc: '「ヘルスケアサンプルを見つける」を2つ追加',
                  sub: ['① 種類: アクティブエネルギー / 期間: 今日 / 集計: 合計',
                        '② 種類: 歩数 / 期間: 今日 / 集計: 合計'],
                },
                {
                  step: '2',
                  label: '「URLのコンテンツを取得」を追加',
                  desc: '以下の値を設定してください',
                  fields: [
                    { label: 'URL', value: syncUrl },
                    { label: '方法', value: 'POST' },
                    { label: 'ヘッダー名', value: 'Authorization' },
                    { label: 'ヘッダー値', value: `Bearer ${syncToken}` },
                    { label: '本文タイプ', value: 'JSON' },
                  ],
                },
                {
                  step: '3',
                  label: 'JSONキーを追加',
                  desc: '本文に以下のキーを設定',
                  fields: [
                    { label: 'date', value: '日付フォーマット (YYYY-MM-DD) → 変数で今日の日付' },
                    { label: 'steps', value: '② の歩数結果 → 変数で設定' },
                    { label: 'activeCalories', value: '① のアクティブエネルギー結果 → 変数で設定' },
                  ],
                },
                {
                  step: '4',
                  label: 'オートメーション設定（任意）',
                  desc: 'ショートカットアプリ → オートメーション → 時刻 → 毎日23:00に設定すると自動同期されます',
                  sub: [],
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] text-white/70 font-medium">{s.label}</p>
                    <p className="text-[10px] text-white/35 leading-relaxed">{s.desc}</p>
                    {s.sub?.map((t, i) => (
                      <p key={i} className="text-[9px] text-white/30 ml-2">{t}</p>
                    ))}
                    {s.fields?.map((f) => (
                      <div key={f.label} className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-white/30 w-20 shrink-0">{f.label}</span>
                        <code className="flex-1 text-[9px] bg-black/20 rounded px-2 py-1 text-white/50 truncate">{f.value}</code>
                        <CopyButton text={f.value} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* 保存ボタン */}
      <button onClick={handleSave} disabled={!height || !weight || !age || saving}
        className={`w-full py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
          saved ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
            : !height || !weight || !age ? 'bg-white/5 text-white/20 cursor-not-allowed'
            : 'btn-primary'}`} id="btn-save-settings">
        {saved ? (<><CheckCircle size={18} />保存しました！</>) : (<><Save size={18} />{saving ? '保存中...' : '設定を保存する'}</>)}
      </button>
    </div>
  );
}
