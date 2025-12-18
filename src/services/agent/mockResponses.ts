/**
 * Mock tool responses for prototype/demo mode
 * 
 * In production, these would be replaced with actual tool implementations
 * that interact with the file system, execute commands, etc.
 */

interface ReadFileInput {
  path: string
}

interface SearchCodebaseInput {
  query: string
  file_pattern?: string
}

interface ExecuteCommandInput {
  command: string
}

interface ListFilesInput {
  path: string
}

interface ThinkInput {
  thought: string
}

export interface ProcedureStageInput {
  label: string
  type: 'ai' | 'manual' | 'user' | 'approval' | 'default'
}

export interface CreateProcedureInput {
  title: string
  stages: ProcedureStageInput[]
}

type ToolInput = ReadFileInput | SearchCodebaseInput | ExecuteCommandInput | ListFilesInput | ThinkInput | CreateProcedureInput

/**
 * Mock file contents for demo purposes
 */
const MOCK_FILES: Record<string, string> = {
  'src/App.tsx': `import { useState } from 'react'
import { Canvas } from './components/Canvas'
import { Header } from './components/Header'
import { ChatPanel } from './components/ChatPanel'
import './App.css'

export function App() {
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  
  return (
    <div className="app">
      <Header onChatToggle={() => setIsChatOpen(!isChatOpen)} />
      <main className="app-main">
        <Canvas isLiveMode={isLiveMode} />
        <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </main>
    </div>
  )
}`,

  'package.json': `{
  "name": "control-tower",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@xyflow/react": "^12.0.0",
    "dagre": "^0.8.5",
    "d3-force": "^3.0.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`,

  'src/components/Canvas.tsx': `import { useCallback, useState, useMemo } from 'react'
import { ReactFlow, useNodesState, useEdgesState, Controls } from '@xyflow/react'
import { InboxNode } from './nodes/InboxNode'
import { OutboxNode } from './nodes/OutboxNode'
import { ProcedureNode } from './nodes/ProcedureNode'

const nodeTypes = {
  inbox: InboxNode,
  outbox: OutboxNode,
  procedure: ProcedureNode,
}

export function Canvas({ isLiveMode }: { isLiveMode: boolean }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  // ... more implementation
}`
}

/**
 * Get a mock response for a tool call
 */
export function getMockToolResponse(toolName: string, input: ToolInput): string {
  switch (toolName) {
    case 'think':
      return 'Thought recorded.'

    case 'read_file': {
      const { path } = input as ReadFileInput
      const content = MOCK_FILES[path]
      if (content) {
        return content
      }
      return `File not found: ${path}`
    }

    case 'search_codebase': {
      const { query } = input as SearchCodebaseInput
      return `Found 3 matches for "${query}":

src/components/Canvas.tsx:42
  const [nodes, setNodes] = useNodesState(initialNodes)

src/components/Canvas.tsx:156
  onNodesChange={onNodesChange}

src/services/ParticleSystem.ts:23
  private nodes: Map<string, NodePosition>`
    }

    case 'execute_command': {
      const { command } = input as ExecuteCommandInput
      if (command.includes('ls')) {
        return `src/
  components/
  services/
  App.tsx
  main.tsx
package.json
vite.config.ts`
      }
      if (command.includes('npm')) {
        return 'npm command executed successfully.'
      }
      if (command.includes('git')) {
        return `On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean`
      }
      return `Command executed: ${command}\nOutput: Success`
    }

    case 'list_files': {
      const { path } = input as ListFilesInput
      if (path.includes('components')) {
        return `Contents of ${path}:
- Canvas.tsx
- Header.tsx
- ChatPanel.tsx
- Timeline.tsx
- nodes/
  - InboxNode.tsx
  - OutboxNode.tsx
  - ProcedureNode.tsx`
      }
      if (path.includes('services')) {
        return `Contents of ${path}:
- ParticleSystem.ts
- CaseEngine.ts
- agent/
  - types.ts
  - tools.ts
  - client.ts`
      }
      return `Contents of ${path}:
- src/
- public/
- package.json
- vite.config.ts
- tsconfig.json`
    }

    case 'create_procedure': {
      const { title, stages } = input as CreateProcedureInput
      return `Created procedure "${title}" with ${stages.length} stages.`
    }

    default:
      return 'Tool executed successfully.'
  }
}

/**
 * Simulate a delay for mock responses (to feel more realistic)
 */
export async function getMockToolResponseWithDelay(
  toolName: string, 
  input: ToolInput,
  delayMs: number = 100
): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, delayMs))
  return getMockToolResponse(toolName, input)
}
