import { Handle, Position, NodeProps } from '@xyflow/react'
import { Table as TableIcon, Plus } from 'lucide-react'
import './nodes.css'

interface TableNodeData {
  label: string
}

const MOCK_HEADERS = [
  'OPPORTUNITY_ID',
  'ACCOUNT_ID',
  'ACCOUNT_NAME',
  'SEGMENT'
]

const MOCK_ROWS = [
  ['e219301a...', '5f80886e...', 'Harris, Welch...', 'Strategic'],
  ['747b0f9b...', '2818bbff...', 'Butler, Lindsey...', 'Mid-Market'],
  ['3c99b6fb...', '0cc01872...', 'Wong and Sons', 'SMB'],
  ['af03bc7a...', 'f57a9a9a...', 'Wilson-Allen', 'Enterprise'],
  ['2d8e8b8a...', 'e979c147...', 'Perez, Riley...', 'SMB'],
]

export function TableNode({ data }: NodeProps<TableNodeData>) {
  return (
    <div className="table-card">
      <div className="table-header-bar">
        <div className="table-title-group">
          <div className="table-icon-wrapper">
            <TableIcon size={16} />
          </div>
          <span className="table-title">{data.label || 'dim_opportunities_sample'}</span>
        </div>
        <div className="table-actions">
          <button className="action-button">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="table-content">
        <div className="table-grid">
          {/* Headers */}
          <div className="table-row header">
            <div className="table-cell index">#</div>
            {MOCK_HEADERS.map((header, i) => (
              <div key={i} className="table-cell header-cell">
                {header}
              </div>
            ))}
          </div>
          
          {/* Rows */}
          {MOCK_ROWS.map((row, i) => (
            <div key={i} className="table-row">
              <div className="table-cell index">{i + 7}</div>
              {row.map((cell, j) => (
                <div key={j} className="table-cell">
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="table-footer">
          <span className="row-count">150 rows</span>
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="table-handle" />
      <Handle type="source" position={Position.Bottom} className="table-handle" />
    </div>
  )
}

