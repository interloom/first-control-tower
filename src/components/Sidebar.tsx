import { CheckSquare, LayoutGrid, Box, Settings, Users, Folder, Menu } from 'lucide-react'
import './Sidebar.css'

interface NavItem {
  icon: typeof CheckSquare
  label: string
  active: boolean
  onClick?: () => void
}

const folders = Array(11).fill({ icon: Folder, label: 'Folder' })

interface SidebarProps {
  onSettingsClick?: () => void
}

export function Sidebar({ onSettingsClick }: SidebarProps) {
  const navItems: NavItem[] = [
    { icon: CheckSquare, label: 'Tasks', active: false },
    { icon: LayoutGrid, label: 'Dashboard', active: false },
    { icon: Box, label: 'Spaces', active: true },
    { icon: Settings, label: 'Settings', active: false, onClick: onSettingsClick },
    { icon: Users, label: 'Team', active: false },
  ]

  return (
    <aside className="sidebar">
      <button className="sidebar-toggle">
        <Menu size={20} />
      </button>
      
      <nav className="sidebar-nav">
        {navItems.map((item, index) => (
          <button 
            key={index} 
            className={`nav-item ${item.active ? 'active' : ''}`}
            title={item.label}
            onClick={item.onClick}
          >
            <item.icon size={20} />
          </button>
        ))}
      </nav>

      <div className="sidebar-folders">
        {folders.map((item, index) => (
          <button key={index} className="folder-item" title={item.label}>
            <item.icon size={16} />
          </button>
        ))}
      </div>
    </aside>
  )
}

