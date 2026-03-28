import { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, prompt: string) => Promise<void>;
}

const EXAMPLES = [
  'Research the latest trends in quantum computing and write a comprehensive summary report',
  'Analyze a CSV dataset, produce statistics, and generate a chart description',
  'Search for news about a company, extract key facts, and draft an investor brief',
];

export default function NLInputModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;

    setLoading(true);
    setError('');
    try {
      await onSubmit(name.trim(), prompt.trim());
      setName('');
      setPrompt('');
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-node-bg border border-node-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-node-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="text-base font-semibold text-white">New Workflow</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-node-border text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Workflow Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Research Assistant"
              className="w-full bg-black/30 border border-node-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent transition-colors"
              required
            />
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Describe the task in natural language
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want the agents to accomplish..."
              rows={5}
              className="w-full bg-black/30 border border-node-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent transition-colors resize-none"
              required
            />
          </div>

          {/* Examples */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Examples:</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="text-left text-xs text-gray-400 hover:text-accent-hover px-2 py-1 rounded hover:bg-accent/10 transition-colors truncate"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !prompt.trim()}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
              'bg-accent hover:bg-accent-hover text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating workflow...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Workflow
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
