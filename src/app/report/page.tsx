'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Trophy, Target, Zap, TrendingDown, TrendingUp, Minus, Loader2, RefreshCw, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface WeeklyReport {
  overall_score: number;
  overall_comment: string;
  achievements: string[];
  nutrition: { score: number; summary: string; advice: string };
  exercise: { score: number; summary: string; advice: string };
  weight: { trend: string; comment: string };
  next_week_goals: string[];
  pro_tip: string;
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 28, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <svg viewBox="0 0 70 70" className="w-16 h-16">
      <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        transform="rotate(-90 35 35)"
        opacity={0.9}
      />
      <text x="35" y="39" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{score}</text>
    </svg>
  );
}

export default function ReportPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [meta, setMeta] = useState<{ weekStart: string; weekEnd: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) { setError('ログインが必要です'); setLoading(false); return; }

      const res = await fetch('/api/weekly-report', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError('レポートの生成に失敗しました'); setLoading(false); return; }
      const json = await res.json();
      setReport(json.report);
      setMeta(json.meta);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) fetchReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;

  const weightIcon = report?.weight.trend === '減少'
    ? <TrendingDown size={14} className="text-emerald-400" />
    : report?.weight.trend === '増加'
    ? <TrendingUp size={14} className="text-red-400" />
    : <Minus size={14} className="text-white/40" />;

  const scoreColor = (s: number) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-4 fade-in">
      <div className="pt-3 flex items-center justify-between">
        <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
          <BarChart2 size={20} />週次レポート
        </h1>
        <button onClick={fetchReport} disabled={loading}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 active:scale-95 transition-all disabled:opacity-30">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {meta && (
        <p className="text-[11px] text-white/30 text-center">
          {meta.weekStart} 〜 {meta.weekEnd}
        </p>
      )}

      {loading && !report && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 size={32} className="animate-spin text-emerald-400" />
          <p className="text-sm text-white/40">AIがあなたの1週間を分析中...</p>
        </div>
      )}

      {error && !loading && (
        <div className="glass-card text-center py-8">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetchReport} className="mt-3 text-xs text-white/40 underline">再試行</button>
        </div>
      )}

      {report && (
        <>
          {/* 総合スコア */}
          <div className="glass-card text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-cyan-500/5" />
            <div className="relative">
              <p className="text-[10px] text-white/40 mb-2">今週の総合スコア</p>
              <div className="flex justify-center mb-3">
                <ScoreRing score={report.overall_score} color={scoreColor(report.overall_score)} />
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{report.overall_comment}</p>
            </div>
          </div>

          {/* 達成事項 */}
          {report.achievements.length > 0 && (
            <div className="glass-card">
              <h3 className="text-xs font-semibold text-white/60 flex items-center gap-2 mb-3">
                <Trophy size={13} className="text-amber-400" />今週の達成事項
              </h3>
              <div className="space-y-2">
                {report.achievements.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Star size={10} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-white/70">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 栄養 & 運動スコア */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card text-center">
              <p className="text-[9px] text-white/40 mb-2">栄養スコア</p>
              <div className="flex justify-center mb-2">
                <ScoreRing score={report.nutrition.score} color={scoreColor(report.nutrition.score)} />
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed mb-2">{report.nutrition.summary}</p>
              <div className="px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[9px] text-emerald-300">{report.nutrition.advice}</p>
              </div>
            </div>
            <div className="glass-card text-center">
              <p className="text-[9px] text-white/40 mb-2">運動スコア</p>
              <div className="flex justify-center mb-2">
                <ScoreRing score={report.exercise.score} color={scoreColor(report.exercise.score)} />
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed mb-2">{report.exercise.summary}</p>
              <div className="px-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-[9px] text-blue-300">{report.exercise.advice}</p>
              </div>
            </div>
          </div>

          {/* 体重トレンド */}
          <div className="glass-card">
            <h3 className="text-xs font-semibold text-white/60 flex items-center gap-2 mb-2">
              {weightIcon}体重トレンド
            </h3>
            <p className="text-[11px] text-white/70">{report.weight.comment}</p>
          </div>

          {/* 来週の目標 */}
          {report.next_week_goals.length > 0 && (
            <div className="glass-card">
              <h3 className="text-xs font-semibold text-white/60 flex items-center gap-2 mb-3">
                <Target size={13} className="text-cyan-400" />来週の目標
              </h3>
              <div className="space-y-2">
                {report.next_week_goals.map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[11px] text-white/70">{g}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* プロTip */}
          <div className="glass-card bg-linear-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/20">
            <h3 className="text-xs font-semibold text-violet-300 flex items-center gap-2 mb-2">
              <Zap size={13} />プロからのアドバイス
            </h3>
            <p className="text-[11px] text-white/70 leading-relaxed">{report.pro_tip}</p>
          </div>
        </>
      )}
    </div>
  );
}
