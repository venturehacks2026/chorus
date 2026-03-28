'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Globe, Brain, Code, FileText, Database, Zap, X, Key, ArrowUpRight } from 'lucide-react';
import type { Connector } from '@/lib/types';
import { cn } from '@/lib/cn';

const CONNECTOR_META: Record<string, { icon: React.ElementType; iconColor: string; iconBg: string; category: string; popular?: boolean }> = {
  'web-search':     { icon: Globe,    iconColor: 'text-blue-500',    iconBg: 'bg-blue-50',    category: 'Research',      popular: true },
  'perplexity':     { icon: Brain,    iconColor: 'text-violet-500',  iconBg: 'bg-violet-50',  category: 'Research',      popular: true },
  'code-executor':  { icon: Code,     iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50', category: 'Dev Tools',     popular: true },
  'file-reader':    { icon: FileText, iconColor: 'text-amber-500',   iconBg: 'bg-amber-50',   category: 'Storage' },
  'memory':         { icon: Database, iconColor: 'text-rose-500',    iconBg: 'bg-rose-50',    category: 'Memory' },
  'http':           { icon: Zap,      iconColor: 'text-cyan-500',    iconBg: 'bg-cyan-50',    category: 'Integrations' },
};

const MOCK_USAGE = {
  'web-search':    [12, 19, 14, 28, 22, 35, 31],
  'perplexity':    [8,  14, 11, 18, 15, 22, 20],
  'code-executor': [5,  9,  12, 10, 17, 14, 19],
  'file-reader':   [3,  4,  6,  5,  8,  7,  9],
  'memory':        [2,  3,  4,  5,  4,  6,  8],
  'http':          [1,  2,  3,  3,  5,  4,  6],
};

const ICON_COLOR_HEX: Record<string, string> = {
  'text-blue-500':   '#3b82f6',
  'text-violet-500': '#8b5cf6',
  'text-emerald-500':'#10b981',
  'text-amber-500':  '#f59e0b',
  'text-rose-500':   '#f43f5e',
  'text-cyan-500':   '#06b6d4',
};

function Sparkline({ values, iconColor }: { values: number[]; iconColor: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const stroke = ICON_COLOR_HEX[iconColor] ?? '#7c3aed';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* last dot */}
      <circle
        cx={w}
        cy={h - ((values[values.length - 1] - min) / range) * h}
        r="2"
        fill={stroke}
      />
    </svg>
  );
}

function ConnectorCard({ c, onClick }: { c: Connector; onClick: () => void }) {
  const meta = CONNECTOR_META[c.slug];
  const Icon = meta?.icon ?? Zap;
  const iconColor = meta?.iconColor ?? 'text-accent';
  const iconBg = meta?.iconBg ?? 'bg-accent-muted';
  const usage = MOCK_USAGE[c.slug as keyof typeof MOCK_USAGE] ?? [1, 1, 1, 1, 1, 1, 1];
  const totalRuns = usage.reduce((a, b) => a + b, 0);

  return (
    <button
      onClick={onClick}
      className="group text-left bg-bg border border-border rounded-xl p-5 hover:border-accent/40 hover:shadow-sm transition-all duration-150 flex flex-col gap-4"
    >
      {/* top row */}
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} strokeWidth={1.5} />
        </div>
        {meta?.popular && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-muted text-accent">
            Popular
          </span>
        )}
      </div>

      {/* name + category */}
      <div>
        <p className="font-semibold text-sm text-text">{c.name}</p>
        <p className="text-xs text-text-subtle mt-0.5">{meta?.category ?? 'Tools'}</p>
      </div>

      {/* description */}
      <p className="text-xs text-text-muted leading-relaxed line-clamp-2 flex-1">{c.description}</p>

      {/* sparkline + runs */}
      <div className="flex items-end justify-between pt-1 border-t border-border">
        <div>
          <p className="text-[10px] text-text-subtle mb-1">7-day usage</p>
          <Sparkline values={usage} iconColor={iconColor} />
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-text tabular-nums">{totalRuns}</p>
          <p className="text-[10px] text-text-subtle">runs</p>
        </div>
      </div>

      {c.vault_secret_keys.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-text-subtle -mt-2">
          <Key className="w-3 h-3" />
          <span>Requires API key</span>
        </div>
      )}
    </button>
  );
}

