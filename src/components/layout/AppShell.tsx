'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigation } from './Navigation';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push('/login');
    }
    if (!loading && user && isLoginPage) {
      router.push('/');
    }
  }, [user, loading, isLoginPage, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-24 pt-safe px-4 max-w-lg mx-auto w-full">
        {children}
      </main>
      {!isLoginPage && user && <Navigation />}
    </div>
  );
}
