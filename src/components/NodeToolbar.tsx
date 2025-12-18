import { Trash2, Copy } from 'lucide-react'
import './NodeToolbar.css'

interface NodeToolbarProps {
  x: number
  y: number
  onDelete: () => void
  onDuplicate: () => void
}

export function NodeToolbar({ x, y, onDelete, onDuplicate }: NodeToolbarProps) {
  return (
    <div 
      className="node-toolbar"
      style={{ 
        left: x,
        top: y,
      }}
    >
      <button 
        className="toolbar-action-btn" 
        onClick={onDuplicate}
        title="Duplicate"
      >
        <Copy size={16} />
      </button>
      <div className="toolbar-divider" />
      <button 
        className="toolbar-action-btn delete" 
        onClick={onDelete}
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

