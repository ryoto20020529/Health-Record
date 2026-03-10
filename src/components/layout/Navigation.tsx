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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around py-1.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 min-w-[56px] min-h-[48px] justify-center rounded-xl transition-all duration-300 active:scale-95 ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
