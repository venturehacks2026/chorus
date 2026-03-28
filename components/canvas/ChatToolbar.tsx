'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, Loader2, X, Sparkles, ChevronDown } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { cn } from '@/lib/cn';

// ─── Skill definitions ────────────────────────────────────────────────────────

interface SkillOption {
  command: string;   // e.g. "brief"
  name: string;
  description: string;
  category: string;
}

const SKILLS: SkillOption[] = [
  { command: 'brief',          name: 'Executive Brief',    description: 'Concise 1-page executive brief',             category: 'Documents' },
  { command: 'report',         name: 'Report Generator',   description: 'Full structured markdown report',            category: 'Documents' },
  { command: 'research',       name: 'Deep Research',      description: 'Multi-source research with citations via marketplace connectors', category: 'Research' },
  { command: 'compare',        name: 'Compare & Contrast', description: 'Scored comparison + recommendation using marketplace search',    category: 'Research' },
  { command: 'summarize',      name: 'Summarize',          description: 'Structured briefing from any content',       category: 'Research' },
  { command: 'monitor',        name: 'Web Monitor',        description: 'Track URL changes / pricing / data',         category: 'Research' },
  { command: 'news-digest',    name: 'News Digest',        description: 'Broad search + RSS feed aggregation',        category: 'Research' },
  { command: 'swot',           name: 'SWOT Analysis',      description: 'Evidence-backed SWOT via marketplace research', category: 'Strategy' },
  { command: 'okrs',           name: 'OKR Generator',      description: 'Well-formed OKRs from a strategic goal',     category: 'Strategy' },
  { command: 'competitor',     name: 'Competitor Profile', description: 'Competitive intel via marketplace connectors', category: 'Strategy' },
  { command: 'analyze',        name: 'Data Analyst',       description: 'Find patterns + surface actionable insights',category: 'Analysis' },
  { command: 'critique',       name: 'Critical Reviewer',  description: 'Weaknesses, risks, blind spots',             category: 'Analysis' },
  { command: 'extract',        name: 'Entity Extractor',   description: 'Pull structured data from unstructured text',category: 'Analysis' },
  { command: 'audit',          name: 'Process Auditor',    description: 'Audit against criteria or policy',           category: 'Analysis' },
  { command: 'code',           name: 'Code Generator',     description: 'Clean, production-ready code',               category: 'Code' },
  { command: 'debug',          name: 'Debugger',           description: 'Root cause + verified fix',                  category: 'Code' },
  { command: 'data-pipeline',  name: 'Data Pipeline',      description: 'End-to-end fetch → transform → store',       category: 'Code' },
  { command: 'draft',          name: 'Draft Writer',       description: 'Polished first drafts of any content',       category: 'Comms' },
  { command: 'workflow-design',name: 'Workflow Designer',  description: 'Optimized process → Chorus agent graph',     category: 'Operations' },
  { command: 'meeting-notes',  name: 'Meeting Notes',      description: 'Raw notes → structured action items',        category: 'Operations' },
];

