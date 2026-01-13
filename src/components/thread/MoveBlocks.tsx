import { useState } from 'react'
import {
  Bot,
  ChevronRight,
  FileText,
  FolderOpen,
  Lightbulb,
  ListTodo,
  MessageSquare,
  Search,
  Terminal,
} from 'lucide-react'
import './MoveBlocks.css'

// Extract filename from a path
function getFileName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

// Extract file-related info from tool input for display in header
function getToolFileInfo(toolName: string, inputObject?: Record<string, unknown>): string[] {
  if (!inputObject) return []
  
  switch (toolName) {
    case 'read_file':
    case 'edit_file':
    case 'create_file':
    case 'delete_file': {
      const path = inputObject.path ?? inputObject.target_file ?? inputObject.file_path
      if (typeof path === 'string') return [getFileName(path)]
      return []
    }
    case 'list_files': {
      const path = inputObject.path ?? inputObject.directory
      if (typeof path === 'string') return [path.endsWith('/') ? path : `${path}/`]
      return []
    }
    default:
      return []
  }
}

export type StreamSegment = { id: string; text: string }

export function StreamText({ segments }: { segments: StreamSegment[] }) {
  return (
    <span className="stream-text">
      {segments.map((seg) => (
        <span key={seg.id} className="stream-segment">
          {seg.text}
        </span>
      ))}
    </span>
  )
}

export function UserMessageBubble({ content, sticky = false }: { content: string; sticky?: boolean }) {
  return (
    <div className={`user-message ${sticky ? 'sticky' : ''}`}>
      <div className="message-label">You</div>
      <div className="message-content">{content}</div>
    </div>
  )
}

interface ToolMeta {
  icon: React.ReactNode
  label: string
}

function getToolMeta(toolName: string): ToolMeta {
  switch (toolName) {
    case 'read_file':
      return { icon: <FileText size={12} />, label: 'Reading File' }
    case 'search_codebase':
      return { icon: <Search size={12} />, label: 'Searching Codebase' }
    case 'execute_command':
      return { icon: <Terminal size={12} />, label: 'Running Command' }
    case 'list_files':
      return { icon: <FolderOpen size={12} />, label: 'Listing Files' }
    case 'think':
      return { icon: <Lightbulb size={12} />, label: 'Thinking' }
    case 'create_procedure':
      return { icon: <ListTodo size={12} />, label: 'Creating Procedure' }
    case 'web_search':
      return { icon: <Search size={12} />, label: 'Searching Web' }
    case 'edit_file':
      return { icon: <FileText size={12} />, label: 'Editing File' }
    case 'create_file':
      return { icon: <FileText size={12} />, label: 'Creating File' }
    case 'delete_file':
      return { icon: <FileText size={12} />, label: 'Deleting File' }
    default:
      // Fallback: convert snake_case to Title Case for unknown tools
      const words = toolName.split('_')
      const titleCase = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      return { icon: <Terminal size={12} />, label: titleCase }
  }
}

