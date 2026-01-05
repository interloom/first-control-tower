import { useCallback, useState, useRef, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  ControlButton,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  addEdge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { InboxNode } from './nodes/InboxNode'
import { OutboxNode } from './nodes/OutboxNode'
import { FileNode } from './nodes/FileNode'
import { ProcedureNode, DEFAULT_PROCEDURE_STAGES, ProcedureStage } from './nodes/ProcedureNode'
import { AgentNode } from './nodes/AgentNode'
import { TableNode } from './nodes/TableNode'
import { ChartNode } from './nodes/ChartNode'
import { FolderNode } from './nodes/FolderNode'
import { MarkerNode } from './nodes/MarkerNode'
import { CaseNode } from './nodes/CaseNode'
import { EventStreamNode } from './nodes/EventStreamNode'
import { ContextMenu } from './ContextMenu'
import { NodeToolbar } from './NodeToolbar'
import { Timeline } from './Timeline'
import { CanvasOutline } from './CanvasOutline'
import { ParticleCanvas } from './ParticleCanvas'
import { ProcedureDetailPanel } from './ProcedureDetailPanel'
import { CaseDetailPanel } from './CaseDetailPanel'
import { StageDetailPanel } from './StageDetailPanel'
import { ParticleSystem } from '../services/ParticleSystem'
import { CaseStatus, CasePriority } from './nodes/CaseNode'
import { mockCases, getCasesByStage, getAverageTimeInStage, MockCase } from '../data/mockCases'
import type { OpenPanelInfo } from './ChatPanel'
import type { GridType } from './PreferencesModal'
import './Canvas.css'

// Type for create procedure handler
export type CreateProcedureHandler = (title: string, stages: ProcedureStage[]) => void

// Type for update procedure handler
export type UpdateProcedureHandler = (procedureId: string, stages: ProcedureStage[]) => void

const nodeTypes = {
  inbox: InboxNode,
  outbox: OutboxNode,
  file: FileNode,
  procedure: ProcedureNode,
  agent: AgentNode,
  table: TableNode,
  chart: ChartNode,
  folder: FolderNode,
  marker: MarkerNode,
  case: CaseNode,
  eventStream: EventStreamNode,
}

const initialNodes: Node[] = [
  {
    id: 'inbox',
    type: 'inbox',
    position: { x: 400, y: 100 },
    data: { 
      label: 'Inbox', 
      count: '34 new',
      casesPerMinute: 2,
      holdDurationMin: 500,
      holdDurationMax: 2000,
    },
  },
  {
    id: 'outbox',
    type: 'outbox',
    position: { x: 400, y: 500 },
    data: { 
      label: 'Outbox', 
      count: '560 today',
      retentionSeconds: 3,
    },
  },
]

const initialEdges: Edge[] = [
  {
    id: 'inbox-outbox',
    source: 'inbox',
    target: 'outbox',
    type: 'default',
    style: { stroke: 'transparent', strokeWidth: 0 },
    selectable: true,
    focusable: true,
  },
]

interface ContextMenuState {
  show: boolean
  x: number
  y: number
  flowX: number
  flowY: number
}

interface ToolbarState {
  show: boolean
  nodeId: string | null
  x: number
  y: number
}

interface CanvasInnerProps {
  gridType: GridType
  gridScale: number
  gridOpacity: number
  showParticleTrails: boolean
  onSelectionChange?: (selectedNodes: SelectedNodeInfo[]) => void
  onNodesListChange?: (nodes: CanvasNodeInfo[]) => void
  onOpenPanelChange?: (panel: OpenPanelInfo | null) => void
  onCreateProcedureReady?: (handler: CreateProcedureHandler) => void
  onUpdateProcedureReady?: (handler: UpdateProcedureHandler) => void
  onCloseAllPanelsReady?: (handler: () => void) => void
}

function CanvasInner({ gridType, gridScale, gridOpacity, showParticleTrails, onSelectionChange, onNodesListChange, onOpenPanelChange, onCreateProcedureReady, onUpdateProcedureReady, onCloseAllPanelsReady }: CanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    flowX: 0,
    flowY: 0,
  })
  const [toolbar, setToolbar] = useState<ToolbarState>({
    show: false,
    nodeId: null,
    x: 0,
    y: 0,
  })
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, flowToScreenPosition, getNode, zoomTo } = useReactFlow()
  
  // Case animation - particle system for flowing cases
  const [isLiveMode, setIsLiveMode] = useState(true)
  
  // History mode state - case transitions for the selected time range
  const [caseTransitions, setCaseTransitions] = useState<number | null>(null)
  
  // Procedure detail panel state
  const [detailPanelNodeId, setDetailPanelNodeId] = useState<string | null>(null)
  
  // Case detail panel state
  const [caseDetailPanelNodeId, setCaseDetailPanelNodeId] = useState<string | null>(null)
  
  // Stage detail panel state
  const [stageDetailPanel, setStageDetailPanel] = useState<{ nodeId: string, stageIndex?: number } | null>(null)
  
  // Cases state for dynamic management
  const [cases, setCases] = useState<MockCase[]>(mockCases)
  
  // Canvas outline collapsed state
  const [outlineCollapsed, setOutlineCollapsed] = useState(true)
  
  // Create particle system instance (stable reference)
  const [particleSystem] = useState(() => new ParticleSystem({
    startNodeId: 'inbox',
    maxParticles: 50,
    spawnRate: 2 / 60, // Default: 2 cases per minute converted to per second
    flowSpeed: 1,
    colors: ['#4f46e5'], // Matches procedure icon color
    trailLength: 18, // 30% shorter than original 25
    particleSizeRange: [2, 2], // Constant size
    speedVariation: [0.4, 0.8],
  }))

  // Sync particle spawn rate with inbox node's casesPerMinute setting
  useEffect(() => {
    const inboxNode = nodes.find(n => n.id === 'inbox')
    const casesPerMinute = inboxNode?.data?.casesPerMinute ?? 2
    particleSystem.updateConfig({ spawnRate: casesPerMinute / 60 })
  }, [nodes, particleSystem])

  // Sync particle trails setting
  useEffect(() => {
    particleSystem.updateConfig({ showTrails: showParticleTrails })
  }, [showParticleTrails, particleSystem])

  // Update trajectory width based on mode (4x wider in history mode)
  useEffect(() => {
    particleSystem.updateConfig({ 
      trajectoryWidth: isLiveMode ? 1.5 : 6 
    })
  }, [isLiveMode, particleSystem])

  // Configure particle system for history mode with lateral spread
  useEffect(() => {
    if (!isLiveMode && caseTransitions !== null) {
      // History mode with selection: high spawn rate, lateral spread enabled
      // Spawn rate = caseTransitions / 10 for ~10 second visualization
      particleSystem.updateConfig({
        spawnRate: caseTransitions / 10,
        maxParticles: Math.min(500, caseTransitions), // Cap at 500 for performance
        lateralSpread: 25, // 25px lateral displacement
        showTrails: false, // Cleaner look with many particles
      })
    } else if (isLiveMode) {
      // Live mode: reset to normal config
      const inboxNode = nodes.find(n => n.id === 'inbox')
      const casesPerMinute = inboxNode?.data?.casesPerMinute ?? 2
      particleSystem.updateConfig({
        spawnRate: casesPerMinute / 60,
        maxParticles: 50,
        lateralSpread: 0, // No lateral spread in live mode
        showTrails: showParticleTrails,
      })
    }
  }, [isLiveMode, caseTransitions, particleSystem, nodes, showParticleTrails])

  // Determine if particles should be enabled
  const particlesEnabled = isLiveMode || (!isLiveMode && caseTransitions !== null)

  // Handler to open procedure detail panel
  const handleOpenDetailPanel = useCallback((nodeId: string) => {
    setDetailPanelNodeId(nodeId)
    setCaseDetailPanelNodeId(null) // Close case panel if open
    setStageDetailPanel(null) // Close stage panel if open
    
    const node = nodes.find(n => n.id === nodeId)
    if (node && onOpenPanelChange) {
      onOpenPanelChange({
        type: 'procedure',
        id: nodeId,
        label: (node.data?.label as string) ?? 'Procedure',
      })
    }
  }, [nodes, onOpenPanelChange])

  // Close procedure detail panel
  const handleCloseDetailPanel = useCallback(() => {
    setDetailPanelNodeId(null)
    onOpenPanelChange?.(null)
  }, [onOpenPanelChange])
  
  // Handler to open case detail panel
  const handleOpenCaseDetailPanel = useCallback((nodeId: string) => {
    setCaseDetailPanelNodeId(nodeId)
    setDetailPanelNodeId(null) // Close procedure panel if open
    setStageDetailPanel(null) // Close stage panel if open
    
    // Check if it's a case from state or a node
    const caseItem = cases.find(c => c.id === nodeId)
    const node = !caseItem ? nodes.find(n => n.id === nodeId) : null
    const label = caseItem?.label ?? (node?.data?.label as string) ?? 'Case'
    
    if (onOpenPanelChange) {
      onOpenPanelChange({
        type: 'case',
        id: nodeId,
        label,
      })
    }
  }, [cases, nodes, onOpenPanelChange])

  // Close case detail panel
  const handleCloseCaseDetailPanel = useCallback(() => {
    setCaseDetailPanelNodeId(null)
    onOpenPanelChange?.(null)
  }, [onOpenPanelChange])
  
  // Handler to open stage detail panel (for Procedure nodes)
  const handleOpenStageDetailPanel = useCallback((nodeId: string, stageIndex: number) => {
    setStageDetailPanel({ nodeId, stageIndex })
    setDetailPanelNodeId(null) // Close procedure panel if open
    setCaseDetailPanelNodeId(null) // Close case panel if open
    
    const node = nodes.find(n => n.id === nodeId)
    if (node && onOpenPanelChange) {
      const stages = node.data?.stages ?? DEFAULT_PROCEDURE_STAGES
      const stage = stages[stageIndex]
      onOpenPanelChange({
        type: 'stage',
        id: `${nodeId}:${stageIndex}`,
        label: stage?.label ?? `Stage ${stageIndex + 1}`,
        nodeId,
        stageIndex,
      })
    }
  }, [nodes, onOpenPanelChange])
  
  // Handler to open stage detail panel (for Inbox/Outbox nodes)
  const handleOpenInboxOutboxStagePanel = useCallback((nodeId: string) => {
    setStageDetailPanel({ nodeId })
    setDetailPanelNodeId(null) // Close procedure panel if open
    setCaseDetailPanelNodeId(null) // Close case panel if open
    
    const node = nodes.find(n => n.id === nodeId)
    if (onOpenPanelChange) {
      onOpenPanelChange({
        type: 'stage',
        id: nodeId,
        label: (node?.data?.label as string) ?? nodeId,
        nodeId,
      })
    }
  }, [nodes, onOpenPanelChange])

  // Close stage detail panel
  const handleCloseStageDetailPanel = useCallback(() => {
    setStageDetailPanel(null)
    onOpenPanelChange?.(null)
  }, [onOpenPanelChange])
  
  // Handler to add example cases to a stage
  const handleAddExampleCases = useCallback((stageId: string) => {
    // Take the 6 example cases and assign them to the selected stage
    const exampleCases = mockCases.map((c, idx) => ({
      ...c,
      id: `${stageId}-case-${idx}-${Date.now()}`,
      currentStage: stageId,
      stageEnteredAt: new Date().toISOString(),
    }))
    setCases(prev => [...prev, ...exampleCases])
  }, [])
  
  // Handler to open case detail from stage panel
  const handleOpenCaseDetailFromStage = useCallback((caseId: string) => {
    // Find the case in cases state and open the case detail panel
    const caseItem = cases.find(c => c.id === caseId)
    if (caseItem) {
      // We'll use the case ID as the "node ID" for now
      setCaseDetailPanelNodeId(caseId)
      setStageDetailPanel(null) // Close stage panel
      
      // Update context pill to show the case panel
      if (onOpenPanelChange) {
        onOpenPanelChange({
          type: 'case',
          id: caseId,
          label: caseItem.label,
        })
      }
    }
  }, [cases, onOpenPanelChange])

  // Get data for the detail panel
  const detailPanelNode = detailPanelNodeId ? nodes.find(n => n.id === detailPanelNodeId) : null
  const detailPanelStages = detailPanelNode?.data?.stages ?? DEFAULT_PROCEDURE_STAGES
  const detailPanelLabel = (detailPanelNode?.data?.label as string) ?? 'Procedure'
  
  // Handle stage details change in procedure detail panel
  const handleStageDetailsChange = useCallback((stageIndex: number, details: string) => {
    if (!detailPanelNodeId) return
    
    setNodes(nds => nds.map(node => {
      if (node.id === detailPanelNodeId) {
        const currentStages = node.data?.stages ?? DEFAULT_PROCEDURE_STAGES
        const updatedStages = currentStages.map((stage: ProcedureStage, idx: number) => 
          idx === stageIndex ? { ...stage, details } : stage
        )
        return {
          ...node,
          data: {
            ...node.data,
            stages: updatedStages,
          }
        }
      }
      return node
    }))
  }, [detailPanelNodeId, setNodes])
  
  // Get data for the case detail panel
  // First check if it's a case from state, otherwise check nodes
  const caseItem = caseDetailPanelNodeId ? cases.find(c => c.id === caseDetailPanelNodeId) : null
  const caseDetailPanelNode = !caseItem && caseDetailPanelNodeId ? nodes.find(n => n.id === caseDetailPanelNodeId) : null
  
  const caseDetailLabel = caseItem?.label ?? (caseDetailPanelNode?.data?.label as string) ?? 'Case'
  const caseDetailId = caseItem?.caseId ?? (caseDetailPanelNode?.data?.caseId as string) ?? `#${caseDetailPanelNodeId?.slice(-6).toUpperCase() ?? ''}`
  const caseDetailStatus = (caseItem?.status ?? caseDetailPanelNode?.data?.status) as CaseStatus ?? 'open'
  const caseDetailPriority = (caseItem?.priority ?? caseDetailPanelNode?.data?.priority) as CasePriority ?? 'medium'
  const caseDetailAssignee = caseItem?.assignee ?? (caseDetailPanelNode?.data?.assignee as string) ?? 'Unassigned'
  const caseDetailCreatedAt = caseItem?.createdAt ?? (caseDetailPanelNode?.data?.createdAt as string) ?? 'Just now'
  const caseDetailDueDate = caseItem?.dueDate ?? (caseDetailPanelNode?.data?.dueDate as string | undefined)
  const caseDetailTags = caseItem?.tags ?? (caseDetailPanelNode?.data?.tags as string[]) ?? []
  const caseDetailCurrentStage = caseItem?.currentStage
  const caseDetailAttachedFiles = caseItem?.attachedFiles
  const caseDetailNotepad = caseItem?.notepad

  // Update procedure nodes with the callbacks
  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.type === 'procedure') {
        return {
          ...node,
          data: {
            ...node.data,
            onOpenDetailPanel: handleOpenDetailPanel,
            onStageClick: handleOpenStageDetailPanel,
          }
        }
      }
      return node
    }))
  }, [handleOpenDetailPanel, handleOpenStageDetailPanel, setNodes])

  // Update case nodes with the callback
  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.type === 'case') {
        return {
          ...node,
          data: {
            ...node.data,
            onOpenDetailPanel: handleOpenCaseDetailPanel,
          }
        }
      }
      return node
    }))
  }, [handleOpenCaseDetailPanel, setNodes])

  // Update inbox node with the generate case callback
  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.id === 'inbox') {
        return {
          ...node,
          data: {
            ...node.data,
            onGenerateCase: () => particleSystem.spawnOne(),
          }
        }
      }
      return node
    }))
  }, [particleSystem, setNodes])

  // Update event stream nodes with the spawn event callback
  // Track event stream node IDs to re-run when new ones are added
  const eventStreamNodeIds = useMemo(() => 
    nodes.filter(n => n.type === 'eventStream').map(n => n.id).join(','),
    [nodes]
  )
  
  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.type === 'eventStream') {
        const nodeId = node.id
        return {
          ...node,
          data: {
            ...node.data,
            onSpawnEvent: () => particleSystem.spawnFrom(nodeId),
          }
        }
      }
      return node
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleSystem, setNodes, eventStreamNodeIds])
  
  // Update inbox and outbox nodes with the stage click callback
  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.id === 'inbox' || node.id === 'outbox') {
        return {
          ...node,
          data: {
            ...node.data,
            onStageClick: handleOpenInboxOutboxStagePanel,
          }
        }
      }
      return node
    }))
  }, [handleOpenInboxOutboxStagePanel, setNodes])

  // Get selected node IDs from nodes state
  const selectedNodeIds = useMemo(() => 
    nodes.filter(node => node.selected).map(node => node.id),
    [nodes]
  )

  // Notify parent of selection changes
  useEffect(() => {
    if (!onSelectionChange) return
    
    const selectedNodes = selectedNodeIds
      .map(id => nodes.find(n => n.id === id))
      .filter((node): node is NonNullable<typeof node> => node != null)
      .map(node => ({
        id: node.id,
        label: (node.data?.label as string) ?? node.id,
        type: node.type ?? 'unknown',
      }))
    
    onSelectionChange(selectedNodes)
  }, [selectedNodeIds, nodes, onSelectionChange])

  // Handle manual edge connections
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({
      ...connection,
      type: 'default',
      style: { stroke: 'transparent', strokeWidth: 0 },
      selectable: true,
      focusable: true,
    }, eds))
  }, [setEdges])

  // Update edge labels when in history mode with a selection
  useEffect(() => {
    if (!isLiveMode && caseTransitions !== null) {
      // Show case transitions label on all edges
      setEdges((eds) => eds.map(edge => ({
        ...edge,
        label: `${caseTransitions.toLocaleString()} transitions`,
        labelStyle: { 
          fill: '#64748b', 
          fontWeight: 500, 
          fontSize: 12,
        },
        labelBgStyle: { 
          fill: 'white', 
          fillOpacity: 0.9,
        },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
      })))
    } else {
      // Clear labels when in live mode or no selection
      setEdges((eds) => eds.map(edge => ({
        ...edge,
        label: undefined,
        labelStyle: undefined,
        labelBgStyle: undefined,
        labelBgPadding: undefined,
        labelBgBorderRadius: undefined,
      })))
    }
  }, [isLiveMode, caseTransitions, setEdges])

  // Sort nodes for outline: inbox first, procedures, outbox last, then other nodes
  const sortedNodes = useMemo(() => {
    const typeOrder: Record<string, number> = { inbox: 0, procedure: 1, outbox: 2 }
    return [...nodes].sort((a, b) => {
      const aOrder = typeOrder[a.type ?? ''] ?? 3
      const bOrder = typeOrder[b.type ?? ''] ?? 3
      return aOrder - bOrder
    })
  }, [nodes])

  // Create a stable signature for nodes to avoid infinite loops
  const nodesSignature = useMemo(() => {
    return sortedNodes.map(n => `${n.id}:${n.data?.label}:${n.type}`).join('|')
  }, [sortedNodes])

  // Notify parent when nodes list changes (for @-mention autocomplete)
  useEffect(() => {
    if (!onNodesListChange) return
    
    const nodesList: CanvasNodeInfo[] = sortedNodes.map(node => ({
      id: node.id,
      label: (node.data?.label as string) ?? node.id,
      nodeType: node.type ?? 'unknown',
    }))
    
    onNodesListChange(nodesList)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesSignature, onNodesListChange])

  // Handle selection from outline - select node on canvas
  const handleOutlineSelectNode = useCallback((nodeId: string) => {
    setNodes((nds) => 
      nds.map((node) => ({
        ...node,
        selected: node.id === nodeId,
      }))
    )
    
    // Also show the toolbar for the selected node
    const node = getNode(nodeId)
    if (node && reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const screenPos = flowToScreenPosition({
        x: node.position.x + 80,
        y: node.position.y,
      })
      
      setToolbar({
        show: true,
        nodeId: node.id,
        x: screenPos.x - bounds.left,
        y: screenPos.y - bounds.top - 50,
      })
    }
    
    setContextMenu((prev) => ({ ...prev, show: false }))
  }, [setNodes, getNode, flowToScreenPosition])


  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      
      if (!reactFlowWrapper.current) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      setContextMenu({
        show: true,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        flowX: position.x,
        flowY: position.y,
      })
      setToolbar({ show: false, nodeId: null, x: 0, y: 0 })
    },
    [screenToFlowPosition]
  )

  const onPaneClick = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, show: false }))
    setToolbar({ show: false, nodeId: null, x: 0, y: 0 })
  }, [])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!reactFlowWrapper.current) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      
      // Get screen position of the node's top center
      const screenPos = flowToScreenPosition({
        x: node.position.x + 80, // Approximate center of node
        y: node.position.y,
      })

      setToolbar({
        show: true,
        nodeId: node.id,
        x: screenPos.x - bounds.left,
        y: screenPos.y - bounds.top - 50, // Position above node
      })
      setContextMenu((prev) => ({ ...prev, show: false }))
    },
    [flowToScreenPosition]
  )

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!reactFlowWrapper.current || toolbar.nodeId !== node.id) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const screenPos = flowToScreenPosition({
        x: node.position.x + 80,
        y: node.position.y,
      })

      setToolbar((prev) => ({
        ...prev,
        x: screenPos.x - bounds.left,
        y: screenPos.y - bounds.top - 50,
      }))
    },
    [flowToScreenPosition, toolbar.nodeId]
  )

  const addNode = useCallback(
    (type: 'file' | 'procedure' | 'agent' | 'table' | 'chart' | 'folder' | 'marker' | 'case' | 'eventStream') => {
      const id = `${type}-${Date.now()}`
      const labels = {
        file: 'New File',
        procedure: 'New Procedure',
        agent: 'New Agent',
        table: 'New Table',
        chart: 'New Chart',
        folder: 'New Folder',
        marker: 'New Marker',
        case: 'New Case',
        eventStream: 'New Event Stream',
      }

      const nodeData: Record<string, unknown> = { label: labels[type] }
      
      // Add default stages for procedure nodes
      if (type === 'procedure') {
        nodeData.stages = DEFAULT_PROCEDURE_STAGES
        nodeData.onOpenDetailPanel = handleOpenDetailPanel
      }

      // Add default data for case nodes
      if (type === 'case') {
        nodeData.status = 'open'
        nodeData.priority = 'medium'
        nodeData.assignee = 'Unassigned'
        nodeData.createdAt = new Date().toLocaleDateString()
        nodeData.tags = []
        nodeData.onOpenDetailPanel = handleOpenCaseDetailPanel
      }

      // Add default data for event stream nodes
      if (type === 'eventStream') {
        nodeData.eventsPerMinute = 240
      }

      const newNode: Node = {
        id,
        type,
        position: { x: contextMenu.flowX - 60, y: contextMenu.flowY - 25 },
        data: nodeData,
      }

      setNodes((nds) => [...nds, newNode])
      setContextMenu((prev) => ({ ...prev, show: false }))
    },
    [contextMenu.flowX, contextMenu.flowY, setNodes, handleOpenDetailPanel, handleOpenCaseDetailPanel]
  )

  const deleteNode = useCallback(() => {
    if (!toolbar.nodeId) return
    
    // Don't allow deleting inbox or outbox
    if (toolbar.nodeId === 'inbox' || toolbar.nodeId === 'outbox') return
    
    // Remove the node and any edges connected to it
    setNodes((nds) => nds.filter((n) => n.id !== toolbar.nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== toolbar.nodeId && e.target !== toolbar.nodeId))
    
    setToolbar({ show: false, nodeId: null, x: 0, y: 0 })
  }, [toolbar.nodeId, setNodes, setEdges])

  const duplicateNode = useCallback(() => {
    if (!toolbar.nodeId) return
    
    // Don't allow duplicating inbox or outbox
    if (toolbar.nodeId === 'inbox' || toolbar.nodeId === 'outbox') return
    
    const nodeToDuplicate = getNode(toolbar.nodeId)
    if (!nodeToDuplicate) return

    const id = `${nodeToDuplicate.type}-${Date.now()}`
    const newNode: Node = {
      ...nodeToDuplicate,
      id,
      position: {
        x: nodeToDuplicate.position.x + 40,
        y: nodeToDuplicate.position.y + 40,
      },
      selected: false,
    }

    setNodes((nds) => [...nds, newNode])
    setToolbar({ show: false, nodeId: null, x: 0, y: 0 })
  }, [toolbar.nodeId, getNode, setNodes])

  // Handle keyboard events for deleting selected edges and nodes
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Delete or Backspace was pressed
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Don't trigger if user is typing in an input, textarea, or contenteditable element
        if (
          event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          (event.target instanceof HTMLElement && event.target.isContentEditable)
        ) {
          return
        }

        // Delete selected edges
        const selectedEdges = edges.filter(edge => edge.selected)
        if (selectedEdges.length > 0) {
          setEdges(eds => eds.filter(edge => !edge.selected))
          event.preventDefault()
          return
        }

        // Delete selected nodes (except inbox/outbox)
        const selectedNodes = nodes.filter(node => node.selected && node.id !== 'inbox' && node.id !== 'outbox')
        if (selectedNodes.length > 0) {
          const selectedNodeIds = selectedNodes.map(n => n.id)
          setNodes(nds => nds.filter(n => !selectedNodeIds.includes(n.id)))
          // Also remove edges connected to deleted nodes
          setEdges(eds => eds.filter(e => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)))
          setToolbar({ show: false, nodeId: null, x: 0, y: 0 })
          event.preventDefault()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [edges, nodes, setEdges, setNodes])

  // Handler for creating procedure nodes from the agent chat
  const handleCreateProcedure = useCallback((title: string, stages: ProcedureStage[]) => {
    const id = `procedure-${Date.now()}`
    
    const newNode: Node = {
      id,
      type: 'procedure',
      position: { x: 400, y: 300 }, // Default position, user can drag to desired location
      data: {
        label: title,
        stages,
        onOpenDetailPanel: handleOpenDetailPanel,
      },
    }

    setNodes((nds) => [...nds, newNode])
  }, [setNodes, handleOpenDetailPanel])

  // Expose the create procedure handler to parent components
  useEffect(() => {
    if (onCreateProcedureReady) {
      onCreateProcedureReady(handleCreateProcedure)
    }
  }, [onCreateProcedureReady, handleCreateProcedure])

  // Handler for updating procedure nodes from the agent chat
  const handleUpdateProcedure = useCallback((procedureId: string, stages: ProcedureStage[]) => {
    setNodes((nds) => 
      nds.map(node => 
        node.id === procedureId 
          ? { ...node, data: { ...node.data, stages } }
          : node
      )
    )
  }, [setNodes])

  // Expose the update procedure handler to parent components
  useEffect(() => {
    if (onUpdateProcedureReady) {
      onUpdateProcedureReady(handleUpdateProcedure)
    }
  }, [onUpdateProcedureReady, handleUpdateProcedure])

  // Create close all panels handler
  const handleCloseAllPanels = useCallback(() => {
    setDetailPanelNodeId(null)
    setCaseDetailPanelNodeId(null)
    setStageDetailPanel(null)
    onOpenPanelChange?.(null)
  }, [onOpenPanelChange])

  // Expose the close all panels handler to parent components
  useEffect(() => {
    if (onCloseAllPanelsReady) {
      onCloseAllPanelsReady(handleCloseAllPanels)
    }
  }, [onCloseAllPanelsReady, handleCloseAllPanels])

  // Compute data for stage detail panel
  const stageDetailData = useMemo(() => {
    if (!stageDetailPanel) return null
    
    const { nodeId, stageIndex } = stageDetailPanel
    const node = nodes.find(n => n.id === nodeId)
    
    let stageName = ''
    let stageType: 'inbox' | 'outbox' | 'procedure' | undefined
    let stageSubtype: 'ai' | 'manual' | 'user' | 'approval' | 'default' | undefined
    let stageId = ''
    
    if (nodeId === 'inbox') {
      stageName = 'Inbox'
      stageType = 'inbox'
      stageId = 'inbox'
    } else if (nodeId === 'outbox') {
      stageName = 'Outbox'
      stageType = 'outbox'
      stageId = 'outbox'
    } else if (node?.type === 'procedure' && stageIndex !== undefined) {
      const stages = node.data?.stages ?? DEFAULT_PROCEDURE_STAGES
      const stage = stages[stageIndex]
      if (stage) {
        stageName = stage.label
        stageType = 'procedure'
        stageSubtype = stage.type
        stageId = `${nodeId}:${stageIndex}`
      }
    }
    
    // Filter cases from state instead of using static helper
    const stageCases = cases.filter(c => c.currentStage === stageId)
    
    // Calculate average time in stage
    const now = new Date()
    const averageTime = stageCases.length === 0 ? 0 : stageCases.reduce((sum, c) => {
      if (!c.stageEnteredAt) return sum
      const enteredAt = new Date(c.stageEnteredAt)
      const hoursInStage = (now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60)
      return sum + hoursInStage
    }, 0) / stageCases.length
    
    return {
      stageName,
      stageType,
      stageSubtype,
      stageId,
      cases: stageCases,
      averageTime,
    }
  }, [stageDetailPanel, nodes, cases])

  return (
    <div className={`canvas-container ${outlineCollapsed ? 'outline-collapsed' : 'outline-expanded'}`} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onContextMenu={onContextMenu}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onNodeDrag={onNodeDrag}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'default',
          // Invisible in idle state - ParticleSystem draws the visible trajectory
          style: { stroke: 'transparent', strokeWidth: 0 },
          selectable: true,
          focusable: true,
        }}
      >
        <Background 
          variant={gridType === 'dots' ? BackgroundVariant.Dots : BackgroundVariant.Lines} 
          gap={gridScale} 
          size={gridType === 'dots' ? 1 : 0.5} 
          color={`rgba(180, 175, 170, ${gridOpacity})`}
        />
        <Controls 
          showInteractive={false}
          position="bottom-right"
        >
          <ControlButton
            onClick={() => zoomTo(1)}
            title="Zoom to 100%"
            aria-label="Zoom to 100%"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="10" fontWeight="bold">1:1</text>
            </svg>
          </ControlButton>
        </Controls>
        
        {/* Particle animation canvas - must be child of ReactFlow for viewport access */}
        <ParticleCanvas 
          particleSystem={particleSystem} 
          enabled={particlesEnabled}
          showTrajectories={true}
        />
      </ReactFlow>

      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAddFile={() => addNode('file')}
          onAddProcedure={() => addNode('procedure')}
          onAddAgent={() => addNode('agent')}
          onAddTable={() => addNode('table')}
          onAddChart={() => addNode('chart')}
          onAddFolder={() => addNode('folder')}
          onAddMarker={() => addNode('marker')}
          onAddCase={() => addNode('case')}
          onAddEventStream={() => addNode('eventStream')}
          onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
        />
      )}

      {toolbar.show && (
        <NodeToolbar
          x={toolbar.x}
          y={toolbar.y}
          onDelete={deleteNode}
          onDuplicate={duplicateNode}
        />
      )}

      <Timeline 
        isLiveMode={isLiveMode}
        onRangeSelect={(start, end, throughput) => {
          console.log('Selected range:', start, end, 'throughput:', throughput)
          if (throughput !== null) {
            setCaseTransitions(throughput)
            setIsLiveMode(false)
          } else {
            setCaseTransitions(null)
          }
        }}
        onLiveModeClick={() => {
          setIsLiveMode(true)
          setCaseTransitions(null)
        }}
        onHistoryModeClick={() => setIsLiveMode(false)}
      />

      <CanvasOutline
        nodes={sortedNodes}
        selectedNodeIds={selectedNodeIds}
        onSelectNode={handleOutlineSelectNode}
        isCollapsed={outlineCollapsed}
        onToggleCollapsed={() => setOutlineCollapsed(prev => !prev)}
      />

      <ProcedureDetailPanel
        isOpen={detailPanelNodeId !== null}
        onClose={handleCloseDetailPanel}
        procedureLabel={detailPanelLabel}
        stages={detailPanelStages}
        onStageDetailsChange={handleStageDetailsChange}
        nodeId={detailPanelNodeId || undefined}
        onStageClick={handleOpenStageDetailPanel}
      />

      <CaseDetailPanel
        isOpen={caseDetailPanelNodeId !== null}
        onClose={handleCloseCaseDetailPanel}
        caseLabel={caseDetailLabel}
        caseId={caseDetailId}
        status={caseDetailStatus}
        priority={caseDetailPriority}
        assignee={caseDetailAssignee}
        createdAt={caseDetailCreatedAt}
        dueDate={caseDetailDueDate}
        tags={caseDetailTags}
        currentStage={caseDetailCurrentStage}
        attachedFiles={caseDetailAttachedFiles}
        notepad={caseDetailNotepad}
      />

      {stageDetailData && (
        <StageDetailPanel
          isOpen={stageDetailPanel !== null}
          onClose={handleCloseStageDetailPanel}
          stageName={stageDetailData.stageName}
          stageType={stageDetailData.stageType}
          stageSubtype={stageDetailData.stageSubtype}
          cases={stageDetailData.cases}
          averageTimeInStage={stageDetailData.averageTime}
          onCaseClick={handleOpenCaseDetailFromStage}
          onAddExampleCases={() => handleAddExampleCases(stageDetailData.stageId)}
        />
      )}
    </div>
  )
}

