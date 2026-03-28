'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Plus, Search, Tag, Globe, Link2, Trash2,
  X, ChevronRight, FileText, Edit3, Check, RefreshCw,
  Layers, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KBDoc {
  id: string;
  title: string;
  content?: string;
  content_type: string;
  category: string | null;
  tags: string[];
  source_url: string | null;
  is_global: boolean;
  workflow_id: string | null;
  word_count: number | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  'Company Policy', 'Guidelines', 'Brand Voice', 'Product', 'Market Context',
  'Compliance', 'Process', 'Research', 'Technical', 'Other',
];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── New/Edit Document Modal ──────────────────────────────────────────────────

function DocModal({
  doc,
  onClose,
  onSaved,
}: {
  doc: KBDoc | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!doc;
  const [title, setTitle] = useState(doc?.title ?? '');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(doc?.category ?? '');
  const [tags, setTags] = useState(doc?.tags?.join(', ') ?? '');
  const [sourceUrl, setSourceUrl] = useState(doc?.source_url ?? '');
  const [isGlobal, setIsGlobal] = useState(doc?.is_global ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingContent, setLoadingContent] = useState(isEdit);

  // Fetch full content when editing
  useEffect(() => {
    if (!isEdit || !doc) return;
    fetch(`/api/knowledge/${doc.id}`)
      .then(r => r.json())
      .then(d => { setContent(d.content ?? ''); setLoadingContent(false); })
      .catch(() => setLoadingContent(false));
  }, [doc?.id, isEdit]);

  async function handleSave() {
    if (!title.trim() || !content.trim()) { setError('Title and content are required.'); return; }
    setBusy(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || null,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        source_url: sourceUrl.trim() || null,
        is_global: isGlobal,
      };
      const url = isEdit ? `/api/knowledge/${doc!.id}` : '/api/knowledge';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit document' : 'Add to knowledge base'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Brand Voice Guidelines, Data Handling Policy"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Content</label>
            {loadingContent ? (
              <div className="flex items-center gap-2 h-48 text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste policies, guidelines, company context, research, or any reference material that agents should be aware of…"
                rows={10}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-y font-mono text-xs leading-relaxed"
              />
            )}
            <p className="text-xs text-gray-400 mt-1">{content.split(/\s+/).filter(Boolean).length} words</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              >
                <option value="">— Select category —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Tags <span className="text-gray-400 font-normal">(comma separated)</span></label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="security, gdpr, onboarding"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Source URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://notion.so/your-doc or https://confluence.company.com/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          {/* Scope toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <button
              onClick={() => setIsGlobal(true)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                isGlobal ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100',
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              Global — all workflows
            </button>
            <button
              onClick={() => setIsGlobal(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                !isGlobal ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100',
              )}
            >
              <Link2 className="w-3.5 h-3.5" />
              Workflow-specific
            </button>
            <p className="text-xs text-gray-400 ml-2">
              {isGlobal
                ? 'All agents in every workflow will see this document'
                : 'Only agents in the linked workflow will see this'}
            </p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 pb-5 shrink-0 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy || loadingContent}
            className="px-4 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add document'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Document card ─────────────────────────────────────────────────────────────

function DocCard({
  doc,
  onEdit,
  onDelete,
}: {
  doc: KBDoc;
  onEdit: (doc: KBDoc) => void;
  onDelete: (id: string) => void;
}) {
  const catColors: Record<string, string> = {
    'Company Policy': 'bg-blue-50 text-blue-600 border-blue-100',
    'Guidelines': 'bg-violet-50 text-violet-600 border-violet-100',
    'Brand Voice': 'bg-pink-50 text-pink-600 border-pink-100',
    'Product': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Market Context': 'bg-amber-50 text-amber-600 border-amber-100',
    'Compliance': 'bg-red-50 text-red-600 border-red-100',
    'Process': 'bg-orange-50 text-orange-600 border-orange-100',
    'Research': 'bg-cyan-50 text-cyan-600 border-cyan-100',
    'Technical': 'bg-teal-50 text-teal-600 border-teal-100',
    'Other': 'bg-gray-50 text-gray-600 border-gray-100',
  };
  const catStyle = catColors[doc.category ?? ''] ?? catColors['Other'];

  return (
    <div className="group bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all duration-150 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(doc)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { if (confirm(`Delete "${doc.title}"?`)) onDelete(doc.id); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {doc.category && (
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', catStyle)}>
            {doc.category}
          </span>
        )}
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1',
          doc.is_global
            ? 'bg-violet-50 text-violet-600 border-violet-100'
            : 'bg-gray-50 text-gray-500 border-gray-100',
        )}>
          {doc.is_global ? <Globe className="w-2.5 h-2.5" /> : <Link2 className="w-2.5 h-2.5" />}
          {doc.is_global ? 'Global' : 'Workflow'}
        </span>
        {doc.word_count != null && (
          <span className="text-[10px] text-gray-400">{doc.word_count.toLocaleString()} words</span>
        )}
        {doc.source_url && (
          <a
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-violet-500 hover:underline flex items-center gap-0.5"
          >
            <Link2 className="w-2.5 h-2.5" /> source
          </a>
        )}
      </div>

      {/* Tags */}
      {doc.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.tags.map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-500 rounded-md flex items-center gap-0.5">
              <Tag className="w-2 h-2" />{t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-[10px] text-gray-400 pt-2 border-t border-gray-50">
        Updated {relativeTime(doc.updated_at)}
      </div>
    </div>
  );
}

// ─── KnowledgePage ────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState<KBDoc | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: docs = [], isFetching } = useQuery({
    queryKey: ['knowledge-base', search, activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/knowledge?${params}`);
      if (!res.ok) return [];
      return res.json() as Promise<KBDoc[]>;
    },
    staleTime: 5_000,
  });

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel('knowledge-base')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_base' }, () => {
        qc.invalidateQueries({ queryKey: ['knowledge-base'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/knowledge/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-base'] }),
  });

  const filtered = activeCategory
    ? docs.filter(d => d.category === activeCategory)
    : docs;

  const categoryGroups = CATEGORIES.filter(c => docs.some(d => d.category === c));
  const uncategorized = docs.filter(d => !d.category);

  function openEdit(doc: KBDoc) {
    setEditDoc(doc);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditDoc(null);
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-600" />
              Knowledge Base
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Company context, policies, and guidelines — injected automatically into every agent&apos;s system prompt at runtime
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search docs…"
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>
            <button
              onClick={() => { setEditDoc(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add document
            </button>
          </div>
        </div>

        {/* How it works callout */}
        {docs.length > 0 && (
          <div className="mt-4 flex items-start gap-2.5 p-3 bg-violet-50 border border-violet-100 rounded-xl">
            <Layers className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-700 leading-relaxed">
              <strong>{docs.filter(d => d.is_global).length} global</strong> and{' '}
              <strong>{docs.filter(d => !d.is_global).length} workflow-specific</strong> documents are automatically injected into agent system prompts when workflows run.
              Global documents inform all agents across all workflows. Workflow-specific documents apply only to agents in that workflow.
            </p>
          </div>
        )}

        {/* Category filter pills */}
        {docs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                !activeCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              )}
            >
              All · {docs.length}
            </button>
            {categoryGroups.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                  activeCategory === cat ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600 hover:bg-violet-100',
                )}
              >
                {cat} · {docs.filter(d => d.category === cat).length}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isFetching && docs.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-base font-medium text-gray-500">No documents yet</p>
            <p className="text-sm mt-1.5 text-center max-w-sm leading-relaxed">
              Add company policies, brand guidelines, product context, compliance docs, or any background that agents should know about.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your first document
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No documents match your filter</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Global documents */}
            {(() => {
              const globalDocs = filtered.filter(d => d.is_global);
              if (!globalDocs.length) return null;
              return (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-3.5 h-3.5 text-violet-500" />
                    <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Global — all workflows</h2>
                    <span className="text-[11px] text-gray-300">{globalDocs.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {globalDocs.map(doc => (
                      <DocCard key={doc.id} doc={doc} onEdit={openEdit} onDelete={id => deleteMut.mutate(id)} />
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* Workflow-specific documents */}
            {(() => {
              const wfDocs = filtered.filter(d => !d.is_global);
              if (!wfDocs.length) return null;
              return (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Link2 className="w-3.5 h-3.5 text-gray-400" />
                    <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Workflow-specific</h2>
                    <span className="text-[11px] text-gray-300">{wfDocs.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {wfDocs.map(doc => (
                      <DocCard key={doc.id} doc={doc} onEdit={openEdit} onDelete={id => deleteMut.mutate(id)} />
                    ))}
                  </div>
                </section>
              );
            })()}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <DocModal
          doc={editDoc}
          onClose={closeModal}
          onSaved={() => qc.invalidateQueries({ queryKey: ['knowledge-base'] })}
        />
      )}
    </div>
  );
}
