import type { 
  Message, 
  ToolUseBlock, 
  AgentStreamEvent,
  ContentBlock 
} from './types'
import { tools, isThinkingTool } from './tools'
import { SYSTEM_PROMPT } from './prompts'
import { getMockToolResponse } from './mockResponses'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

export interface AgentClientConfig {
  apiKey: string
  model?: string
  maxTokens?: number
  systemPrompt?: string
}

/**
 * AgentClient handles communication with the Anthropic API
 * and manages the agentic tool-use loop with streaming.
 */
export class AgentClient {
  private apiKey: string
  private model: string
  private maxTokens: number
  private systemPrompt: string

  constructor(config: AgentClientConfig) {
    this.apiKey = config.apiKey
    this.model = config.model ?? MODEL
    this.maxTokens = config.maxTokens ?? MAX_TOKENS
    this.systemPrompt = config.systemPrompt ?? SYSTEM_PROMPT
  }

  /**
   * Run an agent turn - yields stream events as they occur
   * Handles the full tool loop internally
   */
  async *runTurn(messages: Message[]): AsyncGenerator<AgentStreamEvent> {
    yield { type: 'turn_start' }

    // Clone messages to avoid mutating the original
    const conversationMessages = [...messages]
    let moveCount = 0
    let continueLoop = true

    while (continueLoop) {
      try {
        const response = await this.callAPI(conversationMessages)
        
        // Process the stream
        const { toolUseBlocks, textContent } = await this.processStream(
          response,
          (event) => {
            // Re-yield events from stream processing
            return event
          }
        )

        // Yield events for each tool use block
        for (const block of toolUseBlocks) {
          if (isThinkingTool(block.name)) {
            yield { 
              type: 'thinking_end', 
              data: { 
                id: block.id, 
                thought: (block.input as { thought?: string }).thought || '' 
              } 
            }
          } else {
            yield { 
              type: 'tool_end', 
              data: { id: block.id, name: block.name, input: block.input } 
            }
          }
          moveCount++
        }

        // Check if there are tool calls to process
        if (toolUseBlocks.length > 0) {
          // Build assistant message content
          const assistantContent: ContentBlock[] = []
          
          if (textContent) {
            assistantContent.push({ type: 'text', text: textContent })
          }
          
          for (const block of toolUseBlocks) {
            assistantContent.push({
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: block.input
            })
          }
          
          conversationMessages.push({
            role: 'assistant',
            content: assistantContent
          })

          // Process tool results
          const toolResults: ContentBlock[] = []
          
          for (const block of toolUseBlocks) {
            const result = getMockToolResponse(block.name, block.input)
            
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result
            })

            // Yield tool result event (skip for thinking tool)
            if (!isThinkingTool(block.name)) {
              yield { 
                type: 'tool_result', 
                data: { id: block.id, name: block.name, result } 
              }
            }
          }

          // Add tool results to conversation
          conversationMessages.push({
            role: 'user',
            content: toolResults
          })

        } else {
          // No tool calls - this is the final response
          continueLoop = false
          
          if (textContent) {
            yield { type: 'text_delta', data: { delta: textContent } }
          }
          
          yield { 
            type: 'turn_end', 
            data: { finalText: textContent, moveCount } 
          }
        }

      } catch (error) {
        yield { 
          type: 'error', 
          data: { message: error instanceof Error ? error.message : 'Unknown error' } 
        }
        continueLoop = false
      }
    }
  }

  /**
   * Make an API call with streaming enabled
   */
  private async callAPI(messages: Message[]): Promise<Response> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        stream: true,
        tools: tools,
        system: this.systemPrompt,
        messages: messages
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    return response
  }

  /**
   * Process the SSE stream from the API
   */
  private async processStream(
    response: Response,
    _onEvent: (event: AgentStreamEvent) => AgentStreamEvent
  ): Promise<{ toolUseBlocks: ToolUseBlock[]; textContent: string }> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let currentBlockType: 'text' | 'tool_use' | null = null
    let currentBlockIndex = -1
    const toolUseBlocks: ToolUseBlock[] = []
    let textContent = ''
    let currentToolInput = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            
            switch (event.type) {
              case 'content_block_start':
                currentBlockIndex = event.index
                if (event.content_block.type === 'tool_use') {
                  currentBlockType = 'tool_use'
                  currentToolInput = ''
                  toolUseBlocks[currentBlockIndex] = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    input: {}
                  }
                } else if (event.content_block.type === 'text') {
                  currentBlockType = 'text'
                }
                break

              case 'content_block_delta':
                if (event.delta.type === 'text_delta') {
                  textContent += event.delta.text
                } else if (event.delta.type === 'input_json_delta') {
                  currentToolInput += event.delta.partial_json
                }
                break

              case 'content_block_stop':
                if (currentBlockType === 'tool_use' && toolUseBlocks[currentBlockIndex]) {
                  try {
                    toolUseBlocks[currentBlockIndex].input = JSON.parse(currentToolInput)
                  } catch {
                    toolUseBlocks[currentBlockIndex].input = { raw: currentToolInput }
                  }
                }
                currentBlockType = null
                break

              case 'message_stop':
                // Message complete
                break
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    // Filter out any undefined entries
    const validToolUseBlocks = toolUseBlocks.filter((b): b is ToolUseBlock => b != null && b.id != null)

    return { toolUseBlocks: validToolUseBlocks, textContent }
  }
}

/**
 * Create an agent client instance
 */
export function createAgentClient(apiKey: string, model?: string): AgentClient {
  return new AgentClient({ apiKey, model })
}
