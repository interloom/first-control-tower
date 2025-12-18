import { Handle, Position } from '@xyflow/react'
import { Bot } from 'lucide-react'
import './nodes.css'

interface AgentNodeProps {
  data: {
    label: string
  }
}

export function AgentNode({ data }: AgentNodeProps) {
  return (
    <div className="flow-node block-node agent-block">
      <div className="block-icon agent-icon">
        <Bot size={18} />
      </div>
      <div className="block-content">
        <span className="block-type">Agent</span>
        <span className="block-label">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

