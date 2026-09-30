/**
 * The Hypersave MCP tools. Each is a thin call to the public SDK, so the server
 * needs nothing but an API key and works against any Hypersave deployment.
 */
import type HypersaveClient from 'hypersave';

type Args = Record<string, unknown>;
type Schema = { type: 'object'; properties: Record<string, unknown>; required?: string[] };
export interface Tool {
  name: string;
  description: string;
  inputSchema: Schema;
  run: (client: HypersaveClient, args: Args) => Promise<unknown>;
}

const str = (description: string) => ({ type: 'string', description });
const num = (description: string) => ({ type: 'number', description });
const text = (args: Args, key: string): string => {
  const value = args[key];
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`"${key}" is required`);
  return value;
};
const opt = <T>(args: Args, key: string): T | undefined => (args[key] === undefined ? undefined : (args[key] as T));

export const TOOLS: Tool[] = [
  {
    name: 'hypersave_save',
    description: 'Save something to long-term memory (a note, a fact about the user, a conversation, a URL). Facts are extracted in the background.',
    inputSchema: { type: 'object', properties: { content: str('What to remember'), title: str('Optional title') }, required: ['content'] },
    run: (c, a) => c.save({ content: text(a, 'content'), title: opt(a, 'title') }),
  },
  {
    name: 'hypersave_ask',
    description: 'Answer a question from the user\'s memory, with the supporting sources.',
    inputSchema: { type: 'object', properties: { query: str('The question') }, required: ['query'] },
    run: (c, a) => c.ask(text(a, 'query')),
  },
  {
    name: 'hypersave_search',
    description: 'Search memory and return the most relevant memories without writing an answer.',
    inputSchema: { type: 'object', properties: { query: str('What to look for'), limit: num('Maximum results (default 10)') }, required: ['query'] },
    run: (c, a) => c.search(text(a, 'query'), { limit: opt(a, 'limit') }),
  },
  {
    name: 'hypersave_facts',
    description: 'List structured facts known about the user (identity, work, preferences, relationships, ...).',
    inputSchema: { type: 'object', properties: { category: str('Optional category filter'), limit: num('Maximum facts') } },
    run: (c, a) => c.getFacts({ category: opt(a, 'category'), limit: opt(a, 'limit') }),
  },
  {
    name: 'hypersave_update',
    description: 'Correct the value of a stored fact.',
    inputSchema: {
      type: 'object',
      properties: { factId: str('Fact id from hypersave_facts'), newValue: str('The corrected value'), confidence: num('Optional confidence 0-1') },
      required: ['factId', 'newValue'],
    },
    run: (c, a) => c.updateFact(text(a, 'factId'), {
      value: text(a, a.newValue === undefined && a.value !== undefined ? 'value' : 'newValue'),
      confidence: opt(a, 'confidence'),
    }),
  },
  {
    name: 'hypersave_profile',
    description: 'Get the user\'s assembled profile: who they are, what they work on, what they prefer.',
    inputSchema: { type: 'object', properties: { section: str('Optional section: identity, work, health, preference, ...') } },
    run: (c, a) => c.getProfile({ section: opt(a, 'section') }),
  },
  {
    name: 'hypersave_remind',
    description: 'Create a reminder (surfaced at a time or when a topic comes up), or list/check reminders.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'check', 'list'], description: 'Default create' },
        reminderContent: str('What to be reminded of (create)'),
        keywords: str('Comma-separated topics that trigger the reminder (create), e.g. "project,deadline"'),
        trigger: str('Alternatively a time, e.g. "tomorrow 9am" (create)'),
      },
    },
    run: (c, a) => {
      const action = (opt<string>(a, 'action') ?? 'create').toLowerCase();
      if (action === 'list') return c.getReminders();
      if (action === 'check') return c.getReminders({ includeTriggered: true });
      const content = text(a, a.reminderContent === undefined && a.content !== undefined ? 'content' : 'reminderContent');
      const keywords = opt<string>(a, 'keywords');
      if (keywords) return c.remind({ content, trigger: keywords, triggerType: 'context' });
      return c.remind({ content, trigger: text(a, 'trigger'), triggerType: 'time' });
    },
  },
  {
    name: 'hypersave_temporal',
    description: 'Time-aware memory: what happened around a date, a timeline, trends, or when something was first mentioned.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'timeline', 'trends', 'first_seen'], description: 'What to compute' },
        query: str('Question or subject'),
        days: num('Look-back window in days'),
      },
      required: ['action'],
    },
    run: (c, a) => c.temporal({ action: text(a, 'action') as 'search' | 'timeline' | 'trends' | 'first_seen', query: opt(a, 'query'), days: opt(a, 'days') }),
  },
  {
    name: 'hypersave_list',
    description: 'List recently saved memories.',
    inputSchema: { type: 'object', properties: { limit: num('Maximum memories (default 20)') } },
    run: (c, a) => c.getMemories({ limit: opt(a, 'limit') }),
  },
  {
    name: 'hypersave_delete',
    description: 'Delete a memory by id. This cannot be undone.',
    inputSchema: { type: 'object', properties: { id: str('Memory id from hypersave_list or search results') }, required: ['id'] },
    run: (c, a) => c.deleteMemory(text(a, 'id')),
  },
  {
    name: 'hypersave_graph',
    description: 'Get the knowledge graph of people, places, projects and how they relate.',
    inputSchema: { type: 'object', properties: { entity: str('Optional entity to centre on'), depth: num('Hops from the entity (default 1)') } },
    run: (c, a) => c.getGraph({ entity: opt(a, 'entity'), depth: opt(a, 'depth') }),
  },
  {
    name: 'hypersave_learn',
    description: 'Start learning recurring patterns from recent memories.',
    inputSchema: { type: 'object', properties: { lookbackDays: num('How many days to learn from') } },
    run: (c, a) => c.triggerLearning({ lookbackDays: opt(a, 'lookbackDays') }),
  },
  {
    name: 'hypersave_usage',
    description: 'Show this account\'s usage and plan limits.',
    inputSchema: { type: 'object', properties: {} },
    run: (c) => c.getUsage(),
  },
];
