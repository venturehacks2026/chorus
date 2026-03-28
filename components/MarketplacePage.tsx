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
  'text-blue-500':    '#3b82f6',
  'text-violet-500':  '#8b5cf6',
  'text-emerald-500': '#10b981',
  'text-amber-500':   '#f59e0b',
  'text-rose-500':    '#f43f5e',
  'text-cyan-500':    '#06b6d4',
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
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={w} cy={h - ((values[values.length - 1] - min) / range) * h} r="2" fill={stroke} />
    </svg>
  );
}

function ConnectorCard({ c, onClick }: { c: Connector; onClick: () => void }) {
  const meta = CONNECTOR_META[c.slug];
  const Icon = meta?.icon ?? Zap;
  const iconColor = meta?.iconColor ?? 'text-violet-500';
  const iconBg = meta?.iconBg ?? 'bg-violet-50';
  const usage = MOCK_USAGE[c.slug as keyof typeof MOCK_USAGE] ?? [1, 1, 1, 1, 1, 1, 1];
  const totalRuns = usage.reduce((a, b) => a + b, 0);

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-sm transition-all duration-150 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} strokeWidth={1.5} />
        </div>
        {meta?.popular && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
            Popular
          </span>
        )}
      </div>

      <div>
        <p className="font-semibold text-sm text-gray-900">{c.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{meta?.category ?? 'Tools'}</p>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">{c.description}</p>

      <div className="flex items-end justify-between pt-1 border-t border-gray-100">
        <div>
          <p className="text-[10px] text-gray-400 mb-1">7-day usage</p>
          <Sparkline values={usage} iconColor={iconColor} />
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-gray-900 tabular-nums">{totalRuns}</p>
          <p className="text-[10px] text-gray-400">runs</p>
        </div>
      </div>

      {c.vault_secret_keys.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400 -mt-2">
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
  const iconColor = meta?.iconColor ?? 'text-violet-500';
  const iconBg = meta?.iconBg ?? 'bg-violet-50';
  const barBg = iconColor.replace('text-', 'bg-');
  const usage = MOCK_USAGE[c.slug as keyof typeof MOCK_USAGE] ?? [1, 1, 1, 1, 1, 1, 1];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-96 h-full bg-white border-l border-gray-100 flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg)}>
              <Icon className={cn('w-5 h-5', iconColor)} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-400 font-mono">{c.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <p className="text-sm text-gray-600 leading-relaxed">{c.description}</p>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">7-Day Usage</p>
            <div className="flex items-end gap-1 h-16">
              {usage.map((v, i) => {
                const max = Math.max(...usage);
                const pct = (v / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={cn('w-full rounded-sm transition-all', barBg)}
                      style={{ height: `${Math.max(pct, 8)}%`, opacity: 0.6 + (i / usage.length) * 0.4 }}
                    />
                    <span className="text-[9px] text-gray-400">{days[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {c.vault_secret_keys.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Required secrets</p>
              <div className="space-y-1.5">
                {c.vault_secret_keys.map(k => (
                  <div key={k} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                    <Key className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-gray-600">{k}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2">
              <ArrowUpRight className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-violet-700 leading-relaxed">
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
  const rest    = filtered.filter(c => !CONNECTOR_META[c.slug]?.popular);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-400 mt-0.5">Connectors you can attach to any agent</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-48 pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-500">Could not load connectors.</p>
        )}

        {!isLoading && !isError && (
          <div className="space-y-8">
            {popular.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Popular</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {popular.map(c => <ConnectorCard key={c.id} c={c} onClick={() => setSelected(c)} />)}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">All Connectors</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map(c => <ConnectorCard key={c.id} c={c} onClick={() => setSelected(c)} />)}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-sm font-medium text-gray-900">No connectors found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selected && <ConnectorDrawer c={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
