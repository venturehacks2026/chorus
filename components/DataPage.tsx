'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Database, Table2, Plus, Search,
  Trash2, RefreshCw, X, LayoutGrid, Rows, Clock, Hash,
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Silo {
  id: string;
  workflow_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  record_count: number;
  tables: string[];
  workflows: { id: string; name: string } | null;
}

interface SiloRecord {
  id: string;
  silo_id: string;
  table_name: string;
  data: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function flattenKeys(records: SiloRecord[]): string[] {
  const keys = new Set<string>();
  records.forEach(r => Object.keys(r.data).forEach(k => keys.add(k)));
  return [...keys];
}

// ─── New Silo Modal ───────────────────────────────────────────────────────────

function NewSiloModal({
  workflows,
  onClose,
  onCreated,
}: {
  workflows: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!workflowId || !name.trim()) { setError('Workflow and silo name are required.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/data/silos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: workflowId, name: name.trim(), description: description.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New data silo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Workflow</label>
            <select
              value={workflowId}
              onChange={e => setWorkflowId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            >
              {workflows.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Silo name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. research_results, price_data"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What kind of data lives here?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create silo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Records Table ────────────────────────────────────────────────────────────

function RecordsTable({
  siloId,
  tableName,
}: {
  siloId: string;
  tableName: string;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['silo-records', siloId, tableName],
    queryFn: async () => {
      const res = await fetch(`/api/data/records?silo_id=${siloId}&table_name=${encodeURIComponent(tableName)}&limit=200`);
      return res.json() as Promise<{ records: SiloRecord[]; total: number }>;
    },
    // Refetch often while this table is open
    refetchInterval: 5_000,
    staleTime: 2_000,
  });

  // Supabase realtime: subscribe to new inserts in this silo
  useEffect(() => {
    const ch = supabase
      .channel(`silo-records:${siloId}:${tableName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'silo_records',
          filter: `silo_id=eq.${siloId}`,
        },
        () => {
          // Refetch both records and silos list (for row count update)
          qc.invalidateQueries({ queryKey: ['silo-records', siloId, tableName] });
          qc.invalidateQueries({ queryKey: ['data-silos'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [siloId, tableName, qc]);

  const deleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetch('/api/data/records', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['silo-records', siloId, tableName] });
      qc.invalidateQueries({ queryKey: ['data-silos'] });
    },
  });

  const records = data?.records ?? [];
  const columns = useMemo(() => flattenKeys(records), [records]);

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r => JSON.stringify(r.data).toLowerCase().includes(q));
  }, [records, search]);

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search records…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          />
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {selected.size > 0 && (
            <button
              onClick={() => deleteMut.mutate([...selected])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selected.size}
            </button>
          )}

          <button onClick={() => setViewMode(v => v === 'table' ? 'json' : 'table')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title={viewMode === 'table' ? 'Switch to JSON view' : 'Switch to table view'}
          >
            {viewMode === 'table' ? <LayoutGrid className="w-4 h-4" /> : <Rows className="w-4 h-4" />}
          </button>

          <button onClick={() => refetch()} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
        </div>

        <span className="text-xs text-gray-400 tabular-nums">
          {filtered.length} / {data?.total ?? 0} rows
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Database className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No records yet</p>
            <p className="text-xs mt-1">Agents with the <code className="font-mono bg-gray-100 px-1 rounded">data-store</code> tool will write here</p>
          </div>
        ) : viewMode === 'table' ? (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <th className="px-3 py-2 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 accent-violet-600"
                  />
                </th>
                {columns.map(col => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                    {col}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                  <Clock className="w-3 h-3 inline mr-1" />created
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record, i) => (
                <tr
                  key={record.id}
                  className={cn(
                    'border-b border-gray-50 hover:bg-violet-50/30 transition-colors',
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
                    selected.has(record.id) && 'bg-violet-50',
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(record.id)}
                      onChange={() => setSelected(prev => {
                        const next = new Set(prev);
                        next.has(record.id) ? next.delete(record.id) : next.add(record.id);
                        return next;
                      })}
                      className="rounded border-gray-300 accent-violet-600"
                    />
                  </td>
                  {columns.map(col => (
                    <td key={col} className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={String(record.data[col] ?? '')}>
                      {record.data[col] !== undefined
                        ? typeof record.data[col] === 'object'
                          ? <span className="text-gray-400 italic">{JSON.stringify(record.data[col]).slice(0, 60)}</span>
                          : String(record.data[col])
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                  ))}
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{relativeTime(record.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 space-y-2">
            {filtered.map(record => (
              <div key={record.id} className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 border border-gray-100">
                <div className="text-[10px] text-gray-400 mb-1.5 font-sans">
                  <Hash className="w-3 h-3 inline mr-0.5" />{record.id.slice(0, 8)} · {relativeTime(record.created_at)}
                </div>
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(record.data, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Silo Card ─────────────────────────────────────────────────────────────────

function SiloCard({
  silo,
  selected,
  onSelect,
}: {
  silo: Silo;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(silo.id)}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm',
        selected
          ? 'border-violet-300 bg-violet-50 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            selected ? 'bg-violet-100' : 'bg-gray-100',
          )}>
            <Database className={cn('w-4 h-4', selected ? 'text-violet-600' : 'text-gray-400')} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{silo.name}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {silo.workflows?.name ?? 'Unknown workflow'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-gray-900">{silo.record_count.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">rows</p>
        </div>
      </div>

      {silo.tables.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {silo.tables.slice(0, 4).map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 font-mono">
              {t}
            </span>
          ))}
          {silo.tables.length > 4 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-400">+{silo.tables.length - 4}</span>
          )}
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-2">{relativeTime(silo.updated_at)}</p>
    </button>
  );
}

// ─── DataPage ─────────────────────────────────────────────────────────────────

export default function DataPage() {
  const qc = useQueryClient();
  const [selectedSiloId, setSelectedSiloId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showNewSilo, setShowNewSilo] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['default']));

  const { data: silos = [], isFetching } = useQuery({
    queryKey: ['data-silos'],
    queryFn: async () => {
      const res = await fetch('/api/data/silos');
      if (!res.ok) return [];
      return res.json() as Promise<Silo[]>;
    },
    refetchInterval: 8_000,
    staleTime: 3_000,
  });

  // Realtime: re-fetch silo list when data_silos table changes
  useEffect(() => {
    const ch = supabase
      .channel('data-silos-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_silos' }, () => {
        qc.invalidateQueries({ queryKey: ['data-silos'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'silo_records' }, () => {
        qc.invalidateQueries({ queryKey: ['data-silos'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Also fetch workflows for the new silo modal
  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows-list'],
    queryFn: async () => {
      const res = await fetch('/api/workflows');
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : [];
    },
  });

  const filteredSilos = useMemo(() => {
    if (!search) return silos;
    const q = search.toLowerCase();
    return silos.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.workflows?.name?.toLowerCase().includes(q) ||
      s.tables.some(t => t.toLowerCase().includes(q))
    );
  }, [silos, search]);

  const selectedSilo = silos.find(s => s.id === selectedSiloId) ?? null;

  function handleSelectSilo(id: string) {
    const silo = silos.find(s => s.id === id);
    setSelectedSiloId(id);
    setSelectedTable(silo?.tables[0] ?? null);
  }

  // When silo data refreshes and selected table is now null (new tables appeared), auto-select
  useEffect(() => {
    if (!selectedSiloId || selectedTable) return;
    const silo = silos.find(s => s.id === selectedSiloId);
    if (silo?.tables.length) setSelectedTable(silo.tables[0]);
  }, [silos, selectedSiloId, selectedTable]);

  return (
    <div className="flex h-full bg-white">
      {/* ── Left panel: silos list ── */}
      <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-600" />
              Data
            </h1>
            <button
              onClick={() => setShowNewSilo(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New silo
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search silos…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>
        </div>

        {/* Stats strip */}
        <div className="px-4 pb-3 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            {silos.length} silos
          </span>
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {silos.reduce((s, x) => s + x.record_count, 0).toLocaleString()} rows
          </span>
          {isFetching && <RefreshCw className="w-3 h-3 animate-spin ml-auto" />}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {filteredSilos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Database className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No silos yet</p>
              <p className="text-xs mt-1 text-center px-4">
                Run a workflow with a data-store tool, or create one manually.
              </p>
            </div>
          ) : (
            filteredSilos.map(silo => (
              <SiloCard
                key={silo.id}
                silo={silo}
                selected={selectedSiloId === silo.id}
                onSelect={handleSelectSilo}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedSilo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <Table2 className="w-14 h-14 mb-4 opacity-20" />
            <p className="text-base font-medium text-gray-500">Select a data silo</p>
            <p className="text-sm mt-1.5 text-center max-w-xs">
              Data silos store structured outputs from workflow runs — research results, scraped data, generated code, and more.
            </p>
            {silos.length === 0 && (
              <button
                onClick={() => setShowNewSilo(true)}
                className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create your first silo
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Silo header */}
            <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-violet-600" />
                  <h2 className="text-base font-semibold text-gray-900">{selectedSilo.name}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-violet-50 text-violet-600 font-medium border border-violet-100">
                    {selectedSilo.record_count.toLocaleString()} rows
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Linked to workflow: <span className="font-medium text-gray-600">{selectedSilo.workflows?.name ?? 'Unknown'}</span>
                  {selectedSilo.description && <> · {selectedSilo.description}</>}
                </p>
              </div>
            </div>

            {/* Table picker + records */}
            <div className="flex flex-1 min-h-0">
              {/* Table nav */}
              {selectedSilo.tables.length > 1 && (
                <div className="w-44 shrink-0 border-r border-gray-100 py-3 overflow-y-auto">
                  <p className="px-4 text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1">Tables</p>
                  {selectedSilo.tables.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTable(t)}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors',
                        selectedTable === t
                          ? 'text-violet-700 bg-violet-50 font-medium'
                          : 'text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      <Table2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate font-mono text-xs">{t}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Records */}
              <div className="flex-1 flex flex-col min-w-0">
                {selectedTable ? (
                  <RecordsTable siloId={selectedSilo.id} tableName={selectedTable} />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                    Select a table on the left
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* New silo modal */}
      {showNewSilo && (
        <NewSiloModal
          workflows={workflows}
          onClose={() => setShowNewSilo(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['data-silos'] })}
        />
      )}
    </div>
  );
}