const CAT_COLOR: Record<string, string> = {
  Research:   'bg-blue-100 text-blue-700',
  Documents:  'bg-violet-100 text-violet-700',
  Strategy:   'bg-indigo-100 text-indigo-700',
  Analysis:   'bg-amber-100 text-amber-700',
  Code:       'bg-teal-100 text-teal-700',
  Comms:      'bg-pink-100 text-pink-700',
  Operations: 'bg-orange-100 text-orange-700',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectedSkill {
  command: string;
  name: string;
  category: string;
  agentName: string;  // which agent to apply to ('any' = LLM decides)
}

interface Props {
  workflowId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatToolbar({ workflowId }: Props) {
  const [input, setInput] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const nodes = useWorkflowStore((s) => s.nodes);
  const loadGraph = useWorkflowStore((s) => s.loadGraph);

  // Close picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowSkillPicker(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Detect "/" in input to open skill picker
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.endsWith('/')) {
      setShowSkillPicker(true);
      setSkillSearch('');
    } else if (val.includes('/')) {
      const afterSlash = val.slice(val.lastIndexOf('/') + 1);
      setSkillSearch(afterSlash);
      setShowSkillPicker(true);
    } else {
      setShowSkillPicker(false);
    }
  }, []);

  const agentNames = nodes
    .filter(n => n.type === 'agent')
    .map(n => (n.data as { name?: string }).name ?? n.id);

  const filteredSkills = SKILLS.filter(s =>
    !skillSearch ||
    s.command.includes(skillSearch.toLowerCase()) ||
    s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(skillSearch.toLowerCase())
  );

  function selectSkill(skill: SkillOption) {
    setInput(prev => prev.replace(/\/\S*$/, '').trimEnd());
    setSelectedSkills(prev => {
      if (prev.find(s => s.command === skill.command)) return prev;
      return [...prev, { command: skill.command, name: skill.name, category: skill.category, agentName: 'any' }];
    });
    setShowSkillPicker(false);
    inputRef.current?.focus();
  }

  function removeSkill(command: string) {
    setSelectedSkills(prev => prev.filter(s => s.command !== command));
  }

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && selectedSkills.length === 0) || isLoading) return;

    setIsLoading(true);
    setError(null);

    const skillTokens = selectedSkills
      .map(s => s.agentName !== 'any' ? `/skill-${s.command}@${s.agentName}` : `/skill-${s.command}`)
      .join(' ');

    const message = [skillTokens, trimmed].filter(Boolean).join(' ');

    try {
      const res = await fetch(`/api/workflows/${workflowId}/iterate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, graph: useWorkflowStore.getState().toWorkflowGraph() }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { graph: unknown };
      if (data.graph) {
        loadGraph(workflowId, data.graph as Parameters<typeof loadGraph>[1]);
      }
      setInput('');
      setSelectedSkills([]);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedSkills, isLoading, workflowId, loadGraph]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showSkillPicker && filteredSkills.length > 0) {
        selectSkill(filteredSkills[0]);
      } else {
        handleSend();
      }
    }
    if (e.key === 'Escape') setShowSkillPicker(false);
  }

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4 pointer-events-none">
      <div className="pointer-events-auto">

        {/* Error */}
        {error && (
          <div className="mb-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
            <span className="text-xs text-red-600 flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        )}

        {/* Skill picker dropdown */}
        {showSkillPicker && (
          <div
            ref={pickerRef}
            className="mb-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto"
          >
            <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-semibold text-gray-600">Choose a skill</span>
              <span className="text-[10px] text-gray-400 ml-auto">↵ to select · Esc to close</span>
            </div>
            {filteredSkills.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400">No matching skills</div>
            ) : (
              filteredSkills.map(s => (
                <button
                  key={s.command}
                  onClick={() => selectSkill(s)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-violet-50 transition-colors text-left group"
                >
                  <code className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0', CAT_COLOR[s.category] ?? 'bg-gray-100 text-gray-600')}>
                    /{s.command}
                  </code>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 group-hover:text-violet-700">{s.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{s.description}</p>
                  </div>
                  <span className="text-[10px] text-gray-300 shrink-0 ml-auto">{s.category}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Main bar */}
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
          {/* Selected skill chips */}
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-0">
              {selectedSkills.map(s => (
                <div
                  key={s.command}
                  className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', CAT_COLOR[s.category] ?? 'bg-gray-100 text-gray-600')}
                >
                  <code>/{s.command}</code>
                  {/* Agent selector */}
                  {agentNames.length > 0 && (
                    <div className="relative group/select">
                      <button
                        className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity ml-0.5"
                        title="Apply to specific agent"
                      >
                        <span className="text-[10px]">{s.agentName === 'any' ? 'any' : s.agentName}</span>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      <div className="absolute bottom-full mb-1 left-0 hidden group-hover/select:block bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[120px]">
                        <button
                          onClick={() => setSelectedSkills(prev => prev.map(p => p.command === s.command ? { ...p, agentName: 'any' } : p))}
                          className="block w-full text-left px-3 py-1.5 text-xs hover:bg-violet-50 text-gray-700"
                        >
                          any agent
                        </button>
                        {agentNames.map(a => (
                          <button
                            key={a}
                            onClick={() => setSelectedSkills(prev => prev.map(p => p.command === s.command ? { ...p, agentName: a } : p))}
                            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-violet-50 text-gray-700 truncate"
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => removeSkill(s.command)} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKey}
              placeholder={selectedSkills.length > 0 ? 'Add instructions or just send…' : 'Iterate on the workflow… or type / to add a skill'}
              disabled={isLoading}
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-900 placeholder:text-gray-400 disabled:opacity-50"
            />
            <button
              onClick={() => { setShowSkillPicker(p => !p); setSkillSearch(''); }}
              className={cn(
                'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                showSkillPicker ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50',
              )}
              title="Browse skills"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSend}
              disabled={(!input.trim() && selectedSkills.length === 0) || isLoading}
              className={cn(
                'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                (input.trim() || selectedSkills.length > 0) && !isLoading
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed',
              )}
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ArrowUp className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
