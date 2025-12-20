import { useState, useMemo, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Canvas, SelectedNodeInfo, CanvasNodeInfo, CreateProcedureHandler } from './components/Canvas'
import { Header } from './components/Header'
import { ChatPanel, OpenPanelInfo } from './components/ChatPanel'
import { ThreadsScreen } from './components/ThreadsScreen'
import { ThreadView } from './components/ThreadView'
import { PreferencesModal, GridType } from './components/PreferencesModal'
import { MentionOption } from './components/MentionDropdown'
import './App.css'
import { Globe, Factory, MessageSquare } from 'lucide-react'

// Default opacities: dots are more pronounced, lines are fainter
const DEFAULT_OPACITY = { dots: 0.7, lines: 0.25 }

// Predefined mention commands
const MENTION_COMMANDS: MentionOption[] = [
  { id: 'cmd-all-nodes', label: 'All Nodes', type: 'command', icon: 'layers' },
  { id: 'cmd-procedures', label: 'All Procedures', type: 'command', icon: 'git-branch' },
  { id: 'cmd-current-selection', label: 'Current Selection', type: 'command', icon: 'mouse-pointer' },
]

type Route =
  | { id: 'spaces' }
  | { id: 'threadsHome' }
  | { id: 'threadDetail'; threadId: string }
  | { id: 'dashboard' }
  | { id: 'tasks' }
  | { id: 'team' }

type Thread = {
  id: string
  title: string
  createdAt: number
  messages: { id: string; role: 'user'; content: string }[]
}

type Rect = { top: number; left: number; width: number; height: number }

