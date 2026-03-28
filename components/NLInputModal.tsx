'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const EXAMPLES = [
  'Research the latest AI model releases and write a comparison report',
  'Analyze a dataset, compute statistics, and summarize key findings',
  'Search for competitor news and draft a market intelligence brief',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, prompt: string) => Promise<unknown>;
  loading?: boolean;
  error?: string;
}

export default function NLInputModal({ open, onClose, onSubmit, loading, error }: Props) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [localError, setLocalError] = useState('');

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');
    try {
      await onSubmit(name.trim(), prompt.trim());
      setName('');
      setPrompt('');
    } catch (err) {
      setLocalError(String(err));
    }
  }

  const err = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-bg-muted border border-border rounded-2xl shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-muted flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <span className="font-semibold text-sm">New workflow</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-border text-text-subtle hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Research assistant"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Describe the task
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should this agent pipeline accomplish?"
              rows={4}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all resize-none"
              required
            />
          </div>

          {/* Examples */}
          <div className="space-y-1">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="w-full text-left text-xs text-text-subtle hover:text-text px-2 py-1.5 rounded-lg hover:bg-border transition-colors truncate"
              >
                {ex}
              </button>
            ))}
          </div>

          {err && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !prompt.trim()}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
              'bg-sand-400 hover:bg-sand-500 text-sand-900',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating workflow...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate workflow</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
