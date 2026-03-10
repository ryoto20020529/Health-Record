'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Calculator, CheckCircle, LogOut } from 'lucide-react';
import { getUserSettingsDB, saveUserSettingsDB } from '@/lib/database';
import { calculateAllFromSettings, calculateBMI } from '@/lib/calculations';
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
  const [currentSettings, setCurrentSettings] = useState<UserSettings | null>(null);
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
        setCurrentSettings(s);
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
      setCurrentSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const bmi = height && weight ? calculateBMI(parseFloat(weight), parseFloat(height)) : null;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <Settings size={20} />
            基本設定
          </h1>
          <p className="text-white/40 text-xs mt-1">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="p-2 rounded-xl hover:bg-red-500/15 text-white/40 hover:text-red-400 transition-all active:scale-95"
          id="btn-logout"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* 入力フォーム */}
      <div className="glass-card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">身長 (cm)</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" className="input-field" id="input-height" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">体重 (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65" className="input-field" id="input-weight" />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">年齢</label>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" className="input-field" id="input-age" />
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
                }`}>{g === 'male' ? '男性' : '女性'}</button>
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

      {/* BMI */}
      {bmi && (
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">BMI</span>
            <span className={`text-lg font-bold ${bmi < 18.5 ? 'text-blue-400' : bmi < 25 ? 'text-emerald-400' : bmi < 30 ? 'text-yellow-400' : 'text-red-400'}`}>{bmi}</span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 via-yellow-400 to-red-400 transition-all duration-500" style={{ width: `${Math.min((bmi / 40) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* 計算結果 */}
      {currentSettings && (
        <div className="glass-card slide-up">
          <h3 className="text-xs font-semibold text-white/70 flex items-center gap-1.5 mb-3">
            <Calculator size={14} className="text-cyan-400" />
            計算結果
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40">基礎代謝</div>
              <div className="text-lg font-bold text-emerald-400">{currentSettings.bmr}</div>
              <div className="text-[9px] text-white/30">kcal/日</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40">目標カロリー</div>
              <div className="text-lg font-bold text-cyan-400">{currentSettings.targetCalories}</div>
              <div className="text-[9px] text-white/30">kcal/日</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-white/5 rounded-xl p-2 text-center">
              <div className="text-[9px] text-white/40">P</div>
              <div className="text-sm font-bold text-emerald-400">{currentSettings.targetProtein}g</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 text-center">
              <div className="text-[9px] text-white/40">F</div>
              <div className="text-sm font-bold text-cyan-400">{currentSettings.targetFat}g</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 text-center">
              <div className="text-[9px] text-white/40">C</div>
              <div className="text-sm font-bold text-blue-400">{currentSettings.targetCarbs}g</div>
            </div>
          </div>
        </div>
      )}

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
