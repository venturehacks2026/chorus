'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Connector } from '@/lib/types';

function ConnectorDetail({ c, onClose }: { c: Connector; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="w-full max-w-sm bg-bg border border-border rounded-md shadow-sm">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-semibold text-sm">{c.name}</p>
            <p className="text-xs text-text-subtle font-mono mt-0.5">{c.slug}</p>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            Close
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-text-muted">{c.description}</p>

          {c.vault_secret_keys.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-subtle uppercase tracking-wider mb-2">Required env vars</p>
              <div className="space-y-1">
                {c.vault_secret_keys.map(k => (
                  <div key={k} className="bg-bg-muted border border-border rounded-md px-3 py-2">
                    <span className="text-xs font-mono text-text-muted">{k}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-text-subtle">
            Add this connector to agents via the workflow editor → Agent config → Tools.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { data: connectors = [], isLoading, isError } = useQuery<Connector[]>({
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
      <div className="px-8 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Marketplace</h1>
          <p className="text-sm text-text-muted mt-0.5">Curated connectors for your agents</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search connectors…"
          className="w-52 bg-bg border border-border rounded-md px-3 py-1.5 text-sm placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-text/20 focus:border-text-subtle transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-4 h-4 border-2 border-border border-t-text-subtle rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <p className="text-sm text-text-muted">fetch failed</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="text-left bg-bg border border-border rounded-lg p-4 hover:border-text-subtle hover:bg-bg-subtle transition-all group"
              >
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs font-mono text-text-subtle mt-0.5 mb-2">{c.slug}</p>
                <p className="text-xs text-text-muted line-clamp-2">{c.description}</p>
                {c.vault_secret_keys.length > 0 && (
                  <p className="text-[10px] text-text-subtle mt-2">Requires API key</p>
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
