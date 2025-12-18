import { Handle, Position } from '@xyflow/react'
import { FileText } from 'lucide-react'
import './nodes.css'

interface FileNodeProps {
  data: {
    label: string
  }
}

export function FileNode({ data }: FileNodeProps) {
  return (
    <div className="flow-node block-node file-block">
      <div className="block-icon file-icon">
        <FileText size={18} />
      </div>
      <div className="block-content">
        <span className="block-type">File</span>
        <span className="block-label">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

