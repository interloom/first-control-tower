import { useState, useMemo, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Canvas, SelectedNodeInfo, CanvasNodeInfo, CreateProcedureHandler } from './components/Canvas'
import { Header } from './components/Header'
import { ChatPanel } from './components/ChatPanel'
import { PreferencesModal, GridType } from './components/PreferencesModal'
import { MentionOption } from './components/MentionDropdown'
import './App.css'

// Default opacities: dots are more pronounced, lines are fainter
const DEFAULT_OPACITY = { dots: 0.7, lines: 0.25 }

// Predefined mention commands
const MENTION_COMMANDS: MentionOption[] = [
  { id: 'cmd-all-nodes', label: 'All Nodes', type: 'command', icon: 'layers' },
  { id: 'cmd-procedures', label: 'All Procedures', type: 'command', icon: 'git-branch' },
  { id: 'cmd-current-selection', label: 'Current Selection', type: 'command', icon: 'mouse-pointer' },
]

function App() {
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [gridType, setGridType] = useState<GridType>('dots')
  const [gridScale, setGridScale] = useState(12)
  const [gridOpacity, setGridOpacity] = useState(DEFAULT_OPACITY.dots)
  const [showParticleTrails, setShowParticleTrails] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<SelectedNodeInfo[]>([])
  const [canvasNodes, setCanvasNodes] = useState<CanvasNodeInfo[]>([])
  const [createProcedureHandler, setCreateProcedureHandler] = useState<CreateProcedureHandler | null>(null)

  // Store the create procedure handler when Canvas is ready
  const handleCreateProcedureReady = useCallback((handler: CreateProcedureHandler) => {
    setCreateProcedureHandler(() => handler)
  }, [])

  // Convert canvas nodes to mention options
  const mentionOptions = useMemo((): MentionOption[] => {
    const nodeOptions: MentionOption[] = canvasNodes.map(node => ({
      id: node.id,
      label: node.label,
      type: 'node' as const,
      nodeType: node.nodeType,
    }))
    return [...nodeOptions, ...MENTION_COMMANDS]
  }, [canvasNodes])

  // When grid type changes, apply the default opacity for that type
  const handleGridTypeChange = (type: GridType) => {
    setGridType(type)
    setGridOpacity(DEFAULT_OPACITY[type])
  }

  return (
    <div className="app">
      <Sidebar onSettingsClick={() => setIsPreferencesOpen(true)} />
      <div className="main-area">
        <Header 
          isChatOpen={isChatOpen} 
          onToggleChat={() => setIsChatOpen(prev => !prev)} 
        />
        <Canvas 
          gridType={gridType} 
          gridScale={gridScale} 
          gridOpacity={gridOpacity} 
          showParticleTrails={showParticleTrails}
          onSelectionChange={setSelectedNodes} 
          onNodesListChange={setCanvasNodes}
          onCreateProcedureReady={handleCreateProcedureReady}
        />
      </div>
      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        currentSpace={{ id: 'facility-management', label: 'Facility Management' }}
        selectedNodes={selectedNodes}
        onClearSelection={(nodeId) => {
          if (nodeId) {
            setSelectedNodes(prev => prev.filter(n => n.id !== nodeId))
          } else {
            setSelectedNodes([])
          }
        }}
        mentionOptions={mentionOptions}
        onCreateProcedure={createProcedureHandler ?? undefined}
      />
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        gridType={gridType}
        onGridTypeChange={handleGridTypeChange}
        gridScale={gridScale}
        onGridScaleChange={setGridScale}
        gridOpacity={gridOpacity}
        onGridOpacityChange={setGridOpacity}
        showParticleTrails={showParticleTrails}
        onShowParticleTrailsChange={setShowParticleTrails}
      />
    </div>
  )
}

export default App
