'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Scale, Plus, Camera, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getWeightRecordsDB,
  saveWeightRecordDB,
  deleteWeightRecordDB,
  generateId,
} from '@/lib/database';
import type { WeightRecord } from '@/lib/types';

export default function WeightPage() {
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [photo, setPhoto] = useState<string | undefined>();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadRecords = useCallback(async () => {
    try {
      setRecords(await getWeightRecordsDB());
    } catch (err) {
      console.error('Weight load error:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecords();
  }, [loadRecords]);

  const handleSave = async () => {
    const w = parseFloat(weight);
    if (!w || !date) return;
    const record: WeightRecord = {
      id: generateId(), date, weight: w, photo, createdAt: new Date().toISOString(),
    };
    await saveWeightRecordDB(record);
    await loadRecords();
    setWeight(''); setPhoto(undefined); setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteWeightRecordDB(id);
    await loadRecords();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const changeMonth = (delta: number) => {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() + delta);
    setSelectedMonth(d);
  };

  if (!mounted) return null;

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const monthRecords = records.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const chartData = records.slice(-14).map(r => ({
    day: `${new Date(r.date).getMonth() + 1}/${new Date(r.date).getDate()}`,
    weight: r.weight,
  }));

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2"><Scale size={20} />体重記録</h1>
          <p className="text-white/40 text-xs mt-1">毎日の体重を写真付きで記録</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="w-11 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center active:scale-95" id="btn-add-weight">
          {showForm ? <X size={20} className="text-white" /> : <Plus size={20} className="text-white" />}
        </button>
      </div>

      {/* 入力フォーム */}
      {showForm && (
        <div className="glass-card slide-up space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">日付</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" id="input-weight-date" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">体重 (kg)</label>
              <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="65.0" className="input-field" id="input-weight-value" />
            </div>
          </div>
          <div>
            <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={handlePhotoUpload} className="hidden" />
            {photo ? (
              <div className="relative rounded-xl overflow-hidden w-full h-36">
                <Image src={photo} alt="体重計" fill className="object-cover" />
                <button onClick={() => setPhoto(undefined)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center z-10">
                  <Trash2 size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-white/15 rounded-xl flex flex-col items-center gap-1.5 text-white/30 active:bg-white/5 transition-all" id="btn-upload-photo">
                <Camera size={22} />
                <span className="text-xs">写真を追加</span>
              </button>
            )}
          </div>
          <button onClick={handleSave} disabled={!weight} className="w-full btn-primary disabled:opacity-30" id="btn-save-weight">記録する</button>
        </div>
      )}

      {/* カレンダー */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg active:bg-white/10"><ChevronLeft size={16} className="text-white/50" /></button>
          <h3 className="text-sm font-semibold text-white/70">{year}年{month + 1}月</h3>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg active:bg-white/10"><ChevronRight size={16} className="text-white/50" /></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-white/30 mb-1">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = monthRecords.find(r => r.date === dateStr);
            return (
              <div key={i} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] ${
                record ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/25' : 'text-white/25'}`}>
                <span>{day}</span>
                {record && <span className="text-[7px] font-bold mt-0.5">{record.weight}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 棒グラフ */}
      {chartData.length > 1 && (
        <div className="glass-card">
          <h3 className="text-xs font-semibold text-white/70 mb-3">体重推移</h3>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                <Tooltip contentStyle={{ background: 'rgba(15,21,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', fontSize: '0.7rem' }}
                  formatter={(value) => [`${value} kg`, '体重']} />
                <Bar dataKey="weight" radius={[4, 4, 0, 0]} fill="url(#wBarGrad)" />
                <defs>
                  <linearGradient id="wBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 記録一覧 */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-white/50">記録一覧</h3>
        {records.length === 0 ? (
          <p className="text-center text-white/20 text-xs py-6">まだ記録がありません</p>
        ) : (
          [...records].reverse().slice(0, 20).map(r => (
            <div key={r.id} className="glass-card flex items-center justify-between !py-2.5 !px-3">
              <div className="flex items-center gap-2.5">
                {r.photo ? (
                  <button onClick={() => setViewingPhoto(r.photo!)} className="w-9 h-9 relative rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={r.photo} alt="" fill className="object-cover" />
                  </button>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Scale size={14} className="text-white/20" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold">{r.weight} kg</div>
                  <div className="text-[10px] text-white/40">{r.date}</div>
                </div>
              </div>
              <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg active:bg-red-500/20 text-white/25 active:text-red-400 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 写真プレビュー */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
          <div className="relative w-full max-w-lg aspect-square">
            <Image src={viewingPhoto} alt="" fill className="object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
