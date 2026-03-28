'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, Search, Globe, Zap, Code, Database, FileText, Cpu, X, Lock } from 'lucide-react';
import type { Connector } from '@/lib/types';
import { cn } from '@/lib/cn';

const ICONS: Record<string, React.ReactNode> = {
  'web-search': <Globe className="w-5 h-5" />,
  'perplexity': <Zap className="w-5 h-5" />,
  'http': <Cpu className="w-5 h-5" />,
  'code-executor': <Code className="w-5 h-5" />,
  'file-reader': <FileText className="w-5 h-5" />,
  'memory': <Database className="w-5 h-5" />,
};

const COLORS: Record<string, string> = {
  'web-search': 'text-blue-400 bg-blue-500/10',
  'perplexity': 'text-purple-400 bg-purple-500/10',
  'http': 'text-orange-400 bg-orange-500/10',
  'code-executor': 'text-green-400 bg-green-500/10',
  'file-reader': 'text-yellow-400 bg-yellow-500/10',
  'memory': 'text-pink-400 bg-pink-500/10',
};

function ConnectorDetail({ c, onClose }: { c: Connector; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-muted border border-border rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', COLORS[c.slug] ?? 'bg-accent-muted text-accent')}>
              {ICONS[c.slug] ?? <Zap className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-semibold text-text">{c.name}</p>
              <p className="text-xs text-text-subtle font-mono">{c.slug}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-border text-text-subtle hover:text-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">{c.description}</p>

          {c.vault_secret_keys.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-subtle uppercase tracking-wider mb-2">Required secrets</p>
              {c.vault_secret_keys.map(k => (
                <div key={k} className="flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-2 mb-1.5">
                  <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-amber-300">{k}</span>
                  <span className="text-xs text-text-subtle ml-auto">env var</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-text-subtle">Add this connector to agents via the workflow editor → Agent config → Tools.</p>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { data: connectors = [], isLoading } = useQuery<Connector[]>({
    queryKey: ['connectors'],
    queryFn: () => fetch('/api/connectors').then(r => r.json()),
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Connector | null>(null);

  const filtered = connectors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-bg">
      <header className="px-8 py-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-text-muted" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Marketplace</h1>
            <p className="text-sm text-text-muted mt-0.5">Curated connectors for your agents</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="pl-9 pr-4 py-2 bg-bg-muted border border-border rounded-lg text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent/50 w-52" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className="text-left bg-bg-muted border border-border rounded-xl p-4 hover:border-border/80 hover:bg-bg-subtle transition-all group">
                <div className="flex items-start gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', COLORS[c.slug] ?? 'bg-accent-muted text-accent')}>
                    {ICONS[c.slug] ?? <Zap className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text text-sm group-hover:text-white transition-colors">{c.name}</p>
                    <p className="text-xs text-text-subtle mt-0.5 line-clamp-2">{c.description}</p>
                  </div>
                </div>
                {c.vault_secret_keys.length > 0 && (
                  <div className="flex items-center gap-1 mt-3">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-amber-400">API key required</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && <ConnectorDetail c={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
