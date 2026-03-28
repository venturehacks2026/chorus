import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';
import { createServerSupabase } from '@/lib/supabase-server';

/**
 * DataStore connector — persists and queries structured data in Supabase,
 * scoped to the workflow's silo. Agents use workflow_id + silo_name to
 * partition their data from other workflows.
 */
export class DataStoreConnector extends ConnectorBase {
  slug = 'data-store';
  name = 'Data Store';
  description = 'Persist structured data to a named silo table and query it later. Data survives across executions and is visible in the Data tab. ALWAYS pass data as a plain JSON object with meaningful field names (e.g. {"title":"...", "url":"...", "summary":"..."}), or as an array of such objects for bulk insert. Never pass raw strings.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['insert', 'query', 'list_tables', 'describe', 'delete'],
        description: 'insert: add row(s) | query: filter rows | list_tables: see all table names | describe: get table schema | delete: remove rows by id',
      },
      workflow_id: {
        type: 'string',
        description: 'The workflow ID that owns this silo (injected automatically by the orchestrator)',
      },
      silo_name: {
        type: 'string',
        description: 'Name of the data silo (e.g. "research_results", "price_data"). Created automatically if it doesn\'t exist.',
      },
      table_name: {
        type: 'string',
        description: 'Logical table name within the silo (e.g. "articles", "companies"). Defaults to "default".',
      },
      data: {
        description: 'For insert: a plain JSON object {"field": value, ...} or an array of such objects. Each key becomes a table column. Example: {"title": "Article A", "url": "https://...", "score": 9.2}',
      },
      filter: {
        type: 'object',
        description: 'For query/delete: key-value pairs to filter records by (matches against the data jsonb column).',
      },
      limit: {
        type: 'number',
        description: 'For query: max rows to return (default 50, max 500)',
      },
      ids: {
        type: 'array',
        description: 'For delete: array of record IDs to remove.',
        items: { type: 'string' },
      },
    },
    required: ['action', 'workflow_id', 'silo_name'],
  };

  async call({ config, input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const {
      action,
      workflow_id,
      silo_name,
      table_name = 'default',
      data,
      filter,
      limit: queryLimit = 50,
      ids,
    } = input as {
      action: string;
      workflow_id: string;
      silo_name: string;
      table_name?: string;
      data?: unknown;
      filter?: Record<string, unknown>;
      limit?: number;
      ids?: string[];
    };

    // Allow workflow_id to be injected via config (set by orchestrator) as fallback
    const wfId = workflow_id || (config.workflow_id as string);
    if (!wfId) return { content: 'Error: workflow_id is required' };

    const supabase = createServerSupabase();

    // Ensure the silo exists for this workflow
    const { data: silo, error: siloErr } = await supabase
      .from('data_silos')
      .upsert(
        { workflow_id: wfId, name: silo_name },
        { onConflict: 'workflow_id,name', ignoreDuplicates: false }
      )
      .select('id')
      .single();

    if (siloErr || !silo) {
      return { content: `Error creating/finding silo: ${siloErr?.message ?? 'unknown'}` };
    }

    const siloId = silo.id as string;

    // ── Actions ────────────────────────────────────────────────────────────

    if (action === 'insert') {
      if (data === undefined || data === null) return { content: 'Error: data is required for insert' };

      // Normalize: always store as array of plain objects.
      // Agents sometimes pass a raw string or number — wrap it.
      function toObject(d: unknown): Record<string, unknown> {
        if (typeof d === 'string') {
          // Try to parse as JSON first
          try { const p = JSON.parse(d); if (typeof p === 'object' && p !== null && !Array.isArray(p)) return p; } catch {}
          // Fall back to { value: "..." } so table columns render properly
          return { value: d };
        }
        if (typeof d === 'number' || typeof d === 'boolean') return { value: d };
        if (Array.isArray(d)) return { items: d };
        if (typeof d === 'object' && d !== null) return d as Record<string, unknown>;
        return { value: String(d) };
      }

      const rawRows = Array.isArray(data) ? data : [data];
      const rows = rawRows.map(toObject);

      const inserts = rows.map(d => ({
        silo_id: siloId,
        table_name,
        data: d,
      }));

      const { data: inserted, error } = await supabase
        .from('silo_records')
        .insert(inserts)
        .select('id, created_at');

      if (error) return { content: `Insert error: ${error.message}` };
      return {
        content: `Inserted ${inserted?.length ?? 0} record(s) into silo "${silo_name}" / table "${table_name}".\nIDs: ${inserted?.map((r: { id: string }) => r.id).join(', ')}`,
      };
    }

    if (action === 'query') {
      let q = supabase
        .from('silo_records')
        .select('id, data, created_at, updated_at')
        .eq('silo_id', siloId)
        .eq('table_name', table_name)
        .order('created_at', { ascending: false })
        .limit(Math.min(queryLimit, 500));

      // Apply jsonb filters
      if (filter && typeof filter === 'object') {
        for (const [key, val] of Object.entries(filter)) {
          q = q.filter(`data->>'${key}'`, 'eq', String(val));
        }
      }

      const { data: records, error } = await q;
      if (error) return { content: `Query error: ${error.message}` };
      if (!records?.length) return { content: `No records found in "${silo_name}" / "${table_name}"` };

      const preview = records.map((r: { id: string; data: unknown; created_at: string }) =>
        `[${r.id.slice(0, 8)}] ${JSON.stringify(r.data)}`
      ).join('\n');

      return {
        content: `Found ${records.length} record(s) in "${silo_name}" / "${table_name}":\n\n${preview}`,
        metadata: { records },
      };
    }

    if (action === 'list_tables') {
      const { data: tables, error } = await supabase
        .from('silo_records')
        .select('table_name')
        .eq('silo_id', siloId);

      if (error) return { content: `Error: ${error.message}` };

      const names = [...new Set((tables ?? []).map((r: { table_name: string }) => r.table_name))];
      if (!names.length) return { content: `Silo "${silo_name}" is empty. No tables yet.` };

      // Get row counts per table
      const counts = await Promise.all(names.map(async (t) => {
        const { count } = await supabase
          .from('silo_records')
          .select('*', { count: 'exact', head: true })
          .eq('silo_id', siloId)
          .eq('table_name', t);
        return { table: t, rows: count ?? 0 };
      }));

      return {
        content: `Silo "${silo_name}" tables:\n${counts.map(c => `  • ${c.table}: ${c.rows} rows`).join('\n')}`,
        metadata: { tables: counts },
      };
    }

    if (action === 'describe') {
      // Sample up to 5 rows to infer schema
      const { data: sample, error } = await supabase
        .from('silo_records')
        .select('data')
        .eq('silo_id', siloId)
        .eq('table_name', table_name)
        .limit(5);

      if (error) return { content: `Error: ${error.message}` };
      if (!sample?.length) return { content: `Table "${table_name}" in "${silo_name}" is empty.` };

      const allKeys = new Set<string>();
      (sample as { data: Record<string, unknown> }[]).forEach(r => Object.keys(r.data).forEach(k => allKeys.add(k)));

      const schema = [...allKeys].map(k => {
        const types = new Set((sample as { data: Record<string, unknown> }[])
          .map(r => typeof r.data[k])
          .filter(t => t !== 'undefined'));
        return `  ${k}: ${[...types].join(' | ')}`;
      }).join('\n');

      return {
        content: `Schema of "${silo_name}" / "${table_name}" (inferred from ${sample.length} rows):\n${schema}`,
      };
    }

    if (action === 'delete') {
      if (!ids?.length) return { content: 'Error: ids array is required for delete' };
      const { error } = await supabase
        .from('silo_records')
        .delete()
        .in('id', ids)
        .eq('silo_id', siloId);
      if (error) return { content: `Delete error: ${error.message}` };
      return { content: `Deleted ${ids.length} record(s).` };
    }

    return { content: `Unknown action: ${action}` };
  }
}
