import { Handle, Position } from '@xyflow/react'
import { 
  ListTodo, 
  Edit2, 
  BarChart2, 
  Sparkles, 
  User, 
  FileText, 
  Smile,
  Box
} from 'lucide-react'
import './nodes.css'

export interface ProcedureStage {
  label: string
  type: 'ai' | 'manual' | 'user' | 'approval' | 'default'
  details?: string
}

export const DEFAULT_PROCEDURE_STAGES: ProcedureStage[] = [
  { label: 'Verify Email Recipient', type: 'ai' },
  { label: 'Categorize Email', type: 'manual' },
  { label: 'Extract Customer Details', type: 'user' },
  { label: 'Find Master Service Agreement', type: 'manual' },
  { label: 'Review Master Service Agreement', type: 'ai' },
  { label: 'Verify Information Completeness', type: 'approval' },
  { label: 'If Missing Info, Compose Response', type: 'ai' },
  { label: 'Prepare Work Order', type: 'ai' },
  { label: 'Select Subcontractor', type: 'ai' },
  { label: 'Obtain Approval', type: 'approval' },
]

interface ProcedureNodeProps {
  id: string
  data: {
    label: string
    stages?: ProcedureStage[]
    onOpenDetailPanel?: (nodeId: string) => void
  }
}

const getStepIcon = (type: string) => {
  switch (type) {
    case 'ai': return <Sparkles size={14} className="text-indigo-500" />;
    case 'manual': return <Box size={14} className="text-orange-500" />;
    case 'user': return <User size={14} className="text-blue-500" />;
    case 'approval': return <Smile size={14} className="text-orange-500" />;
    default: return <FileText size={14} className="text-gray-500" />;
  }
}

const getStepIconBg = (type: string) => {
  switch (type) {
    case 'ai': return 'bg-indigo-100';
    case 'manual': return 'bg-orange-100';
    case 'user': return 'bg-blue-100';
    case 'approval': return 'bg-orange-50';
    default: return 'bg-gray-100';
  }
}

export function ProcedureNode({ id, data }: ProcedureNodeProps) {
  const stages = data.stages ?? DEFAULT_PROCEDURE_STAGES
  
  const handleOpenPanel = (e: React.MouseEvent) => {
    e.stopPropagation()
    data.onOpenDetailPanel?.(id)
  }
  
  return (
    <div className="procedure-card">
      <div className="procedure-header">
        <div className="procedure-title-group">
          <div className="procedure-icon-wrapper">
            <ListTodo size={16} />
          </div>
          <span className="procedure-title">{data.label || 'Procedure'}</span>
        </div>
        <div className="procedure-actions">
          <button className="action-button" onClick={handleOpenPanel}>
            <Edit2 size={14} />
          </button>
          <button className="action-button">
            <BarChart2 size={14} />
          </button>
        </div>
      </div>
      
      <div className="procedure-steps">
        <div className="timeline-line" />
        {stages.map((step, index) => (
          <div key={index} className="procedure-step" data-stage-index={index}>
            <div className="step-indicator">
              <div className="step-dot" />
            </div>
            <span className="step-label">{step.label}</span>
            <div className={`step-icon ${getStepIconBg(step.type)}`}>
              {getStepIcon(step.type)}
            </div>
          </div>
        ))}
      </div>

      <Handle type="target" position={Position.Top} className="procedure-handle" />
      <Handle type="source" position={Position.Bottom} className="procedure-handle" />
    </div>
  )
}
