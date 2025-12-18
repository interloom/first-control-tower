import { Handle, Position } from '@xyflow/react'
import { CircleDotDashed } from 'lucide-react'
import './nodes.css'

interface MarkerNodeProps {
  data: {
    label: string
  }
}

export function MarkerNode({ data }: MarkerNodeProps) {
  return (
    <div className="flow-node block-node marker-block">
      <div className="block-icon marker-icon">
        <CircleDotDashed size={18} />
      </div>
      <div className="block-content">
        <span className="block-type">Marker</span>
        <span className="block-label">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
