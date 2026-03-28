'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, BookOpen, Puzzle, Store } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/',            icon: Bot,      label: 'Workflows' },
  { href: '/knowledge',   icon: BookOpen, label: 'Knowledge Base' },
  { href: '/skills',      icon: Puzzle,   label: 'Skills' },
  { href: '/marketplace', icon: Store,    label: 'Marketplace' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-gray-100 flex flex-col bg-white">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-gray-100">
        <span className="text-[15px] font-bold tracking-tight text-gray-900">Chorus</span>
        <span className="ml-0.5 text-violet-600 font-bold text-[15px]">.</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-3">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/'
            ? pathname === '/' || pathname.startsWith('/workflows')
            : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-[14px] rounded-lg transition-colors',
                active
                  ? 'bg-violet-50 text-violet-700 font-semibold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium',
              )}
            >
              <Icon
                className={cn('w-4 h-4 shrink-0', active ? 'text-violet-600' : 'text-gray-400')}
                strokeWidth={active ? 2.25 : 1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
