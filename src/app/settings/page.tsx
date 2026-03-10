'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, CheckCircle, LogOut } from 'lucide-react';
import { getUserSettingsDB, saveUserSettingsDB } from '@/lib/database';
import { calculateAllFromSettings } from '@/lib/calculations';
import { ACTIVITY_LEVEL_LABELS } from '@/lib/constants';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Gender, ActivityLevel, UserSettings } from '@/lib/types';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const s = await getUserSettingsDB();
      if (s) {
        setHeight(s.height.toString());
        setWeight(s.weight.toString());
        setAge(s.age.toString());
        setGender(s.gender);
        setActivityLevel(s.activityLevel);
      }
    } catch (err) {
      console.error('Settings load error:', err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age);
    if (!h || !w || !a) return;

    setSaving(true);
    try {
      const calculated = calculateAllFromSettings(h, w, a, gender, activityLevel);
      const settings: UserSettings = { height: h, weight: w, age: a, gender, activityLevel, ...calculated };
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
                    ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-white border border-emerald-500/40'
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
                    ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30'
                    : 'bg-white/3 text-white/50 border border-white/8'
                }`}>{label}</button>
            ))}
          </div>
        </div>
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
