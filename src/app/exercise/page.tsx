'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Plus, Trash2, Clock, Flame, Search, X } from 'lucide-react';
import {
  getExerciseRecordsByDateDB,
  saveExerciseRecordDB,
  deleteExerciseRecordDB,
  getUserSettingsDB,
  generateId,
  getTodayString,
} from '@/lib/database';
import { calculateExerciseCalories } from '@/lib/calculations';
import { EXERCISE_PRESETS } from '@/lib/constants';
import type { ExerciseRecord } from '@/lib/types';

export default function ExercisePage() {
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customIntensity, setCustomIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate');
  const [duration, setDuration] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userWeight, setUserWeight] = useState(65);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async (date: string) => {
    try {
      const [recs, settings] = await Promise.all([
        getExerciseRecordsByDateDB(date),
        getUserSettingsDB(),
      ]);
      setRecords(recs);
      if (settings) setUserWeight(settings.weight);
    } catch (err) {
      console.error('Exercise load error:', err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const today = getTodayString();
    setSelectedDate(today);
    loadData(today);
  }, [loadData]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    loadData(date);
  };

  const handleSave = async () => {
    const dur = parseInt(duration);
    if (!dur) return;
    let exerciseName = '';
    let mets = 5;
    if (selectedPreset) {
      const preset = EXERCISE_PRESETS.find(p => p.name === selectedPreset);
      if (preset) { exerciseName = preset.nameJa; mets = preset.mets; }
    } else if (customName) {
      exerciseName = customName;
      mets = customIntensity === 'light' ? 3.5 : customIntensity === 'intense' ? 8.0 : 5.0;
    } else return;

    const caloriesBurned = calculateExerciseCalories(mets, userWeight, dur);
    const record: ExerciseRecord = {
      id: generateId(), date: selectedDate, name: exerciseName,
      duration: dur, caloriesBurned, createdAt: new Date().toISOString(),
    };
    await saveExerciseRecordDB(record);
    await loadData(selectedDate);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteExerciseRecordDB(id);
    await loadData(selectedDate);
  };

  const resetForm = () => {
    setShowForm(false); setSelectedPreset(null); setCustomName(''); setCustomIntensity('moderate'); setDuration(''); setSearchQuery('');
  };

  if (!mounted) return null;

  const totalCalBurned = records.reduce((s, r) => s + r.caloriesBurned, 0);
  const totalDuration = records.reduce((s, r) => s + r.duration, 0);

  const filteredPresets = searchQuery
    ? EXERCISE_PRESETS.filter(p => p.nameJa.includes(searchQuery) || p.name.includes(searchQuery.toLowerCase()))
    : EXERCISE_PRESETS;

  const previewCalories = (() => {
    const dur = parseInt(duration) || 0;
    if (!dur) return 0;
    if (selectedPreset) {
      const preset = EXERCISE_PRESETS.find(p => p.name === selectedPreset);
      return preset ? calculateExerciseCalories(preset.mets, userWeight, dur) : 0;
    }
    const intensityMets = customIntensity === 'light' ? 3.5 : customIntensity === 'intense' ? 8.0 : 5.0;
    return customName ? calculateExerciseCalories(intensityMets, userWeight, dur) : 0;
  })();

  const EMOJI_MAP: Record<string, string> = {
    walking: '🚶', jogging: '🏃', running: '💨', cycling: '🚴', swimming: '🏊',
    weight_training: '🏋️', weight_training_heavy: '🏋️', yoga: '🧘', stretching: '🤸',
    hiit: '🔥', dance: '💃', tennis: '🎾', basketball: '🏀', soccer: '⚽', stairs: '📶',
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2"><Dumbbell size={20} />運動記録</h1>
          <p className="text-white/40 text-xs mt-1">消費カロリーを自動計算</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="w-11 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center active:scale-95" id="btn-add-exercise">
          {showForm ? <X size={20} className="text-white" /> : <Plus size={20} className="text-white" />}
        </button>
      </div>

      {/* 日付 & サマリー */}
      <div className="flex items-center gap-3">
        <input type="date" value={selectedDate} onChange={e => handleDateChange(e.target.value)} className="input-field !w-auto flex-shrink-0" id="input-exercise-date" />
        <div className="flex-1 flex gap-3 justify-end">
          <div className="text-right">
            <div className="text-[9px] text-white/40">消費</div>
            <div className="text-base font-bold text-orange-400 flex items-center gap-0.5"><Flame size={12} />{totalCalBurned}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-white/40">時間</div>
            <div className="text-base font-bold text-cyan-400 flex items-center gap-0.5"><Clock size={12} />{totalDuration}分</div>
          </div>
        </div>
      </div>

      {/* 入力フォーム */}
      {showForm && (
        <div className="glass-card slide-up space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="運動を検索..." className="input-field !pl-9 text-sm" id="input-exercise-search" />
          </div>

          <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
            {filteredPresets.map(preset => (
              <button key={preset.name} onClick={() => { setSelectedPreset(preset.name); setCustomName(''); }}
                className={`py-2.5 px-1.5 rounded-xl text-xs font-medium transition-all text-center active:scale-95 ${
                  selectedPreset === preset.name
                    ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-white border border-emerald-500/40'
                    : 'bg-white/5 text-white/50 border border-white/8'}`}>
                <div className="text-base mb-0.5">{EMOJI_MAP[preset.name] || '🏅'}</div>
                {preset.nameJa}
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 pt-3">
            <h4 className="text-[10px] text-white/40 mb-1.5">手動入力</h4>
            <input type="text" value={customName} onChange={e => { setCustomName(e.target.value); setSelectedPreset(null); }}
              placeholder="運動名を入力" className="input-field text-sm mb-2" id="input-exercise-custom-name" />
            <div className="grid grid-cols-3 gap-1.5">
              {([['light', '軽い', '🚶'], ['moderate', '普通', '🏃'], ['intense', '激しい', '🔥']] as const).map(([key, label, emoji]) => (
                <button key={key} onClick={() => setCustomIntensity(key)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                    customIntensity === key
                      ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-white border border-emerald-500/40'
                      : 'bg-white/5 text-white/40 border border-white/8'}`}>
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">時間（分）</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="30" className="input-field" id="input-exercise-duration" />
          </div>

          {previewCalories > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-orange-300/70">推定消費</div>
              <div className="text-lg font-bold text-orange-400 flex items-center justify-center gap-1"><Flame size={16} />{previewCalories} kcal</div>
            </div>
          )}

          <button onClick={handleSave} disabled={(!selectedPreset && !customName) || !duration}
            className="w-full btn-primary disabled:opacity-30" id="btn-save-exercise">記録する</button>
        </div>
      )}

      {/* 記録リスト */}
      <div className="space-y-1.5">
        {records.length === 0 ? (
          <p className="text-center text-white/20 text-xs py-6">運動記録はまだありません</p>
        ) : records.map(r => (
          <div key={r.id} className="glass-card flex items-center justify-between !py-2.5 !px-3">
            <div>
              <div className="text-sm font-semibold">{r.name}</div>
              <div className="text-[9px] text-white/40 flex gap-2 mt-0.5">
                <span className="flex items-center gap-0.5"><Clock size={9} />{r.duration}分</span>
                <span className="flex items-center gap-0.5 text-orange-400"><Flame size={9} />{r.caloriesBurned}kcal</span>
              </div>
            </div>
            <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg active:bg-red-500/20 text-white/25 active:text-red-400 transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
