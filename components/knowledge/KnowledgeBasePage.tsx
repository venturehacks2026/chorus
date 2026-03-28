'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { SOPListItem, ASDListItem } from '@/lib/knowledge-types';
import SOPTable from './SOPTable';
import ASDCard from './ASDCard';
import ASDDetailModal from './ASDDetailModal';
import UploadSOPModal from './UploadSOPModal';
import SOPViewerModal from './SOPViewerModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function KnowledgeBasePage() {
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedAsdId, setSelectedAsdId] = useState<string | null>(null);
  const [compilingSopIds, setCompilingSopIds] = useState<Set<string>>(new Set());
  const [viewingSopId, setViewingSopId] = useState<string | null>(null);
  const [deletingSopId, setDeletingSopId] = useState<string | null>(null);
  const [extractingSopIds, setExtractingSopIds] = useState<Set<string>>(new Set());

  async function extractContractsFromSop(sop: { id: string; title: string; content?: string }) {
    setExtractingSopIds(prev => new Set(prev).add(sop.id));
    try {
      let content = sop.content;
      if (!content) {
        const res = await fetch(`/api/knowledge/sops/${sop.id}`);
        const data = await res.json();
        content = data.content ?? '';
      }
      await fetch('/api/contracts/extract-from-sop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sop_id: sop.id, sop_content: content, sop_title: sop.title }),
      });
    } catch {
      // Contract extraction is non-blocking
    } finally {
      setExtractingSopIds(prev => { const next = new Set(prev); next.delete(sop.id); return next; });
    }
  }

  // ── Data fetching ──
  const { data: sops = [], isLoading: sopsLoading } = useQuery<SOPListItem[]>({
    queryKey: ['sops'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge/sops');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const { data: asds = [], isLoading: asdsLoading } = useQuery<ASDListItem[]>({
    queryKey: ['asds'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge/asds');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasCompiling = data?.some(a => a.status === 'compiling');
      return hasCompiling ? 3000 : false;
    },
  });

  // ── Mutations ──
  const uploadText = useMutation({
    mutationFn: (body: { title: string; content: string }) =>
      fetch('/api/knowledge/sops/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['sops'] });
      setUploadOpen(false);
      if (data?.id) {
        extractContractsFromSop({ id: data.id, title: variables.title, content: variables.content });
      }
    },
  });

  const uploadFile = useMutation({
    mutationFn: (formData: FormData) =>
      fetch('/api/knowledge/sops/upload', {
        method: 'POST',
        body: formData,
      }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sops'] });
      setUploadOpen(false);
      if (data?.id) {
        extractContractsFromSop({ id: data.id, title: data.title ?? 'Uploaded SOP' });
      }
    },
  });

  const compile = useMutation({
    mutationFn: (sopId: string) =>
      fetch(`/api/knowledge/asds/compile/${sopId}`, { method: 'POST' }).then(r => r.json()),
    onMutate: (sopId) => {
      setCompilingSopIds(prev => new Set(prev).add(sopId));
    },
    onSettled: (_data, _err, sopId) => {
      setCompilingSopIds(prev => {
        const next = new Set(prev);
        next.delete(sopId);
        return next;
      });
      qc.invalidateQueries({ queryKey: ['asds'] });
    },
  });

  const deleteSop = useMutation({
    mutationFn: async (sopId: string) => {
      const res = await fetch(`/api/knowledge/sops/${sopId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      return res.json();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['sops'] });
      qc.invalidateQueries({ queryKey: ['asds'] });
      setDeletingSopId(null);
    },
  });

  const isUploading = uploadText.isPending || uploadFile.isPending;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* header */}
      <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-semibold">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload SOPs and compile agent skill documents</p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Upload SOP
        </button>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {(sopsLoading && asdsLoading) ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Documents section */}
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Documents</h2>
              {sopsLoading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                </div>
              ) : (
                <SOPTable
                  sops={sops}
                  asds={asds}
                  compilingSopIds={compilingSopIds}
                  onCompile={(sopId) => compile.mutate(sopId)}
                  onViewSOP={setViewingSopId}
                  onDelete={setDeletingSopId}
                />
              )}
            </section>

            {/* Agent Skills section */}
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Agent Skills</h2>
              {asdsLoading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                </div>
              ) : asds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <p className="text-sm text-gray-500">No agent skills yet</p>
                  <p className="text-xs text-gray-400 mt-1">Compile a document to generate an agent skill</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {asds.map(asd => (
                    <ASDCard key={asd.id} asd={asd} onClick={() => setSelectedAsdId(asd.id)} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* modals / drawers */}
      <UploadSOPModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmitText={(title, content) => uploadText.mutate({ title, content })}
        onSubmitFile={(formData) => uploadFile.mutate(formData)}
        isPending={isUploading}
      />

      <SOPViewerModal sopId={viewingSopId} onClose={() => setViewingSopId(null)} />

      {deletingSopId && (
        <ConfirmDeleteModal
          sopTitle={sops.find(s => s.id === deletingSopId)?.title ?? 'this SOP'}
          onConfirm={() => deleteSop.mutate(deletingSopId)}
          onCancel={() => setDeletingSopId(null)}
          isPending={deleteSop.isPending}
        />
      )}

      {selectedAsdId && (
        <ASDDetailModal asdId={selectedAsdId} onClose={() => setSelectedAsdId(null)} />
      )}
    </div>
  );
}
