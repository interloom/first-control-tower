import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Bot, X, Plus, MousePointer2, Globe, Image, Mic, ChevronDown,
  Sparkles, Zap, Crown, Ban, Check
} from 'lucide-react'
import { MentionInput, MentionInputHandle, Mention } from './MentionInput'
import { MentionOption } from './MentionDropdown'
import { NodePill } from './NodePill'
import { 
  AgentTurnView,
  type StreamSegment,
  type ToolCallStatus,
  type ToolCallData,
} from './thread/MoveBlocks'
import { 
  createAgentClient, 
  isThinkingTool,
  type ChatMessage, 
  type AgentTurn, 
  type Move,
  type Message,
  type AgentStreamEvent
} from '../services/agent'
import type { ProcedureStageInput } from '../services/agent/mockResponses'
import './ChatPanel.css'

// Get API key from environment variable
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

// Model definitions
interface ModelOption {
  id: string
  name: string
  description: string
  icon: typeof Sparkles
  modelId: string | null // null means "no model"
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'opus',
    name: 'Opus',
    description: 'Most capable, complex tasks',
    icon: Crown,
    modelId: 'claude-sonnet-4-20250514' // Using Sonnet 4 as placeholder since Opus 4 isn't available yet
  },
  {
    id: 'sonnet',
    name: 'Sonnet',
    description: 'Balanced performance',
    icon: Sparkles,
    modelId: 'claude-sonnet-4-20250514'
  },
  {
    id: 'haiku',
    name: 'Haiku',
    description: 'Fast and efficient',
    icon: Zap,
    modelId: 'claude-3-5-haiku-20241022'
  },
  {
    id: 'none',
    name: 'No Model',
    description: 'Just add message, no AI response',
    icon: Ban,
    modelId: null
  }
]

export interface SelectedNodeInfo {
  id: string
  label: string
  type: string
}

export interface CurrentSpaceInfo {
  id: string
  label: string
}

export interface OpenPanelInfo {
  type: 'procedure' | 'case' | 'stage'
  id: string
  label: string
  nodeId?: string  // For stage panels, the procedure/inbox/outbox nodeId
  stageIndex?: number  // For stage panels, the stage index
}

/**
 * Format context as XML tags to prepend to user messages.
 * This gives the agent awareness of what the user is currently viewing/selecting.
 */
function formatContextForAgent(
  currentSpace?: CurrentSpaceInfo | null,
  selectedNodes?: SelectedNodeInfo[],
  openPanel?: OpenPanelInfo | null
): string {
  if (!currentSpace && (!selectedNodes || selectedNodes.length === 0) && !openPanel) return ''

  const parts: string[] = ['<context>']
  
  if (currentSpace) {
    parts.push(`  <current_space id="${currentSpace.id}">${currentSpace.label}</current_space>`)
  }
  
  if (selectedNodes && selectedNodes.length > 0) {
    parts.push('  <selected_nodes>')
    for (const node of selectedNodes) {
      parts.push(`    <node type="${node.type}" id="${node.id}">${node.label}</node>`)
    }
    parts.push('  </selected_nodes>')
  }
  
  if (openPanel) {
    parts.push(`  <open_panel type="${openPanel.type}" id="${openPanel.id}">${openPanel.label}</open_panel>`)
  }
  
  parts.push('</context>')
  
  return parts.join('\n')
}

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  currentSpace?: CurrentSpaceInfo | null
  selectedNodes?: SelectedNodeInfo[]
  openPanel?: OpenPanelInfo | null
  onClearSelection?: (nodeId?: string) => void
  onClearOpenPanel?: () => void
  mentionOptions?: MentionOption[]
  onCreateProcedure?: (title: string, stages: ProcedureStageInput[]) => void
  onUpdateProcedure?: (procedureId: string, stages: ProcedureStageInput[]) => void
}

// Convert ChatPanel move format to MoveBlocks format
type MoveBlocksMove =
  | { type: 'thinking'; id: string; segments: StreamSegment[]; isStreaming: boolean }
  | { type: 'tool_call'; id: string; name: string; inputObject?: Record<string, unknown>; resultText?: string; status: ToolCallStatus }
  | { type: 'tool_group'; id: string; tools: ToolCallData[] }

