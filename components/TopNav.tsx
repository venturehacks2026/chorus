'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/', label: 'Agents' },
  { href: '/marketplace', label: 'Marketplace' },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-bg shrink-0">
      <div className="flex items-center h-12 px-6 gap-6">
        <span className="text-sm font-semibold tracking-tight select-none">Chorus</span>

        <nav className="flex items-center gap-0.5">
          {TABS.map(({ href, label }) => {
            const active = href === '/'
              ? pathname === '/' || pathname.startsWith('/workflows')
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  active
                    ? 'bg-bg-muted text-text font-medium'
                    : 'text-text-muted hover:text-text hover:bg-bg-subtle',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
