'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  Flame,
  Target,
  ArrowDown,
  ArrowUp,
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
  LineChart,
  Line,
} from 'recharts';
import { getUserSettings, getMealRecordsByDate, getExerciseRecordsByDate, getWeightRecords, getTodayString } from '@/lib/storage';
import type { UserSettings, DailySummary } from '@/lib/types';

export default function DashboardPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [weeklyWeights, setWeeklyWeights] = useState<{ day: string; weight: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = getUserSettings();
    setSettings(s);

    const today = getTodayString();
    const meals = getMealRecordsByDate(today);
    const exercises = getExerciseRecordsByDate(today);
    const weights = getWeightRecords();

    const totalCaloriesIn = meals.reduce((sum, m) => sum + m.calories, 0);
    const totalCaloriesOut = exercises.reduce((sum, e) => sum + e.caloriesBurned, 0);
    const protein = meals.reduce((sum, m) => sum + m.protein, 0);
    const fat = meals.reduce((sum, m) => sum + m.fat, 0);
    const carbs = meals.reduce((sum, m) => sum + m.carbs, 0);
    const todayWeight = weights.find(w => w.date === today);

    setSummary({
      date: today,
      targetCalories: s?.targetCalories || 2000,
      totalCaloriesIn,
      totalCaloriesOut,
      netCalories: totalCaloriesIn - totalCaloriesOut,
      protein,
      fat,
      carbs,
      weight: todayWeight?.weight,
    });

    // 直近7日間の体重推移
    const last7Days: { day: string; weight: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const record = weights.find(w => w.date === dateStr);
      if (record) {
        const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
        last7Days.push({ day: dayLabel, weight: record.weight });
      }
    }
    setWeeklyWeights(last7Days);
  }, []);

  if (!mounted) return null;

  if (!settings) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
          <Activity size={40} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text mb-2">
            ヘルスケア・ビジュアル・トラッカー
          </h1>
          <p className="text-white/50 text-sm">
            まずは基本設定を行いましょう
          </p>
        </div>
        <a href="/settings" className="btn-primary inline-flex items-center gap-2">
          設定を開始する
          <ArrowUp size={16} className="rotate-90" />
        </a>
      </div>
    );
  }

  const caloriePercent = summary
    ? Math.min((summary.totalCaloriesIn / summary.targetCalories) * 100, 100)
    : 0;
  const remaining = summary
    ? Math.max(summary.targetCalories - summary.netCalories, 0)
    : 0;

  const pieData = [
    { name: '摂取済み', value: summary?.totalCaloriesIn || 0 },
    { name: '残り', value: remaining },
  ];
  const PIE_COLORS = ['#10b981', 'rgba(255,255,255,0.08)'];

  const pfcData = [
    { name: 'P', current: summary?.protein || 0, target: settings.targetProtein, fill: '#10b981' },
    { name: 'F', current: summary?.fat || 0, target: settings.targetFat, fill: '#06b6d4' },
    { name: 'C', current: summary?.carbs || 0, target: settings.targetCarbs, fill: '#3b82f6' },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* ヘッダー */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold gradient-text">ダッシュボード</h1>
        <p className="text-white/40 text-sm mt-1">
          {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
      </div>

      {/* カロリー進捗 */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <Target size={16} className="text-emerald-400" />
            カロリー進捗
          </h2>
          <span className="text-xs text-white/40">{Math.round(caloriePercent)}%</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={55}
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
              <span className="text-lg font-bold text-white">
                {summary?.totalCaloriesIn || 0}
              </span>
              <span className="text-[10px] text-white/40">kcal</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50 flex items-center gap-1.5">
                <Flame size={14} className="text-orange-400" />
                摂取
              </span>
              <span className="font-semibold">{summary?.totalCaloriesIn || 0} kcal</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50 flex items-center gap-1.5">
                <ArrowDown size={14} className="text-cyan-400" />
                消費
              </span>
              <span className="font-semibold">{summary?.totalCaloriesOut || 0} kcal</span>
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
        <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-cyan-400" />
          PFCバランス
        </h2>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pfcData} barGap={8}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,21,39,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value, name) => [
                  `${value}g`,
                  name === 'current' ? '摂取量' : '目標量',
                ]}
              />
              <Bar dataKey="target" fill="rgba(255,255,255,0.08)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="current" radius={[6, 6, 0, 0]}>
                {pfcData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-around mt-2 text-xs text-white/50">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />
            タンパク質 {summary?.protein || 0}g / {settings.targetProtein}g
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 mr-1" />
            脂質 {summary?.fat || 0}g / {settings.targetFat}g
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />
            炭水化物 {summary?.carbs || 0}g / {settings.targetCarbs}g
          </span>
        </div>
      </div>

      {/* 体重推移 */}
      <div className="glass-card">
        <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2 mb-4">
          <ArrowUp size={16} className="text-blue-400" />
          体重推移（直近7日間）
        </h2>
        {weeklyWeights.length > 0 ? (
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyWeights}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  hide
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,21,39,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value) => [`${value} kg`, '体重']}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="url(#weightGradient)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3b82f6', stroke: '#0a0f1e', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-white/30 text-sm py-8">
            体重データがまだありません
          </p>
        )}
      </div>
    </div>
  );
}