function ConnectorDrawer({ c, onClose }: { c: Connector; onClose: () => void }) {
  const meta = CONNECTOR_META[c.slug];
  const Icon = meta?.icon ?? Zap;
  const iconColor = meta?.iconColor ?? 'text-accent';
  const iconBg = meta?.iconBg ?? 'bg-accent-muted';
  const usage = MOCK_USAGE[c.slug as keyof typeof MOCK_USAGE] ?? [1, 1, 1, 1, 1, 1, 1];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-96 h-full bg-bg border-l border-border flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
              <Icon className={cn('w-5 h-5', iconColor)} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-xs text-text-subtle font-mono">{c.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-muted text-text-subtle hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* description */}
          <p className="text-sm text-text-muted leading-relaxed">{c.description}</p>

          {/* usage chart */}
          <div>
            <p className="text-xs font-medium text-text-subtle uppercase tracking-widest mb-3">7-Day Usage</p>
            <div className="flex items-end gap-1 h-16">
              {usage.map((v, i) => {
                const max = Math.max(...usage);
                const pct = (v / max) * 100;
                const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={cn('w-full rounded-sm transition-all', iconColor.replace('text-', 'bg-'))}
                      style={{ height: `${Math.max(pct, 8)}%`, opacity: 0.7 + (i / usage.length) * 0.3 }}
                    />
                    <span className="text-[9px] text-text-subtle">{days[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* env vars */}
          {c.vault_secret_keys.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-subtle uppercase tracking-widest mb-2">Required secrets</p>
              <div className="space-y-1.5">
                {c.vault_secret_keys.map(k => (
                  <div key={k} className="flex items-center gap-2 bg-bg-muted border border-border rounded-lg px-3 py-2">
                    <Key className="w-3 h-3 text-text-subtle flex-shrink-0" />
                    <span className="text-xs font-mono text-text-muted">{k}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* how to use */}
          <div className="bg-accent-muted border border-accent/20 rounded-lg px-4 py-3">
            <div className="flex items-start gap-2">
              <ArrowUpRight className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-xs text-accent leading-relaxed">
                Add this connector to an agent via <strong>Workflow Editor → Agent Config → Tools</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { data: connectors = [], isLoading, isError } = useQuery<Connector[]>({
    queryKey: ['connectors'],
    queryFn: async () => {
      const res = await fetch('/api/connectors');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Connector | null>(null);

  const filtered = connectors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()),
  );

  const popular = filtered.filter(c => CONNECTOR_META[c.slug]?.popular);
  const rest = filtered.filter(c => !CONNECTOR_META[c.slug]?.popular);

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* header */}
      <div className="px-8 py-5 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-semibold">Marketplace</h1>
          <p className="text-sm text-text-muted mt-0.5">Connectors you can attach to any agent</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-48 pl-8 pr-3 py-1.5 bg-bg border border-border rounded-md text-sm placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/40 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-4 h-4 border-2 border-border border-t-text-subtle rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-500">Could not load connectors.</p>
        )}

        {!isLoading && !isError && (
          <div className="space-y-8">
            {/* popular */}
            {popular.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-text-subtle uppercase tracking-widest mb-4">Popular</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {popular.map(c => (
                    <ConnectorCard key={c.id} c={c} onClick={() => setSelected(c)} />
                  ))}
                </div>
              </section>
            )}

            {/* all others */}
            {rest.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-text-subtle uppercase tracking-widest mb-4">All Connectors</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map(c => (
                    <ConnectorCard key={c.id} c={c} onClick={() => setSelected(c)} />
                  ))}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-sm font-medium text-text">No connectors found</p>
                <p className="text-xs text-text-muted mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selected && <ConnectorDrawer c={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