// Stepper wrapper component
function MoveStep({
  icon,
  isActive,
  isDone,
  isLast,
  variant,
  children,
}: {
  icon: React.ReactNode
  isActive?: boolean
  isDone?: boolean
  isLast?: boolean
  variant?: 'thinking' | 'tool' | 'final'
  children: React.ReactNode
}) {
  return (
    <div className={`move-step ${isLast ? 'last' : ''}`}>
      <div className="step-rail">
        <div className={`step-icon ${variant ?? ''} ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
          {icon}
        </div>
        {!isLast && <div className="step-line" />}
      </div>
      <div className="step-content">
        {children}
      </div>
    </div>
  )
}

export function ThinkingBlock({
  segments,
  isCollapsed,
  onToggle,
  isStreaming,
}: {
  segments: StreamSegment[]
  isCollapsed: boolean
  onToggle: () => void
  isStreaming: boolean
}) {
  return (
    <div className={`move thinking-block ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="move-header" onClick={onToggle}>
        <span>Thinking</span>
        <ChevronRight size={14} className="chevron" />
      </div>
      <div className="move-content">
        <StreamText segments={segments} />
        {isStreaming && <span className="inline-cursor" />}
      </div>
    </div>
  )
}

export type ToolCallStatus = 'forming' | 'running' | 'done'

export type ToolCallData = {
  id: string
  name: string
  status: ToolCallStatus
  inputText?: string
  inputObject?: Record<string, unknown>
  resultText?: string
}

export function ToolCallBlock({
  name,
  inputText,
  inputObject,
  resultText,
  status,
  isCollapsed,
  onToggle,
}: {
  name: string
  inputText?: string
  inputObject?: Record<string, unknown>
  resultText?: string
  status: ToolCallStatus
  isCollapsed: boolean
  onToggle: () => void
}) {
  const showResult = typeof resultText === 'string' && resultText.length > 0
  const meta = getToolMeta(name)
  const fileInfo = getToolFileInfo(name, inputObject)

  return (
    <div className={`move tool-block ${isCollapsed ? 'collapsed' : ''} status-${status}`}>
      <div className="move-header" onClick={onToggle}>
        <span className="tool-label">{meta.label}</span>
        {fileInfo.length > 0 && (
          <span className="tool-file-pills">
            {fileInfo.map((file, i) => (
              <span key={i} className="tool-file-pill">
                {file}
              </span>
            ))}
          </span>
        )}
        <span className={`tool-status-pill ${status}`}>{status}</span>
        <ChevronRight size={14} className="chevron" />
      </div>
      <div className="move-content">
        <div className="tool-args">
          {inputText ? (
            <pre className="mono-pre">{inputText}</pre>
          ) : (
            <pre className="mono-pre">{JSON.stringify(inputObject ?? {}, null, 2)}</pre>
          )}
          {(status === 'forming' || status === 'running') && <div className="shimmer" />}
        </div>

        {showResult && (
          <div className="tool-result">
            <div className="tool-result-label">Result</div>
            <div className="tool-result-content">
              <pre className="mono-pre">{resultText}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export getToolMeta for use in AgentTurnView
export { getToolMeta }

export function LoadingIndicator({ label = 'Processing…' }: { label?: string }) {
  return (
    <div className="loading-indicator">
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span>{label}</span>
    </div>
  )
}

export function AgentTurnView({
  title = 'Agent',
  moves,
  finalSegments,
  isStreaming,
}: {
  title?: string
  moves: Array<
    | { type: 'thinking'; id: string; segments: StreamSegment[]; isStreaming: boolean }
    | {
        type: 'tool_call'
        id: string
        name: string
        inputText?: string
        inputObject?: Record<string, unknown>
        resultText?: string
        status: ToolCallStatus
      }
    | {
        type: 'tool_group'
        id: string
        tools: ToolCallData[]
      }
  >
  finalSegments: StreamSegment[]
  isStreaming: boolean
}) {
  // Tracks moves user has toggled from their default state
  // Thinking: default expanded (toggled = collapsed)
  // Tool calls: default collapsed (toggled = expanded)
  const [toggledMoves, setToggledMoves] = useState<Set<string>>(new Set())

  const toggleMove = (moveId: string) => {
    setToggledMoves((prev) => {
      const next = new Set(prev)
      if (next.has(moveId)) next.delete(moveId)
      else next.add(moveId)
      return next
    })
  }

  const hasFinalAnswer = finalSegments.length > 0
  const isFinalAnswerDone = hasFinalAnswer && !isStreaming

  return (
    <div className="agent-turn">
      <div className="turn-header">
        <Bot size={16} />
        <span>{title}</span>
        {isStreaming && <span className="header-spinner" />}
        <span className="move-count">
          {moves.length} move{moves.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="move-steps">
        {moves.map((move, index) => {
          const isLastMove = index === moves.length - 1 && !hasFinalAnswer

          if (move.type === 'thinking') {
            const isThinkingDone = !move.isStreaming
            return (
              <MoveStep
                key={move.id}
                icon={<Lightbulb size={12} />}
                isActive={move.isStreaming}
                isDone={isThinkingDone}
                isLast={isLastMove}
                variant="thinking"
              >
                <ThinkingBlock
                  segments={move.segments}
                  isCollapsed={toggledMoves.has(move.id)}
                  onToggle={() => toggleMove(move.id)}
                  isStreaming={move.isStreaming}
                />
              </MoveStep>
            )
          }

          // Tool group (parallel tools)
          if (move.type === 'tool_group') {
            const allDone = move.tools.every(t => t.status === 'done')
            const anyActive = move.tools.some(t => t.status === 'forming' || t.status === 'running')
            // Use first tool's icon as the group icon
            const firstMeta = move.tools.length > 0 ? getToolMeta(move.tools[0].name) : { icon: <Terminal size={12} /> }

            return (
              <MoveStep
                key={move.id}
                icon={firstMeta.icon}
                isActive={anyActive}
                isDone={allDone}
                isLast={isLastMove}
                variant="tool"
              >
                <div className="tool-group">
                  {move.tools.map((tool) => (
                    <ToolCallBlock
                      key={tool.id}
                      name={tool.name}
                      inputText={tool.inputText}
                      inputObject={tool.inputObject}
                      resultText={tool.resultText}
                      status={tool.status}
                      isCollapsed={!toggledMoves.has(tool.id)}
                      onToggle={() => toggleMove(tool.id)}
                    />
                  ))}
                </div>
              </MoveStep>
            )
          }

          // Single tool call
          const meta = getToolMeta(move.name)
          const isToolDone = move.status === 'done'
          const isToolActive = move.status === 'forming' || move.status === 'running'

          return (
            <MoveStep
              key={move.id}
              icon={meta.icon}
              isActive={isToolActive}
              isDone={isToolDone}
              isLast={isLastMove}
              variant="tool"
            >
              <ToolCallBlock
                name={move.name}
                inputText={move.inputText}
                inputObject={move.inputObject}
                resultText={move.resultText}
                status={move.status}
                isCollapsed={!toggledMoves.has(move.id)}
                onToggle={() => toggleMove(move.id)}
              />
            </MoveStep>
          )
        })}

        {hasFinalAnswer && (
          <MoveStep
            icon={<MessageSquare size={12} />}
            isActive={isStreaming}
            isDone={isFinalAnswerDone}
            isLast={true}
            variant="final"
          >
            <div className="final-answer">
              <StreamText segments={finalSegments} />
              {isStreaming && <span className="inline-cursor" />}
            </div>
          </MoveStep>
        )}
      </div>
    </div>
  )
}
