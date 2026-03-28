'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Store } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/',           icon: Bot,   label: 'Agents' },
  { href: '/marketplace', icon: Store, label: 'Marketplace' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border flex flex-col bg-bg">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-border">
        <span className="text-base font-bold tracking-tight text-text">Chorus</span>
        <span className="ml-1.5 text-accent font-bold text-base">.</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 py-4">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/'
            ? pathname === '/' || pathname.startsWith('/workflows')
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-[15px] rounded-lg transition-colors font-medium',
                active
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-muted hover:text-text hover:bg-bg-muted',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
