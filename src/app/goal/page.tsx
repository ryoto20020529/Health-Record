'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target, Flame, UtensilsCrossed, Dumbbell,
  CheckCircle, AlertTriangle, Award, ArrowRight, X, Settings,
} from 'lucide-react';
import {
  getActiveGoalDB,
  saveGoalDB,
  deleteGoalDB,
  getUserSettingsDB,
  getMealRecordsByDateDB,
  getExerciseRecordsByDateDB,
  getExerciseRecordsDB,
  getWeightRecordsDB,
  generateId,
  getTodayString,
} from '@/lib/database';
import type { GoalPlan, UserSettings, ExerciseRecord } from '@/lib/types';

// おすすめ食事プラン
function getMealSuggestions(dailyCal: number) {
  const perMeal = Math.round(dailyCal / 3);
  return [
    { meal: '朝食', cal: Math.round(perMeal * 0.3), example: 'オートミール + プロテイン + バナナ' },
    { meal: '昼食', cal: Math.round(perMeal * 0.4), example: '鶏むね肉サラダ + 玄米おにぎり' },
    { meal: '夕食', cal: Math.round(perMeal * 0.3), example: '焼き魚 + 味噌汁 + サラダ' },
  ];
}

// ユーザーの運動履歴からおすすめを生成
function getExerciseSuggestionsFromHistory(
  history: ExerciseRecord[],
  targetMin: number
): { name: string; duration: number; avgCal: number }[] {
  // 運動ごとに頻度・平均時間・平均カロリーを集計
  const stats = new Map<string, { count: number; totalDur: number; totalCal: number }>();
  history.forEach(r => {
    const s = stats.get(r.name) || { count: 0, totalDur: 0, totalCal: 0 };
    s.count++; s.totalDur += r.duration; s.totalCal += r.caloriesBurned;
    stats.set(r.name, s);
  });
  // 頻度順にソート
  const sorted = [...stats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4);

  if (sorted.length === 0) {
    return [
      { name: 'ウォーキング', duration: targetMin, avgCal: Math.round(targetMin * 4) },
      { name: 'ストレッチ', duration: 10, avgCal: 20 },
    ];
  }

  return sorted.map(([name, s]) => ({
    name,
    duration: Math.round(s.totalDur / s.count),
    avgCal: Math.round(s.totalCal / s.count),
  }));
}

