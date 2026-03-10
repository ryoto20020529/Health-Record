'use client';

import { useState, useEffect } from 'react';
import {
  Dumbbell,
  Plus,
  Trash2,
  Clock,
  Flame,
  Search,
} from 'lucide-react';
import {
  getExerciseRecordsByDate,
  saveExerciseRecord,
  deleteExerciseRecord,
  getUserSettings,
  generateId,
  getTodayString,
} from '@/lib/storage';
import { calculateExerciseCalories } from '@/lib/calculations';
import { EXERCISE_PRESETS } from '@/lib/constants';
import type { ExerciseRecord } from '@/lib/types';

export default function ExercisePage() {
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customMets, setCustomMets] = useState('');
  const [duration, setDuration] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userWeight, setUserWeight] = useState(65);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const today = getTodayString();
    setSelectedDate(today);
    setRecords(getExerciseRecordsByDate(today));
    const s = getUserSettings();
    if (s) setUserWeight(s.weight);
  }, []);

  const loadRecords = (date: string) => {
    setSelectedDate(date);
    setRecords(getExerciseRecordsByDate(date));
  };

  const handleSave = () => {
    const dur = parseInt(duration);
    if (!dur) return;

    let exerciseName = '';
    let mets = 5;

    if (selectedPreset) {
      const preset = EXERCISE_PRESETS.find((p) => p.name === selectedPreset);
      if (preset) {
        exerciseName = preset.nameJa;
        mets = preset.mets;
      }
    } else if (customName) {
      exerciseName = customName;
      mets = parseFloat(customMets) || 5;
    } else {
      return;
    }

    const caloriesBurned = calculateExerciseCalories(mets, userWeight, dur);

    const record: ExerciseRecord = {
      id: generateId(),
      date: selectedDate,
      name: exerciseName,
      duration: dur,
      caloriesBurned,
      createdAt: new Date().toISOString(),
    };
    saveExerciseRecord(record);
    setRecords(getExerciseRecordsByDate(selectedDate));
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteExerciseRecord(id);
    setRecords(getExerciseRecordsByDate(selectedDate));
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedPreset(null);
    setCustomName('');
    setCustomMets('');
    setDuration('');
    setSearchQuery('');
  };

  if (!mounted) return null;

  const totalCalBurned = records.reduce((s, r) => s + r.caloriesBurned, 0);
  const totalDuration = records.reduce((s, r) => s + r.duration, 0);

  const filteredPresets = searchQuery
    ? EXERCISE_PRESETS.filter(
        (p) =>
          p.nameJa.includes(searchQuery) || p.name.includes(searchQuery.toLowerCase())
      )
    : EXERCISE_PRESETS;

  // 選択中のプリセットの消費カロリーを計算
  const previewCalories = (() => {
    const dur = parseInt(duration) || 0;
    if (!dur) return 0;
    if (selectedPreset) {
      const preset = EXERCISE_PRESETS.find((p) => p.name === selectedPreset);
      return preset ? calculateExerciseCalories(preset.mets, userWeight, dur) : 0;
    }
    if (customMets) {
      return calculateExerciseCalories(parseFloat(customMets) || 5, userWeight, dur);
    }
    return 0;
  })();

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Dumbbell size={24} />
            運動記録
          </h1>
          <p className="text-white/40 text-sm mt-1">消費カロリーを自動計算</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center transition-transform hover:scale-105"
          id="btn-add-exercise"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {/* 日付選択 & サマリー */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => loadRecords(e.target.value)}
          className="input-field !w-auto"
          id="input-exercise-date"
        />
        <div className="flex-1 flex gap-4 justify-end">
          <div className="text-right">
            <div className="text-[10px] text-white/40">消費カロリー</div>
            <div className="text-lg font-bold text-orange-400 flex items-center gap-1">
              <Flame size={14} />
              {totalCalBurned} kcal
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/40">運動時間</div>
            <div className="text-lg font-bold text-cyan-400 flex items-center gap-1">
              <Clock size={14} />
              {totalDuration}分
            </div>
          </div>
        </div>
      </div>

      {/* 入力フォーム */}
      {showForm && (
        <div className="glass-card slide-up space-y-4">
          <h3 className="text-sm font-semibold text-white/70">運動メニューを選択</h3>

          {/* 検索 */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="運動を検索..."
              className="input-field !pl-10"
              id="input-exercise-search"
            />
          </div>

          {/* プリセット一覧 */}
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {filteredPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setSelectedPreset(preset.name);
                  setCustomName('');
                }}
                className={`py-3 px-2 rounded-xl text-xs font-medium transition-all text-center ${
                  selectedPreset === preset.name
                    ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-white border border-emerald-500/40 scale-[1.02]'
                    : 'bg-white/5 text-white/50 border border-white/8 hover:bg-white/10'
                }`}
              >
                <div className="text-lg mb-1">{
                  preset.name === 'walking' ? '🚶' :
                  preset.name === 'jogging' ? '🏃' :
                  preset.name === 'running' ? '💨' :
                  preset.name === 'cycling' ? '🚴' :
                  preset.name === 'swimming' ? '🏊' :
                  preset.name.includes('weight') ? '🏋️' :
                  preset.name === 'yoga' ? '🧘' :
                  preset.name === 'stretching' ? '🤸' :
                  preset.name === 'hiit' ? '🔥' :
                  preset.name === 'dance' ? '💃' :
                  preset.name === 'stairs' ? '📶' : '⚽'
                }</div>
                {preset.nameJa}
              </button>
            ))}
          </div>

          {/* カスタム入力 */}
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-xs text-white/40 mb-2">または手動入力</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setSelectedPreset(null);
                }}
                placeholder="運動名"
                className="input-field text-sm"
                id="input-exercise-custom-name"
              />
              <input
                type="number"
                value={customMets}
                onChange={(e) => setCustomMets(e.target.value)}
                placeholder="METs値 (例: 5)"
                className="input-field text-sm"
                id="input-exercise-custom-mets"
              />
            </div>
          </div>

          {/* 時間入力 */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">実施時間（分）</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              className="input-field"
              id="input-exercise-duration"
            />
          </div>

          {/* プレビュー */}
          {previewCalories > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
              <div className="text-[10px] text-orange-300/70">推定消費カロリー</div>
              <div className="text-xl font-bold text-orange-400 flex items-center justify-center gap-1">
                <Flame size={18} />
                {previewCalories} kcal
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={(!selectedPreset && !customName) || !duration}
            className="w-full btn-primary disabled:opacity-30 disabled:cursor-not-allowed"
            id="btn-save-exercise"
          >
            記録する
          </button>
        </div>
      )}

      {/* 記録リスト */}
      <div className="space-y-2">
        {records.length === 0 ? (
          <p className="text-center text-white/20 text-sm py-8">この日の運動記録はまだありません</p>
        ) : (
          records.map((r) => (
            <div key={r.id} className="glass-card flex items-center justify-between !p-3">
              <div>
                <div className="text-sm font-semibold">{r.name}</div>
                <div className="text-[10px] text-white/40 flex gap-3 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {r.duration}分
                  </span>
                  <span className="flex items-center gap-1 text-orange-400">
                    <Flame size={10} />
                    {r.caloriesBurned}kcal
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="p-2 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
