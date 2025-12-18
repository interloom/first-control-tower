import { X, Briefcase, User, Calendar, Clock, Tag, AlertCircle, Circle, CheckCircle2, Pause, MessageSquare, Bell, UserPlus, Edit3, Plus } from 'lucide-react'
import { CaseStatus, CasePriority } from './nodes/CaseNode'
import './CaseDetailPanel.css'

interface CaseDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  caseLabel: string
  caseId: string
  status: CaseStatus
  priority: CasePriority
  assignee: string
  createdAt: string
  dueDate?: string
  tags: string[]
}

interface ActivityItem {
  id: string
  type: 'message' | 'status_change' | 'assignment' | 'created' | 'notification' | 'title_update'
  user: string
  content?: string
  timestamp: string
  icon: 'message' | 'status' | 'assign' | 'plus' | 'bell' | 'edit'
  newValue?: string
}

// Mock activity data - in a real app this would come from props
const mockActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'created',
    user: 'System',
    timestamp: '2 hours ago',
    icon: 'plus',
    content: 'Case created'
  },
  {
    id: '2',
    type: 'assignment',
    user: 'Alex Chen',
    timestamp: '1 hour ago',
    icon: 'assign',
    newValue: 'Sarah Johnson'
  },
  {
    id: '3',
    type: 'status_change',
    user: 'Sarah Johnson',
    timestamp: '45 min ago',
    icon: 'status',
    newValue: 'In Progress'
  },
  {
    id: '4',
    type: 'message',
    user: 'Sarah Johnson',
    content: 'I\'ve started looking into this case. Will need to gather more information from the customer before proceeding.',
    timestamp: '30 min ago',
    icon: 'message'
  },
  {
    id: '5',
    type: 'notification',
    user: 'Triage Trigger',
    timestamp: '15 min ago',
    icon: 'bell',
    content: 'Priority escalated due to SLA threshold'
  },
]

const getStatusIcon = (status: CaseStatus) => {
  switch (status) {
    case 'open': return <Circle size={14} />
    case 'in_progress': return <Clock size={14} />
    case 'pending': return <Pause size={14} />
    case 'resolved': return <CheckCircle2 size={14} />
    case 'closed': return <CheckCircle2 size={14} />
    default: return <Circle size={14} />
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

const getPriorityLabel = (priority: CasePriority) => {
  switch (priority) {
    case 'urgent': return 'Urgent'
    case 'high': return 'High'
    case 'medium': return 'Medium'
    case 'low': return 'Low'
    default: return 'Unknown'
  }
}

const getActivityIcon = (icon: ActivityItem['icon']) => {
  switch (icon) {
    case 'message': return <MessageSquare size={16} />
    case 'status': return <Circle size={16} />
    case 'assign': return <UserPlus size={16} />
    case 'plus': return <Plus size={16} />
    case 'bell': return <Bell size={16} />
    case 'edit': return <Edit3 size={16} />
    default: return <Circle size={16} />
  }
}

export function CaseDetailPanel({ 
  isOpen, 
  onClose, 
  caseLabel,
  caseId,
  status,
  priority,
  assignee,
  createdAt,
  dueDate,
  tags
}: CaseDetailPanelProps) {
  return (
    <div className={`case-detail-panel ${isOpen ? 'open' : ''}`}>
      <button 
        className="panel-close-button"
        onClick={onClose}
        title="Close panel"
      >
        <X size={16} />
      </button>

      {/* Narrow Header Section */}
      <div className="case-panel-header">
        <div className="case-panel-header-icon">
          <Briefcase size={16} />
        </div>
        <div className="case-panel-header-content">
          <span className="case-panel-header-title">{caseLabel}</span>
          <span className="case-panel-header-subtitle">Case {caseId}</span>
        </div>
      </div>

      {/* Status & Meta Section */}
      <div className="case-panel-meta">
        <div className="case-panel-status-row">
          <div className={`case-panel-status-badge status-${status}`}>
            {getStatusIcon(status)}
            <span>{getStatusLabel(status)}</span>
          </div>
          <div className={`case-panel-priority-badge priority-${priority}`}>
            <AlertCircle size={12} />
            <span>{getPriorityLabel(priority)}</span>
          </div>
        </div>
        
        <div className="case-panel-meta-grid">
          <div className="case-panel-meta-item">
            <User size={14} />
            <span className="meta-label">Assignee</span>
            <span className="meta-value">{assignee}</span>
          </div>
          <div className="case-panel-meta-item">
            <Calendar size={14} />
            <span className="meta-label">Created</span>
            <span className="meta-value">{createdAt}</span>
          </div>
          {dueDate && (
            <div className="case-panel-meta-item">
              <Clock size={14} />
              <span className="meta-label">Due</span>
              <span className="meta-value due-date">{dueDate}</span>
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div className="case-panel-tags">
            <Tag size={14} />
            <div className="tags-list">
              {tags.map((tag, index) => (
                <span key={index} className="case-panel-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activity Thread Section */}
      <div className="case-panel-activity-header">
        <span>Activity</span>
        <span className="activity-count">{mockActivity.length}</span>
      </div>

      <div className="case-panel-activity-list">
        {mockActivity.map((item) => (
          <div key={item.id} className={`activity-item activity-${item.type}`}>
            <div className="activity-icon-wrapper">
              <div className="activity-icon">
                {getActivityIcon(item.icon)}
              </div>
            </div>
            <div className="activity-content">
              {item.type === 'message' ? (
                <>
                  <div className="activity-header">
                    <span className="activity-user">{item.user}</span>
                    <span className="activity-timestamp">{item.timestamp}</span>
                  </div>
                  <div className="activity-message">
                    {item.content}
                  </div>
                </>
              ) : item.type === 'assignment' ? (
                <div className="activity-inline">
                  <span className="activity-user-pill">{item.user}</span>
                  <span className="activity-action">assigned</span>
                  <span className="activity-user-pill">{item.newValue}</span>
                  <span className="activity-timestamp">· {item.timestamp}</span>
                </div>
              ) : item.type === 'status_change' ? (
                <div className="activity-inline">
                  <span className="activity-user-pill">{item.user}</span>
                  <span className="activity-action">changed status to</span>
                  <span className="activity-value-pill">{item.newValue}</span>
                  <span className="activity-timestamp">· {item.timestamp}</span>
                </div>
              ) : item.type === 'notification' ? (
                <div className="activity-inline">
                  <span className="activity-user-pill">{item.user}</span>
                  <span className="activity-action">{item.content}</span>
                  <span className="activity-timestamp">· {item.timestamp}</span>
                </div>
              ) : (
                <div className="activity-inline">
                  <span className="activity-action">{item.content}</span>
                  <span className="activity-timestamp">· {item.timestamp}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Composer Footer */}
      <div className="case-panel-composer">
        <div className="composer-input">
          <span className="composer-placeholder">Write a message…</span>
        </div>
        <button className="composer-send-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  )
}


