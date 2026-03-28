'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitText: (title: string, content: string) => void;
  onSubmitFile: (formData: FormData) => void;
  isPending: boolean;
}

type Tab = 'text' | 'file';

export default function UploadSOPModal({ open, onClose, onSubmitText, onSubmitFile, isPending }: Props) {
  const [tab, setTab] = useState<Tab>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setTitle('');
    setContent('');
    setFile(null);
    setDragOver(false);
  }, []);

  function handleClose() {
    if (!isPending) {
      reset();
      onClose();
    }
  }

  function handleSubmit() {
    if (isPending) return;
    if (tab === 'text') {
      if (!title.trim() || !content.trim()) return;
      onSubmitText(title.trim(), content.trim());
      reset();
    } else {
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      if (title.trim()) fd.append('title', title.trim());
      onSubmitFile(fd);
      reset();
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  if (!open) return null;

  const canSubmit = tab === 'text'
    ? title.trim().length > 0 && content.trim().length > 0
    : !!file;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-lg mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold">Upload SOP</h2>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['text', 'file'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
                  tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900',
                )}
              >
                {t === 'text' ? 'Paste Text' : 'Upload File'}
              </button>
            ))}
          </div>

          {/* title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={tab === 'text' ? 'SOP title' : 'Title (optional — defaults to filename)'}
            className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          />

          {tab === 'text' ? (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste or type your SOP content here…"
              rows={8}
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none leading-relaxed"
            />
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
                dragOver
                  ? 'border-violet-400 bg-violet-50/50'
                  : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30',
              )}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-violet-500" />
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-300" />
                  <p className="text-sm text-gray-500">Drop a file here or click to browse</p>
                  <p className="text-xs text-gray-400">PDF, DOCX, or TXT</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isPending}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className={cn(
              'text-sm font-medium px-4 py-1.5 rounded-lg transition-colors',
              canSubmit && !isPending
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed',
            )}
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading…
              </span>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
