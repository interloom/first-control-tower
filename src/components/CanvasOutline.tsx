import { Node } from '@xyflow/react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Inbox, 
  Package, 
  FileText, 
  ListTodo, 
  Bot, 
  Table as TableIcon,
  Layers,
  Briefcase
} from 'lucide-react'
import './CanvasOutline.css'

interface CanvasOutlineProps {
  nodes: Node[]
  selectedNodeIds: string[]
  onSelectNode: (nodeId: string) => void
  isCollapsed: boolean
  onToggleCollapsed: () => void
}

const nodeTypeIcons: Record<string, { icon: typeof Inbox; color: string; bg: string }> = {
  inbox: { icon: Inbox, color: '#ef6c40', bg: '#ffead4' },
  outbox: { icon: Package, color: '#6382f1', bg: '#e0e5ff' },
  file: { icon: FileText, color: '#ca8a04', bg: '#fef9c3' },
  procedure: { icon: ListTodo, color: '#4f46e5', bg: '#e0e7ff' },
  agent: { icon: Bot, color: '#16a34a', bg: '#dcfce7' },
  table: { icon: TableIcon, color: '#15803d', bg: '#dcfce7' },
  case: { icon: Briefcase, color: '#ea580c', bg: '#fed7aa' },
}

export function CanvasOutline({ nodes, selectedNodeIds, onSelectNode, isCollapsed, onToggleCollapsed }: CanvasOutlineProps) {

  const getNodeLabel = (node: Node): string => {
    if (node.data?.label) return node.data.label as string
    return node.type || node.id
  }

  const getNodeTypeLabel = (type: string | undefined): string => {
    if (!type) return 'Node'
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className={`canvas-outline ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="outline-toggle"
        onClick={onToggleCollapsed}
        title={isCollapsed ? 'Expand outline' : 'Collapse outline'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      
      {!isCollapsed && (
        <>
          <div className="outline-header">
            <Layers size={14} />
            <span>Directory</span>
            <span className="outline-count">{nodes.length}</span>
          </div>
          
          <div className="outline-list">
            {nodes.map((node) => {
              const isSelected = selectedNodeIds.includes(node.id)
              const nodeConfig = nodeTypeIcons[node.type || ''] || nodeTypeIcons.file
              const Icon = nodeConfig.icon

              return (
                <button
                  key={node.id}
                  className={`outline-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectNode(node.id)}
                >
                  <div 
                    className="outline-item-icon"
                    style={{ 
                      backgroundColor: nodeConfig.bg,
                      color: nodeConfig.color 
                    }}
                  >
                    <Icon size={12} />
                  </div>
                  <div className="outline-item-content">
                    <span className="outline-item-label">{getNodeLabel(node)}</span>
                    <span className="outline-item-type">{getNodeTypeLabel(node.type)}</span>
                  </div>
                </button>
              )
            })}
            
            {nodes.length === 0 && (
              <div className="outline-empty">
                No elements on canvas
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

