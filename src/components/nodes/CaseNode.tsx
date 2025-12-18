import { Handle, Position } from '@xyflow/react'
import { 
  Briefcase, 
  Edit2, 
  BarChart2, 
  User,
  Clock,
  Tag,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  Pause
} from 'lucide-react'
import './nodes.css'

export type CaseStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
export type CasePriority = 'low' | 'medium' | 'high' | 'urgent'

export interface CaseData {
  label: string
  caseId?: string
  status?: CaseStatus
  priority?: CasePriority
  assignee?: string
  createdAt?: string
  dueDate?: string
  tags?: string[]
  onOpenDetailPanel?: (nodeId: string) => void
}

interface CaseNodeProps {
  id: string
  data: CaseData
}

const getStatusIcon = (status: CaseStatus) => {
  switch (status) {
    case 'open': return <Circle size={14} className="text-blue-500" />
    case 'in_progress': return <Clock size={14} className="text-orange-500" />
    case 'pending': return <Pause size={14} className="text-yellow-500" />
    case 'resolved': return <CheckCircle2 size={14} className="text-green-500" />
    case 'closed': return <CheckCircle2 size={14} className="text-gray-400" />
    default: return <Circle size={14} className="text-gray-400" />
  }
}

const getStatusLabel = (status: CaseStatus) => {
  switch (status) {
    case 'open': return 'Open'
    case 'in_progress': return 'In Progress'
    case 'pending': return 'Pending'
    case 'resolved': return 'Resolved'
    case 'closed': return 'Closed'
    default: return 'Unknown'
  }
}

const getStatusBadgeClass = (status: CaseStatus) => {
  switch (status) {
    case 'open': return 'status-badge-open'
    case 'in_progress': return 'status-badge-in-progress'
    case 'pending': return 'status-badge-pending'
    case 'resolved': return 'status-badge-resolved'
    case 'closed': return 'status-badge-closed'
    default: return ''
  }
}

const getPriorityClass = (priority: CasePriority) => {
  switch (priority) {
    case 'urgent': return 'priority-urgent'
    case 'high': return 'priority-high'
    case 'medium': return 'priority-medium'
    case 'low': return 'priority-low'
    default: return ''
  }
}

const getPriorityLabel = (priority: CasePriority) => {
  switch (priority) {
    case 'urgent': return 'Urgent'
    case 'high': return 'High'
    case 'medium': return 'Medium'
    case 'low': return 'Low'
    default: return 'Unknown'
  }
}

export function CaseNode({ id, data }: CaseNodeProps) {
  const status = data.status ?? 'open'
  const priority = data.priority ?? 'medium'
  const assignee = data.assignee ?? 'Unassigned'
  const caseId = data.caseId ?? `#${id.slice(-6).toUpperCase()}`
  const createdAt = data.createdAt ?? 'Just now'
  const tags = data.tags ?? []
  
  const handleOpenPanel = (e: React.MouseEvent) => {
    e.stopPropagation()
    data.onOpenDetailPanel?.(id)
  }
  
  return (
    <div className="case-card">
      <div className="case-header">
        <div className="case-title-group">
          <div className="case-icon-wrapper">
            <Briefcase size={16} />
          </div>
          <div className="case-title-content">
            <span className="case-title">{data.label || 'Case'}</span>
            <span className="case-id">{caseId}</span>
          </div>
        </div>
        <div className="case-actions">
          <button className="action-button" onClick={handleOpenPanel}>
            <Edit2 size={14} />
          </button>
          <button className="action-button">
            <BarChart2 size={14} />
          </button>
        </div>
      </div>
      
      <div className="case-details">
        {/* Status & Priority Row */}
        <div className="case-detail-row case-status-row">
          <div className={`status-badge ${getStatusBadgeClass(status)}`}>
            {getStatusIcon(status)}
            <span>{getStatusLabel(status)}</span>
          </div>
          <div className={`priority-badge ${getPriorityClass(priority)}`}>
            <AlertCircle size={12} />
            <span>{getPriorityLabel(priority)}</span>
          </div>
        </div>

        {/* Assignee */}
        <div className="case-detail-row">
          <div className="case-detail-icon">
            <User size={14} />
          </div>
          <span className="case-detail-label">Assignee</span>
          <span className="case-detail-value">{assignee}</span>
        </div>

        {/* Created Date */}
        <div className="case-detail-row">
          <div className="case-detail-icon">
            <Calendar size={14} />
          </div>
          <span className="case-detail-label">Created</span>
          <span className="case-detail-value">{createdAt}</span>
        </div>

        {/* Due Date (if provided) */}
        {data.dueDate && (
          <div className="case-detail-row">
            <div className="case-detail-icon">
              <Clock size={14} />
            </div>
            <span className="case-detail-label">Due</span>
            <span className="case-detail-value case-due-date">{data.dueDate}</span>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="case-detail-row case-tags-row">
            <div className="case-detail-icon">
              <Tag size={14} />
            </div>
            <div className="case-tags">
              {tags.map((tag, index) => (
                <span key={index} className="case-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top} className="case-handle" />
      <Handle type="source" position={Position.Bottom} className="case-handle" />
    </div>
  )
}


