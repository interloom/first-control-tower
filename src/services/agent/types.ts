// ============================================
// Anthropic API Types
// ============================================

export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

export interface ToolUseBlock {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseContentBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

export type ContentBlock = TextBlock | ToolUseContentBlock | ToolResultBlock

export interface Message {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

// ============================================
// Stream Event Types
// ============================================

export type StreamEventType = 
  | 'turn_start'
  | 'thinking_start'
  | 'thinking_delta'
  | 'thinking_end'
  | 'tool_start'
  | 'tool_delta'
  | 'tool_end'
  | 'tool_result'
  | 'text_delta'
  | 'turn_end'
  | 'error'

export interface StreamEvent {
  type: StreamEventType
  data?: unknown
}

export interface TurnStartEvent extends StreamEvent {
  type: 'turn_start'
}

export interface ThinkingStartEvent extends StreamEvent {
  type: 'thinking_start'
  data: { id: string }
}

export interface ThinkingDeltaEvent extends StreamEvent {
  type: 'thinking_delta'
  data: { id: string; delta: string }
}

export interface ThinkingEndEvent extends StreamEvent {
  type: 'thinking_end'
  data: { id: string; thought: string }
}

export interface ToolStartEvent extends StreamEvent {
  type: 'tool_start'
  data: { id: string; name: string }
}

export interface ToolDeltaEvent extends StreamEvent {
  type: 'tool_delta'
  data: { id: string; delta: string }
}

export interface ToolEndEvent extends StreamEvent {
  type: 'tool_end'
  data: { id: string; name: string; input: Record<string, unknown> }
}

export interface ToolResultEvent extends StreamEvent {
  type: 'tool_result'
  data: { id: string; name: string; result: string }
}

export interface TextDeltaEvent extends StreamEvent {
  type: 'text_delta'
  data: { delta: string }
}

export interface TurnEndEvent extends StreamEvent {
  type: 'turn_end'
  data: { finalText: string; moveCount: number }
}

export interface ErrorEvent extends StreamEvent {
  type: 'error'
  data: { message: string }
}

export type AgentStreamEvent = 
  | TurnStartEvent
  | ThinkingStartEvent
  | ThinkingDeltaEvent
  | ThinkingEndEvent
  | ToolStartEvent
  | ToolDeltaEvent
  | ToolEndEvent
  | ToolResultEvent
  | TextDeltaEvent
  | TurnEndEvent
  | ErrorEvent

// ============================================
// UI State Types
// ============================================

export interface ThinkingMove {
  type: 'thinking'
  id: string
  thought: string
  isStreaming: boolean
}

export interface ToolCallMove {
  type: 'tool_call'
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  isStreaming: boolean
}

export type Move = ThinkingMove | ToolCallMove

export interface AgentTurn {
  id: string
  moves: Move[]
  finalAnswer?: string
  isComplete: boolean
  isStreaming: boolean
}

export interface UserMessage {
  id: string
  role: 'user'
  content: string
}

export interface AgentMessage {
  id: string
  role: 'agent'
  turn: AgentTurn
}

export type ChatMessage = UserMessage | AgentMessage
