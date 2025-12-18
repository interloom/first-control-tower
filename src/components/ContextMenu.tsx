import { useEffect, useRef } from 'react'
import { FileText, Workflow, Bot, Table, BarChart3, Folder, CircleDotDashed, Briefcase, Radio } from 'lucide-react'
import './ContextMenu.css'

interface ContextMenuProps {
  x: number
  y: number
  onAddFile: () => void
  onAddProcedure: () => void
  onAddAgent: () => void
  onAddTable: () => void
  onAddChart: () => void
  onAddFolder: () => void
  onAddMarker: () => void
  onAddCase: () => void
  onAddEventStream: () => void
  onClose: () => void
}

export function ContextMenu({ x, y, onAddFile, onAddProcedure, onAddAgent, onAddTable, onAddChart, onAddFolder, onAddMarker, onAddCase, onAddEventStream, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      <div className="context-menu-header">Add to canvas</div>
      <div className="context-menu-items">
        <button className="context-menu-item" onClick={onAddFile}>
          <div className="context-menu-icon file">
            <FileText size={14} />
          </div>
          <span>File</span>
        </button>
        <button className="context-menu-item" onClick={onAddProcedure}>
          <div className="context-menu-icon procedure">
            <Workflow size={14} />
          </div>
          <span>Procedure</span>
        </button>
        <button className="context-menu-item" onClick={onAddAgent}>
          <div className="context-menu-icon agent">
            <Bot size={14} />
          </div>
          <span>Agent</span>
        </button>
        <button className="context-menu-item" onClick={onAddTable}>
          <div className="context-menu-icon table-item">
            <Table size={14} className="text-green-600" />
          </div>
          <span>Table</span>
        </button>
        <button className="context-menu-item" onClick={onAddChart}>
          <div className="context-menu-icon chart-item">
            <BarChart3 size={14} />
          </div>
          <span>Chart</span>
        </button>
        <button className="context-menu-item" onClick={onAddFolder}>
          <div className="context-menu-icon folder-item">
            <Folder size={14} />
          </div>
          <span>Folder</span>
        </button>
        <button className="context-menu-item" onClick={onAddMarker}>
          <div className="context-menu-icon marker-item">
            <CircleDotDashed size={14} />
          </div>
          <span>Marker</span>
        </button>
        <button className="context-menu-item" onClick={onAddCase}>
          <div className="context-menu-icon case-item">
            <Briefcase size={14} />
          </div>
          <span>Case</span>
        </button>
        <button className="context-menu-item" onClick={onAddEventStream}>
          <div className="context-menu-icon event-stream-item">
            <Radio size={14} />
          </div>
          <span>Event Stream</span>
        </button>
      </div>
    </div>
  )
}