function convertMovesToMoveBlocksFormat(moves: Move[]): MoveBlocksMove[] {
  return moves.map(move => {
    if (move.type === 'thinking') {
      // Convert thought string to segments
      const segments: StreamSegment[] = move.thought
        .split(/(\s+)/)
        .filter(Boolean)
        .map((text, i) => ({ id: `${move.id}-seg-${i}`, text }))
      return {
        type: 'thinking' as const,
        id: move.id,
        segments,
        isStreaming: move.isStreaming,
      }
    } else {
      return {
        type: 'tool_call' as const,
        id: move.id,
        name: move.name,
        inputObject: move.input,
        resultText: move.result,
        status: (move.isStreaming ? 'running' : 'done') as ToolCallStatus,
      }
    }
  })
}

function convertFinalAnswerToSegments(finalAnswer?: string): StreamSegment[] {
  if (!finalAnswer) return []
  return finalAnswer
    .split(/(\s+)/)
    .filter(Boolean)
    .map((text, i) => ({ id: `final-seg-${i}`, text }))
}

// ChatPanel's agent turn wrapper that converts data and renders MoveBlocks AgentTurnView
function ChatPanelAgentTurn({ turn }: { turn: AgentTurn }) {
  const convertedMoves = convertMovesToMoveBlocksFormat(turn.moves)
  const finalSegments = convertFinalAnswerToSegments(turn.finalAnswer)
  
  return (
    <AgentTurnView
      title="Agent"
      moves={convertedMoves}
      finalSegments={finalSegments}
      isStreaming={turn.isStreaming}
    />
  )
}

// User Message Component - matches MoveBlocks layout
function UserMessageView({ content }: { content: string }) {
  return (
    <div className="user-turn">
      <div className="turn-header">
        <span>You</span>
      </div>
      <div className="user-message">
        {content}
      </div>
    </div>
  )
}