export default function GoalPage() {
  const [goal, setGoal] = useState<GoalPlan | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [mounted, setMounted] = useState(false);

  // 今日のデータ
  const [todayCalIn, setTodayCalIn] = useState(0);
  const [todayCalOut, setTodayCalOut] = useState(0);
  const [todayExMin, setTodayExMin] = useState(0);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseRecord[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [g, s] = await Promise.all([getActiveGoalDB(), getUserSettingsDB()]);
      setGoal(g);
      setSettings(s);

      const today = getTodayString();
      const [meals, exercises, weights, allExercises] = await Promise.all([
        getMealRecordsByDateDB(today),
        getExerciseRecordsByDateDB(today),
        getWeightRecordsDB(),
        getExerciseRecordsDB(),
      ]);

      setTodayCalIn(meals.reduce((sum, m) => sum + m.calories, 0));
      setTodayCalOut(exercises.reduce((sum, e) => sum + e.caloriesBurned, 0));
      setTodayExMin(exercises.reduce((sum, e) => sum + e.duration, 0));
      setExerciseHistory(allExercises);

      if (weights.length > 0) {
        setLatestWeight(weights[weights.length - 1].weight);
      }
    } catch (err) {
      console.error('Goal load error:', err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const handleCreateGoal = async () => {
    const tw = parseFloat(targetWeight);
    if (!tw || !targetDate || !settings) return;

    const currentWeight = settings.weight;
    const weightDiff = currentWeight - tw; // 正なら減量
    const today = new Date();
    const target = new Date(targetDate);
    const daysLeft = Math.max(Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 1);

    // 1kgの脂肪 = 7200kcal
    const totalDeficit = weightDiff * 7200;
    const dailyDeficit = Math.round(totalDeficit / daysLeft);

    // 食事制限で60%, 運動で40%のカロリー削減
    const dietDeficit = Math.round(dailyDeficit * 0.6);
    const exerciseDeficit = Math.round(dailyDeficit * 0.4);
    const dailyCalorieTarget = Math.max(settings.tdee - dietDeficit, 1200); // 最低1200kcal
    // 中程度の運動(5 METs)で消費するのに必要な時間
    const exerciseMinPerDay = Math.round((exerciseDeficit / (5 * settings.weight * 1.05)) * 60);

    const newGoal: GoalPlan = {
      id: generateId(),
      targetWeight: tw,
      targetDate,
      dailyCalorieDeficit: dailyDeficit,
      dailyCalorieTarget,
      recommendedExerciseMin: Math.max(exerciseMinPerDay, 15),
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    await saveGoalDB(newGoal);
    await loadData();
    setShowSetup(false);
  };

  const handleDeleteGoal = async () => {
    if (goal) {
      await deleteGoalDB(goal.id);
      setGoal(null);
    }
  };

  if (!mounted) return null;

  // 残り日数
  const daysLeft = goal ? Math.max(Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)), 0) : 0;
  const weightToGo = goal && latestWeight ? Math.round((latestWeight - goal.targetWeight) * 10) / 10 : 0;

  // 今日のフィードback
  const netCalories = todayCalIn - todayCalOut;
  const calorieBudget = goal ? goal.dailyCalorieTarget : 0;
  const remainingExCal = Math.max(calorieBudget > 0 ? todayCalIn - calorieBudget : 0, 0); // 運動で減らすべき残りkcal
  const calorieStatus = netCalories <= calorieBudget ? 'good' : netCalories <= calorieBudget * 1.1 ? 'warning' : 'over';
  const exerciseStatus = goal && todayExMin >= goal.recommendedExerciseMin ? 'good' : todayExMin > 0 ? 'partial' : 'none';

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2"><Target size={20} />目標プラン</h1>
          <p className="text-white/40 text-xs mt-1">逆算して毎日の行動を提案</p>
        </div>
        <a href="/settings" className="p-2 rounded-xl hover:bg-white/10 text-white/40 transition-all active:scale-95">
          <Settings size={18} />
        </a>
      </div>

      {/* 目標未設定 or セットアップ */}
      {!goal && !showSetup && (
        <div className="glass-card text-center py-10 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
            <Target size={28} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">目標を設定しよう</h2>
            <p className="text-white/40 text-xs mt-1">目標体重と期限を決めると<br/>毎日の食事・運動プランを逆算します</p>
          </div>
          <button onClick={() => setShowSetup(true)} className="btn-primary mx-auto gap-2 px-8" id="btn-start-goal">
            目標を設定する <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* セットアップフォーム */}
      {showSetup && (
        <div className="glass-card slide-up space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/70">目標設定</h3>
            <button onClick={() => setShowSetup(false)} className="p-1.5 rounded-lg active:bg-white/10"><X size={16} className="text-white/40" /></button>
          </div>

          {settings && (
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40">現在の体重</div>
              <div className="text-2xl font-bold text-emerald-400">{settings.weight} <span className="text-xs text-white/40">kg</span></div>
            </div>
          )}

          <div>
            <label className="text-xs text-white/50 mb-1 block">目標体重 (kg)</label>
            <input type="number" step="0.1" value={targetWeight} onChange={e => setTargetWeight(e.target.value)}
              placeholder="60.0" className="input-field" id="input-target-weight" />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">目標日</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              className="input-field" id="input-target-date" />
          </div>

          {targetWeight && targetDate && settings && (() => {
            const diff = settings.weight - parseFloat(targetWeight);
            // eslint-disable-next-line react-hooks/purity
            const days = Math.max(Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 1);
            const weekly = Math.round((diff / days) * 7 * 10) / 10;
            const safe = Math.abs(weekly) <= 1.0;
            return (
              <div className={`rounded-xl p-3 text-center border ${safe ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                <div className="text-[10px] text-white/50">{days}日間で {Math.abs(diff).toFixed(1)}kg {diff > 0 ? '減量' : '増量'}</div>
                <div className={`text-sm font-bold mt-0.5 ${safe ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  週{Math.abs(weekly).toFixed(1)}kgペース {!safe && '⚠️ ゆるやかに'}
                </div>
              </div>
            );
          })()}

          <button onClick={handleCreateGoal} disabled={!targetWeight || !targetDate || !settings}
            className="w-full btn-primary disabled:opacity-30" id="btn-save-goal">プランを作成</button>
        </div>
      )}

      {/* アクティブゴール表示 */}
      {goal && (
        <>
          {/* 概要カード */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                <Target size={14} className="text-emerald-400" />現在の目標
              </h3>
              <button onClick={handleDeleteGoal} className="text-[10px] text-white/30 hover:text-red-400 transition-colors">リセット</button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-[9px] text-white/40">目標体重</div>
                <div className="text-lg font-bold text-emerald-400">{goal.targetWeight}<span className="text-[9px]">kg</span></div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-[9px] text-white/40">残り</div>
                <div className="text-lg font-bold text-cyan-400">{daysLeft}<span className="text-[9px]">日</span></div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-[9px] text-white/40">あと</div>
                <div className="text-lg font-bold text-blue-400">{weightToGo}<span className="text-[9px]">kg</span></div>
              </div>
            </div>
          </div>

          {/* 今日のフィードバック */}
          <div className="glass-card">
            <h3 className="text-xs font-semibold text-white/70 flex items-center gap-1.5 mb-3">
              {calorieStatus === 'good' ? <CheckCircle size={14} className="text-emerald-400" /> : <AlertTriangle size={14} className="text-yellow-400" />}
              今日のフィードバック
            </h3>

            {/* カロリー */}
            <div className={`rounded-xl p-3 mb-2 border ${
              calorieStatus === 'good' ? 'bg-emerald-500/10 border-emerald-500/20' :
              calorieStatus === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
              'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60 flex items-center gap-1"><Flame size={12} />カロリー</span>
                <span className={`text-sm font-bold ${calorieStatus === 'good' ? 'text-emerald-400' : calorieStatus === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {netCalories} / {calorieBudget} kcal
                </span>
              </div>
              <div className="mt-1.5 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${calorieStatus === 'good' ? 'bg-emerald-500' : calorieStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min((netCalories / calorieBudget) * 100, 100)}%` }} />
              </div>
              <p className="text-[10px] text-white/40 mt-1.5">
                {calorieStatus === 'good' ? '✅ 順調です！この調子で続けましょう' :
                 calorieStatus === 'warning' ? '⚠️ 少しオーバー気味。軽い運動で調整を' :
                 '🚨 目標を超えています。夜食を控えましょう'}
              </p>
            </div>

            {/* 運動 */}
            <div className={`rounded-xl p-3 border ${
              exerciseStatus === 'good' ? 'bg-emerald-500/10 border-emerald-500/20' :
              exerciseStatus === 'partial' ? 'bg-cyan-500/10 border-cyan-500/20' :
              'bg-white/5 border-white/8'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60 flex items-center gap-1"><Dumbbell size={12} />運動</span>
                <span className={`text-sm font-bold ${exerciseStatus === 'good' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {todayCalOut} kcal消費済み
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-white/40">時間: {todayExMin}分</span>
                {remainingExCal > 0 && (
                  <span className="text-[10px] text-orange-400 font-semibold">あと{remainingExCal}kcal運動で消費</span>
                )}
              </div>
              <p className="text-[10px] text-white/40 mt-1.5">
                {exerciseStatus === 'good' ? '✅ 運動目標達成！お疲れ様です' :
                 remainingExCal > 0 ? `🔥 食事が${remainingExCal}kcalオーバー、運動で取り戻そう！` :
                 exerciseStatus === 'partial' ? `💪 あと${goal.recommendedExerciseMin - todayExMin}分で目標達成！` :
                 '🏃 今日の運動はまだです。少し体を動かしましょう'}
              </p>
            </div>
          </div>

          {/* 食事の提案 */}
          <div className="glass-card">
            <h3 className="text-xs font-semibold text-white/70 flex items-center gap-1.5 mb-3">
              <UtensilsCrossed size={14} className="text-orange-400" />おすすめ食事プラン
            </h3>
            <div className="space-y-1.5">
              {getMealSuggestions(goal.dailyCalorieTarget).map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                  <div>
                    <div className="text-xs font-semibold">{s.meal}</div>
                    <div className="text-[9px] text-white/40 mt-0.5">{s.example}</div>
                  </div>
                  <div className="text-xs font-bold text-orange-400">{s.cal}kcal</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center text-[9px] text-white/30">
              1日の目標: {goal.dailyCalorieTarget} kcal 以内
            </div>
          </div>

          {/* 運動の提案（ユーザーの運動履歴ベース） */}
          <div className="glass-card">
            <h3 className="text-xs font-semibold text-white/70 flex items-center gap-1.5 mb-3">
              <Dumbbell size={14} className="text-cyan-400" />あなたの運動メニュー
            </h3>
            <div className="space-y-1.5">
              {getExerciseSuggestionsFromHistory(exerciseHistory, goal.recommendedExerciseMin).map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                  <div>
                    <div className="text-xs font-semibold">{s.name}</div>
                    <div className="text-[9px] text-white/40">平均{s.duration}分</div>
                  </div>
                  <div className="text-xs font-bold text-cyan-400">約{s.avgCal}kcal</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center text-[9px] text-white/30">
              {exerciseHistory.length > 0 ? '過去の記録から提案しています' : 'まず運動を記録してメニューを作りましょう'}
            </div>
          </div>

          {/* モチベーション */}
          {calorieStatus === 'good' && exerciseStatus === 'good' && (
            <div className="glass-card text-center py-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/20">
              <Award size={28} className="text-yellow-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-white">今日は完璧です！🎉</div>
              <div className="text-[10px] text-white/50 mt-1">
                食事も運動も目標達成。この習慣を続ければ目標体重に到達できます！
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
