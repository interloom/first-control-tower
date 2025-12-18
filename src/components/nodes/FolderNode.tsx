import { Handle, Position } from '@xyflow/react'
import { Folder } from 'lucide-react'
import './nodes.css'

interface FolderNodeProps {
  data: {
    label: string
    fileCount?: number
    totalSize?: string
    lastModified?: string
  }
}

export function FolderNode({ data }: FolderNodeProps) {
  const fileCount = data.fileCount ?? 12
  const totalSize = data.totalSize ?? '2.4 MB'
  const lastModified = data.lastModified ?? 'Dec 8, 2025'

  return (
    <div className="flow-node block-node folder-block">
      <div className="block-icon folder-icon">
        <Folder size={18} />
      </div>
      <div className="block-content">
        <span className="block-type">Folder</span>
        <span className="block-label">{data.label}</span>
        <div className="folder-meta">
          <span>{fileCount} files</span>
          <span className="meta-separator">•</span>
          <span>{totalSize}</span>
          <span className="meta-separator">•</span>
          <span>{lastModified}</span>
        </div>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
