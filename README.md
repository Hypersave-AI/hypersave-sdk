# Hypersave SDK

Official TypeScript/JavaScript SDK for the [Hypersave](https://hypersave.io) API - Your AI-powered memory layer.

## Installation

```bash
npm install hypersave
# or
yarn add hypersave
# or
pnpm add hypersave
```

## Quick Start

```typescript
import { HypersaveClient } from 'hypersave';

const client = new HypersaveClient({
  apiKey: 'your-api-key',
  // baseUrl: 'https://api.hypersave.io', // Optional, this is the default
});

// Save content to your memory
const saved = await client.save({
  content: 'Meeting notes: Discussed Q4 roadmap with the team...',
  category: 'Work',
});

// Ask questions about your saved content
const answer = await client.ask('What was discussed in the Q4 meeting?');
console.log(answer.answer);

// Search your memories
const results = await client.search('roadmap');
console.log(results.results);
```

## Features

- **Save**: Store any content (text, URLs, documents) with AI-powered analysis
- **Ask**: Get verified answers from your personal knowledge base
- **Search**: Find relevant documents and facts using semantic search
- **Query**: Multi-strategy search with reminder support
- **Profile**: Build and query your user profile from extracted facts
- **Graph**: Explore your knowledge graph
- **V7 Enhanced**: Chunk-based search, entity extraction, and more

## API Reference

### Configuration

```typescript
interface HypersaveConfig {
  apiKey: string;           // Required: Your API key
  baseUrl?: string;         // Optional: API base URL (default: https://api.hypersave.io)
  timeout?: number;         // Optional: Request timeout in ms (default: 30000)
  userId?: string;          // Optional: Default user ID for all requests
}
```

### Core Methods

#### `save(options)` - Save content

```typescript
// Async save (default) - returns immediately
const result = await client.save({
  content: 'https://example.com/article',
  title: 'Interesting Article',
  category: 'Research',
});

// Check status of async save
if (result.pendingId) {
  const status = await client.getSaveStatus(result.pendingId);
  console.log(status.status); // 'processing' | 'indexed' | 'complete' | 'error'
}
```

#### `saveSync(options)` - Save and wait for completion

```typescript
const result = await client.saveSync({
  content: 'Important note to remember',
});
console.log(`Saved! Extracted ${result.saved?.facts} facts`);
```

#### `ask(query)` - Ask a question

```typescript
const answer = await client.ask('What are my favorite programming languages?');
console.log(answer.answer);
console.log(`Confidence: ${answer.confidence}`);
console.log(`Used ${answer.context.memoriesUsed} memories`);
```

#### `search(query, options)` - Search documents and facts

```typescript
const results = await client.search('machine learning', {
  limit: 20,
  includeContext: true,
});

for (const result of results.results) {
  console.log(`[${result.type}] ${result.content} (${result.relevance})`);
}
```

#### `query(message, options)` - Multi-strategy search

```typescript
const result = await client.query('coffee meeting tomorrow', {
  limit: 30,
});

// Check for triggered reminders
if (result.reminders.length > 0) {
  console.log('Reminder:', result.reminders[0].content);
}

console.log(`Found ${result.stats.totalResults} results`);
```

#### `getMemories(options)` - List saved memories

```typescript
const memories = await client.getMemories({ limit: 100 });
console.log(`${memories.total} documents, ${memories.facts} facts`);

for (const doc of memories.documents) {
  console.log(`- ${doc.title} (${doc.type})`);
}
```

#### `getProfile()` - Get user profile

```typescript
const profile = await client.getProfile();
console.log('Profile:', profile.profile);
console.log(`Built from ${profile.facts.length} facts`);
```

#### `getGraph()` - Get knowledge graph

```typescript
const graph = await client.getGraph();
console.log(`${graph.nodes.length} nodes, ${graph.edges.length} edges`);
```

#### `deleteMemory(id)` - Delete a memory

```typescript
await client.deleteMemory('document-id-123');
```

#### `remind(options)` - Create a reminder

```typescript
const reminder = await client.remind({
  content: 'Buy milk',
  trigger: 'grocery store',
  priority: 3,
});
```

#### `getUsage()` - Get API usage stats

```typescript
const usage = await client.getUsage();
console.log(`${usage.usage.documentsIndexed} documents indexed`);
```

### V7 Enhanced API

Access enhanced features via `client.v7`:

```typescript
// Chunk-based search with modes
const results = await client.v7.search('quantum computing', {
  mode: 'deep',      // 'fast' | 'balanced' | 'deep'
  limit: 10,
});

// Ask with source citations
const answer = await client.v7.ask('What is quantum entanglement?');
console.log(answer.answer);
console.log('Sources:', answer.sources);

// Enhanced document ingestion
const ingested = await client.v7.ingest({
  content: 'Long document content...',
  title: 'Research Paper',
  type: 'text',
  category: 'Research',
});
console.log(`Created ${ingested.chunksCreated} chunks`);

// Get extracted entities
const entities = await client.v7.getEntities({ type: 'person' });
for (const entity of entities.entities) {
  console.log(`${entity.name} (${entity.mentions} mentions)`);
}

// Query by entity
const entityInfo = await client.v7.getEntity('Elon Musk');
console.log(`Found in ${entityInfo.documentCount} documents`);

// Get user facts
const facts = await client.v7.getFacts();
console.log(`${facts.count} facts stored`);
```

## Error Handling

The SDK provides typed errors for better error handling:

```typescript
import {
  HypersaveClient,
  HypersaveError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  isHypersaveError,
} from 'hypersave';

try {
  const result = await client.ask('my question');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof ValidationError) {
    console.error('Invalid request:', error.details);
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found');
  } else if (isHypersaveError(error)) {
    console.error(`API error (${error.statusCode}): ${error.message}`);
  } else {
    throw error;
  }
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  HypersaveConfig,
  SaveOptions,
  SaveResult,
  AskResult,
  SearchResult,
  DocumentType,
  CategoryType,
  SectorType,
} from 'hypersave';
```

## Examples

### Save a URL and get summary

```typescript
const result = await client.saveSync({
  content: 'https://arxiv.org/abs/2301.00001',
  category: 'Research',
});

console.log(`Saved: ${result.saved?.title}`);
console.log(`Extracted ${result.saved?.facts} facts`);
```

### Build a chatbot with memory

```typescript
async function chat(message: string) {
  // Search relevant context
  const context = await client.query(message, { limit: 5 });

  // Format context for your LLM
  const memories = context.results
    .map(r => r.content)
    .join('\n');

  // Pass to your LLM with the context
  const response = await yourLLM.chat({
    system: `Use this context from the user's memories:\n${memories}`,
    message,
  });

  return response;
}
```

### Semantic search with filtering

```typescript
const results = await client.v7.search('project deadlines', {
  mode: 'balanced',
  sectors: ['episodic', 'procedural'],
  limit: 20,
});
```

### Use with Local LLMs (Ollama)

Hypersave works as a memory layer for any LLM, including local open-source models:

```typescript
import { HypersaveClient } from 'hypersave';
import ollama from 'ollama';

const hypersave = new HypersaveClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.hypersave.io'
});

async function chatWithMemory(userMessage: string) {
  // Get memory-augmented answer from Hypersave
  const memoryResponse = await hypersave.ask(userMessage);

  console.log(`Found ${memoryResponse.context?.memoriesUsed} memories`);

  // Enhance with local LLM for richer response
  const response = await ollama.chat({
    model: 'gpt-oss:20b', // or llama3.1, mistral, etc.
    messages: [
      {
        role: 'system',
        content: `User info from memory: "${memoryResponse.answer}". Use this to personalize.`
      },
      { role: 'user', content: userMessage }
    ]
  });

  return response.message.content;
}

// Save facts to Hypersave
await hypersave.save({ content: 'I work as a software engineer at Google', type: 'text' });
await hypersave.save({ content: 'My dog Max loves to play fetch', type: 'text' });

// Query with memory - LLM now knows your personal context
const answer = await chatWithMemory('What is my job?');
// Output: "You work as a software engineer at Google"
```

**Validated with:** GPT-OSS 20B, Llama 3.1, Qwen 2.5, Gemma 2, and other Ollama-compatible models.

## License

MIT
