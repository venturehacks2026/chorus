'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GitBranch, Store, Settings } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/', icon: GitBranch, label: 'Workflows' },
  { href: '/marketplace', icon: Store, label: 'Marketplace' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-14 flex flex-col items-center py-4 gap-1 bg-bg-subtle border-r border-border shrink-0">
      {/* Logo */}
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center mb-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2C8 2 3 5 3 9C3 11.2 5.2 13 8 13C10.8 13 13 11.2 13 9C13 5 8 2 8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
          <circle cx="8" cy="9" r="1.5" fill="white"/>
        </svg>
      </div>

      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
              active
                ? 'bg-accent text-white'
                : 'text-text-subtle hover:text-text hover:bg-border',
            )}
          >
            <Icon className="w-4 h-4" />
          </Link>
        );
      })}

      <div className="flex-1" />

      <Link
        href="/settings"
        title="Settings"
        className="w-9 h-9 flex items-center justify-center rounded-lg text-text-subtle hover:text-text hover:bg-border transition-colors"
      >
        <Settings className="w-4 h-4" />
      </Link>
    </aside>
  );
}