interface SelectedNodeInfo {
  id: string
  label: string
  type: string
}

interface CanvasNodeInfo {
  id: string
  label: string
  nodeType: string
}

interface CanvasProps {
  gridType?: GridType
  gridScale?: number
  gridOpacity?: number
  showParticleTrails?: boolean
  onSelectionChange?: (selectedNodes: SelectedNodeInfo[]) => void
  onNodesListChange?: (nodes: CanvasNodeInfo[]) => void
  onOpenPanelChange?: (panel: OpenPanelInfo | null) => void
  onCreateProcedureReady?: (handler: CreateProcedureHandler) => void
  onUpdateProcedureReady?: (handler: UpdateProcedureHandler) => void
  onCloseAllPanelsReady?: (handler: () => void) => void
}

export function Canvas({ gridType = 'dots', gridScale = 12, gridOpacity = 0.7, showParticleTrails = false, onSelectionChange, onNodesListChange, onOpenPanelChange, onCreateProcedureReady, onUpdateProcedureReady, onCloseAllPanelsReady }: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner 
        gridType={gridType} 
        gridScale={gridScale} 
        gridOpacity={gridOpacity} 
        showParticleTrails={showParticleTrails}
        onSelectionChange={onSelectionChange} 
        onNodesListChange={onNodesListChange}
        onOpenPanelChange={onOpenPanelChange}
        onCreateProcedureReady={onCreateProcedureReady}
        onUpdateProcedureReady={onUpdateProcedureReady}
        onCloseAllPanelsReady={onCloseAllPanelsReady}
      />
    </ReactFlowProvider>
  )
}

export type { SelectedNodeInfo, CanvasNodeInfo, CreateProcedureHandler, UpdateProcedureHandler }
