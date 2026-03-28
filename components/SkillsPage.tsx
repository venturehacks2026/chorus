'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, ArrowRight } from 'lucide-react';
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
  tools?: string[];
}

const SKILLS: Skill[] = [

  // ── Research ──────────────────────────────────────────────────────────────
  {
    command: '/research',
    name: 'Deep Research',
    category: 'Research',
    description: 'Thoroughly research a topic across multiple sources, synthesize findings, and produce a structured report with citations.',
    systemPrompt: 'You are a research specialist. When given a topic:\n1. Identify key dimensions to explore (history, current state, key players, trends, risks)\n2. Search multiple sources using web-scraper and rss-reader\n3. Synthesize into a structured report with sections and citations\n4. Flag conflicting info or areas of uncertainty\nAlways cite sources. Never hallucinate facts. Store findings in data-store under silo "research" table "reports".',
    example: '/research latest developments in AI reasoning models',
    tools: ['web-scraper', 'rss-reader', 'web-search', 'data-store'],
  },
  {
    command: '/monitor',
    name: 'Web Monitor',
    category: 'Research',
    description: 'Fetch and analyze any URL for changes, news, pricing, or specific data points. Stores results for comparison.',
    systemPrompt: 'You are a web monitoring agent. For each URL:\n1. Fetch and extract relevant data using web-scraper\n2. Structure findings as a clean table or report\n3. Store each result in data-store (silo: "monitoring", table: match the domain) with a timestamp field\n4. Flag anything unusual, missing, or changed versus prior stored data\nReturn a summary of what was found and any anomalies.',
    example: '/monitor https://competitor.com/pricing — extract all pricing tiers',
    tools: ['web-scraper', 'json-api', 'data-store'],
  },
  {
    command: '/news-digest',
    name: 'News Digest',
    category: 'Research',
    description: 'Aggregate and summarize news from RSS feeds and web sources on any topic or industry.',
    systemPrompt: 'You are a news analyst. Steps:\n1. Fetch relevant RSS feeds using rss-reader for the requested topic\n2. For key stories, use web-scraper to get full article text\n3. Group stories by theme/significance\n4. Write a structured digest: headline, 2-sentence summary, source, date\n5. Store each article as a record in data-store (silo: "news", table: topic name)\nPrioritize recency and relevance. Filter out duplicates.',
    example: '/news-digest AI industry headlines this week',
    tools: ['rss-reader', 'web-scraper', 'data-store'],
  },
  {
    command: '/compare',
    name: 'Compare & Contrast',
    category: 'Research',
    description: 'Objectively compare options across defined dimensions with a scored table and recommendation.',
    systemPrompt: 'You are an analytical comparator. Steps:\n1. Define comparison dimensions from the user\'s context\n2. Research each option using web-scraper or json-api as needed\n3. Build a markdown comparison table with scores (1-5) per dimension\n4. Give a final recommendation with clear reasoning\nBe objective — acknowledge trade-offs. Store the comparison matrix in data-store.',
    example: '/compare GPT-4o vs Claude Haiku for customer support at scale',
    tools: ['web-scraper', 'data-store'],
  },
  {
    command: '/summarize',
    name: 'Summarize',
    category: 'Research',
    description: 'Condense any URL, document, or pasted content into a structured briefing.',
    systemPrompt: 'You are a summarization expert. Output format:\n1. **TL;DR** (2 sentences max)\n2. **Key points** (5-8 bullets, ≤15 words each)\n3. **Notable details** (numbers, names, dates worth preserving)\n4. **Gaps / caveats** (what the source doesn\'t cover)\nIf given a URL, use web-scraper to fetch it first. Preserve precision — never generalize away specific data.',
    example: '/summarize https://example.com/article',
    tools: ['web-scraper', 'file-reader'],
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  {
    command: '/report',
    name: 'Report Generator',
    category: 'Documents',
    description: 'Generate a full structured report (Markdown) from research data, stored in the data silo as a document.',
    systemPrompt: 'You are a professional report writer. Process:\n1. Gather all relevant context from the data-store or provided input\n2. Outline the report structure (executive summary, sections, conclusion)\n3. Write a complete, professional report in Markdown format\n4. Include: executive summary, key findings, supporting evidence, recommendations, appendix if needed\n5. Store the final report in data-store (silo: "documents", table: "reports") with fields: {title, content, summary, created_at, word_count}\nFormat cleanly with headers, bullets, and tables where appropriate.',
    example: '/report generate a competitive analysis report from the research in data silo "market_research"',
    tools: ['data-store', 'web-scraper'],
  },
  {
    command: '/brief',
    name: 'Executive Brief',
    category: 'Documents',
    description: 'Create a concise 1-page executive brief from complex data or research — decision-ready format.',
    systemPrompt: 'You are a strategic communications expert who writes for C-level audiences. Produce a one-page executive brief:\n**Situation** (2-3 sentences)\n**Key facts** (3-5 bullets with numbers)\n**Options** (2-3 paths forward, each with pros/cons)\n**Recommendation** (clear, actionable, justified)\n**Next steps** (3 bullets with owners and dates if known)\nNo jargon. Store in data-store (silo: "documents", table: "briefs").',
    example: '/brief summarize our Q3 performance data into an exec brief',
    tools: ['data-store'],
  },
  {
    command: '/policy-doc',
    name: 'Policy Document',
    category: 'Documents',
    description: 'Draft structured policy or procedure documents with sections, rules, and compliance notes.',
    systemPrompt: 'You are a policy and compliance writer. Draft a formal policy document with:\n1. **Purpose & Scope**\n2. **Policy Statements** — numbered rules\n3. **Procedures** — step-by-step compliance\n4. **Exceptions & Escalation**\n5. **Review & Ownership**\nWrite in formal, precise language. Store in data-store (silo: "documents", table: "policies").',
    example: '/policy-doc draft a data retention policy for a SaaS company handling PII',
    tools: ['data-store'],
  },
  {
    command: '/proposal',
    name: 'Proposal Writer',
    category: 'Documents',
    description: 'Write structured business proposals, RFP responses, or project plans.',
    systemPrompt: 'You are a business development writer. Create a structured proposal with: Executive Summary, Problem Statement, Proposed Solution, Deliverables & Timeline, Investment, Why Us, Next Steps. Store in data-store (silo: "documents", table: "proposals").',
    example: '/proposal write an RFP response for an enterprise AI automation contract',
    tools: ['data-store'],
  },
  {
    command: '/sop',
    name: 'SOP Writer',
    category: 'Documents',
    description: 'Create Standard Operating Procedures — the foundation for Chorus workflows. Can be uploaded to the Knowledge Base.',
    systemPrompt: 'You are an operations documentation specialist. Write a Standard Operating Procedure (SOP):\n1. **Process Name & ID**\n2. **Objective**\n3. **Scope**\n4. **Roles & Responsibilities** (RACI)\n5. **Prerequisites**\n6. **Step-by-Step Procedure** with [DECISION] points\n7. **Exception Handling**\n8. **Success Criteria**\nThis SOP can be uploaded to the Chorus Knowledge Base to auto-generate an agent workflow. Store in data-store (silo: "documents", table: "sops").',
    example: '/sop document our customer onboarding process from contract signed to first value delivered',
    tools: ['data-store'],
  },

  // ── Strategy ──────────────────────────────────────────────────────────────
  {
    command: '/swot',
    name: 'SWOT Analysis',
    category: 'Strategy',
    description: 'Perform a SWOT analysis on a company, product, or initiative with researched evidence.',
    systemPrompt: 'You are a strategic analyst. Conduct a thorough SWOT analysis:\n**Strengths** | **Weaknesses** | **Opportunities** | **Threats**\nFor each quadrant: 3-5 points with evidence. Research externally if needed. Conclude with the 2 most critical strategic implications. Store in data-store.',
    example: '/swot analyze our position in the enterprise AI automation market',
    tools: ['web-scraper', 'rss-reader', 'data-store'],
  },
  {
    command: '/okrs',
    name: 'OKR Generator',
    category: 'Strategy',
    description: 'Generate well-formed Objectives and Key Results from a strategic goal or initiative.',
    systemPrompt: 'You are an OKR facilitation expert. Generate 3-5 OKRs. For each: Objective (inspiring, time-bound), 3 Key Results (measurable, outcome-not-output). Include confidence score (%) per KR. Store structured OKRs in data-store.',
    example: '/okrs generate OKRs for growing our enterprise sales pipeline by Q3',
    tools: ['data-store'],
  },
  {
    command: '/competitor',
    name: 'Competitor Profile',
    category: 'Strategy',
    description: 'Build a detailed competitor intelligence profile from public web sources.',
    systemPrompt: 'You are a competitive intelligence analyst. Build a complete competitor profile:\n1. Overview (funding, size, founded)\n2. Products & Pricing\n3. Go-to-Market\n4. Strengths & Weaknesses\n5. Recent News\n6. Differentiation vs Us\nUse web-scraper, rss-reader, json-api. Store in data-store (silo: "competitors", table: company slug).',
    example: '/competitor profile HubSpot as a CRM competitor',
    tools: ['web-scraper', 'rss-reader', 'json-api', 'data-store'],
  },

  // ── Analysis ──────────────────────────────────────────────────────────────
  {
    command: '/analyze',
    name: 'Data Analyst',
    category: 'Analysis',
    description: 'Analyze data or metrics, find patterns, and surface actionable insights.',
    systemPrompt: 'You are a data analyst. Compute key statistics, identify patterns and anomalies, form hypotheses, suggest 3 actionable next steps, and note what additional data would help. Show your working. Use code-executor for large datasets.',
    tools: ['code-executor', 'data-store'],
    example: '/analyze these Q3 sales numbers: [paste CSV or data]',
  },
  {
    command: '/forecast',
    name: 'Trend Forecaster',
    category: 'Analysis',
    description: 'Project trends forward using historical data and contextual research with 3 scenarios.',
    systemPrompt: 'You are a forecasting analyst. Identify the trend, research external factors, produce 3 scenarios (conservative/base/optimistic) with confidence intervals. List top 3 risks per scenario. Store forecast in data-store.',
    tools: ['web-scraper', 'code-executor', 'data-store'],
    example: '/forecast our SaaS churn rate given these cohort numbers',
  },
  {
    command: '/critique',
    name: 'Critical Reviewer',
    category: 'Analysis',
    description: 'Find weaknesses, risks, and blind spots in any plan, argument, or document.',
    systemPrompt: 'You are a critical reviewer. Output: Strengths (2-3 bullets), Critical issues (High/Med/Low severity), Logical gaps, Unstated assumptions, Suggested fixes. Be direct and constructive. Organize by severity.',
    example: '/critique our go-to-market strategy: [paste doc]',
  },
  {
    command: '/extract',
    name: 'Entity Extractor',
    category: 'Analysis',
    description: 'Pull structured data (names, dates, numbers, entities) from unstructured text into data silo.',
    systemPrompt: 'Extract all relevant entities and return structured JSON: people, organizations, dates, amounts, locations. Deduplicate. Note ambiguous cases. Store extracted entities in data-store.',
    tools: ['code-executor', 'data-store'],
    example: '/extract all parties, dates, and amounts from this contract',
  },
  {
    command: '/audit',
    name: 'Process Auditor',
    category: 'Analysis',
    description: 'Audit a process or system against a set of criteria or policy — identify gaps and non-compliance.',
    systemPrompt: 'You are a process auditor. Map the current state, check each step against each criterion (Pass/Fail/Gap), build an audit findings table, produce an overall compliance score and prioritized remediation plan. Store in data-store.',
    example: '/audit our customer data handling process against GDPR requirements',
    tools: ['data-store'],
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    command: '/financial-model',
    name: 'Financial Modeler',
    category: 'Finance',
    description: 'Build financial projections, unit economics models, or scenario analyses from assumptions.',
    systemPrompt: 'You are a financial modeling expert. State all assumptions explicitly. Build revenue/cost/margin projections. Show unit economics (CAC, LTV, payback). Run 3 scenarios with sensitivity analysis. Use code-executor for calculations. Store in data-store.',
    tools: ['code-executor', 'data-store'],
    example: '/financial-model 3-year SaaS revenue model: 100 customers, $500 ACV, 15% monthly growth',
  },
  {
    command: '/market-size',
    name: 'Market Sizing',
    category: 'Finance',
    description: 'Calculate TAM, SAM, and SOM for a market using top-down and bottom-up approaches.',
    systemPrompt: 'You are a market sizing analyst. Calculate TAM (top-down from industry), SAM (serviceable segment), SOM (realistic 3-year capture). Research using web-scraper and rss-reader. Cite each data point. Store results in data-store.',
    tools: ['web-scraper', 'rss-reader', 'code-executor', 'data-store'],
    example: '/market-size the enterprise AI workflow automation market in North America',
  },

  // ── Comms ─────────────────────────────────────────────────────────────────
  {
    command: '/draft',
    name: 'Draft Writer',
    category: 'Comms',
    description: 'Write polished first drafts of emails, reports, docs, or social posts from a brief.',
    systemPrompt: 'You are a professional writer. Parse format, audience, and tone. Outline structure, then write a complete polished draft. Note any assumptions. Match tone exactly. No filler or padding.',
    example: '/draft a product launch email for enterprise customers — technical, concise',
    tools: ['data-store'],
  },
  {
    command: '/pitch',
    name: 'Pitch Deck Outline',
    category: 'Comms',
    description: 'Generate a structured pitch deck outline with narrative arc and slide-by-slide talking points.',
    systemPrompt: 'You are a pitch consultant. Create a pitch deck: Problem, Solution, Market (TAM/SAM/SOM), Product, Business Model, Traction, Team, Ask. For each slide: headline, 3-5 bullet talking points, suggested visual.',
    example: '/pitch deck for an AI agent orchestration platform raising Series A',
    tools: ['data-store'],
  },
  {
    command: '/email-sequence',
    name: 'Email Sequence',
    category: 'Comms',
    description: 'Write a multi-touch email sequence for outreach, onboarding, or nurture campaigns.',
    systemPrompt: 'You are a B2B copywriter. Write a complete sequence. For each email: subject line (A/B), preview text, opening hook, body, CTA, send timing. Escalate value/urgency across touches. Store in data-store (silo: "comms", table: "sequences").',
    example: '/email-sequence 5-touch cold outreach for enterprise buyers of AI automation tools',
    tools: ['data-store'],
  },

  // ── Operations ────────────────────────────────────────────────────────────
  {
    command: '/workflow-design',
    name: 'Workflow Designer',
    category: 'Operations',
    description: 'Design an optimized workflow for any business process — maps to Chorus agent graph.',
    systemPrompt: 'You are a business process architect. Identify all process steps and decision points. Assign each step: human, AI agent, or hybrid. Define inputs, outputs, dependencies. Flag steps needing human oversight. Output structured list convertible to a Chorus agent graph.',
    example: '/workflow-design an end-to-end lead qualification process for our sales team',
    tools: ['data-store'],
  },
  {
    command: '/incident',
    name: 'Incident Report',
    category: 'Operations',
    description: 'Structure and analyze an incident or outage report with root cause and remediation.',
    systemPrompt: 'You are an incident management specialist. Produce: Incident Summary, Timeline, Root Cause Analysis (5 Whys), Impact Assessment, Immediate Response, Remediation, Prevention. Blame-free and specific. Store in data-store (silo: "operations", table: "incidents").',
    example: '/incident write up the database outage on [date]: [describe what happened]',
    tools: ['data-store'],
  },
  {
    command: '/meeting-notes',
    name: 'Meeting Notes',
    category: 'Operations',
    description: 'Transform raw meeting notes or transcripts into structured, action-ready summaries.',
    systemPrompt: 'Transform raw notes into: Meeting Summary (2 sentences), Attendees, Key Decisions (numbered), Action Items (owner|task|due date|priority table), Open Questions, Next Meeting. Preserve all specifics. Store in data-store.',
    example: '/meeting-notes [paste transcript or raw notes]',
    tools: ['data-store'],
  },

  // ── Code ──────────────────────────────────────────────────────────────────
  {
    command: '/code',
    name: 'Code Generator',
    category: 'Code',
    description: 'Generate clean, production-ready code in any language with error handling and tests.',
    systemPrompt: 'You are a senior engineer. Outline approach first. Write clean, well-commented code with error handling and usage examples. Run the code using code-executor to verify it works. Store final code in data-store (silo: "code", table: "scripts") with fields: {language, purpose, code, verified}.',
    tools: ['code-executor', 'data-store'],
    example: '/code a Python script that fetches HN top stories and formats them as a digest',
  },
  {
    command: '/debug',
    name: 'Debugger',
    category: 'Code',
    description: 'Find the root cause of bugs, explain what went wrong, and provide a verified fix.',
    systemPrompt: 'You are a debugging expert. Trace execution mentally. Identify root cause (not symptom). Explain exactly why it fails. Provide a fixed version. Run the fix with code-executor to verify. List any other issues spotted.',
    tools: ['code-executor'],
    example: '/debug [paste code + error message]',
  },
  {
    command: '/refactor',
    name: 'Refactorer',
    category: 'Code',
    description: 'Improve code structure, readability, and performance without changing behavior.',
    systemPrompt: 'You are a refactoring specialist. Produce: refactored code (complete), diff-style summary of changes, rationale for each change. Run both versions with code-executor to verify equivalence. Flag unavoidable behavior changes.',
    tools: ['code-executor'],
    example: '/refactor this Python function for readability: [paste code]',
  },
  {
    command: '/data-pipeline',
    name: 'Data Pipeline',
    category: 'Code',
    description: 'Build an end-to-end data pipeline: fetch → transform → store in data silo.',
    systemPrompt: 'You are a data engineer. Build a complete pipeline: 1) Fetch data using rss-reader/web-scraper/json-api, 2) Transform with code-executor, 3) Validate data quality, 4) Store as structured objects in data-store, 5) Report records processed and quality metrics.',
    example: '/data-pipeline fetch HN top stories, extract title/score/url/comments, store in data silo',
    tools: ['rss-reader', 'web-scraper', 'json-api', 'code-executor', 'data-store'],
  },
];

const CATEGORIES = Array.from(new Set(SKILLS.map(s => s.category)));

const CAT_STYLE: Record<string, { bg: string; text: string; border: string; dot: string; activeBg: string }> = {
  Research:      { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100',    dot: 'bg-blue-400',    activeBg: 'bg-blue-600' },
  Documents:     { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100',  dot: 'bg-violet-400',  activeBg: 'bg-violet-600' },
  Strategy:      { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-100',  dot: 'bg-indigo-400',  activeBg: 'bg-indigo-600' },
  Analysis:      { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',   dot: 'bg-amber-400',   activeBg: 'bg-amber-600' },
  Finance:       { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-400', activeBg: 'bg-emerald-600' },
  Comms:         { bg: 'bg-pink-50',    text: 'text-pink-600',    border: 'border-pink-100',    dot: 'bg-pink-400',    activeBg: 'bg-pink-600' },
  Operations:    { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-100',  dot: 'bg-orange-400',  activeBg: 'bg-orange-600' },
  Code:          { bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-100',    dot: 'bg-teal-400',    activeBg: 'bg-teal-600' },
};

const DEFAULT_STYLE = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', dot: 'bg-gray-400', activeBg: 'bg-gray-600' };

/* ── ASD status badge styles ── */

const ASD_STATUS_STYLE: Record<ASDStatus, string> = {
  compiling:           'bg-blue-50 text-blue-600',
  active:              'bg-emerald-50 text-emerald-700',
  needs_clarification: 'bg-amber-50 text-amber-600',
  needs_recompile:     'bg-red-50 text-red-600',
  archived:            'bg-gray-100 text-gray-500',
};

/* ── ASD skill card (SOP-derived) ── */

function SOPSkillCard({ asd }: { asd: ASDListItem }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-3 hover:border-violet-200 hover:shadow-sm transition-all duration-150">
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', ASD_STATUS_STYLE[asd.status])}>
          {asd.status.replace(/_/g, ' ')}
        </span>
        {asd.automation_coverage_score != null && (
          <span className="text-[10px] text-gray-400 font-medium tabular-nums">
            {Math.round(asd.automation_coverage_score * 100)}% coverage
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
          {asd.description ?? `ASD v${asd.current_version}`}
        </p>
        <p className="text-[10px] text-gray-400 mt-1 font-mono">v{asd.current_version}</p>
      </div>
      <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {new Date(asd.created_at).toLocaleDateString()}
        </span>
        <Link
          href={`/knowledge?asd=${asd.id}`}
          className="text-[11px] text-violet-600 hover:text-violet-700 font-medium transition-colors"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

/* ── Prompt template card ── */

function SkillCard({ skill }: { skill: Skill }) {
  const c = CAT_STYLE[skill.category] ?? DEFAULT_STYLE;
  return (
    <div className="group bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-200 hover:shadow-sm transition-all duration-150">
      <div className="flex items-start justify-between gap-2">
        <code className={cn('text-xs font-mono font-bold px-2 py-1 rounded-lg border', c.bg, c.text, c.border)}>
          {skill.command}
        </code>
        <span className={cn('text-[10px] font-semibold uppercase tracking-widest mt-1 shrink-0', c.text)}>
          {skill.category}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-900 leading-snug">{skill.name}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{skill.description}</p>
      </div>

      {skill.tools && skill.tools.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skill.tools.map(t => (
            <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-500 rounded-md">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 flex-1 min-h-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">System prompt</p>
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-4 whitespace-pre-line">{skill.systemPrompt}</p>
      </div>

      <div className="flex items-start gap-2 pt-2 border-t border-gray-50">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5 shrink-0">eg.</span>
        <code className="text-[11px] text-gray-400 font-mono leading-relaxed line-clamp-2">{skill.example}</code>
      </div>
    </div>
  );
}

/* ── Main page ── */

export default function SkillsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  const activeAsds = asds.filter(a => a.status !== 'archived');

  const filtered = SKILLS.filter(s => {
    const matchCat = !activeCategory || s.category === activeCategory;
    const matchSearch = !search || [s.name, s.command, s.description, s.category]
      .some(f => f.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const visibleCategories = Array.from(new Set(filtered.map(s => s.category)));

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Skills</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              SOP-derived capabilities and {SKILLS.length} prompt templates — use as{' '}
              <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[11px]">/skill</code>{' '}
              in agent system prompts
            </p>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>
        </div>

        {/* Category filter pills — only show when not searching ASD section */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn('px-3 py-1 rounded-full text-xs font-medium transition-all',
              !activeCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
          >
            All · {SKILLS.length}
          </button>
          {CATEGORIES.map(cat => {
            const c = CAT_STYLE[cat] ?? DEFAULT_STYLE;
            const count = SKILLS.filter(s => s.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium transition-all',
                  activeCategory === cat ? `${c.activeBg} text-white` : `${c.bg} ${c.text} hover:opacity-80`)}
              >
                {cat} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">

        {/* SOP-derived skills from Knowledge Base */}
        {!search && !activeCategory && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                  SOP-Derived Skills
                </h2>
                {activeAsds.length > 0 && (
                  <span className="text-[11px] text-gray-300">{activeAsds.length}</span>
                )}
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
                  Upload an SOP to get started →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeAsds.map(asd => <SOPSkillCard key={asd.id} asd={asd} />)}
              </div>
            )}
          </section>
        )}

        {/* Prompt template skills */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="text-sm">No skills match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          visibleCategories.map(cat => {
            const c = CAT_STYLE[cat] ?? DEFAULT_STYLE;
            const catSkills = filtered.filter(s => s.category === cat);
            return (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', c.dot)} />
                  <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{cat}</h2>
                  <span className="text-[11px] text-gray-300 font-medium">{catSkills.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {catSkills.map(s => <SkillCard key={s.command} skill={s} />)}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
