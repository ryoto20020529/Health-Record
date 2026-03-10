'use client';

import { useState, useEffect, useRef } from 'react';
import { Scale, Plus, Camera, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getWeightRecords,
  saveWeightRecord,
  deleteWeightRecord,
  generateId,
} from '@/lib/storage';
import type { WeightRecord } from '@/lib/types';

export default function WeightPage() {
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setRecords(getWeightRecords());
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleSave = () => {
    const w = parseFloat(weight);
    if (!w || !date) return;

    const record: WeightRecord = {
      id: generateId(),
      date,
      weight: w,
      photo,
      createdAt: new Date().toISOString(),
    };
    saveWeightRecord(record);
    setRecords(getWeightRecords());
    setWeight('');
    setPhoto(undefined);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deleteWeightRecord(id);
    setRecords(getWeightRecords());
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

  // カレンダー用データ
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const monthRecords = records.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // グラフ用データ（直近30日）
  const chartData = records
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((r) => ({
      day: `${new Date(r.date).getMonth() + 1}/${new Date(r.date).getDate()}`,
      weight: r.weight,
    }));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Scale size={24} />
            体重記録
          </h1>
          <p className="text-white/40 text-sm mt-1">毎日の体重を写真付きで記録</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center transition-transform hover:scale-105"
          id="btn-add-weight"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {/* 入力フォーム */}
      {showForm && (
        <div className="glass-card slide-up space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                id="input-weight-date"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">体重 (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="65.0"
                className="input-field"
                id="input-weight-value"
              />
            </div>
          </div>

          {/* 写真アップロード */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">体重計の写真（任意）</label>
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {photo ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photo} alt="体重計" className="w-full h-40 object-cover" />
                <button
                  onClick={() => setPhoto(undefined)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <Trash2 size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-white/15 rounded-xl flex flex-col items-center gap-2 text-white/30 hover:text-white/50 hover:border-white/25 transition-all"
                id="btn-upload-photo"
              >
                <Camera size={24} />
                <span className="text-xs">タップして写真を追加</span>
              </button>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={!weight}
            className="w-full btn-primary disabled:opacity-30 disabled:cursor-not-allowed"
            id="btn-save-weight"
          >
            記録する
          </button>
        </div>
      )}

      {/* カレンダー */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronLeft size={18} className="text-white/50" />
          </button>
          <h3 className="text-sm font-semibold text-white/70">
            {year}年{month + 1}月
          </h3>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronRight size={18} className="text-white/50" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-white/30 mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = monthRecords.find((r) => r.date === dateStr);
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all ${
                  record
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-white/30 hover:bg-white/5'
                }`}
              >
                <span className="text-[10px]">{day}</span>
                {record && (
                  <span className="text-[8px] font-bold mt-0.5">{record.weight}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 体重推移グラフ */}
      {chartData.length > 1 && (
        <div className="glass-card">
          <h3 className="text-sm font-semibold text-white/70 mb-4">体重推移</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
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
                  stroke="url(#wGrad)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981', stroke: '#0a0f1e', strokeWidth: 2 }}
                />
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 記録リスト */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white/50">記録一覧</h3>
        {records.length === 0 ? (
          <p className="text-center text-white/20 text-sm py-8">まだ記録がありません</p>
        ) : (
          records
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((r) => (
              <div
                key={r.id}
                className="glass-card flex items-center justify-between !p-3"
              >
                <div className="flex items-center gap-3">
                  {r.photo ? (
                    <button
                      onClick={() => setViewingPhoto(r.photo!)}
                      className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                    >
                      <img src={r.photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={16} className="text-white/20" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold">{r.weight} kg</div>
                    <div className="text-[10px] text-white/40">{r.date}</div>
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

      {/* 写真プレビュー */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <img src={viewingPhoto} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