export function ChatPanel({ isOpen, onClose, currentSpace, selectedNodes = [], openPanel, onClearSelection, onClearOpenPanel, mentionOptions = [], onCreateProcedure, onUpdateProcedure }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<string>('Ready')
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODEL_OPTIONS[1]) // Default to Sonnet
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mentionInputRef = useRef<MentionInputHandle>(null)
  const modelPickerRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef(API_KEY ? createAgentClient(API_KEY) : null)
  
  // Use ref to avoid stale closure in handleStreamEvent
  const onCreateProcedureRef = useRef(onCreateProcedure)
  useEffect(() => {
    onCreateProcedureRef.current = onCreateProcedure
  }, [onCreateProcedure])

  const onUpdateProcedureRef = useRef(onUpdateProcedure)
  useEffect(() => {
    onUpdateProcedureRef.current = onUpdateProcedure
  }, [onUpdateProcedure])

  const clearChat = () => {
    setMessages([])
    setConversationHistory([])
    mentionInputRef.current?.clear()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      mentionInputRef.current?.focus()
    }
  }, [isOpen])

  // Close model picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(event.target as Node)) {
        setIsModelPickerOpen(false)
      }
    }
    if (isModelPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isModelPickerOpen])

  // Update client when model changes
  useEffect(() => {
    if (API_KEY && selectedModel.modelId) {
      clientRef.current = createAgentClient(API_KEY, selectedModel.modelId)
    }
  }, [selectedModel])

  const runAgentTurn = useCallback(async (userMessage: string) => {
    // Build context-prefixed message for the agent
    const contextPrefix = formatContextForAgent(currentSpace, selectedNodes, openPanel)
    const messageForAgent = contextPrefix 
      ? `${contextPrefix}\n\n${userMessage}`
      : userMessage

    // Handle "No Model" case - just add message without AI response
    if (!selectedModel.modelId) {
      const userMsgId = Date.now().toString()
      setMessages(prev => [
        ...prev,
        { id: userMsgId, role: 'user', content: userMessage }
      ])
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: messageForAgent }
      ])
      return
    }

    if (!clientRef.current) {
      console.error('No API key configured')
      return
    }

    setIsProcessing(true)
    setStatus('Processing...')

    // Add context-prefixed message to conversation history (for agent)
    // UI shows clean message, API gets context-enriched message
    const newHistory: Message[] = [
      ...conversationHistory,
      { role: 'user', content: messageForAgent }
    ]
    setConversationHistory(newHistory)

    // Add user message to UI
    const userMsgId = Date.now().toString()
    const turnId = (Date.now() + 1).toString()
    
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: userMessage },
      { 
        id: turnId, 
        role: 'agent', 
        turn: { 
          id: turnId, 
          moves: [], 
          isComplete: false, 
          isStreaming: true 
        } 
      }
    ])

    try {
      const currentMoves: Move[] = []
      let finalText = ''

      for await (const event of clientRef.current.runTurn(newHistory)) {
        handleStreamEvent(event, turnId, currentMoves, (text) => { finalText = text })
      }

      // Update conversation history with assistant response
      if (finalText) {
        setConversationHistory(prev => [
          ...prev,
          { role: 'assistant', content: finalText }
        ])
      }

    } catch (error) {
      console.error('Agent error:', error)
      setMessages(prev => prev.map(msg => {
        if (msg.id === turnId && msg.role === 'agent') {
          return {
            ...msg,
            turn: {
              ...msg.turn,
              isStreaming: false,
              isComplete: true,
              finalAnswer: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
        return msg
      }))
    }

    setIsProcessing(false)
    setStatus('Ready')
  }, [conversationHistory, selectedModel, currentSpace, selectedNodes, openPanel])

  const handleStreamEvent = (
    event: AgentStreamEvent, 
    turnId: string, 
    currentMoves: Move[],
    setFinalText: (text: string) => void
  ) => {
    switch (event.type) {
      case 'thinking_end': {
        const data = event.data as { id: string; thought: string }
        const move: Move = {
          type: 'thinking',
          id: data.id,
          thought: data.thought,
          isStreaming: false
        }
        currentMoves.push(move)
        updateTurnMoves(turnId, [...currentMoves])
        break
      }

      case 'tool_end': {
        const data = event.data as { id: string; name: string; input: Record<string, unknown> }
        
        // Handle create_procedure tool - invoke the callback to add node to canvas
        // Use ref to get the latest callback and avoid stale closure
        if (data.name === 'create_procedure' && onCreateProcedureRef.current) {
          const { title, stages } = data.input as { title: string; stages: ProcedureStageInput[] }
          onCreateProcedureRef.current(title, stages)
        }

        // Handle update_procedure tool - invoke the callback to update existing node on canvas
        if (data.name === 'update_procedure' && onUpdateProcedureRef.current) {
          const { procedureId, stages } = data.input as { procedureId: string; stages: ProcedureStageInput[] }
          onUpdateProcedureRef.current(procedureId, stages)
        }
        
        if (!isThinkingTool(data.name)) {
          const move: Move = {
            type: 'tool_call',
            id: data.id,
            name: data.name,
            input: data.input,
            isStreaming: true
          }
          currentMoves.push(move)
          updateTurnMoves(turnId, [...currentMoves])
        }
        break
      }

      case 'tool_result': {
        const data = event.data as { id: string; name: string; result: string }
        const moveIndex = currentMoves.findIndex(m => m.id === data.id)
        if (moveIndex !== -1 && currentMoves[moveIndex].type === 'tool_call') {
          currentMoves[moveIndex] = {
            ...currentMoves[moveIndex],
            result: data.result,
            isStreaming: false
          } as Move
          updateTurnMoves(turnId, [...currentMoves])
        }
        break
      }

      case 'text_delta': {
        const data = event.data as { delta: string }
        setFinalText(data.delta)
        break
      }

      case 'turn_end': {
        const data = event.data as { finalText: string; moveCount: number }
        setMessages(prev => prev.map(msg => {
          if (msg.id === turnId && msg.role === 'agent') {
            return {
              ...msg,
              turn: {
                ...msg.turn,
                moves: currentMoves,
                finalAnswer: data.finalText || undefined,
                isStreaming: false,
                isComplete: true
              }
            }
          }
          return msg
        }))
        break
      }

      case 'error': {
        const data = event.data as { message: string }
        setMessages(prev => prev.map(msg => {
          if (msg.id === turnId && msg.role === 'agent') {
            return {
              ...msg,
              turn: {
                ...msg.turn,
                isStreaming: false,
                isComplete: true,
                finalAnswer: `Error: ${data.message}`
              }
            }
          }
          return msg
        }))
        break
      }
    }
  }

  const updateTurnMoves = (turnId: string, moves: Move[]) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === turnId && msg.role === 'agent') {
        return {
          ...msg,
          turn: {
            ...msg.turn,
            moves
          }
        }
      }
      return msg
    }))
  }

  const handleSubmit = (text: string, _mentions: Mention[]) => {
    if (!text.trim() || isProcessing) return
    mentionInputRef.current?.clear()
    runAgentTurn(text.trim())
  }

  return (
    <aside className={`chat-panel ${isOpen ? 'open' : ''}`}>
      <div className="chat-panel-inner">
        <div className="chat-header">
          <div className="chat-header-title">
            <div className="chat-avatar">
              <Bot size={16} />
            </div>
            <span>Assistant</span>
            <div className="header-status">
              <div className={`status-dot ${isProcessing ? 'active' : ''}`}></div>
              <span className="status-text">{status}</span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="chat-new" onClick={clearChat}>
              <Plus size={18} />
            </button>
            <button className="chat-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {!API_KEY && (
            <div className="api-key-warning">
              <p>No API key configured.</p>
              <p>Add <code>VITE_ANTHROPIC_API_KEY</code> to your <code>.env.local</code> file.</p>
            </div>
          )}
          
          {messages.map(message => {
            if (message.role === 'user') {
              return <UserMessageView key={message.id} content={message.content} />
            } else {
              return <ChatPanelAgentTurn key={message.id} turn={message.turn} />
            }
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="context-pills">
            {currentSpace && (
              <NodePill
                label={currentSpace.label}
                nodeType="space"
                className="context-pill"
              />
            )}
            {selectedNodes.map(node => (
              <NodePill
                key={node.id}
                label={node.label}
                nodeType={node.type}
                className="selection-pill"
                onRemove={() => onClearSelection?.(node.id)}
              />
            ))}
            {openPanel && (
              <NodePill
                label={openPanel.label}
                nodeType={openPanel.type}
                className="panel-pill"
                onRemove={onClearOpenPanel}
              />
            )}
          </div>
          <div className="composer-container">
            <MentionInput
              ref={mentionInputRef}
              placeholder="Send a message..."
              mentionOptions={mentionOptions}
              onSubmit={handleSubmit}
            />
            <div className="composer-toolbar">
              <div className="composer-toolbar-left">
                <div className="model-picker-container" ref={modelPickerRef}>
                  <button 
                    type="button" 
                    className="composer-mode-button"
                    onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
                  >
                    <selectedModel.icon size={14} />
                    <span>{selectedModel.name}</span>
                    <ChevronDown size={12} className={isModelPickerOpen ? 'rotated' : ''} />
                  </button>
                  
                  {isModelPickerOpen && (
                    <div className="model-picker-dropdown">
                      <div className="model-picker-header">Select Model</div>
                      {MODEL_OPTIONS.map((model) => {
                        const Icon = model.icon
                        const isSelected = selectedModel.id === model.id
                        return (
                          <button
                            key={model.id}
                            className={`model-picker-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedModel(model)
                              setIsModelPickerOpen(false)
                            }}
                          >
                            <Icon size={16} className="model-icon" />
                            <div className="model-info">
                              <span className="model-name">{model.name}</span>
                              <span className="model-description">{model.description}</span>
                            </div>
                            {isSelected && <Check size={14} className="model-check" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="composer-toolbar-right">
                <button type="button" className="composer-action-button">
                  <MousePointer2 size={16} />
                </button>
                <button type="button" className="composer-action-button">
                  <Globe size={16} />
                </button>
                <button type="button" className="composer-action-button">
                  <Image size={16} />
                </button>
                <button type="button" className="composer-action-button composer-mic-button">
                  <Mic size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
