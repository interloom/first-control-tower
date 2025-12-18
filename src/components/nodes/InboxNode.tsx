import { useState } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import { Inbox, Settings } from 'lucide-react'
import { InboxPopover } from '../NodePopover'
import './nodes.css'

interface InboxNodeProps {
  id: string
  data: {
    label: string
    count: string
    casesPerMinute: number
    holdDurationMin: number
    holdDurationMax: number
    onGenerateCase?: () => void
  }
}

export function InboxNode({ id, data }: InboxNodeProps) {
  const [showPopover, setShowPopover] = useState(false)
  const { setNodes } = useReactFlow()

  const updateData = (updates: Partial<InboxNodeProps['data']>) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    )
  }

  return (
    <div className="flow-node inbox-node">
      <div className="node-icon inbox-icon">
        <Inbox size={16} />
      </div>
      <div className="node-content">
        <span className="node-title">{data.label}</span>
        <span className="node-subtitle">{data.casesPerMinute}/min</span>
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
      <Handle type="source" position={Position.Bottom} />
      
      {showPopover && (
        <InboxPopover
          casesPerMinute={data.casesPerMinute}
          holdDurationMin={data.holdDurationMin}
          holdDurationMax={data.holdDurationMax}
          onCasesPerMinuteChange={(v) => updateData({ casesPerMinute: v })}
          onHoldDurationMinChange={(v) => updateData({ holdDurationMin: v })}
          onHoldDurationMaxChange={(v) => updateData({ holdDurationMax: v })}
          onGenerateCase={data.onGenerateCase}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  )
}