function App() {
  const [route, setRoute] = useState<Route>({ id: 'spaces' })
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [gridType, setGridType] = useState<GridType>('dots')
  const [gridScale, setGridScale] = useState(12)
  const [gridOpacity, setGridOpacity] = useState(DEFAULT_OPACITY.dots)
  const [showParticleTrails, setShowParticleTrails] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<SelectedNodeInfo[]>([])
  const [canvasNodes, setCanvasNodes] = useState<CanvasNodeInfo[]>([])
  const [openPanel, setOpenPanel] = useState<OpenPanelInfo | null>(null)
  const [createProcedureHandler, setCreateProcedureHandler] = useState<CreateProcedureHandler | null>(null)
  const [closeAllPanelsHandler, setCloseAllPanelsHandler] = useState<(() => void) | null>(null)

  const [threads, setThreads] = useState<Thread[]>([])
  const [pendingMessageTransition, setPendingMessageTransition] = useState<{
    threadId: string
    messageId: string
    from: Rect
  } | null>(null)

  // Store the create procedure handler when Canvas is ready
  const handleCreateProcedureReady = useCallback((handler: CreateProcedureHandler) => {
    setCreateProcedureHandler(() => handler)
  }, [])

  const handleCloseAllPanelsReady = useCallback((handler: () => void) => {
    setCloseAllPanelsHandler(() => handler)
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

  const handleNavigate = useCallback((id: string) => {
    if (id === 'threads') {
      setRoute({ id: 'threadsHome' })
      setIsChatOpen(false)
      return
    }
    if (id === 'spaces') {
      setRoute({ id: 'spaces' })
      return
    }
    if (id === 'dashboard') return setRoute({ id: 'dashboard' })
    if (id === 'tasks') return setRoute({ id: 'tasks' })
    if (id === 'team') return setRoute({ id: 'team' })
  }, [])

  const startNewThread = useCallback((text: string, fromRect?: Rect) => {
    const now = Date.now()
    const threadId = `thread-${now}`
    const messageId = `msg-${now}`
    const title = text.trim().slice(0, 42) || 'Untitled'

    setThreads(prev => [
      {
        id: threadId,
        title,
        createdAt: now,
        messages: [{ id: messageId, role: 'user', content: text }],
      },
      ...prev,
    ])

    if (fromRect) {
      setPendingMessageTransition({ threadId, messageId, from: fromRect })
    } else {
      setPendingMessageTransition(null)
    }

    setRoute({ id: 'threadDetail', threadId })
  }, [])

  const currentThread =
    route.id === 'threadDetail' ? threads.find(t => t.id === route.threadId) : null

  const sidebarActiveId = route.id === 'spaces' ? 'spaces' : route.id.startsWith('thread') ? 'threads' : route.id

  const headerConfig = (() => {
    if (route.id === 'spaces') {
      return {
        sectionLabel: 'Spaces',
        SectionIcon: Globe,
        contextLabel: 'Facility Management',
        ContextIcon: Factory,
        showContextChevron: true,
        showChatToggle: true,
      }
    }

    if (route.id === 'threadsHome') {
      return {
        sectionLabel: 'Threads',
        SectionIcon: MessageSquare,
        contextLabel: 'New thread',
        showContextChevron: false,
        showChatToggle: false,
      }
    }

    if (route.id === 'threadDetail') {
      return {
        sectionLabel: 'Threads',
        SectionIcon: MessageSquare,
        contextLabel: currentThread?.title ?? 'Thread',
        showContextChevron: false,
        showChatToggle: false,
      }
    }

    return {
      sectionLabel: route.id,
      contextLabel: undefined,
      showContextChevron: false,
      showChatToggle: false,
    }
  })()

  return (
    <div className="app">
      <Sidebar
        activeId={sidebarActiveId}
        onNavigate={handleNavigate}
        onSettingsClick={() => setIsPreferencesOpen(true)}
      />
      <div className="main-area">
        <Header
          sectionLabel={headerConfig.sectionLabel}
          SectionIcon={headerConfig.SectionIcon}
          contextLabel={headerConfig.contextLabel}
          ContextIcon={headerConfig.ContextIcon}
          showContextChevron={headerConfig.showContextChevron}
          showChatToggle={headerConfig.showChatToggle}
          isChatOpen={isChatOpen}
          onToggleChat={() => setIsChatOpen(prev => !prev)}
        />

        {route.id === 'spaces' && (
          <>
            <Canvas
              gridType={gridType}
              gridScale={gridScale}
              gridOpacity={gridOpacity}
              showParticleTrails={showParticleTrails}
              onSelectionChange={setSelectedNodes}
              onNodesListChange={setCanvasNodes}
              onOpenPanelChange={setOpenPanel}
              onCreateProcedureReady={handleCreateProcedureReady}
              onCloseAllPanelsReady={handleCloseAllPanelsReady}
            />
          </>
        )}

        {route.id === 'threadsHome' && <ThreadsScreen title="Threads" onStartThread={startNewThread} />}

        {route.id === 'threadDetail' && currentThread && (
          <ThreadView
            threadId={currentThread.id}
            threadTitle={currentThread.title}
            initialMessage={currentThread.messages[0]!}
            pendingTransition={
              pendingMessageTransition &&
              pendingMessageTransition.threadId === currentThread.id &&
              pendingMessageTransition.messageId === currentThread.messages[0]?.id
                ? { messageId: pendingMessageTransition.messageId, from: pendingMessageTransition.from }
                : null
            }
            onTransitionDone={() => {
              setPendingMessageTransition(prev => {
                if (!prev) return prev
                if (prev.threadId !== currentThread.id) return prev
                return null
              })
            }}
          />
        )}

        {route.id === 'threadDetail' && !currentThread && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mono-500)' }}>
            Thread not found
          </div>
        )}

        {route.id !== 'spaces' && route.id !== 'threadsHome' && route.id !== 'threadDetail' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mono-500)' }}>
            {route.id} coming soon
          </div>
        )}
      </div>
      {route.id === 'spaces' && (
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentSpace={{ id: 'facility-management', label: 'Facility Management' }}
          selectedNodes={selectedNodes}
          openPanel={openPanel}
          onClearSelection={(nodeId) => {
            if (nodeId) {
              setSelectedNodes(prev => prev.filter(n => n.id !== nodeId))
            } else {
              setSelectedNodes([])
            }
          }}
          onClearOpenPanel={() => {
            setOpenPanel(null)
            closeAllPanelsHandler?.()
          }}
          mentionOptions={mentionOptions}
          onCreateProcedure={createProcedureHandler ?? undefined}
        />
      )}
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
