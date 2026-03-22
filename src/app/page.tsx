'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flame, TrendingDown, Calendar, Settings, Scale, Plus, Camera, Trash2, X, Target, ArrowRight, Footprints, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import Image from 'next/image';
import { ActivityRing, RingLegend } from '@/components/ActivityRing';
import {
  getUserSettingsDB,
  getMealRecordsByDateDB,
  getExerciseRecordsByDateDB,
  getWeightRecordsDB,
  saveWeightRecordDB,
  getActiveGoalDB,
  generateId,
  getTodayString,
} from '@/lib/database';
import { uploadPhoto } from '@/lib/storage-upload';
import type { UserSettings, GoalPlan } from '@/lib/types';

export default function DashboardPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [goal, setGoal] = useState<GoalPlan | null>(null);
  const [todayCalIn, setTodayCalIn] = useState(0);
  const [todayCalOut, setTodayCalOut] = useState(0);
  const [todayExMin, setTodayExMin] = useState(0);
  const [mealCount, setMealCount] = useState(0);
  const [weightData, setWeightData] = useState<{ date: string; weight: number }[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newPhoto, setNewPhoto] = useState<string | undefined>();
  const [todaySteps, setTodaySteps] = useState(0);
  const [showStepInput, setShowStepInput] = useState(false);
  const [stepInput, setStepInput] = useState('');
  const [uploadingWeight, setUploadingWeight] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveWeight = async () => {
    const w = parseFloat(newWeight);
    if (!w) return;
    setUploadingWeight(true);

    let photoUrl: string | undefined;
    if (newPhoto) {
      const url = await uploadPhoto(newPhoto, 'weight');
      photoUrl = url || undefined;
    }

    const record = {
      id: generateId(),
      date: getTodayString(),
      weight: w,
      photo: photoUrl,
      createdAt: new Date().toISOString(),
    };
    await saveWeightRecordDB(record);
    await loadData();
    setUploadingWeight(false);
    setShowWeightModal(false);
    setNewWeight('');
    setNewPhoto(undefined);
  };

  const handleSaveSteps = () => {
    const steps = parseInt(stepInput);
    if (!steps) return;
    setTodaySteps(steps);
    // ローカルストレージに保存
    const today = getTodayString();
    localStorage.setItem(`steps-${today}`, steps.toString());
    setShowStepInput(false);
    setStepInput('');
  };

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

      // 最新体重
      if (weights.length > 0) {
        setLatestWeight(weights[weights.length - 1].weight);
      }

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

      // 歩数データをローカルストレージから取得
      const savedSteps = localStorage.getItem(`steps-${today}`);
      if (savedSteps) setTodaySteps(parseInt(savedSteps));
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!mounted) return null;

  const calorieTarget = goal?.dailyCalorieTarget || settings?.targetCalories || 2000;
  const exerciseTarget = goal?.recommendedExerciseMin || 30;
  const netCalories = todayCalIn - todayCalOut;
  const weightChange = weightData.length >= 2 ? 
    Math.round((weightData[weightData.length - 1].weight - weightData[0].weight) * 10) / 10 : 0;

  // 目標関連
  const daysLeft = goal ? Math.max(Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)), 0) : 0;
  const weightToGo = goal && latestWeight ? Math.round((latestWeight - goal.targetWeight) * 10) / 10 : 0;
  const calorieStatus = netCalories <= calorieTarget ? 'good' : netCalories <= calorieTarget * 1.1 ? 'warning' : 'over';
  const exerciseStatus = goal && todayExMin >= goal.recommendedExerciseMin ? 'good' : todayExMin > 0 ? 'partial' : 'none';

  // 歩数からの推定カロリー
  const stepCalories = settings ? Math.round(todaySteps * 0.04 * settings.weight / 60) : Math.round(todaySteps * 0.04);

  return (
    <div className="space-y-4 fade-in">
      {/* ヘッダー */}
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold gradient-text">ヘルスケア・トラッカー</h1>
          <p className="text-white/40 text-xs mt-0.5">
            {streak > 0 && <span className="text-orange-400">🔥 {streak}日連続記録中</span>}
          </p>
        </div>
        <a href="/settings" className="p-2 rounded-xl hover:bg-white/10 text-white/40 transition-all active:scale-95" title="設定">
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

      {/* ── 目標プログレス（ホームに統合） ── */}
      {goal && settings && (
        <a href="/goal" className="glass-card block bg-linear-to-r from-emerald-500/5 to-cyan-500/5 border-emerald-500/15 hover:border-emerald-500/25 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-emerald-400" />
            <h3 className="text-xs font-semibold text-white/70">目標プラン</h3>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-white/40">
              詳細 <ArrowRight size={10} />
            </div>
          </div>

          {/* 3列メトリクス */}
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="bg-white/5 rounded-xl p-2.5">
              <div className="text-[9px] text-white/40">目標体重</div>
              <div className="text-base font-bold text-emerald-400">{goal.targetWeight}<span className="text-[8px]">kg</span></div>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5">
              <div className="text-[9px] text-white/40">残り</div>
              <div className="text-base font-bold text-cyan-400">{daysLeft}<span className="text-[8px]">日</span></div>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5">
              <div className="text-[9px] text-white/40">あと</div>
              <div className="text-base font-bold text-blue-400">{weightToGo}<span className="text-[8px]">kg</span></div>
            </div>
          </div>

          {/* 今日のステータス */}
          <div className="flex items-center gap-2 text-[10px]">
            {calorieStatus === 'good' ? (
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={10} />カロリー順調</span>
            ) : calorieStatus === 'warning' ? (
              <span className="flex items-center gap-1 text-yellow-400"><AlertTriangle size={10} />少しオーバー</span>
            ) : (
              <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={10} />カロリー超過</span>
            )}
            <span className="text-white/20">|</span>
            {exerciseStatus === 'good' ? (
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={10} />運動目標達成</span>
            ) : exerciseStatus === 'partial' ? (
              <span className="flex items-center gap-1 text-cyan-400">あと{goal.recommendedExerciseMin - todayExMin}分</span>
            ) : (
              <span className="text-white/40">運動未記録</span>
            )}
          </div>
        </a>
      )}

      {/* 目標未設定 */}
      {!goal && settings && (
        <a href="/goal" className="glass-card block text-center py-5">
          <Target size={24} className="text-emerald-400/50 mx-auto mb-2" />
          <p className="text-sm text-white/50">目標を設定して毎日の行動を逆算</p>
          <p className="text-emerald-400 text-xs mt-1.5 font-semibold flex items-center justify-center gap-1">
            目標を設定する <ArrowRight size={12} />
          </p>
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
          <div className="glass-card p-3! text-center">
            <Flame size={14} className="text-orange-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-orange-400">{todayCalIn}</div>
            <div className="text-[8px] text-white/30">摂取kcal</div>
          </div>
          <div className="glass-card p-3! text-center">
            <TrendingDown size={14} className="text-cyan-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-cyan-400">{todayCalOut}</div>
            <div className="text-[8px] text-white/30">消費kcal</div>
          </div>
          <div className="glass-card p-3! text-center">
            <Calendar size={14} className="text-emerald-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-emerald-400">{netCalories}</div>
            <div className="text-[8px] text-white/30">ネットkcal</div>
          </div>
        </div>
      )}

      {/* 今日の歩数カード */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-white/70 flex items-center gap-2">
            <Footprints size={14} className="text-violet-400" />
            今日の歩数
          </h3>
          <button
            onClick={() => setShowStepInput(!showStepInput)}
            className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400 active:scale-95 transition-all">
            {showStepInput ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>

        {showStepInput && (
          <div className="flex gap-2 mb-3 slide-up">
            <input
              type="number"
              value={stepInput}
              onChange={e => setStepInput(e.target.value)}
              placeholder="8000"
              className="input-field flex-1 py-2! text-sm"
              id="input-steps"
            />
            <button
              onClick={handleSaveSteps}
              disabled={!stepInput}
              className="px-4 py-2 rounded-xl bg-linear-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold disabled:opacity-30 active:scale-95 transition-all"
            >
              記録
            </button>
          </div>
        )}

        <div className="flex items-end gap-4">
          <div>
            <div className="text-2xl font-bold text-violet-400">{todaySteps.toLocaleString()}</div>
            <div className="text-[9px] text-white/40">歩</div>
          </div>
          <div className="flex-1">
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-violet-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min((todaySteps / 8000) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] text-white/30 mt-1">
              <span>0</span>
              <span>目標 8,000歩</span>
            </div>
          </div>
          {stepCalories > 0 && (
            <div className="text-right">
              <div className="text-sm font-bold text-violet-300">{stepCalories}</div>
              <div className="text-[8px] text-white/30">kcal</div>
            </div>
          )}
        </div>
      </div>

      {/* 体重トレンド */}
      <div className="glass-card overflow-hidden relative">
        <div className="flex items-center justify-between mb-3 px-1">
          <a href="/weight" className="flex-1">
            <h3 className="text-xs font-semibold text-white/70 flex items-center gap-2">
              <Scale size={14} className="text-emerald-400" />
              体重推移
            </h3>
          </a>
          <div className="flex items-center gap-3">
            {weightData.length >= 2 && (
              <a href="/weight">
                <span className={`text-xs font-bold ${weightChange < 0 ? 'text-emerald-400' : weightChange > 0 ? 'text-red-400' : 'text-white/40'}`}>
                  {weightChange > 0 ? '+' : ''}{weightChange}kg
                </span>
              </a>
            )}
            <button 
              onClick={() => setShowWeightModal(true)}
              className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 active:scale-95 transition-all">
              <Plus size={14} />
            </button>
          </div>
        </div>
        
        {weightData.length > 0 ? (
          <a href="/weight" className="block px-1">
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
                    <div className={`w-full rounded-t-md transition-all duration-500 ${isLatest ? 'bg-linear-to-t from-emerald-500 to-cyan-500' : 'bg-white/10'}`}
                      style={{ height: `${height}px` }} />
                    <div className="text-[7px] text-white/25">{d.date}</div>
                  </div>
                );
              })}
            </div>
          </a>
        ) : (
          <div className="h-20 flex items-center justify-center text-white/30 text-xs">
            まだ記録がありません
          </div>
        )}
      </div>

      {/* Quick Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-8 fade-in">
          <div className="bg-[#0f1527] border border-white/10 w-full max-w-sm rounded-3xl p-5 slide-up relative">
            <button onClick={() => setShowWeightModal(false)} className="absolute top-4 right-4 p-2 rounded-full active:bg-white/10 text-white/50">
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Scale size={20} className="text-emerald-400" />
              今日の体重を記録
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">体重 (kg)</label>
                <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="65.0" className="input-field text-lg" />
              </div>

              <div>
                <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={handlePhotoUpload} className="hidden" />
                {newPhoto ? (
                  <div className="relative rounded-xl overflow-hidden w-full h-32">
                    <Image src={newPhoto} alt="体重計" fill className="object-cover" />
                    <button onClick={() => setNewPhoto(undefined)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center z-10">
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full py-4 border-2 border-dashed border-white/15 rounded-xl flex items-center justify-center gap-2 text-white/40 active:bg-white/5 transition-all">
                    <Camera size={18} />
                    <span className="text-sm">写真を追加（任意）</span>
                  </button>
                )}
              </div>

              <button onClick={handleSaveWeight} disabled={!newWeight || uploadingWeight} className="w-full btn-primary disabled:opacity-30 mt-2">
                {uploadingWeight ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />保存中...</span>
                ) : '記録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
