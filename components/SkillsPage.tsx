'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Loader2, BookOpen, CircleDot, GitBranch, ArrowRight } from 'lucide-react';
import type { ASDListItem, ASDStatus } from '@/lib/knowledge-types';
import { cn } from '@/lib/cn';

/* ── Hardcoded prompt-template skills ── */

interface Skill {
  command: string;
  name: string;
  description: string;
  category: string;
  systemPrompt: string;
  example: string;
}

const SKILLS: Skill[] = [
  // Research
  {
    command: '/research',
    name: 'Deep Research',
    category: 'Research',
    description: 'Thoroughly research a topic, synthesize multiple sources, and produce a structured report.',
    systemPrompt: 'You are a research specialist. When given a topic, you:\n1. Identify the key dimensions to explore\n2. Search for authoritative sources\n3. Synthesize findings into a clear, structured report with citations\n4. Flag any conflicting information or gaps',
    example: '/research latest developments in AI reasoning models',
  },
  {
    command: '/summarize',
    name: 'Summarize',
    category: 'Research',
    description: 'Condense any content into clear key points. Works on articles, docs, transcripts.',
    systemPrompt: 'You are a summarization expert. Extract the most important information, preserve key numbers and names, and present findings as concise bullet points followed by a one-paragraph executive summary.',
    example: '/summarize [paste article text]',
  },
  {
    command: '/compare',
    name: 'Compare & Contrast',
    category: 'Research',
    description: 'Objectively compare two or more options across defined dimensions.',
    systemPrompt: 'You are an analytical comparator. Create a structured comparison using a markdown table. For each dimension, assess each option objectively. Conclude with a recommendation based on the stated criteria.',
    example: '/compare GPT-4o vs Claude Haiku for customer support',
  },

  // Writing
  {
    command: '/draft',
    name: 'Draft Writer',
    category: 'Writing',
    description: 'Write polished first drafts of emails, reports, docs, or posts given a brief.',
    systemPrompt: 'You are a professional writer. Produce clean, well-structured drafts that match the requested tone. Ask for clarification if the brief is ambiguous before writing.',
    example: '/draft a product launch email for our new AI feature',
  },
  {
    command: '/rewrite',
    name: 'Rewrite & Improve',
    category: 'Writing',
    description: 'Improve clarity, tone, and structure of existing text without changing meaning.',
    systemPrompt: 'You are an editor. Rewrite the provided text to improve clarity and flow while preserving the original intent. Show the improved version and briefly explain the key changes.',
    example: '/rewrite [paste your draft]',
  },
  {
    command: '/bullets',
    name: 'Bullet Points',
    category: 'Writing',
    description: 'Convert any content into clean, scannable bullet points.',
    systemPrompt: 'Convert the provided content into concise, parallel bullet points. Each bullet should be a single idea, start with a verb or noun, and be readable in isolation.',
    example: '/bullets convert this meeting transcript into action items',
  },

  // Analysis
  {
    command: '/analyze',
    name: 'Data Analyst',
    category: 'Analysis',
    description: 'Analyze data, identify patterns, and surface actionable insights.',
    systemPrompt: 'You are a data analyst. Examine the provided data for patterns, anomalies, and trends. Present findings clearly with specific numbers. Suggest follow-up questions worth investigating.',
    example: '/analyze these Q3 sales numbers: [paste data]',
  },
  {
    command: '/critique',
    name: 'Critical Reviewer',
    category: 'Analysis',
    description: 'Identify weaknesses, risks, and blind spots in any plan, document, or argument.',
    systemPrompt: 'You are a critical reviewer. Identify logical gaps, unstated assumptions, missing evidence, and potential failure modes. Be direct but constructive. Organize feedback by severity.',
    example: '/critique our go-to-market strategy [paste doc]',
  },
  {
    command: '/extract',
    name: 'Entity Extractor',
    category: 'Analysis',
    description: 'Pull structured data (names, dates, numbers, entities) from unstructured text.',
    systemPrompt: 'Extract all relevant entities from the provided text. Return structured JSON with typed fields. Group related entities. Note any ambiguous or conflicting information.',
    example: '/extract all company names, dates, and dollar amounts from this contract',
  },

  // Code
  {
    command: '/code',
    name: 'Code Generator',
    category: 'Code',
    description: 'Generate clean, working code in any language from a plain-English description.',
    systemPrompt: 'You are a senior engineer. Write clean, well-commented code that follows best practices. Include error handling and edge cases. Explain any non-obvious decisions.',
    example: '/code a Python script that parses CSV and outputs JSON',
  },
  {
    command: '/debug',
    name: 'Debugger',
    category: 'Code',
    description: 'Find bugs, explain what went wrong, and provide a fixed version.',
    systemPrompt: 'Analyze the provided code or error message. Identify the root cause, explain why it fails, and provide a corrected version. Also note any other issues found.',
    example: '/debug [paste code + error message]',
  },
  {
    command: '/explain',
    name: 'Code Explainer',
    category: 'Code',
    description: 'Walk through code line by line, explaining what it does in plain English.',
    systemPrompt: 'Explain the provided code to someone who understands programming but is unfamiliar with this codebase. Cover what it does, how it works, and any key patterns or gotchas.',
    example: '/explain [paste code snippet]',
  },
];

