'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Scale, UtensilsCrossed, Dumbbell, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'ホーム' },
  { href: '/weight', icon: Scale, label: '体重' },
  { href: '/meals', icon: UtensilsCrossed, label: '食事' },
  { href: '/exercise', icon: Dumbbell, label: '運動' },
  { href: '/settings', icon: Settings, label: '設定' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10">
      <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'text-emerald-400 scale-105'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
