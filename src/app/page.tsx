'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  TrendingUp,
  Flame,
  Target,
  ArrowDown,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  getUserSettingsDB,
  getMealRecordsByDateDB,
  getExerciseRecordsByDateDB,
  getWeightRecordsDB,
  getTodayString,
} from '@/lib/database';
import type { UserSettings } from '@/lib/types';

export default function DashboardPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [totalCalIn, setTotalCalIn] = useState(0);
  const [totalCalOut, setTotalCalOut] = useState(0);
  const [protein, setProtein] = useState(0);
  const [fat, setFat] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [weeklyWeights, setWeeklyWeights] = useState<{ day: string; weight: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const s = await getUserSettingsDB();
      setSettings(s);

      const today = getTodayString();
      const [meals, exercises, weights] = await Promise.all([
        getMealRecordsByDateDB(today),
        getExerciseRecordsByDateDB(today),
        getWeightRecordsDB(),
      ]);

      setTotalCalIn(meals.reduce((sum, m) => sum + m.calories, 0));
      setTotalCalOut(exercises.reduce((sum, e) => sum + e.caloriesBurned, 0));
      setProtein(meals.reduce((sum, m) => sum + m.protein, 0));
      setFat(meals.reduce((sum, m) => sum + m.fat, 0));
      setCarbs(meals.reduce((sum, m) => sum + m.carbs, 0));

      // 直近7日間の体重
      const last7: { day: string; weight: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const rec = weights.find(w => w.date === dateStr);
        if (rec) {
          last7.push({ day: `${d.getMonth() + 1}/${d.getDate()}`, weight: rec.weight });
        }
      }
      setWeeklyWeights(last7);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  if (!mounted) return null;

  if (!settings) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[70vh] text-center gap-6 px-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
          <Activity size={40} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text mb-2">
            ヘルスケア・トラッカー
          </h1>
          <p className="text-white/50 text-sm">まずは基本設定を行いましょう</p>
        </div>
        <a href="/settings" className="btn-primary gap-2 px-8">
          設定を開始する →
        </a>
      </div>
    );
  }

  const remaining = Math.max(settings.targetCalories - (totalCalIn - totalCalOut), 0);
  const caloriePercent = Math.min((totalCalIn / settings.targetCalories) * 100, 100);

  const pieData = [
    { name: '摂取済み', value: totalCalIn },
    { name: '残り', value: remaining },
  ];
  const PIE_COLORS = ['#10b981', 'rgba(255,255,255,0.06)'];

  const pfcData = [
    { name: 'P', current: protein, target: settings.targetProtein, fill: '#10b981' },
    { name: 'F', current: fat, target: settings.targetFat, fill: '#06b6d4' },
    { name: 'C', current: carbs, target: settings.targetCarbs, fill: '#3b82f6' },
  ];

  return (
    <div className="space-y-5 fade-in">
      {/* ヘッダー */}
      <div className="pt-3">
        <h1 className="text-xl font-bold gradient-text">ダッシュボード</h1>
        <p className="text-white/40 text-xs mt-1">
          {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
      </div>

      {/* カロリー進捗 */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
            <Target size={14} className="text-emerald-400" />
            カロリー進捗
          </h2>
          <span className="text-[10px] text-white/40">{Math.round(caloriePercent)}%</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="w-28 h-28 relative flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-white">{totalCalIn}</span>
              <span className="text-[9px] text-white/40">kcal</span>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50 flex items-center gap-1">
                <Flame size={12} className="text-orange-400" />
                摂取
              </span>
              <span className="font-semibold text-sm">{totalCalIn} kcal</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50 flex items-center gap-1">
                <ArrowDown size={12} className="text-cyan-400" />
                消費
              </span>
              <span className="font-semibold text-sm">{totalCalOut} kcal</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">残り</span>
              <span className="font-bold text-emerald-400">{remaining} kcal</span>
            </div>
          </div>
        </div>
      </div>

      {/* PFCバランス */}
      <div className="glass-card">
        <h2 className="text-xs font-semibold text-white/70 flex items-center gap-1.5 mb-3">
          <TrendingUp size={14} className="text-cyan-400" />
          PFCバランス
        </h2>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pfcData} barGap={8}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,21,39,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  fontSize: '0.7rem',
                }}
                formatter={(value, name) => [
                  `${value}g`,
                  name === 'current' ? '摂取量' : '目標量',
                ]}
              />
              <Bar dataKey="target" fill="rgba(255,255,255,0.06)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="current" radius={[6, 6, 0, 0]}>
                {pfcData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-around mt-2 text-[10px] text-white/50">
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />P {protein}g/{settings.targetProtein}g</span>
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500 mr-1" />F {fat}g/{settings.targetFat}g</span>
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1" />C {carbs}g/{settings.targetCarbs}g</span>
        </div>
      </div>

      {/* 体重推移（棒グラフ） */}
      <div className="glass-card">
        <h2 className="text-xs font-semibold text-white/70 flex items-center gap-1.5 mb-3">
          <TrendingUp size={14} className="text-blue-400" />
          体重推移（7日間）
        </h2>
        {weeklyWeights.length > 0 ? (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyWeights}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,21,39,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    fontSize: '0.7rem',
                  }}
                  formatter={(value) => [`${value} kg`, '体重']}
                />
                <Bar dataKey="weight" radius={[6, 6, 0, 0]} fill="url(#barGrad)">
                </Bar>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-white/25 text-xs py-6">体重データがまだありません</p>
        )}
      </div>
    </div>
  );
}
