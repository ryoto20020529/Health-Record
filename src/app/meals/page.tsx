'use client';

import { useState, useEffect, useRef } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Camera,
  Trash2,
  Sparkles,
  Loader2,
  Edit3,
} from 'lucide-react';
import {
  getMealRecordsByDate,
  saveMealRecord,
  deleteMealRecord,
  getUserSettings,
  generateId,
  getTodayString,
} from '@/lib/storage';
import { MEAL_TYPE_LABELS } from '@/lib/constants';
import type { MealRecord, UserSettings } from '@/lib/types';

export default function MealsPage() {
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [mealType, setMealType] = useState<MealRecord['mealType']>('lunch');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [analyzing, setAnalyzing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const today = getTodayString();
    setSelectedDate(today);
    setSettings(getUserSettings());
    setRecords(getMealRecordsByDate(today));
  }, []);

  const loadRecords = (date: string) => {
    setSelectedDate(date);
    setRecords(getMealRecordsByDate(date));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!photo) return;
    setAnalyzing(true);

    // AI API呼び出し（フォールバック: デモ値）
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photo }),
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name || '食事');
        setCalories(data.calories?.toString() || '');
        setProtein(data.protein?.toString() || '');
        setFat(data.fat?.toString() || '');
        setCarbs(data.carbs?.toString() || '');
      } else {
        // デモ値
        setName('AI解析結果（デモ）');
        setCalories('450');
        setProtein('25');
        setFat('15');
        setCarbs('50');
      }
    } catch {
      // デモ値
      setName('AI解析結果（デモ）');
      setCalories('450');
      setProtein('25');
      setFat('15');
      setCarbs('50');
    }
    setAnalyzing(false);
  };

  const handleSave = () => {
    const cal = parseFloat(calories);
    if (!name || !cal) return;

    const record: MealRecord = {
      id: generateId(),
      date: selectedDate,
      mealType,
      name,
      calories: cal,
      protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0,
      carbs: parseFloat(carbs) || 0,
      photo,
      createdAt: new Date().toISOString(),
    };
    saveMealRecord(record);
    setRecords(getMealRecordsByDate(selectedDate));
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteMealRecord(id);
    setRecords(getMealRecordsByDate(selectedDate));
  };

  const resetForm = () => {
    setShowForm(false);
    setName('');
    setCalories('');
    setProtein('');
    setFat('');
    setCarbs('');
    setPhoto(undefined);
  };

  if (!mounted) return null;

  const totalCal = records.reduce((s, r) => s + r.calories, 0);
  const totalP = records.reduce((s, r) => s + r.protein, 0);
  const totalF = records.reduce((s, r) => s + r.fat, 0);
  const totalC = records.reduce((s, r) => s + r.carbs, 0);
  const remaining = settings ? Math.max(settings.targetCalories - totalCal, 0) : 0;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <UtensilsCrossed size={24} />
            食事記録
          </h1>
          <p className="text-white/40 text-sm mt-1">AI解析で簡単カロリー計算</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center transition-transform hover:scale-105"
          id="btn-add-meal"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {/* 日付選択 */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => loadRecords(e.target.value)}
          className="input-field !w-auto"
          id="input-meal-date"
        />
        {settings && (
          <div className="flex-1 text-right">
            <div className="text-xs text-white/40">残りカロリー</div>
            <div className={`text-lg font-bold ${remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {remaining} kcal
            </div>
          </div>
        )}
      </div>

      {/* 本日のサマリー */}
      <div className="glass-card">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-[10px] text-white/40">カロリー</div>
            <div className="text-sm font-bold text-white">{totalCal}</div>
            <div className="text-[8px] text-white/30">kcal</div>
          </div>
          <div>
            <div className="text-[10px] text-white/40">P</div>
            <div className="text-sm font-bold text-emerald-400">{totalP}g</div>
          </div>
          <div>
            <div className="text-[10px] text-white/40">F</div>
            <div className="text-sm font-bold text-cyan-400">{totalF}g</div>
          </div>
          <div>
            <div className="text-[10px] text-white/40">C</div>
            <div className="text-sm font-bold text-blue-400">{totalC}g</div>
          </div>
        </div>
        {settings && (
          <div className="mt-3 w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${Math.min((totalCal / settings.targetCalories) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 入力フォーム */}
      {showForm && (
        <div className="glass-card slide-up space-y-4">
          {/* 写真アップロード & AI解析 */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">食事の写真</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileRef}
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {photo ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden">
                  <img src={photo} alt="食事" className="w-full h-48 object-cover" />
                  <button
                    onClick={() => setPhoto(undefined)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <Trash2 size={14} className="text-white" />
                  </button>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  id="btn-analyze-meal"
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      AI解析中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      AIで解析する
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-white/15 rounded-xl flex flex-col items-center gap-2 text-white/30 hover:text-white/50 hover:border-white/25 transition-all"
                id="btn-upload-meal-photo"
              >
                <Camera size={28} />
                <span className="text-xs">タップして食事の写真を撮影 / 選択</span>
              </button>
            )}
          </div>

          {/* 食事タイプ */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">食事タイプ</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(MEAL_TYPE_LABELS) as [MealRecord['mealType'], string][]).map(
                ([type, label]) => (
                  <button
                    key={type}
                    onClick={() => setMealType(type)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      mealType === type
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-white/40 border border-white/8'
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 手動入力 */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1">
              <Edit3 size={12} />
              メニュー名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: チキンサラダ"
              className="input-field"
              id="input-meal-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">カロリー (kcal)</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="450"
                className="input-field"
                id="input-meal-cal"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">タンパク質 (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="25"
                className="input-field"
                id="input-meal-protein"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">脂質 (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="15"
                className="input-field"
                id="input-meal-fat"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">炭水化物 (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="50"
                className="input-field"
                id="input-meal-carbs"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!name || !calories}
            className="w-full btn-primary disabled:opacity-30 disabled:cursor-not-allowed"
            id="btn-save-meal"
          >
            記録する
          </button>
        </div>
      )}

      {/* 記録リスト */}
      <div className="space-y-2">
        {records.length === 0 ? (
          <p className="text-center text-white/20 text-sm py-8">この日の食事記録はまだありません</p>
        ) : (
          records.map((r) => (
            <div key={r.id} className="glass-card flex items-center justify-between !p-3">
              <div className="flex items-center gap-3">
                {r.photo ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={r.photo} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed size={16} className="text-white/20" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {r.name}
                    <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                      {MEAL_TYPE_LABELS[r.mealType]}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/40 flex gap-2 mt-0.5">
                    <span>{r.calories}kcal</span>
                    <span>P:{r.protein}g</span>
                    <span>F:{r.fat}g</span>
                    <span>C:{r.carbs}g</span>
                  </div>
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
