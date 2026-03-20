'use client';

import { useState } from 'react';
import { Activity, Mail, Lock, ArrowRight, UserPlus, LogIn, Loader2 } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setSuccess('確認メールを送信しました。メールを確認してからログインしてください。');
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '認証に失敗しました';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 fade-in">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-linear-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
            <Activity size={36} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">
            ヘルスケア・トラッカー
          </h1>
          <p className="text-white/40 text-sm mt-2">
            {isSignUp ? 'アカウントを作成' : 'ログインして始めましょう'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card space-y-5">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">メールアドレス</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="input-field pl-10!"
                required
                id="input-email"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">パスワード</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                className="input-field pl-10!"
                required
                minLength={6}
                id="input-password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-4! disabled:opacity-50"
            id="btn-auth-submit"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus size={18} />
                アカウント作成
              </>
            ) : (
              <>
                <LogIn size={18} />
                ログイン
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
          className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors flex items-center justify-center gap-1"
          id="btn-toggle-auth"
        >
          {isSignUp ? 'すでにアカウントをお持ちの方' : '新規アカウント作成'}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
