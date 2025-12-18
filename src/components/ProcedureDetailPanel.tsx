import { X, ListTodo, Sparkles, Box, User, Smile, FileText, ChevronRight } from 'lucide-react'
import { ProcedureStage } from './nodes/ProcedureNode'
import './ProcedureDetailPanel.css'

interface ProcedureDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  procedureLabel: string
  stages: ProcedureStage[]
  onStageDetailsChange?: (stageIndex: number, details: string) => void
}

const getStepIcon = (type: string) => {
  switch (type) {
    case 'ai': return <Sparkles size={16} className="text-indigo-500" />;
    case 'manual': return <Box size={16} className="text-orange-500" />;
    case 'user': return <User size={16} className="text-blue-500" />;
    case 'approval': return <Smile size={16} className="text-orange-500" />;
    default: return <FileText size={16} className="text-gray-500" />;
  }
}

const getStepIconBg = (type: string) => {
  switch (type) {
    case 'ai': return '#e0e7ff';
    case 'manual': return '#ffedd5';
    case 'user': return '#dbeafe';
    case 'approval': return '#fff7ed';
    default: return '#f1f5f9';
  }
}

const getStepTypeLabel = (type: string) => {
  switch (type) {
    case 'ai': return 'AI Automated';
    case 'manual': return 'Manual Task';
    case 'user': return 'User Input';
    case 'approval': return 'Approval Required';
    default: return 'Default';
  }
}

export function ProcedureDetailPanel({ 
  isOpen, 
  onClose, 
  procedureLabel, 
  stages,
  onStageDetailsChange 
}: ProcedureDetailPanelProps) {
  return (
    <div className={`procedure-detail-panel ${isOpen ? 'open' : ''}`}>
      <button 
        className="panel-close-button"
        onClick={onClose}
        title="Close panel"
      >
        <X size={16} />
      </button>

      <div className="panel-header">
        <div className="panel-header-icon">
          <ListTodo size={16} />
        </div>
        <div className="panel-header-content">
          <span className="panel-header-title">{procedureLabel}</span>
          <span className="panel-header-subtitle">Procedure • {stages.length} stages</span>
        </div>
      </div>

      <div className="panel-stages-list">
        {stages.map((stage, index) => (
          <div key={index} className="panel-stage-item">
            <div className="panel-stage-header">
              <div 
                className="panel-stage-icon" 
                style={{ backgroundColor: getStepIconBg(stage.type) }}
              >
                {getStepIcon(stage.type)}
              </div>
              <div className="panel-stage-info">
                <span className="panel-stage-number">Stage {index + 1}</span>
                <span className="panel-stage-label">{stage.label}</span>
              </div>
              <button className="panel-stage-expand">
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="panel-stage-meta">
              <span className="panel-stage-type-badge" data-type={stage.type}>
                {getStepTypeLabel(stage.type)}
              </span>
            </div>
            <div className="panel-stage-details">
              <textarea
                className="panel-stage-details-input"
                placeholder="Add details for this stage..."
                value={stage.details || ''}
                onChange={(e) => onStageDetailsChange?.(index, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
