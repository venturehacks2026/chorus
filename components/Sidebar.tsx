'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Store } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/', icon: Bot, label: 'Agents' },
  { href: '/marketplace', icon: Store, label: 'Marketplace' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-border flex flex-col bg-bg">
      <div className="px-4 h-12 flex items-center border-b border-border">
        <span className="text-sm font-semibold">Chorus</span>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/'
            ? pathname === '/' || pathname.startsWith('/workflows')
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                active
                  ? 'bg-bg-muted text-text font-medium'
                  : 'text-text-muted hover:text-text hover:bg-bg-subtle',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
