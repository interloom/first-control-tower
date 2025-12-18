import { Inbox, Package, Bot, FileText, Table, BarChart3, X, Factory } from 'lucide-react'
import './NodePill.css'

// Map node types to icons
const nodeTypeIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  inbox: Inbox,
  outbox: Package,
  procedure: Bot,
  file: FileText,
  agent: Bot,
  table: Table,
  chart: BarChart3,
  space: Factory,
}

export interface NodePillProps {
  label: string
  nodeType?: string
  className?: string
  onRemove?: () => void
}

export function NodePill({ label, nodeType, className = '', onRemove }: NodePillProps) {
  const IconComponent = nodeType ? nodeTypeIcons[nodeType] : null

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove?.()
  }

  return (
    <span className={`node-pill ${className}`}>
      {IconComponent && <IconComponent size={12} />}
      <span>{label}</span>
      {onRemove && (
        <button type="button" className="node-pill-remove" onClick={handleRemoveClick}>
          <X size={10} />
        </button>
      )}
    </span>
  )
}
