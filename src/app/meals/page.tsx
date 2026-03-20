'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { UtensilsCrossed, Camera, Trash2, Sparkles, Loader2, Edit3, X, Plus, Search } from 'lucide-react';
import {
  getMealRecordsByDateDB,
  saveMealRecordDB,
  deleteMealRecordDB,
  getUserSettingsDB,
  generateId,
} from '@/lib/database';
import { MEAL_TYPE_LABELS, autoDetectMealType, FOOD_DATABASE } from '@/lib/constants';
import type { MealRecord, UserSettings, FoodItem } from '@/lib/types';

export default function MealsPage() {
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mealType, setMealType] = useState<MealRecord['mealType']>(autoDetectMealType());
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [analyzing, setAnalyzing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (date: string) => {
    try {
      const [meals, s] = await Promise.all([getMealRecordsByDateDB(date), getUserSettingsDB()]);
      setRecords(meals);
      setSettings(s);
    } catch (err) {
      console.error('Meals load error:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(selectedDate);
  }, [loadData, selectedDate]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    loadData(date);
  };

  // 食事名入力時にサジェスト
  const handleNameChange = (value: string) => {
    setName(value);
    if (value.length >= 1) {
      const q = value.toLowerCase();
      const results = FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(q)).slice(0, 6);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // サジェストから選択
  const selectSuggestion = (item: FoodItem) => {
    setName(item.name);
    setCalories(item.calories.toString());
    setProtein(item.protein.toString());
    setFat(item.fat.toString());
    setCarbs(item.carbs.toString());
    setShowSuggestions(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhoto(base64);
      await analyzePhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzePhoto = async (imageData: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name || '食事');
        setCalories(data.calories?.toString() || '');
        setProtein(data.protein?.toString() || '');
        setFat(data.fat?.toString() || '');
        setCarbs(data.carbs?.toString() || '');
      }
    } catch {
      setName('食事');
      setCalories('400'); setProtein('20'); setFat('15'); setCarbs('45');
    }
    setAnalyzing(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    const cal = parseFloat(calories);
    if (!name || !cal) return;
    const record: MealRecord = {
      id: generateId(), date: selectedDate, mealType, name,
      calories: cal, protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0, carbs: parseFloat(carbs) || 0,
      photo, createdAt: new Date().toISOString(),
    };
    await saveMealRecordDB(record);
    await loadData(selectedDate);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteMealRecordDB(id);
    await loadData(selectedDate);
  };

  const resetForm = () => {
    setShowForm(false); setName(''); setCalories('');
    setProtein(''); setFat(''); setCarbs(''); setPhoto(undefined);
    setSuggestions([]); setShowSuggestions(false);
  };

  if (!mounted) return null;

  const totalCal = records.reduce((s, r) => s + r.calories, 0);
  const totalP = records.reduce((s, r) => s + r.protein, 0);
  const totalF = records.reduce((s, r) => s + r.fat, 0);
  const totalC = records.reduce((s, r) => s + r.carbs, 0);
  const remaining = settings ? Math.max(settings.targetCalories - totalCal, 0) : 0;

  return (
    <div className="space-y-5 fade-in">
      <div className="pt-3">
        <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
          <UtensilsCrossed size={20} />食事記録
        </h1>
      </div>

      {/* 写真クイック入力ボタン */}
      <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={handlePhotoUpload} className="hidden" />
      <button onClick={() => fileRef.current?.click()}
        className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/25 flex items-center justify-center gap-3 text-emerald-300 font-semibold active:scale-[0.98] transition-all" id="btn-photo-quick">
        {analyzing ? (
          <><Loader2 size={22} className="animate-spin" />AI解析中...</>
        ) : (
          <><Camera size={22} /><Sparkles size={16} />📷 撮って記録</>
        )}
      </button>

      {/* 手動入力トグル */}
      {!showForm && (
        <button onClick={() => { setShowForm(true); }}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white/50 text-sm active:scale-[0.98]" id="btn-manual-input">
          <Edit3 size={14} /><Plus size={14} />自分で入力する
        </button>
      )}

      {/* 日付 & サマリー */}
      <div className="flex items-center gap-3">
        <input type="date" value={selectedDate} onChange={e => handleDateChange(e.target.value)} className="input-field !w-auto flex-shrink-0" id="input-meal-date" />
        {settings && (
          <div className="flex-1 text-right">
            <div className="text-[10px] text-white/40">残りカロリー</div>
            <div className={`text-lg font-bold ${remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{remaining} <span className="text-xs">kcal</span></div>
          </div>
        )}
      </div>

      {/* デイリーサマリー */}
      <div className="glass-card !py-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><div className="text-[9px] text-white/40">カロリー</div><div className="text-sm font-bold">{totalCal}</div></div>
          <div><div className="text-[9px] text-white/40">P</div><div className="text-sm font-bold text-emerald-400">{totalP}g</div></div>
          <div><div className="text-[9px] text-white/40">F</div><div className="text-sm font-bold text-cyan-400">{totalF}g</div></div>
          <div><div className="text-[9px] text-white/40">C</div><div className="text-sm font-bold text-blue-400">{totalC}g</div></div>
        </div>
        {settings && (
          <div className="mt-2 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${Math.min((totalCal / settings.targetCalories) * 100, 100)}%` }} />
          </div>
        )}
      </div>

      {/* 入力フォーム */}
      {showForm && (
        <div className="glass-card slide-up space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/70">{photo ? '解析結果を確認' : '食事を入力'}</h3>
            <button onClick={resetForm} className="p-1.5 rounded-lg active:bg-white/10"><X size={16} className="text-white/40" /></button>
          </div>

          {photo && (
            <div className="relative rounded-xl overflow-hidden w-full h-36">
              <Image src={photo} alt="食事" fill className="object-cover" />
            </div>
          )}

          {/* 食事タイプ */}
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.entries(MEAL_TYPE_LABELS) as [MealRecord['mealType'], string][]).map(([type, label]) => (
              <button key={type} onClick={() => setMealType(type)}
                className={`py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                  mealType === type ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-white/5 text-white/40 border border-white/8'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* メニュー名入力 + サジェスト */}
          <div className="relative">
            <label className="text-xs text-white/50 mb-1 block">メニュー名</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" value={name} onChange={e => handleNameChange(e.target.value)}
                onFocus={() => name.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="食事名を入力（例: 鶏むね肉）" className="input-field !pl-9" id="input-meal-name" />
            </div>

            {/* サジェストドロップダウン */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-[#0f1527] border border-white/15 rounded-xl overflow-hidden shadow-xl slide-up">
                {suggestions.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => selectSuggestion(item)}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/5 active:bg-white/10 transition-all border-b border-white/5 last:border-0"
                  >
                    <div className="text-sm text-white/90">{item.name}</div>
                    <div className="text-[9px] text-white/40 flex gap-2 mt-0.5">
                      <span className="text-orange-400">{item.calories}kcal</span>
                      <span>P:{item.protein}g</span>
                      <span>F:{item.fat}g</span>
                      <span>C:{item.carbs}g</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PFC入力をコンパクトに */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/40 mb-0.5 block">カロリー (kcal)</label>
              <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="450" className="input-field text-sm" id="input-meal-cal" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-0.5 block">タンパク質 (g)</label>
              <input type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="25" className="input-field text-sm" id="input-meal-protein" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-0.5 block">脂質 (g)</label>
              <input type="number" value={fat} onChange={e => setFat(e.target.value)} placeholder="15" className="input-field text-sm" id="input-meal-fat" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-0.5 block">炭水化物 (g)</label>
              <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="50" className="input-field text-sm" id="input-meal-carbs" />
            </div>
          </div>

          <button onClick={handleSave} disabled={!name || !calories} className="w-full btn-primary disabled:opacity-30" id="btn-save-meal">
            記録する
          </button>
        </div>
      )}

      {/* 記録リスト */}
      <div className="space-y-1.5">
        {records.length === 0 ? (
          <p className="text-center text-white/20 text-xs py-6">食事記録はまだありません</p>
        ) : records.map(r => (
          <div key={r.id} className="glass-card flex items-center justify-between !py-2.5 !px-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {r.photo ? (
                <div className="w-9 h-9 relative rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={r.photo} alt="" fill className="object-cover" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><UtensilsCrossed size={14} className="text-white/20" /></div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                  {r.name}
                  <span className="text-[8px] text-white/30 bg-white/5 px-1 py-0.5 rounded flex-shrink-0">{MEAL_TYPE_LABELS[r.mealType]}</span>
                </div>
                <div className="text-[9px] text-white/40 flex gap-1.5 mt-0.5">
                  <span>{r.calories}kcal</span><span>P:{r.protein}g</span><span>F:{r.fat}g</span><span>C:{r.carbs}g</span>
                </div>
              </div>
            </div>
            <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg active:bg-red-500/20 text-white/25 active:text-red-400 transition-all flex-shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
