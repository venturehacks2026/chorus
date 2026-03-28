'use client';

import { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="w-full max-w-md bg-bg border border-border rounded-md shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm">New workflow</span>
          <button
            onClick={onClose}
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Research assistant"
              className="w-full bg-bg-subtle border border-border rounded-md px-3 py-2 text-sm placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-sand-400/40 focus:border-sand-400 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Task description</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should this agent pipeline accomplish?"
              rows={4}
              className="w-full bg-bg-subtle border border-border rounded-md px-3 py-2 text-sm placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-sand-400/40 focus:border-sand-400 transition-all resize-none"
              required
            />
          </div>

          <div className="space-y-0.5">
            <p className="text-xs text-text-subtle mb-1">Examples</p>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="w-full text-left text-xs text-text-muted hover:text-text px-2 py-1.5 rounded-md hover:bg-bg-muted transition-colors truncate"
              >
                {ex}
              </button>
            ))}
          </div>

          {err && (
            <p className="text-xs text-red-700 bg-red-100 border border-red-200 px-3 py-2 rounded-md">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !prompt.trim()}
            className={cn(
              'w-full py-2 rounded-md text-sm font-medium transition-all',
              'bg-sand-400 hover:bg-sand-500 text-sand-900',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {loading ? 'Generating workflow...' : 'Generate workflow'}
          </button>
        </form>
      </div>
    </div>
  );
}
