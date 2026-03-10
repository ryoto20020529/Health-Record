'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flame, TrendingDown, Calendar, Settings } from 'lucide-react';
import { ActivityRing, RingLegend } from '@/components/ActivityRing';
import {
  getUserSettingsDB,
  getMealRecordsByDateDB,
  getExerciseRecordsByDateDB,
  getWeightRecordsDB,
  getActiveGoalDB,
  getTodayString,
} from '@/lib/database';
import type { UserSettings, GoalPlan } from '@/lib/types';

export default function DashboardPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [goal, setGoal] = useState<GoalPlan | null>(null);
  const [todayCalIn, setTodayCalIn] = useState(0);
  const [todayCalOut, setTodayCalOut] = useState(0);
  const [todayExMin, setTodayExMin] = useState(0);
  const [mealCount, setMealCount] = useState(0);
  const [weightData, setWeightData] = useState<{ date: string; weight: number }[]>([]);
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, g] = await Promise.all([getUserSettingsDB(), getActiveGoalDB()]);
      setSettings(s);
      setGoal(g);

      const today = getTodayString();
      const [meals, exercises, weights] = await Promise.all([
        getMealRecordsByDateDB(today),
        getExerciseRecordsByDateDB(today),
        getWeightRecordsDB(),
      ]);

      setTodayCalIn(meals.reduce((sum, m) => sum + m.calories, 0));
      setTodayCalOut(exercises.reduce((sum, e) => sum + e.caloriesBurned, 0));
      setTodayExMin(exercises.reduce((sum, e) => sum + e.duration, 0));
      setMealCount(meals.length);

      // 直近7日の体重
      const last7 = weights.slice(-7).map(w => ({ date: w.date.slice(5), weight: w.weight }));
      setWeightData(last7);

      // ストリーク計算（連続記録日数）
      let s2 = 0;
      const dateSet = new Set(weights.map(w => w.date));
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const ds = d.toISOString().split('T')[0];
        if (dateSet.has(ds)) { s2++; d.setDate(d.getDate() - 1); }
        else break;
      }
      setStreak(s2);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  if (!mounted) return null;

  const calorieTarget = goal?.dailyCalorieTarget || settings?.targetCalories || 2000;
  const exerciseTarget = goal?.recommendedExerciseMin || 30;
  const netCalories = todayCalIn - todayCalOut;
  const weightChange = weightData.length >= 2 ? 
    Math.round((weightData[weightData.length - 1].weight - weightData[0].weight) * 10) / 10 : 0;

  return (
    <div className="space-y-5 fade-in">
      {/* ヘッダー */}
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold gradient-text">ヘルスケア・トラッカー</h1>
          <p className="text-white/40 text-xs mt-0.5">
            {streak > 0 && <span className="text-orange-400">🔥 {streak}日連続記録中</span>}
          </p>
        </div>
        <a href="/settings" className="p-2 rounded-xl hover:bg-white/10 text-white/40 transition-all active:scale-95">
          <Settings size={18} />
        </a>
      </div>

      {/* 設定未完了 */}
      {!settings && (
        <a href="/settings" className="glass-card text-center py-6 block">
          <p className="text-sm text-white/60">まず基本情報を設定してください</p>
          <p className="text-emerald-400 text-xs mt-1 font-semibold">設定へ →</p>
        </a>
      )}

      {/* アクティビティリング */}
      {settings && (
        <div className="glass-card flex flex-col items-center py-6">
          <ActivityRing
            calories={{ current: netCalories, target: calorieTarget }}
            exercise={{ current: todayExMin, target: exerciseTarget }}
            meals={{ count: mealCount, target: 3 }}
            size={180}
          />
          <div className="w-full mt-4 px-2">
            <RingLegend
              calories={{ current: netCalories, target: calorieTarget }}
              exercise={{ current: todayExMin, target: exerciseTarget }}
              meals={{ count: mealCount, target: 3 }}
            />
          </div>
        </div>
      )}

      {/* 今日の数値 */}
      {settings && (
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-card !p-3 text-center">
            <Flame size={14} className="text-orange-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-orange-400">{todayCalIn}</div>
            <div className="text-[8px] text-white/30">摂取kcal</div>
          </div>
          <div className="glass-card !p-3 text-center">
            <TrendingDown size={14} className="text-cyan-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-cyan-400">{todayCalOut}</div>
            <div className="text-[8px] text-white/30">消費kcal</div>
          </div>
          <div className="glass-card !p-3 text-center">
            <Calendar size={14} className="text-emerald-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-emerald-400">{netCalories}</div>
            <div className="text-[8px] text-white/30">ネットkcal</div>
          </div>
        </div>
      )}

      {/* 体重トレンド */}
      {weightData.length > 0 && (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-white/70">体重推移</h3>
            <span className={`text-xs font-bold ${weightChange < 0 ? 'text-emerald-400' : weightChange > 0 ? 'text-red-400' : 'text-white/40'}`}>
              {weightChange > 0 ? '+' : ''}{weightChange}kg
            </span>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {weightData.map((d, i) => {
              const min = Math.min(...weightData.map(w => w.weight));
              const max = Math.max(...weightData.map(w => w.weight));
              const range = max - min || 1;
              const height = ((d.weight - min) / range) * 60 + 12;
              const isLatest = i === weightData.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[8px] text-white/30">{isLatest ? d.weight : ''}</div>
                  <div className={`w-full rounded-t-md transition-all duration-500 ${isLatest ? 'bg-gradient-to-t from-emerald-500 to-cyan-500' : 'bg-white/10'}`}
                    style={{ height: `${height}px` }} />
                  <div className="text-[7px] text-white/25">{d.date}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 目標情報 */}
      {goal && (
        <a href="/goal" className="glass-card block bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border-emerald-500/15">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/60">
              🎯 目標: <span className="font-bold text-emerald-400">{goal.targetWeight}kg</span>
            </div>
            <div className="text-[10px] text-white/40">
              残り{Math.max(Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0)}日 →
            </div>
          </div>
        </a>
      )}
    </div>
  );
}
