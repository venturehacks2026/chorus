'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Globe, Brain, Code, FileText, Database, Zap, Key, Check, X, Eye, EyeOff, Plus } from 'lucide-react';
import type { Connector } from '@/lib/types';
import { cn } from '@/lib/cn';

// ─── Connector metadata ───────────────────────────────────────────────────────

const CONNECTOR_META: Record<string, {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  category: string;
  popular?: boolean;
  secretKey?: string;          // env var name for the API key
  secretLabel?: string;        // human label shown in modal
  secretPlaceholder?: string;
}> = {
  'web-search':     { icon: Globe,    iconColor: 'text-blue-500',    iconBg: 'bg-blue-50',    category: 'Research',      popular: true,  secretKey: 'BRAVE_API_KEY',       secretLabel: 'Brave Search API Key',      secretPlaceholder: 'BSAxxxxxxxxxxxx…' },
  'perplexity':     { icon: Brain,    iconColor: 'text-violet-500',  iconBg: 'bg-violet-50',  category: 'Research',      popular: true,  secretKey: 'PERPLEXITY_API_KEY',  secretLabel: 'Perplexity API Key',        secretPlaceholder: 'pplx-xxxxxxxxxxxx…' },
  'code-executor':  { icon: Code,     iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50', category: 'Dev Tools',     popular: true  },
  'file-reader':    { icon: FileText, iconColor: 'text-amber-500',   iconBg: 'bg-amber-50',   category: 'Storage' },
  'memory':         { icon: Database, iconColor: 'text-rose-500',    iconBg: 'bg-rose-50',    category: 'Memory' },
  'http':           { icon: Zap,      iconColor: 'text-cyan-500',    iconBg: 'bg-cyan-50',    category: 'Integrations',  secretKey: 'HTTP_BEARER_TOKEN',   secretLabel: 'Bearer Token (optional)', secretPlaceholder: 'Bearer …' },
};

const MOCK_USAGE: Record<string, number[]> = {
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

// ─── Local key store (in-memory for demo; swap to localStorage or vault) ─────

type KeyStore = Record<string, string>;
const keyStore: KeyStore = {};

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, iconColor }: { values: number[]; iconColor: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 64; const h = 24;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`);
  const stroke = ICON_COLOR_HEX[iconColor] ?? '#7c3aed';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={w} cy={h - ((values[values.length - 1] - min) / range) * h} r="2" fill={stroke} />
    </svg>
  );
}

// ─── API Key Modal ────────────────────────────────────────────────────────────

function ApiKeyModal({
  connector,
  meta,
  onClose,
  onSave,
}: {
  connector: Connector;
  meta: typeof CONNECTOR_META[string];
  onClose: () => void;
  onSave: (slug: string, key: string) => void;
}) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);

  function handleSave() {
    if (!key.trim()) return;
    onSave(connector.slug, key.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', meta.iconBg)}>
              <meta.icon className={cn('w-4 h-4', meta.iconColor)} strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-sm text-gray-900">Connect {connector.name}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{meta.secretLabel ?? 'API Key'}</label>
            <div className="relative">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-400 bg-white transition-all">
                <Key className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <input
                  type={show ? 'text' : 'password'}
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder={meta.secretPlaceholder ?? 'Enter API key…'}
                  autoFocus
                  className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none font-mono min-w-0"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Stored locally in your session. Never sent to our servers.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!key.trim()}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                'bg-violet-600 hover:bg-violet-700 text-white shadow-sm',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Save key
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Connector Card ───────────────────────────────────────────────────────────

function ConnectorCard({
  c,
  onAddKey,
}: {
  c: Connector;
  onAddKey: (c: Connector) => void;
}) {
  const meta = CONNECTOR_META[c.slug];
  const Icon = meta?.icon ?? Zap;
  const iconColor = meta?.iconColor ?? 'text-violet-500';
  const iconBg = meta?.iconBg ?? 'bg-violet-50';
  const usage = MOCK_USAGE[c.slug] ?? [1, 1, 1, 1, 1, 1, 1];
  const totalRuns = usage.reduce((a, b) => a + b, 0);
  const needsKey = !!meta?.secretKey;
  const hasKey = needsKey && !!keyStore[c.slug];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 hover:border-gray-300 hover:shadow-sm transition-all duration-150">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} strokeWidth={1.5} />
        </div>
        <div className="flex items-center gap-2">
          {meta?.popular && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
              Popular
            </span>
          )}
        </div>
      </div>

      {/* Name + category */}
      <div>
        <p className="font-semibold text-sm text-gray-900">{c.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{meta?.category ?? 'Tools'}</p>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">{c.description}</p>

      {/* Sparkline */}
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

      {/* Add / key section */}
      {needsKey ? (
        hasKey ? (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-1.5 flex-1">
              <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} />
              </div>
              <span className="text-xs text-emerald-600 font-medium">Connected</span>
              <span className="text-[11px] font-mono text-gray-400 ml-1">
                {'•'.repeat(8)}{keyStore[c.slug].slice(-4)}
              </span>
            </div>
            <button
              onClick={() => onAddKey(c)}
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              Update
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAddKey(c)}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/40 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add API key
          </button>
        )
      ) : (
        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} />
          </div>
          <span className="text-xs text-emerald-600 font-medium">No key required</span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [addingFor, setAddingFor] = useState<Connector | null>(null);
  const [, forceRender] = useState(0);

  const { data: connectors = [], isLoading, isError } = useQuery<Connector[]>({
    queryKey: ['connectors'],
    queryFn: async () => {
      const res = await fetch('/api/connectors');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const filtered = connectors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()),
  );

  const popular = filtered.filter(c => CONNECTOR_META[c.slug]?.popular);
  const rest    = filtered.filter(c => !CONNECTOR_META[c.slug]?.popular);

  function handleSaveKey(slug: string, key: string) {
    keyStore[slug] = key;
    forceRender(n => n + 1);
  }

  const addingMeta = addingFor ? CONNECTOR_META[addingFor.slug] : null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-400 mt-0.5">API connectors for your agents</p>
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
        {isError && <p className="text-sm text-red-500">Could not load connectors.</p>}

        {!isLoading && !isError && (
          <div className="space-y-8">
            {popular.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Popular</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {popular.map(c => <ConnectorCard key={c.id} c={c} onAddKey={setAddingFor} />)}
                </div>
              </section>
            )}
            {rest.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">All Connectors</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map(c => <ConnectorCard key={c.id} c={c} onAddKey={setAddingFor} />)}
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

      {/* API Key Modal */}
      {addingFor && addingMeta && (
        <ApiKeyModal
          connector={addingFor}
          meta={addingMeta}
          onClose={() => setAddingFor(null)}
          onSave={handleSaveKey}
        />
      )}
    </div>
  );
}
