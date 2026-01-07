import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import type { AgentStreamEvent } from '../services/agent/types'
import { runMockThreadTurn } from '../services/threads/mockThreadAgent'
import {
  AgentTurnView,
  type StreamSegment,
  type ToolCallData,
  type ToolCallStatus,
  UserMessageBubble,
} from './thread/MoveBlocks'
import './ThreadView.css'

type Rect = { top: number; left: number; width: number; height: number }

type ThreadMessage = { id: string; role: 'user'; content: string }

type ThreadMove =
  | { type: 'thinking'; id: string; segments: StreamSegment[]; isStreaming: boolean }
  | {
      type: 'tool_call'
      id: string
      name: string
      status: ToolCallStatus
      inputText?: string
      inputObject?: Record<string, unknown>
      resultText?: string
    }
  | {
      type: 'tool_group'
      id: string
      tools: ToolCallData[]
    }

type ThreadTurn = {
  id: string
  userMessage: string
  moves: ThreadMove[]
  finalSegments: StreamSegment[]
  isStreaming: boolean
}

export function ThreadView({
  threadId,
  threadTitle,
  initialMessage,
  pendingTransition,
  onTransitionDone,
}: {
  threadId: string
  threadTitle: string
  initialMessage: ThreadMessage
  pendingTransition: { messageId: string; from: Rect } | null
  onTransitionDone: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)

  const [composerText, setComposerText] = useState('')
  
  // All conversation turns (first one is from initial message, subsequent from follow-ups)
  const [turns, setTurns] = useState<ThreadTurn[]>(() => [{
    id: `turn-${threadId}-0`,
    userMessage: initialMessage.content,
    moves: [],
    finalSegments: [],
    isStreaming: true,
  }])

  // Transition overlay state
  const [transitionTo, setTransitionTo] = useState<Rect | null>(null)
  const [isTransitionActive, setIsTransitionActive] = useState(false)

  const canSend = composerText.trim().length > 0 && !turns.some(t => t.isStreaming)

  const pinnedMessageOpacity = useMemo(() => {
    if (!pendingTransition) return 1
    if (pendingTransition.messageId !== initialMessage.id) return 1
    return isTransitionActive ? 0 : 1
  }, [pendingTransition, initialMessage.id, isTransitionActive])

  // Run mock agent for a specific turn
  const runAgentTurn = useCallback(async (turnId: string, userText: string) => {
    const currentMoves: ThreadMove[] = []
    const finalSegments: StreamSegment[] = []

    const appendSegments = (segments: StreamSegment[], delta: string, prefix: string) => {
      const tokens = delta.split(/(\s+)/)
      for (const t of tokens) {
        if (!t) continue
        segments.push({ id: `${prefix}-${segments.length}-${Date.now()}`, text: t })
      }
    }

    const update = () => {
      setTurns((prev) => prev.map(turn => 
        turn.id === turnId 
          ? { ...turn, moves: [...currentMoves], finalSegments: [...finalSegments] }
          : turn
      ))
    }

    for await (const event of runMockThreadTurn(userText)) {
      handleEvent(event, currentMoves, finalSegments, appendSegments)
      update()

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      })
    }

    setTurns((prev) => prev.map(turn => 
      turn.id === turnId 
        ? { ...turn, isStreaming: false }
        : turn
    ))
  }, [])

  // Kick off first turn on mount
  useEffect(() => {
    runAgentTurn(turns[0].id, initialMessage.content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start bottom→top transition when arriving with pendingTransition
  useEffect(() => {
    if (!pendingTransition) return
    if (pendingTransition.messageId !== initialMessage.id) return

    const toRect = pinnedRef.current?.getBoundingClientRect()
    if (!toRect) return

    setTransitionTo({ top: toRect.top, left: toRect.left, width: toRect.width, height: toRect.height })
    setIsTransitionActive(true)

    const done = window.setTimeout(() => {
      setIsTransitionActive(false)
      setTransitionTo(null)
      onTransitionDone()
    }, 520)

    return () => window.clearTimeout(done)
  }, [pendingTransition, initialMessage.id, onTransitionDone])

  const submitFollowup = useCallback(() => {
    if (!canSend) return
    
    const text = composerText.trim()
    const turnId = `turn-${threadId}-${turns.length}`
    
    // Add new turn
    setTurns(prev => [...prev, {
      id: turnId,
      userMessage: text,
      moves: [],
      finalSegments: [],
      isStreaming: true,
    }])
    
    setComposerText('')
    
    // Start agent turn
    setTimeout(() => runAgentTurn(turnId, text), 50)
  }, [canSend, composerText, threadId, turns.length, runAgentTurn])

  return (
    <div className="thread-view">
      <div className="thread-scroll" ref={scrollRef}>
        {/* Pinned first message */}
        <div className="thread-pinned" ref={pinnedRef} style={{ opacity: pinnedMessageOpacity }}>
          <UserMessageBubble content={initialMessage.content} sticky />
        </div>

        {/* First agent turn */}
        <div className="thread-timeline">
          <AgentTurnView
            title="Agent"
            moves={turns[0].moves}
            finalSegments={turns[0].finalSegments}
            isStreaming={turns[0].isStreaming}
          />
        </div>

        {/* Follow-up turns */}
        {turns.slice(1).map((turn) => (
          <div key={turn.id} className="thread-followup">
            <div className="thread-followup-message">
              <UserMessageBubble content={turn.userMessage} />
            </div>
            <div className="thread-timeline">
              <AgentTurnView
                title="Agent"
                moves={turn.moves}
                finalSegments={turn.finalSegments}
                isStreaming={turn.isStreaming}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="thread-composer">
        <div className="thread-composer-inner">
          <textarea
            className="thread-textarea"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            placeholder="Send a follow-up…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
                e.preventDefault()
                submitFollowup()
              }
            }}
          />
          <button type="button" className="thread-send" onClick={submitFollowup} disabled={!canSend}>
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      {pendingTransition && transitionTo && isTransitionActive && (
        <MessageTransitionOverlay from={pendingTransition.from} to={transitionTo} content={initialMessage.content} />
      )}

      <div className="thread-debug" aria-hidden>
        <span>{threadTitle}</span>
      </div>
    </div>
  )
}

// Helper to find a tool by ID across both tool_call and tool_group moves
function findToolById(moves: ThreadMove[], toolId: string): ToolCallData | null {
  for (const move of moves) {
    if (move.type === 'tool_call' && move.id === toolId) {
      return move
    }
    if (move.type === 'tool_group') {
      const tool = move.tools.find(t => t.id === toolId)
      if (tool) return tool
    }
  }
  return null
}

// Check if there are any in-flight tools (not done)
function hasInFlightTools(moves: ThreadMove[]): boolean {
  const last = moves[moves.length - 1]
  if (!last) return false
  if (last.type === 'tool_call' && last.status !== 'done') return true
  if (last.type === 'tool_group') {
    return last.tools.some(t => t.status !== 'done')
  }
  return false
}

function handleEvent(
  event: AgentStreamEvent,
  moves: ThreadMove[],
  finalSegments: StreamSegment[],
  appendSegments: (segments: StreamSegment[], delta: string, prefix: string) => void
) {
  switch (event.type) {
    case 'thinking_start': {
      const data = event.data as { id: string }
      moves.push({ type: 'thinking', id: data.id, segments: [], isStreaming: true })
      return
    }

    case 'thinking_delta': {
      const data = event.data as { id: string; delta: string }
      const move = moves.find((m) => m.type === 'thinking' && m.id === data.id)
      if (move && move.type === 'thinking') {
        appendSegments(move.segments, data.delta, `thinking-${data.id}`)
      }
      return
    }

    case 'thinking_end': {
      const data = event.data as { id: string; thought: string }
      const move = moves.find((m) => m.type === 'thinking' && m.id === data.id)
      if (move && move.type === 'thinking') {
        move.isStreaming = false
      }
      return
    }

    case 'tool_start': {
      const data = event.data as { id: string; name: string }
      const newTool: ToolCallData = {
        id: data.id,
        name: data.name,
        status: 'forming',
        inputText: '',
      }

      // Check if we should group with existing in-flight tools
      if (hasInFlightTools(moves)) {
        const last = moves[moves.length - 1]
        if (last.type === 'tool_call') {
          // Convert single tool_call to tool_group
          const existingTool: ToolCallData = {
            id: last.id,
            name: last.name,
            status: last.status,
            inputText: last.inputText,
            inputObject: last.inputObject,
            resultText: last.resultText,
          }
          // Replace with group
          moves[moves.length - 1] = {
            type: 'tool_group',
            id: `group-${last.id}`,
            tools: [existingTool, newTool],
          }
        } else if (last.type === 'tool_group') {
          // Add to existing group
          last.tools.push(newTool)
        }
      } else {
        // Start new single tool_call
        moves.push({
          type: 'tool_call',
          ...newTool,
        })
      }
      return
    }

    case 'tool_delta': {
      const data = event.data as { id: string; delta: string }
      const tool = findToolById(moves, data.id)
      if (tool) {
        tool.inputText = (tool.inputText ?? '') + data.delta
      }
      return
    }

    case 'tool_end': {
      const data = event.data as { id: string; name: string; input: Record<string, unknown> }
      const tool = findToolById(moves, data.id)
      if (tool) {
        tool.status = 'running'
        tool.inputObject = data.input
      }
      return
    }

    case 'tool_result': {
      const data = event.data as { id: string; name: string; result: string }
      const tool = findToolById(moves, data.id)
      if (tool) {
        tool.status = 'done'
        tool.resultText = data.result
      }
      return
    }

    case 'text_delta': {
      const data = event.data as { delta: string }
      appendSegments(finalSegments, data.delta, 'final')
      return
    }

    case 'turn_end': {
      return
    }
  }
}

function MessageTransitionOverlay({ from, to, content }: { from: Rect; to: Rect; content: string }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const styleFrom = {
    top: from.top,
    left: from.left,
    width: from.width,
    height: from.height,
  }

  const styleTo = {
    top: to.top,
    left: to.left,
    width: to.width,
    height: to.height,
  }

  const style = ready ? styleTo : styleFrom

  return (
    <div
      className={`thread-transition ${ready ? 'to' : 'from'}`}
      style={style as CSSProperties}
    >
      <div className="thread-transition-inner">
        <div className="message-label">You</div>
        <div className="message-content">{content}</div>
      </div>
    </div>
  )
}
