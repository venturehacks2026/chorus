'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

const EXAMPLES = [
  'Research the latest AI model releases and write a comparison report',
  'Analyze a dataset, compute statistics, and summarize key findings',
  'Search for competitor news and draft a market intelligence brief',
];

const INPUT = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-sm text-gray-900">New workflow</span>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Research assistant" className={INPUT} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Task description</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="What should this agent pipeline accomplish?"
              rows={4}
              className={`${INPUT} resize-none`}
              required
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">Examples</p>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="w-full text-left text-xs text-gray-500 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors truncate"
              >
                {ex}
              </button>
            ))}
          </div>

          {err && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !prompt.trim()}
            className={cn(
              'w-full py-2 rounded-lg text-sm font-semibold transition-all',
              'bg-violet-600 hover:bg-violet-700 text-white shadow-sm',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {loading ? 'Generating…' : 'Generate workflow'}
          </button>
        </form>
      </div>
    </div>
  );
}
