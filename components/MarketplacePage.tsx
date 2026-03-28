'use client';

import { useState, useEffect } from 'react';
import { Key, Check, X, Eye, EyeOff, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Only connectors that require an API key are shown ───────────────────────
// No-key connectors (web-scraper, rss-reader, code-executor, etc.) are internal
// tools that just work — they don't belong in a "marketplace" UI.

interface ConnectorMeta {
  domain: string;          // used for icon.horse logo fetch
  displayName: string;     // shown on card
  category: string;
  description: string;
  secretLabel: string;
  secretPlaceholder: string;
  docsUrl: string;
  slug: string;
}

// Only API-key-gated connectors appear here
const KEYED_CONNECTORS: ConnectorMeta[] = [
  {
    slug: 'web-search',
    domain: 'brave.com',
    displayName: 'Brave Search',
    category: 'Search',
    description: 'Real-time web search powered by Brave — privacy-first, no tracking, independent index.',
    secretLabel: 'Brave Search API Key',
    secretPlaceholder: 'BSAxxxxxxxxxxxxxxxxxxxx…',
    docsUrl: 'https://brave.com/search/api/',
  },
  {
    slug: 'parallel-research',
    domain: 'brave.com',
    displayName: 'Parallel Research',
    category: 'Search',
    description: 'Run multiple Brave searches concurrently and merge deduplicated results — faster broad research.',
    secretLabel: 'Brave Search API Key',
    secretPlaceholder: 'BSAxxxxxxxxxxxxxxxxxxxx…',
    docsUrl: 'https://brave.com/search/api/',
  },
  {
    slug: 'perplexity',
    domain: 'perplexity.ai',
    displayName: 'Perplexity',
    category: 'Research',
    description: 'Deep research queries with cited sources via Perplexity Sonar — best for nuanced, cited answers.',
    secretLabel: 'Perplexity API Key',
    secretPlaceholder: 'pplx-xxxxxxxxxxxxxxxxxxxx…',
    docsUrl: 'https://docs.perplexity.ai/',
  },
];

// ─── Logo component using Brandfetch API (server-proxied) ────────────────────

function ServiceLogo({ domain, size = 32 }: { domain: string; size?: number }) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/brand?domain=${encodeURIComponent(domain)}`)
      .then(r => r.json())
      .then(({ iconUrl: url }: { iconUrl: string | null }) => {
        setIconUrl(url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [domain]);

  if (loading) {
    return (
      <div
        className="rounded-xl bg-gray-100 animate-pulse shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  if (!iconUrl || errored) {
    return (
      <div
        className="rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-600 uppercase shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {domain[0]}
      </div>
    );
  }

  return (
    <img
      src={iconUrl}
      alt={domain}
      width={size}
      height={size}
      className="rounded-xl object-contain shrink-0"
      onError={() => setErrored(true)}
    />
  );
}

// ─── API Key Modal ────────────────────────────────────────────────────────────

function ApiKeyModal({
  meta,
  onClose,
  onSaved,
}: {
  meta: ConnectorMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!key.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/connectors/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: meta.slug, secret_value: key.trim() }),
      });
      if (!res.ok) throw new Error();
      onSaved();
      onClose();
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ServiceLogo domain={meta.domain} size={36} />
            <div>
              <p className="font-semibold text-sm text-gray-900">{meta.displayName}</p>
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-violet-500 hover:text-violet-700 flex items-center gap-0.5 transition-colors"
              >
                Get API key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{meta.secretLabel}</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-400 bg-white transition-all">
              <Key className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder={meta.secretPlaceholder}
                autoFocus
                className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none font-mono min-w-0"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
              >
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {error && <p className="text-[11px] text-red-500 mt-1.5">{error}</p>}
            <p className="text-[11px] text-gray-400 mt-1.5">
              Stored securely server-side. Never exposed to the browser or committed to GitHub.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!key.trim() || saving}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
                'bg-violet-600 hover:bg-violet-700 text-white shadow-sm',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Saving…' : 'Save key'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
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
  meta,
  keyUpdateTick,
  onAddKey,
}: {
  meta: ConnectorMeta;
  keyUpdateTick: number;
  onAddKey: (m: ConnectorMeta) => void;
}) {
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setChecking(true);
    fetch(`/api/connectors/secrets/${meta.slug}`)
      .then(r => r.json())
      .then(({ exists }: { exists: boolean }) => setHasKey(exists))
      .catch(() => setHasKey(false))
      .finally(() => setChecking(false));
  }, [meta.slug, keyUpdateTick]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 hover:border-gray-200 hover:shadow-sm transition-all duration-150">
      {/* Logo + name */}
      <div className="flex items-center gap-3">
        <ServiceLogo domain={meta.domain} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{meta.displayName}</p>
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{meta.category}</span>
        </div>
        {hasKey && !checking && (
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed flex-1">{meta.description}</p>

      {/* Key action */}
      <div className="pt-1 border-t border-gray-50">
        {checking ? (
          <div className="flex items-center gap-1.5 h-9">
            <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin" />
            <span className="text-xs text-gray-400">Checking…</span>
          </div>
        ) : hasKey ? (
          <div className="flex items-center justify-between h-9">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
              <span className="text-xs text-emerald-600 font-medium">Connected</span>
            </div>
            <button
              onClick={() => onAddKey(meta)}
              className="text-[11px] text-gray-400 hover:text-violet-600 transition-colors"
            >
              Update key
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAddKey(meta)}
            className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/40 transition-all font-medium"
          >
            <Key className="w-3.5 h-3.5" />
            Add API key
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [addingFor, setAddingFor] = useState<ConnectorMeta | null>(null);
  const [keyUpdateTick, setKeyUpdateTick] = useState(0);

  function handleKeySaved() {
    setKeyUpdateTick(t => t + 1);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 shrink-0">
        <h1 className="text-base font-semibold text-gray-900">Marketplace</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Connect external APIs to give your agents access to real-time data and research tools.
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {KEYED_CONNECTORS.map(meta => (
            <ConnectorCard
              key={meta.slug}
              meta={meta}
              keyUpdateTick={keyUpdateTick}
              onAddKey={setAddingFor}
            />
          ))}
        </div>

        <div className="mt-8 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-1">Built-in connectors</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Web scraper, RSS reader, JSON API, code executor, data store, memory, and HTTP are built in and require no API key — they&apos;re available to all agents automatically.
          </p>
        </div>
      </div>

      {addingFor && (
        <ApiKeyModal
          meta={addingFor}
          onClose={() => setAddingFor(null)}
          onSaved={handleKeySaved}
        />
      )}
    </div>
  );
}
