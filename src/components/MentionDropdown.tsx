import { useEffect, useRef } from 'react'
import { 
  Inbox, 
  Package, 
  Bot, 
  FileText, 
  Table, 
  BarChart3,
  Layers,
  GitBranch,
  MousePointer,
  Command,
  LucideIcon
} from 'lucide-react'
import './MentionDropdown.css'

export interface MentionOption {
  id: string
  label: string
  type: 'node' | 'command'
  nodeType?: string  // inbox, outbox, procedure, file, agent, table, chart
  icon?: string      // For commands: layers, git-branch, mouse-pointer
}

interface MentionDropdownProps {
  options: MentionOption[]
  selectedIndex: number
  onSelect: (option: MentionOption) => void
  onClose: () => void
  position: { top: number; left: number }
}

// Map node types to icons
const nodeTypeIcons: Record<string, LucideIcon> = {
  inbox: Inbox,
  outbox: Package,
  procedure: Bot,
  file: FileText,
  agent: Bot,
  table: Table,
  chart: BarChart3,
}

// Map command icons
const commandIcons: Record<string, LucideIcon> = {
  layers: Layers,
  'git-branch': GitBranch,
  'mouse-pointer': MousePointer,
}

function getIcon(option: MentionOption): LucideIcon {
  if (option.type === 'command' && option.icon) {
    return commandIcons[option.icon] || Command
  }
  if (option.type === 'node' && option.nodeType) {
    return nodeTypeIcons[option.nodeType] || FileText
  }
  return FileText
}

export function MentionDropdown({ 
  options, 
  selectedIndex, 
  onSelect, 
  onClose, 
  position 
}: MentionDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Group options by type
  const nodeOptions = options.filter(opt => opt.type === 'node')
  const commandOptions = options.filter(opt => opt.type === 'command')

  // Calculate actual indices for selection
  let currentIndex = 0
  const getIndexForOption = (optionIndex: number, isCommand: boolean): number => {
    if (isCommand) {
      return nodeOptions.length + optionIndex
    }
    return optionIndex
  }

  return (
    <div 
      className="mention-dropdown"
      style={{
        bottom: `calc(100% - ${position.top}px + 8px)`,
        left: Math.max(0, position.left - 8),
      }}
      ref={listRef}
    >
      {nodeOptions.length > 0 && (
        <div className="mention-dropdown-section">
          <div className="mention-dropdown-section-title">Nodes</div>
          {nodeOptions.map((option, idx) => {
            const Icon = getIcon(option)
            const globalIdx = getIndexForOption(idx, false)
            const isSelected = globalIdx === selectedIndex
            return (
              <div
                key={option.id}
                ref={isSelected ? selectedRef : null}
                className={`mention-dropdown-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(option)}
                onMouseEnter={() => {/* Could add hover selection */}}
              >
                <span className="mention-dropdown-icon">
                  <Icon size={14} />
                </span>
                <span className="mention-dropdown-label">{option.label}</span>
                {option.nodeType && (
                  <span className="mention-dropdown-type">{option.nodeType}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {commandOptions.length > 0 && (
        <div className="mention-dropdown-section">
          <div className="mention-dropdown-section-title">Commands</div>
          {commandOptions.map((option, idx) => {
            const Icon = getIcon(option)
            const globalIdx = getIndexForOption(idx, true)
            const isSelected = globalIdx === selectedIndex
            return (
              <div
                key={option.id}
                ref={isSelected ? selectedRef : null}
                className={`mention-dropdown-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(option)}
              >
                <span className="mention-dropdown-icon command">
                  <Icon size={14} />
                </span>
                <span className="mention-dropdown-label">{option.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {options.length === 0 && (
        <div className="mention-dropdown-empty">No matches found</div>
      )}
    </div>
  )
}
