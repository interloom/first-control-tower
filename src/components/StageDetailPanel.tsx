import { X, ListTodo, Inbox, Send, Briefcase, User, Clock, AlertCircle, Circle, CheckCircle2, Pause, Sparkles, Box, Smile, FileText } from 'lucide-react'
import { MockCase } from '../data/mockCases'
import { CaseStatus, CasePriority } from './nodes/CaseNode'
import './StageDetailPanel.css'

interface StageDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  stageName: string
  stageType?: 'inbox' | 'outbox' | 'procedure'
  stageSubtype?: 'ai' | 'manual' | 'user' | 'approval' | 'default'
  cases: MockCase[]
  averageTimeInStage: number
  onCaseClick: (caseId: string) => void
  onAddExampleCases?: () => void
}

const getStageIcon = (stageType?: 'inbox' | 'outbox' | 'procedure', stageSubtype?: string) => {
  if (stageType === 'inbox') return <Inbox size={16} />
  if (stageType === 'outbox') return <Send size={16} />
  
  // Procedure stage - use subtype
  switch (stageSubtype) {
    case 'ai': return <Sparkles size={16} />
    case 'manual': return <Box size={16} />
    case 'user': return <User size={16} />
    case 'approval': return <Smile size={16} />
    default: return <ListTodo size={16} />
  }
}

const getStageIconBg = (stageType?: 'inbox' | 'outbox' | 'procedure', stageSubtype?: string) => {
  if (stageType === 'inbox') return '#dbeafe'
  if (stageType === 'outbox') return '#dcfce7'
  
  // Procedure stage - use subtype
  switch (stageSubtype) {
    case 'ai': return '#e0e7ff'
    case 'manual': return '#ffedd5'
    case 'user': return '#dbeafe'
    case 'approval': return '#fff7ed'
    default: return '#f1f5f9'
  }
}

const getStageIconColor = (stageType?: 'inbox' | 'outbox' | 'procedure', stageSubtype?: string) => {
  if (stageType === 'inbox') return '#2563eb'
  if (stageType === 'outbox') return '#16a34a'
  
  // Procedure stage - use subtype
  switch (stageSubtype) {
    case 'ai': return '#4f46e5'
    case 'manual': return '#ea580c'
    case 'user': return '#2563eb'
    case 'approval': return '#ea580c'
    default: return '#64748b'
  }
}

const getStatusIcon = (status: CaseStatus) => {
  switch (status) {
    case 'open': return <Circle size={12} />
    case 'in_progress': return <Clock size={12} />
    case 'pending': return <Pause size={12} />
    case 'resolved': return <CheckCircle2 size={12} />
    case 'closed': return <CheckCircle2 size={12} />
    default: return <Circle size={12} />
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

const formatDuration = (hours: number): string => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}m`
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  if (remainingHours === 0) {
    return `${days}d`
  }
  return `${days}d ${remainingHours}h`
}

const getTimeInStage = (stageEnteredAt?: string): string => {
  if (!stageEnteredAt) return 'Unknown'
  
  const now = new Date()
  const enteredAt = new Date(stageEnteredAt)
  const hours = (now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60)
  
  return formatDuration(hours)
}

export function StageDetailPanel({ 
  isOpen, 
  onClose, 
  stageName,
  stageType,
  stageSubtype,
  cases,
  averageTimeInStage,
  onCaseClick,
  onAddExampleCases
}: StageDetailPanelProps) {
  const iconBg = getStageIconBg(stageType, stageSubtype)
  const iconColor = getStageIconColor(stageType, stageSubtype)
  
  return (
    <div className={`stage-detail-panel ${isOpen ? 'open' : ''}`}>
      <button 
        className="panel-close-button"
        onClick={onClose}
        title="Close panel"
      >
        <X size={16} />
      </button>

      {/* Header Section */}
      <div className="stage-panel-header">
        <div 
          className="stage-panel-header-icon"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {getStageIcon(stageType, stageSubtype)}
        </div>
        <div className="stage-panel-header-content">
          <span className="stage-panel-header-title">{stageName}</span>
          <span className="stage-panel-header-subtitle">Stage</span>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="stage-panel-stats">
        <div className="stage-stat-card">
          <div className="stage-stat-icon">
            <Briefcase size={14} />
          </div>
          <div className="stage-stat-content">
            <span className="stage-stat-value">{cases.length}</span>
            <span className="stage-stat-label">Cases</span>
          </div>
        </div>
        <div className="stage-stat-card">
          <div className="stage-stat-icon">
            <Clock size={14} />
          </div>
          <div className="stage-stat-content">
            <span className="stage-stat-value">{formatDuration(averageTimeInStage)}</span>
            <span className="stage-stat-label">Avg. Time</span>
          </div>
        </div>
      </div>

      {/* Cases List Header */}
      <div className="stage-panel-cases-header">
        <span>Cases at this Stage</span>
        <span className="cases-count">{cases.length}</span>
      </div>

      {/* Cases List */}
      <div className="stage-panel-cases-list">
        {cases.length === 0 ? (
          <div className="stage-panel-empty">
            <Briefcase size={32} />
            <span>No cases at this stage</span>
            {onAddExampleCases && (
              <button 
                className="add-example-cases-btn"
                onClick={onAddExampleCases}
              >
                Add Example Cases
              </button>
            )}
          </div>
        ) : (
          cases.map((caseItem) => (
            <div 
              key={caseItem.id} 
              className="stage-case-item"
              onClick={() => onCaseClick(caseItem.id)}
            >
              <div className="stage-case-header">
                <div className="stage-case-title-group">
                  <Briefcase size={14} />
                  <div className="stage-case-title-content">
                    <span className="stage-case-title">{caseItem.label}</span>
                    <span className="stage-case-id">{caseItem.caseId}</span>
                  </div>
                </div>
              </div>
              
              <div className="stage-case-badges">
                <div className={`stage-case-status-badge ${getStatusBadgeClass(caseItem.status || 'open')}`}>
                  {getStatusIcon(caseItem.status || 'open')}
                  <span>{caseItem.status === 'in_progress' ? 'In Progress' : caseItem.status || 'Open'}</span>
                </div>
                <div className={`stage-case-priority-badge ${getPriorityClass(caseItem.priority || 'medium')}`}>
                  <AlertCircle size={10} />
                  <span>{getPriorityLabel(caseItem.priority || 'medium')}</span>
                </div>
              </div>

              <div className="stage-case-meta">
                <div className="stage-case-meta-item">
                  <User size={12} />
                  <span>{caseItem.assignee || 'Unassigned'}</span>
                </div>
                <div className="stage-case-meta-item">
                  <Clock size={12} />
                  <span>{getTimeInStage(caseItem.stageEnteredAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

