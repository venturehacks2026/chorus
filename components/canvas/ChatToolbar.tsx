'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Sparkles, ChevronRight, X } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { SKILLS, type Skill, SKILL_CATEGORIES } from '@/lib/skills';
import { cn } from '@/lib/cn';

const SKILL_TOKEN_RE = /\/skill(-[\w-]*)?$/;

const CATEGORY_COLOR: Record<string, string> = {
  Research: 'text-blue-600 bg-blue-50',
  Writing: 'text-violet-600 bg-violet-50',
  Analysis: 'text-amber-600 bg-amber-50',
  Code: 'text-emerald-600 bg-emerald-50',
};

export default function ChatToolbar({ workflowId }: { workflowId: string }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const loadGraph = useWorkflowStore((s) => s.loadGraph);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownIdx, setDropdownIdx] = useState(0);

  const match = message.match(SKILL_TOKEN_RE);
  const skillQuery = match !== null
    ? (match[1] ? match[1].slice(1) : '')
    : null;

  const suggestions: Skill[] = skillQuery !== null
    ? (skillQuery === ''
      ? SKILLS.filter(s => !selectedSkills.some(sel => sel.command === s.command))
      : SKILLS.filter(s => {
          if (selectedSkills.some(sel => sel.command === s.command)) return false;
          const cmd = s.command.slice(1);
          return cmd.includes(skillQuery) || s.name.toLowerCase().includes(skillQuery.toLowerCase());
        }))
    : [];

  useEffect(() => { setDropdownIdx(0); }, [skillQuery]);

  function applySkill(skill: Skill) {
    if (selectedSkills.some(s => s.command === skill.command)) return;
    setSelectedSkills(prev => [...prev, skill]);
    setMessage(msg => msg.replace(SKILL_TOKEN_RE, '').trimEnd() + (msg.replace(SKILL_TOKEN_RE, '').trimEnd() ? ' ' : ''));
    inputRef.current?.focus();
  }

  function removeSkill(command: string) {
    setSelectedSkills(prev => prev.filter(s => s.command !== command));
    inputRef.current?.focus();
  }

  const handleSubmit = useCallback(async () => {
    if (!message.trim() && selectedSkills.length === 0) return;
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const skillPrefix = selectedSkills.map(s => `/skill-${s.command.slice(1)}`).join(' ');
      const fullMessage = skillPrefix
        ? `${skillPrefix} ${message.trim()}`
        : message.trim();

      const res = await fetch(`/api/workflows/${workflowId}/iterate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.graph) {
        loadGraph(workflowId, data.graph);
      }
      setMessage('');
      setSelectedSkills([]);
    } catch (err) {
      setError(String((err as Error).message));
    } finally {
      setLoading(false);
    }
  }, [message, selectedSkills, loading, workflowId, loadGraph]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setDropdownIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setDropdownIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); applySkill(suggestions[dropdownIdx]); return; }
      if (e.key === 'Escape') { setMessage(msg => msg.replace(SKILL_TOKEN_RE, '')); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && suggestions.length === 0) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[520px] max-w-[calc(100%-3rem)] z-30">
      {error && (
        <div className="mb-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Skill autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div className="mb-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/60">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Skills</span>
          </div>
          {suggestions.map((skill, i) => (
            <button
              key={skill.command}
              onMouseDown={(e) => { e.preventDefault(); applySkill(skill); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                i === dropdownIdx ? 'bg-violet-50' : 'hover:bg-gray-50',
              )}
            >
              <code className={cn(
                'text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0',
                CATEGORY_COLOR[skill.category] ?? 'text-gray-600 bg-gray-50',
              )}>
                {skill.command}
              </code>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{skill.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{skill.description}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Skill chips */}
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5 px-1">
          {selectedSkills.map(skill => (
            <div
              key={skill.command}
              className={cn(
                'inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-lg text-xs font-medium border transition-colors',
                CATEGORY_COLOR[skill.category] ?? 'text-gray-600 bg-gray-50',
                'border-current/20',
              )}
            >
              <code className="text-[10px] font-mono font-bold">{skill.command}</code>
              <span className="text-[10px] opacity-70 truncate max-w-[120px]">{skill.name}</span>
              <button
                onClick={() => removeSkill(skill.command)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 transition-colors shrink-0"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className={cn(
        'flex items-center gap-2 bg-white border rounded-xl px-3 py-2 shadow-lg transition-all',
        'focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-400',
        loading ? 'border-violet-200 bg-violet-50/20' : 'border-gray-200',
      )}>
        <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Iterate on this workflow… try /skill to browse skills"
            disabled={loading}
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-40 leading-[1.4]"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={(!message.trim() && selectedSkills.length === 0) || loading}
          className={cn(
            'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all',
            (message.trim() || selectedSkills.length > 0) && !loading
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed',
          )}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
