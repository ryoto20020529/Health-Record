'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Plus, Trash2, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getWorkoutSetsByDateDB, getWorkoutSetsByExerciseDB,
  saveWorkoutSetDB, deleteWorkoutSetDB, generateId, getTodayString,
} from '@/lib/database';
import { WORKOUT_EXERCISES, MUSCLE_GROUP_COLOR, MUSCLE_GROUP_EMOJI } from '@/lib/constants';
import type { WorkoutSet, MuscleGroup } from '@/lib/types';

const MUSCLE_GROUPS: MuscleGroup[] = ['胸', '背中', '脚', '肩', '腕', '腹', 'その他'];

export default function WorkoutPage() {
  const [date] = useState(getTodayString());
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup>('胸');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [prMap, setPrMap] = useState<Record<string, number>>({});
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadSets = useCallback(async () => {
    const data = await getWorkoutSetsByDateDB(date);
    setSets(data);
  }, [date]);

  useEffect(() => { setMounted(true); loadSets(); }, [loadSets]);

  // 種目選択時に過去PRを取得
  const handleSelectExercise = async (name: string) => {
    setSelectedExercise(name);
    setWeightInput('');
    setRepsInput('10');
    if (!prMap[name]) {
      const history = await getWorkoutSetsByExerciseDB(name);
      const maxWeight = history.length ? Math.max(...history.map(s => s.weightKg)) : 0;
      setPrMap(prev => ({ ...prev, [name]: maxWeight }));
      // 前回の重量を自動入力
      const lastUsed = history.find(s => s.date === date)?.weightKg ?? history[0]?.weightKg;
      if (lastUsed) setWeightInput(lastUsed.toString());
    } else {
      const history = await getWorkoutSetsByExerciseDB(name);
      const lastUsed = history.find(s => s.date === date)?.weightKg ?? history[0]?.weightKg;
      if (lastUsed) setWeightInput(lastUsed.toString());
    }
  };

  const handleAddSet = async () => {
    if (!selectedExercise || !repsInput) return;
    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput);
    if (!reps) return;

    setSaving(true);
    const todaySetsForExercise = sets.filter(s => s.exerciseName === selectedExercise);
    const setNumber = todaySetsForExercise.length + 1;
    const newSet: WorkoutSet = {
      id: generateId(), date, exerciseName: selectedExercise,
      muscleGroup: selectedGroup, setNumber, reps, weightKg: weight,
      createdAt: new Date().toISOString(),
    };
    await saveWorkoutSetDB(newSet);

    // PR更新チェック
    if (weight > (prMap[selectedExercise] || 0)) {
      setPrMap(prev => ({ ...prev, [selectedExercise]: weight }));
    }
    await loadSets();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteWorkoutSetDB(id);
    await loadSets();
  };

  if (!mounted) return null;

  // 今日のセットを種目別にグループ化
  const grouped = sets.reduce<Record<string, WorkoutSet[]>>((acc, s) => {
    if (!acc[s.exerciseName]) acc[s.exerciseName] = [];
    acc[s.exerciseName].push(s);
    return acc;
  }, {});

  const totalVolume = sets.reduce((acc, s) => acc + s.weightKg * s.reps, 0);
  const totalSets = sets.length;

  return (
    <div className="space-y-4 fade-in">
      <div className="pt-3 flex items-center justify-between">
        <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
          <Dumbbell size={20} />筋トレ
        </h1>
        <div className="text-right">
          <p className="text-[10px] text-white/30">本日のボリューム</p>
          <p className="text-sm font-bold text-emerald-400">{totalVolume.toLocaleString()} kg</p>
          <p className="text-[9px] text-white/30">{totalSets} セット</p>
        </div>
      </div>

      {/* 筋肉部位タブ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {MUSCLE_GROUPS.map(g => (
          <button key={g} onClick={() => { setSelectedGroup(g); setSelectedExercise(null); }}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 bg-linear-to-r ${
              selectedGroup === g
                ? MUSCLE_GROUP_COLOR[g]
                : 'bg-white/5 border-white/10 text-white/40'
            }`}>
            {MUSCLE_GROUP_EMOJI[g]} {g}
          </button>
        ))}
      </div>

      {/* 種目選択 */}
      <div className="glass-card space-y-3">
        <p className="text-xs text-white/50 font-medium">種目を選択</p>
        <div className="grid grid-cols-2 gap-1.5">
          {WORKOUT_EXERCISES[selectedGroup].map(ex => (
            <button key={ex} onClick={() => handleSelectExercise(ex)}
              className={`px-3 py-2.5 rounded-xl text-xs text-left transition-all active:scale-[0.97] border ${
                selectedExercise === ex
                  ? `bg-linear-to-r ${MUSCLE_GROUP_COLOR[selectedGroup]}`
                  : 'bg-white/5 border-white/8 text-white/60'
              }`}>
              {ex}
              {prMap[ex] > 0 && (
                <span className="ml-1 text-[9px] text-amber-400">
                  PR {prMap[ex]}kg
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* セット入力 */}
      {selectedExercise && (
        <div className="glass-card space-y-3 slide-up">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white/80">{selectedExercise}</p>
            {prMap[selectedExercise] > 0 && (
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <Trophy size={10} />PR: {prMap[selectedExercise]}kg
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">重量 (kg)</label>
              <input type="number" inputMode="decimal" value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                placeholder="0" className="input-field text-center text-lg font-bold" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">レップ数</label>
              <input type="number" inputMode="numeric" value={repsInput}
                onChange={e => setRepsInput(e.target.value)}
                placeholder="10" className="input-field text-center text-lg font-bold" />
            </div>
          </div>
          {/* PR予告 */}
          {parseFloat(weightInput) > (prMap[selectedExercise] || 0) && parseFloat(weightInput) > 0 && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
              <Trophy size={14} />新記録になります！
            </div>
          )}
          <button onClick={handleAddSet} disabled={saving || !repsInput}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-30">
            <Plus size={16} />
            セット {sets.filter(s => s.exerciseName === selectedExercise).length + 1} を追加
          </button>
        </div>
      )}

      {/* 今日のログ */}
      {Object.keys(grouped).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/40 font-medium px-1">今日のログ</p>
          {Object.entries(grouped).map(([ex, exSets]) => {
            const maxWeight = Math.max(...exSets.map(s => s.weightKg));
            const isPR = maxWeight > 0 && maxWeight >= (prMap[ex] || maxWeight);
            const isExpanded = expandedExercise === ex;
            const volume = exSets.reduce((a, s) => a + s.weightKg * s.reps, 0);
            return (
              <div key={ex} className="glass-card py-3! px-3!">
                <button onClick={() => setExpandedExercise(isExpanded ? null : ex)}
                  className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/90">{ex}</span>
                    {isPR && <Trophy size={12} className="text-amber-400" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] text-white/40">{exSets.length}セット</p>
                      <p className="text-[10px] text-emerald-400">{volume.toLocaleString()}kg vol</p>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-1 border-t border-white/8 pt-2">
                    {exSets.map(s => (
                      <div key={s.id} className="flex items-center justify-between text-[11px]">
                        <span className="text-white/50">
                          Set {s.setNumber}
                          <span className="text-white/80 font-medium">{s.weightKg}kg × {s.reps}回</span>
                          {s.weightKg >= (prMap[ex] || 0) && s.weightKg > 0 && (
                            <span className="ml-1 text-amber-400">🏆</span>
                          )}
                        </span>
                        <button onClick={() => handleDelete(s.id)}
                          className="p-1.5 rounded-lg active:bg-red-500/20 text-white/20 active:text-red-400 transition-all">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sets.length === 0 && (
        <div className="text-center py-12 text-white/20 text-sm">
          <Dumbbell size={32} className="mx-auto mb-3 opacity-30" />
          種目を選んでトレーニングを開始しよう
        </div>
      )}
    </div>
  );
}
