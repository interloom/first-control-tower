import type { Tool } from './types'

/**
 * Think tool - used for internal reasoning
 * Rendered as a collapsible "Thinking" block in the UI
 */
export const thinkTool: Tool = {
  name: 'think',
  description: 'Use this tool to think through a problem step by step. Use it for reasoning, planning, and working through complex logic before taking action.',
  input_schema: {
    type: 'object',
    properties: {
      thought: {
        type: 'string',
        description: 'Your internal reasoning or thought process'
      }
    },
    required: ['thought']
  }
}

/**
 * Read file tool - reads contents of a file
 */
export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file at the given path.',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The file path to read'
      }
    },
    required: ['path']
  }
}

/**
 * Search codebase tool - searches for patterns in code
 */
export const searchCodebaseTool: Tool = {
  name: 'search_codebase',
  description: 'Search for code patterns or text in the codebase.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query or pattern'
      },
      file_pattern: {
        type: 'string',
        description: 'Optional glob pattern to filter files (e.g., "*.ts")'
      }
    },
    required: ['query']
  }
}

/**
 * Execute command tool - runs shell commands
 */
export const executeCommandTool: Tool = {
  name: 'execute_command',
  description: 'Execute a shell command.',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The command to execute'
      }
    },
    required: ['command']
  }
}

/**
 * List files tool - lists directory contents
 */
export const listFilesTool: Tool = {
  name: 'list_files',
  description: 'List files in a directory.',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The directory path to list'
      }
    },
    required: ['path']
  }
}

/**
 * Create procedure tool - creates a new Procedure node on the canvas
 */
export const createProcedureTool: Tool = {
  name: 'create_procedure',
  description: 'Create a new Procedure node on the canvas with a title and a list of stages. Use this when the user asks you to create a workflow, process, or procedure.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title/label for the procedure (e.g., "Customer Onboarding", "Invoice Processing")'
      },
      stages: {
        type: 'array',
        description: 'Array of stages that make up the procedure. Each stage has a label and a type.',
        items: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
              description: 'The name/description of this stage'
            },
            type: {
              type: 'string',
              enum: ['ai', 'manual', 'user', 'approval', 'default'],
              description: 'The type of stage: "ai" for AI-automated steps, "manual" for manual work, "user" for user input required, "approval" for approval gates, "default" for general steps'
            }
          },
          required: ['label', 'type']
        }
      }
    },
    required: ['title', 'stages']
  }
}

/**
 * All available tools for the agent
 */
export const tools: Tool[] = [
  thinkTool,
  readFileTool,
  searchCodebaseTool,
  executeCommandTool,
  listFilesTool,
  createProcedureTool
]

/**
 * Tool names that should be rendered as "thinking" blocks
 * rather than regular tool calls
 */
export const THINKING_TOOL_NAMES = ['think']

/**
 * Tool names that perform actions on the canvas (require callbacks)
 */
export const ACTION_TOOL_NAMES = ['create_procedure']

/**
 * Check if a tool name is a thinking tool
 */
export function isThinkingTool(toolName: string): boolean {
  return THINKING_TOOL_NAMES.includes(toolName)
}

/**
 * Check if a tool name is an action tool (modifies canvas)
 */
export function isActionTool(toolName: string): boolean {
  return ACTION_TOOL_NAMES.includes(toolName)
}
