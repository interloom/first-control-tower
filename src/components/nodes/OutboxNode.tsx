import { useState } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import { Package, Settings } from 'lucide-react'
import { OutboxPopover } from '../NodePopover'
import './nodes.css'

interface OutboxNodeProps {
  id: string
  data: {
    label: string
    count: string
    retentionSeconds: number
  }
}

export function OutboxNode({ id, data }: OutboxNodeProps) {
  const [showPopover, setShowPopover] = useState(false)
  const { setNodes } = useReactFlow()

  const updateData = (updates: Partial<OutboxNodeProps['data']>) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    )
  }

  return (
    <div className="flow-node outbox-node">
      <div className="node-icon outbox-icon">
        <Package size={16} />
      </div>
      <div className="node-content">
        <span className="node-title">{data.label}</span>
        <span className="node-subtitle">{data.retentionSeconds}s retention</span>
      </div>
      <button
        className="node-settings-btn"
        onClick={(e) => {
          e.stopPropagation()
          setShowPopover(!showPopover)
        }}
      >
        <Settings size={14} />
      </button>
      <Handle type="target" position={Position.Top} />
      
      {showPopover && (
        <OutboxPopover
          retentionSeconds={data.retentionSeconds}
          onRetentionSecondsChange={(v) => updateData({ retentionSeconds: v })}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  )
}

