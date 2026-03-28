import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';
import type { WorkflowGraph } from '@/lib/types';

// ─── Skill definitions (server-side, no imports from client files) ────────────

const SKILL_PROMPTS: Record<string, { system: string; tools?: string[] }> = {
  brief:           { system: 'You write concise 1-page executive briefs: Situation, Key Facts, Options, Recommendation, Next Steps. Store in data-store.', tools: ['data-store'] },
  report:          { system: 'You write full structured Markdown reports: executive summary, sections, recommendations, appendix. Store in data-store.', tools: ['data-store'] },
  research:        { system: 'You are a research specialist. Identify dimensions, search multiple sources, synthesize with citations. Store in data-store.', tools: ['web-scraper', 'rss-reader', 'data-store'] },
  compare:         { system: 'You build scored comparison tables (1–5 per dimension) and give a clear recommendation with trade-offs. Store in data-store.', tools: ['web-scraper', 'data-store'] },
  summarize:       { system: 'You condense content into: TL;DR (2 sentences), Key Points (5-8 bullets), Notable Details, Gaps/Caveats.', tools: ['web-scraper'] },
  monitor:         { system: 'You fetch URLs, extract relevant data, store results with timestamps, flag anomalies vs prior data. Store in data-store.', tools: ['web-scraper', 'json-api', 'data-store'] },
  'news-digest':   { system: 'You aggregate RSS feeds and web articles, group by theme, write a structured digest with headline, summary, source, date. Store in data-store.', tools: ['rss-reader', 'web-scraper', 'data-store'] },
  swot:            { system: 'You conduct SWOT analyses: 3-5 points per quadrant with evidence, 2 critical strategic implications. Store in data-store.', tools: ['web-scraper', 'data-store'] },
  okrs:            { system: 'You generate 3-5 OKRs: inspiring time-bound Objective + 3 measurable Key Results each with confidence %. Store in data-store.', tools: ['data-store'] },
  competitor:      { system: 'You build competitor profiles: overview, products, pricing, GTM, strengths/weaknesses, recent news, differentiation. Store in data-store.', tools: ['web-scraper', 'rss-reader', 'data-store'] },
  analyze:         { system: 'You are a data analyst: compute stats, identify patterns and anomalies, form hypotheses, suggest 3 actionable next steps. Use code-executor for large datasets.', tools: ['code-executor', 'data-store'] },
  critique:        { system: 'You find weaknesses and risks: Strengths (2-3), Critical Issues (High/Med/Low), Logical Gaps, Assumptions, Fixes. Organized by severity.', tools: [] },
  extract:         { system: 'You extract structured entities (people, orgs, dates, amounts, locations) from unstructured text as JSON, deduplicated. Store in data-store.', tools: ['code-executor', 'data-store'] },
  audit:           { system: 'You audit processes against criteria: map current state, check each step (Pass/Fail/Gap), build audit table, compliance score, prioritized remediation plan. Store in data-store.', tools: ['data-store'] },
  code:            { system: 'You write clean, production-ready code with error handling. Outline approach first, then implement. Run with code-executor to verify. Store in data-store.', tools: ['code-executor', 'data-store'] },
  debug:           { system: 'You debug code: trace execution, identify root cause (not symptom), provide a verified fix. Run with code-executor to confirm. List other issues spotted.', tools: ['code-executor'] },
  'data-pipeline': { system: 'You build complete data pipelines: fetch → transform → validate → store. Report records processed and quality metrics. Store in data-store.', tools: ['rss-reader', 'web-scraper', 'json-api', 'code-executor', 'data-store'] },
  draft:           { system: 'You write polished first drafts: parse format/audience/tone, outline, write complete draft. No filler.', tools: ['data-store'] },
  'workflow-design': { system: 'You design optimized workflows: identify steps/decisions, assign human/AI/hybrid, define inputs/outputs, flag oversight needs. Output Chorus-compatible structure.', tools: ['data-store'] },
  'meeting-notes': { system: 'You transform raw notes: Meeting Summary, Attendees, Key Decisions, Action Items table (owner|task|due|priority), Open Questions, Next Meeting. Store in data-store.', tools: ['data-store'] },
};

