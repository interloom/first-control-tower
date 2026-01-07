import type { AgentStreamEvent } from '../agent/types'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`
}

/**
 * Mock agent turn stream for Threads.
 *
 * This is intentionally UI-first: it yields small deltas so the UI can render
 * "forming/loading/streaming" states without calling external APIs.
 * 
 * Demonstrates all tool types:
 * - think: Internal reasoning
 * - search_codebase: Search for patterns
 * - read_file: Read file contents
 * - list_files: List directory contents
 * - execute_command: Run shell commands
 * - create_procedure: Canvas action - create procedure node
 * - update_procedure: Canvas action - update procedure node
 */
export async function* runMockThreadTurn(userText: string): AsyncGenerator<AgentStreamEvent> {
  yield { type: 'turn_start' }

  // ─────────────────────────────────────────────────────────────
  // 1. Thinking - internal reasoning
  // ─────────────────────────────────────────────────────────────
  const thinkingId = uid('thinking')
  yield { type: 'thinking_start', data: { id: thinkingId } }

  const thought =
    `Let me analyze this request.\n\n` +
    `User asked: "${userText}"\n\n` +
    `I'll need to:\n` +
    `1. Search the codebase for relevant patterns\n` +
    `2. Read the key configuration files\n` +
    `3. Create a procedure if needed\n`

  for (const chunk of splitForStreaming(thought, 18)) {
    await sleep(120)
    yield { type: 'thinking_delta', data: { id: thinkingId, delta: chunk } }
  }
  yield { type: 'thinking_end', data: { id: thinkingId, thought } }

  // ─────────────────────────────────────────────────────────────
  // 2. search_codebase - find relevant code
  // ─────────────────────────────────────────────────────────────
  const searchId = uid('tool')
  yield { type: 'tool_start', data: { id: searchId, name: 'search_codebase' } }

  const searchArgs = JSON.stringify({ query: 'ProcedureStage', file_pattern: '*.tsx' }, null, 2)
  for (const chunk of splitForStreaming(searchArgs, 20)) {
    await sleep(105)
    yield { type: 'tool_delta', data: { id: searchId, delta: chunk } }
  }
  yield { type: 'tool_end', data: { id: searchId, name: 'search_codebase', input: { query: 'ProcedureStage', file_pattern: '*.tsx' } } }

  await sleep(900)
  const searchResult = `Found 3 matches:\n• src/components/nodes/ProcedureNode.tsx:14\n• src/components/Canvas.tsx:89\n• src/components/ProcedureDetailPanel.tsx:22`
  yield { type: 'tool_result', data: { id: searchId, name: 'search_codebase', result: searchResult } }

  // ─────────────────────────────────────────────────────────────
  // 3. read_file - read the relevant file
  // ─────────────────────────────────────────────────────────────
  const readId = uid('tool')
  yield { type: 'tool_start', data: { id: readId, name: 'read_file' } }

  const readArgs = JSON.stringify({ path: 'src/components/nodes/ProcedureNode.tsx' }, null, 2)
  for (const chunk of splitForStreaming(readArgs, 20)) {
    await sleep(90)
    yield { type: 'tool_delta', data: { id: readId, delta: chunk } }
  }
  yield { type: 'tool_end', data: { id: readId, name: 'read_file', input: { path: 'src/components/nodes/ProcedureNode.tsx' } } }

  await sleep(750)
  const fileContent = `export interface ProcedureStage {\n  label: string\n  type: 'ai' | 'manual' | 'user' | 'approval' | 'default'\n  details?: string\n}\n\nexport const DEFAULT_PROCEDURE_STAGES: ProcedureStage[] = [\n  { label: 'Verify Email Recipient', type: 'ai' },\n  { label: 'Categorize Email', type: 'manual' },\n  // ... 8 more stages\n]`
  yield { type: 'tool_result', data: { id: readId, name: 'read_file', result: fileContent } }

  // ─────────────────────────────────────────────────────────────
  // 4. list_files - explore directory structure
  // ─────────────────────────────────────────────────────────────
  const listId = uid('tool')
  yield { type: 'tool_start', data: { id: listId, name: 'list_files' } }

  const listArgs = JSON.stringify({ path: 'src/services' }, null, 2)
  for (const chunk of splitForStreaming(listArgs, 20)) {
    await sleep(90)
    yield { type: 'tool_delta', data: { id: listId, delta: chunk } }
  }
  yield { type: 'tool_end', data: { id: listId, name: 'list_files', input: { path: 'src/services' } } }

  await sleep(600)
  const listResult = `src/services/\n├── agent/\n│   ├── client.ts\n│   ├── tools.ts\n│   └── types.ts\n├── threads/\n│   └── mockThreadAgent.ts\n├── CaseEngine.ts\n└── ParticleSystem.ts`
  yield { type: 'tool_result', data: { id: listId, name: 'list_files', result: listResult } }

  // ─────────────────────────────────────────────────────────────
  // 5. PARALLEL read_file calls - read multiple files at once
  // ─────────────────────────────────────────────────────────────
  const parallelRead1 = uid('tool')
  const parallelRead2 = uid('tool')
  const parallelRead3 = uid('tool')

  // Start all 3 tools before any finish (parallel execution)
  yield { type: 'tool_start', data: { id: parallelRead1, name: 'read_file' } }
  yield { type: 'tool_start', data: { id: parallelRead2, name: 'read_file' } }
  yield { type: 'tool_start', data: { id: parallelRead3, name: 'read_file' } }

  // Stream args for each (interleaved to simulate parallel)
  const args1 = JSON.stringify({ path: 'src/services/agent/client.ts' }, null, 2)
  const args2 = JSON.stringify({ path: 'src/services/agent/tools.ts' }, null, 2)
  const args3 = JSON.stringify({ path: 'src/services/agent/types.ts' }, null, 2)

  for (let i = 0; i < Math.max(args1.length, args2.length, args3.length); i += 15) {
    await sleep(60)
    if (i < args1.length) yield { type: 'tool_delta', data: { id: parallelRead1, delta: args1.slice(i, i + 15) } }
    if (i < args2.length) yield { type: 'tool_delta', data: { id: parallelRead2, delta: args2.slice(i, i + 15) } }
    if (i < args3.length) yield { type: 'tool_delta', data: { id: parallelRead3, delta: args3.slice(i, i + 15) } }
  }

  // End all tools (args complete)
  yield { type: 'tool_end', data: { id: parallelRead1, name: 'read_file', input: { path: 'src/services/agent/client.ts' } } }
  yield { type: 'tool_end', data: { id: parallelRead2, name: 'read_file', input: { path: 'src/services/agent/tools.ts' } } }
  yield { type: 'tool_end', data: { id: parallelRead3, name: 'read_file', input: { path: 'src/services/agent/types.ts' } } }

  // Results come back as they complete
  await sleep(400)
  yield { type: 'tool_result', data: { id: parallelRead1, name: 'read_file', result: 'export class AgentClient {\n  constructor(apiKey: string) { ... }\n  async streamTurn(messages) { ... }\n}' } }
  await sleep(300)
  yield { type: 'tool_result', data: { id: parallelRead2, name: 'read_file', result: 'export const TOOLS = [\n  { name: "read_file", ... },\n  { name: "search_codebase", ... },\n]' } }
  await sleep(250)
  yield { type: 'tool_result', data: { id: parallelRead3, name: 'read_file', result: 'export interface AgentStreamEvent {\n  type: string\n  data?: unknown\n}' } }

  // ─────────────────────────────────────────────────────────────
  // 6. Intermittent thinking - reflect before taking action
  // ─────────────────────────────────────────────────────────────
  const thinking2Id = uid('thinking')
  yield { type: 'thinking_start', data: { id: thinking2Id } }

  const thought2 =
    `Good, I now have a clear picture of the codebase structure.\n\n` +
    `The ProcedureStage interface supports 5 types: ai, manual, user, approval, default.\n` +
    `I should create a well-structured procedure that demonstrates these different stage types.\n`

  for (const chunk of splitForStreaming(thought2, 18)) {
    await sleep(100)
    yield { type: 'thinking_delta', data: { id: thinking2Id, delta: chunk } }
  }
  yield { type: 'thinking_end', data: { id: thinking2Id, thought: thought2 } }

  // ─────────────────────────────────────────────────────────────
  // 6. create_procedure - canvas action
  // ─────────────────────────────────────────────────────────────
  const createId = uid('tool')
  yield { type: 'tool_start', data: { id: createId, name: 'create_procedure' } }

  const createArgs = JSON.stringify({
    title: 'Document Review',
    stages: [
      { label: 'Receive Document', type: 'default' },
      { label: 'Extract Key Data', type: 'ai' },
      { label: 'Validate Information', type: 'manual' },
      { label: 'Request Approval', type: 'approval' },
      { label: 'Archive Document', type: 'ai' },
    ]
  }, null, 2)

  for (const chunk of splitForStreaming(createArgs, 25)) {
    await sleep(105)
    yield { type: 'tool_delta', data: { id: createId, delta: chunk } }
  }
  yield { type: 'tool_end', data: { 
    id: createId, 
    name: 'create_procedure', 
    input: {
      title: 'Document Review',
      stages: [
        { label: 'Receive Document', type: 'default' },
        { label: 'Extract Key Data', type: 'ai' },
        { label: 'Validate Information', type: 'manual' },
        { label: 'Request Approval', type: 'approval' },
        { label: 'Archive Document', type: 'ai' },
      ]
    }
  } }

  await sleep(1050)
  yield { type: 'tool_result', data: { id: createId, name: 'create_procedure', result: '✓ Created procedure "Document Review" with 5 stages' } }

  // ─────────────────────────────────────────────────────────────
  // 7. execute_command - run a shell command
  // ─────────────────────────────────────────────────────────────
  const execId = uid('tool')
  yield { type: 'tool_start', data: { id: execId, name: 'execute_command' } }

  const execArgs = JSON.stringify({ command: 'wc -l src/components/nodes/*.tsx' }, null, 2)
  for (const chunk of splitForStreaming(execArgs, 20)) {
    await sleep(90)
    yield { type: 'tool_delta', data: { id: execId, delta: chunk } }
  }
  yield { type: 'tool_end', data: { id: execId, name: 'execute_command', input: { command: 'wc -l src/components/nodes/*.tsx' } } }

  await sleep(840)
  const execResult = `  127 src/components/nodes/ProcedureNode.tsx\n   94 src/components/nodes/CaseNode.tsx\n   45 src/components/nodes/InboxNode.tsx\n  266 total`
  yield { type: 'tool_result', data: { id: execId, name: 'execute_command', result: execResult } }

  // ─────────────────────────────────────────────────────────────
  // Final message
  // ─────────────────────────────────────────────────────────────
  const finalText =
    `I've analyzed the codebase and created the procedure you requested.\n\n` +
    `**Summary:**\n` +
    `• Found the ProcedureStage interface with 5 stage types\n` +
    `• Created "Document Review" procedure with 5 stages\n` +
    `• The codebase has 266 lines across node components\n\n` +
    `The new procedure is now visible on your canvas. Let me know if you'd like to adjust any of the stages.`

  for (const chunk of splitForStreaming(finalText, 12)) {
    await sleep(96)
    yield { type: 'text_delta', data: { delta: chunk } }
  }

  yield { type: 'turn_end', data: { finalText, moveCount: 8 } }
}

function splitForStreaming(text: string, maxChunk: number) {
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxChunk))
    i += maxChunk
  }
  return chunks
}