const CATEGORIES = Array.from(new Set(SKILLS.map(s => s.category)));

const CATEGORY_COLOR: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Research: { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100',   dot: 'bg-blue-400' },
  Writing:  { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100', dot: 'bg-violet-400' },
  Analysis: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',  dot: 'bg-amber-400' },
  Code:     { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100',dot: 'bg-emerald-400' },
};

/* ── ASD status badge styles ── */

const ASD_STATUS_STYLE: Record<ASDStatus, string> = {
  compiling:           'bg-blue-50 text-blue-600',
  active:              'bg-emerald-50 text-emerald-700',
  needs_clarification: 'bg-amber-50 text-amber-600',
  needs_recompile:     'bg-red-50 text-red-600',
  archived:            'bg-gray-100 text-gray-500',
};

/* ── Prompt template card (existing) ── */

function SkillCard({ skill }: { skill: Skill }) {
  const c = CATEGORY_COLOR[skill.category] ?? CATEGORY_COLOR.Research;
  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-300 hover:shadow-sm transition-all duration-150">
      {/* Command + category */}
      <div className="flex items-start justify-between gap-2">
        <code className={cn(
          'text-sm font-mono font-bold px-2 py-0.5 rounded-lg border',
          c.bg, c.text, c.border,
        )}>
          {skill.command}
        </code>
        <span className={cn('text-[10px] font-semibold uppercase tracking-widest mt-1', c.text)}>
          {skill.category}
        </span>
      </div>

      {/* Name + description */}
      <div>
        <p className="text-sm font-semibold text-gray-900">{skill.name}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{skill.description}</p>
      </div>

      {/* System prompt preview */}
      <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">System prompt</p>
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3 font-mono">{skill.systemPrompt}</p>
      </div>

      {/* Example */}
      <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5 shrink-0">Example</span>
        <code className="text-[11px] text-gray-500 font-mono leading-relaxed line-clamp-2">{skill.example}</code>
      </div>
    </div>
  );
}

/* ── SOP-derived skill card (from Knowledge Base) ── */

function SOPSkillCard({ asd }: { asd: ASDListItem }) {
  const coverage = asd.automation_coverage_score ?? 0;
  const pct = Math.round(coverage * 100);

  return (
    <Link
      href="/knowledge"
      className="group bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-violet-600/40 hover:shadow-sm transition-all duration-150"
    >
      {/* top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <p className="font-semibold text-sm text-gray-900 leading-tight">{asd.skill_id}</p>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0', ASD_STATUS_STYLE[asd.status])}>
          {asd.status}
        </span>
      </div>

      {/* description */}
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">
        {asd.description || 'Agent skill compiled from SOP'}
      </p>

      {/* stats */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <CircleDot className="w-3 h-3" />
          v{asd.current_version}
        </span>
        <span className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          {asd.status === 'compiling' ? '...' : 'View graph'}
        </span>
      </div>

      {/* coverage bar */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-gray-400">Automation coverage</span>
          <span className="text-[11px] font-semibold text-gray-900 tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

/* ── Main page ── */

export default function SkillsPage() {
  const { data: asds = [], isLoading: asdsLoading } = useQuery<ASDListItem[]>({
    queryKey: ['asds'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge/asds');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const activeAsds = asds.filter(a => a.status !== 'archived');

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 shrink-0">
        <h1 className="text-base font-semibold text-gray-900">Skills</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Agent capabilities from compiled SOPs and prompt templates
        </p>
      </div>

      <div className="px-8 py-6 space-y-8">
        {/* SOP-derived skills section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                SOP-Derived Skills
              </h2>
            </div>
            <Link
              href="/knowledge"
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
            >
              Manage in Knowledge Base
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {asdsLoading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
            </div>
          ) : activeAsds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 border border-dashed border-gray-200 rounded-xl">
              <p className="text-sm text-gray-400">No SOP-derived skills yet</p>
              <Link
                href="/knowledge"
                className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-1 transition-colors"
              >
                Upload an SOP to get started
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeAsds.map(asd => (
                <SOPSkillCard key={asd.id} asd={asd} />
              ))}
            </div>
          )}
        </section>

        {/* Prompt template skills (existing hardcoded) */}
        {CATEGORIES.map(cat => {
          const c = CATEGORY_COLOR[cat];
          return (
            <section key={cat}>
              <div className="flex items-center gap-2 mb-4">
                <span className={cn('w-2 h-2 rounded-full', c?.dot)} />
                <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{cat}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {SKILLS.filter(s => s.category === cat).map(s => (
                  <SkillCard key={s.command} skill={s} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
