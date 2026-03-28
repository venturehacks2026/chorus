'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Workflow } from '@/lib/types';

const DOC_TYPE_LABELS: Record<string, string> = {
  sop: 'SOP',
  policy: 'Policy',
  process: 'Process Doc',
  runbook: 'Runbook',
  other: 'Other',
};

const STATUS_STYLE: Record<string, string> = {
  draft: 'text-gray-500 bg-gray-50',
  running: 'text-blue-500 bg-blue-50',
  completed: 'text-emerald-600 bg-emerald-50',
  failed: 'text-red-500 bg-red-50',
};

export default function KnowledgeBase() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [docType, setDocType] = useState('sop');
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['knowledge'],
    queryFn: () => fetch('/api/knowledge').then((r) => r.json()).then((d) => (Array.isArray(d) ? d : [])),
  });

  const ingest = useMutation({
    mutationFn: (body: { title: string; content: string; doc_type: string }) =>
      fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['knowledge'] });
      qc.invalidateQueries({ queryKey: ['workflows'] });
      setShowUpload(false);
      setTitle('');
      setContent('');
      if (data.workflow?.id) {
        router.push(`/workflows/${data.workflow.id}?new=1`);
      }
    },
  });

  const handleFileDrop = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const text = await file.text();
    setTitle(file.name.replace(/\.[^.]+$/, ''));
    setContent(text);
    setShowUpload(true);
    setDragActive(false);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="shrink-0 px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Knowledge Base</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Upload SOPs, policies, and process documents. Generate agent workflows with one click.
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Ingest Document
          </button>
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Ingest Document</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); handleFileDrop(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                  dragActive
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50',
                )}
              >
                <Upload className={cn('w-5 h-5', dragActive ? 'text-violet-500' : 'text-gray-300')} />
                <p className="text-sm text-gray-500">
                  Drop a file here or <span className="text-violet-600 font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-400">TXT, MD — plain text extracted</p>
                <input ref={fileRef} type="file" className="hidden" accept=".txt,.md" onChange={(e) => handleFileDrop(e.target.files)} />
              </div>

              {/* Title */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />

              {/* Type selector */}
              <div className="flex gap-2 flex-wrap">
                {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setDocType(val)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                      docType === val
                        ? 'bg-violet-50 text-violet-700 border-violet-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste document content here, or drop a file above…"
                rows={6}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none font-mono leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!title.trim() || !content.trim()) return;
                  ingest.mutate({ title: title.trim(), content: content.trim(), doc_type: docType });
                }}
                disabled={!title.trim() || !content.trim() || ingest.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-40"
              >
                {ingest.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate ASD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No documents ingested yet</p>
            <p className="text-xs text-gray-400">Upload an SOP or process document to generate an agent workflow</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 truncate max-w-[300px]">
                      {doc.description ?? doc.nl_prompt?.replace('[SOP] ', '').slice(0, 80)}
                    </span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <span className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0', STATUS_STYLE[doc.status] ?? STATUS_STYLE.draft)}>
                  {doc.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : null}
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>

                <button
                  onClick={() => router.push(`/workflows/${doc.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
