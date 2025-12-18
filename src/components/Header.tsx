import { Globe, ChevronDown, Factory, MessageCircle } from 'lucide-react'
import './Header.css'

interface HeaderProps {
  isChatOpen: boolean
  onToggleChat: () => void
}

export function Header({ isChatOpen, onToggleChat }: HeaderProps) {
  return (
    <header className="header">
      <div className="breadcrumb">
        <button className="breadcrumb-item">
          <Globe size={20} />
          <span>Spaces</span>
        </button>
        <span className="breadcrumb-separator">/</span>
        <button className="breadcrumb-item space-selector">
          <div className="space-avatar">
            <Factory size={12} />
          </div>
          <span>Facility Management</span>
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="header-actions">
        <button 
          className={`chat-toggle ${isChatOpen ? 'active' : ''}`}
          onClick={onToggleChat}
          title={isChatOpen ? 'Close chat' : 'Open chat'}
        >
          <MessageCircle size={18} />
        </button>
      </div>
    </header>
  )
}
