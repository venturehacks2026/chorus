import { useState } from 'react';
import { Store, Search, Zap, Globe, Code, Database, FileText, Cpu, X } from 'lucide-react';
import { useConnectors } from '@/hooks/useConnectors';
import type { Connector } from 'chorus-shared';
import { cn } from '@/lib/cn';

const CONNECTOR_ICONS: Record<string, React.ReactNode> = {
  'web-search': <Globe className="w-5 h-5" />,
  'perplexity': <Zap className="w-5 h-5" />,
  'http': <Cpu className="w-5 h-5" />,
  'code-executor': <Code className="w-5 h-5" />,
  'file-reader': <FileText className="w-5 h-5" />,
  'memory': <Database className="w-5 h-5" />,
};

const CONNECTOR_COLORS: Record<string, string> = {
  'web-search': 'text-blue-400 bg-blue-500/20',
  'perplexity': 'text-purple-400 bg-purple-500/20',
  'http': 'text-orange-400 bg-orange-500/20',
  'code-executor': 'text-green-400 bg-green-500/20',
  'file-reader': 'text-yellow-400 bg-yellow-500/20',
  'memory': 'text-pink-400 bg-pink-500/20',
};

function ConnectorCard({ connector, onClick }: { connector: Connector; onClick: () => void }) {
  const icon = CONNECTOR_ICONS[connector.slug] ?? <Zap className="w-5 h-5" />;
  const color = CONNECTOR_COLORS[connector.slug] ?? 'text-accent bg-accent/20';
  const needsSecrets = connector.vault_secret_keys.length > 0;

  return (
    <div
      onClick={onClick}
      className="bg-node-bg border border-node-border rounded-2xl p-5 hover:border-accent/50 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white group-hover:text-accent-hover transition-colors">
              {connector.name}
            </h3>
            {needsSecrets && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                Needs API key
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{connector.description}</p>
        </div>
      </div>

      {needsSecrets && (
        <div className="mt-3 pt-3 border-t border-node-border">
          <p className="text-xs text-gray-500">Required secrets:</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {connector.vault_secret_keys.map((key) => (
              <span key={key} className="text-xs font-mono px-1.5 py-0.5 bg-node-border text-gray-400 rounded">
                {key}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectorDetailModal({ connector, onClose }: { connector: Connector; onClose: () => void }) {
  const icon = CONNECTOR_ICONS[connector.slug] ?? <Zap className="w-6 h-6" />;
  const color = CONNECTOR_COLORS[connector.slug] ?? 'text-accent bg-accent/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-node-bg border border-node-border rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between p-6 border-b border-node-border">
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{connector.name}</h2>
              <p className="text-sm text-gray-500 font-mono">{connector.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-node-border text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-300">{connector.description}</p>

          {connector.vault_secret_keys.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Required Vault Secrets
              </p>
              <div className="space-y-2">
                {connector.vault_secret_keys.map((key) => (
                  <div key={key} className="flex items-center gap-3 bg-black/30 px-3 py-2 rounded-lg">
                    <span className="text-xs font-mono text-amber-400">{key}</span>
                    <span className="text-xs text-gray-500 flex-1">
                      Store at: <code className="text-gray-400">secret/data/chorus/connectors/{connector.slug}</code>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(connector.config_schema).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Configuration Options
              </p>
              <div className="space-y-2">
                {Object.entries(connector.config_schema).map(([key, field]) => (
                  <div key={key} className="flex items-start gap-3 bg-black/30 px-3 py-2 rounded-lg">
                    <span className="text-xs font-mono text-blue-400">{key}</span>
                    <div className="flex-1">
                      <span className="text-xs text-gray-400">{field.label}</span>
                      {field.default !== undefined && (
                        <span className="text-xs text-gray-600 ml-2">
                          default: {JSON.stringify(field.default)}
                        </span>
                      )}
                    </div>
                    {field.required && (
                      <span className="text-[10px] text-red-400">required</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <p className="text-xs text-gray-500">
              Add this connector to an agent via the workflow editor → Agent Config → Tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { data: connectors = [], isLoading } = useConnectors();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Connector | null>(null);

  const filtered = connectors.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-node-border">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-white">Marketplace</h1>
            <p className="text-sm text-gray-500 mt-0.5">Curated connectors for your agents</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connectors..."
            className="pl-9 pr-4 py-2 bg-node-bg border border-node-border rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onClick={() => setSelected(connector)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ConnectorDetailModal connector={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