const ITERATE_SYSTEM = `You are a workflow architect for Chorus. The user wants to iterate on an existing workflow graph.

Given the current JSON graph and the user's instruction, return an UPDATED WorkflowGraph JSON.

Rules:
- Preserve existing agent IDs and structure unless explicitly asked to change them
- When applying a /skill-<command> to an agent, update that agent's system_prompt to include the skill's behavior and add the skill's required tools to the agent's tools list
- If /skill-<command>@AgentName is specified, only apply to that agent; otherwise apply to the most relevant agent
- When adding new agents, use IDs like "agent-N" continuing from the highest existing N
- ALWAYS return valid JSON with the same schema as the input graph
- Return ONLY the JSON — no markdown, no explanation

Return format: { "agents": [...], "edges": [...] }`;

// ─── Connector availability ───────────────────────────────────────────────────

const FREE_CONNECTORS = ['web-scraper', 'rss-reader', 'json-api', 'code-executor', 'data-store', 'http', 'memory', 'file-reader'];
const KEYED_CONNECTORS = ['web-search', 'perplexity', 'parallel-research'];

async function getEnabledSlugs(): Promise<string[]> {
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.from('connector_secrets').select('slug').in('slug', KEYED_CONNECTORS);
    return [...FREE_CONNECTORS, ...(data ?? []).map((r: { slug: string }) => r.slug)];
  } catch {
    return FREE_CONNECTORS;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as { message: string; graph: WorkflowGraph };

    if (!body.message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const enabledSlugs = await getEnabledSlugs();

    // Parse /skill-<command> tokens from the message
    const skillTokenRegex = /\/skill-([\w-]+)(?:@([\w\s-]+))?/g;
    let match: RegExpExecArray | null;
    const skills: Array<{ command: string; agentTarget: string | null }> = [];
    while ((match = skillTokenRegex.exec(body.message)) !== null) {
      skills.push({ command: match[1], agentTarget: match[2] ?? null });
    }

    // Build skill context block
    let skillContext = '';
    if (skills.length > 0) {
      skillContext = '\n\n--- SKILLS TO APPLY ---\n';
      for (const { command, agentTarget } of skills) {
        const skill = SKILL_PROMPTS[command];
        if (!skill) continue;
        const tools = (skill.tools ?? []).filter(t => enabledSlugs.includes(t));
        skillContext += `\nSkill: /skill-${command}${agentTarget ? ` → apply to agent named "${agentTarget}"` : ' → apply to most relevant agent'}\n`;
        skillContext += `Behavior: ${skill.system}\n`;
        if (tools.length > 0) {
          skillContext += `Required tools: ${tools.join(', ')}\n`;
        }
      }
    }

    const userMessage = [
      `Available connectors: ${enabledSlugs.join(', ')}`,
      `\nCurrent graph:\n${JSON.stringify(body.graph, null, 2)}`,
      skillContext,
      `\nUser instruction: ${body.message.replace(/\/skill-[\w-]+(?:@[\w\s-]+)?/g, '').trim() || '(Apply the skills above)'}`,
    ].join('');

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: ITERATE_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    // Strip markdown fences
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

    let graph: WorkflowGraph;
    try {
      graph = JSON.parse(cleaned) as WorkflowGraph;
    } catch {
      return NextResponse.json({ error: 'Failed to parse updated graph', raw }, { status: 500 });
    }

    // Persist updated graph
    const supabase = createServerSupabase();
    await supabase.from('workflows').update({ graph_json: graph }).eq('id', id);

    return NextResponse.json({ graph });
  } catch (err) {
    console.error('[iterate]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
