import { useMemo } from 'react'
import { Node, useReactFlow, useViewport } from '@xyflow/react'
import { Case } from '../services/CaseEngine'
import './CaseOverlay.css'

interface CaseOverlayProps {
  cases: Case[]
  nodes: Node[]
  proceduralOrder: string[]
}

// Node dimensions (approximate)
const NODE_WIDTH = 160
const NODE_HEIGHT = 50
const PROCEDURE_NODE_WIDTH = 340
const PROCEDURE_NODE_HEADER_HEIGHT = 50
const STAGE_HEIGHT = 32

export function CaseOverlay({ cases, nodes, proceduralOrder }: CaseOverlayProps) {
  const { x: viewportX, y: viewportY, zoom } = useViewport()
  const { getNode } = useReactFlow()

  // Get node position in screen coordinates
  const getNodeScreenPosition = (nodeId: string) => {
    const node = getNode(nodeId)
    if (!node) return null
    
    const isProcedure = node.type === 'procedure'
    const width = isProcedure ? PROCEDURE_NODE_WIDTH : NODE_WIDTH
    const height = isProcedure ? 400 : NODE_HEIGHT // Approximate procedure node height
    
    return {
      x: (node.position.x + width / 2) * zoom + viewportX,
      y: (node.position.y + height) * zoom + viewportY, // Bottom of node
      width: width * zoom,
      height: height * zoom,
      nodeX: node.position.x * zoom + viewportX,
      nodeY: node.position.y * zoom + viewportY,
    }
  }

  // Get position for a case at a procedure stage
  const getStagePosition = (nodeId: string, stageIndex: number) => {
    const node = getNode(nodeId)
    if (!node) return null
    
    // Position relative to the stage within the procedure node
    const stageY = PROCEDURE_NODE_HEADER_HEIGHT + (stageIndex * STAGE_HEIGHT) + STAGE_HEIGHT / 2
    
    return {
      x: (node.position.x + 20) * zoom + viewportX, // Left side of node with padding
      y: (node.position.y + stageY) * zoom + viewportY,
    }
  }

  // Get handle position for a node (source = bottom, target = top)
  const getHandlePosition = (nodeId: string, type: 'source' | 'target') => {
    const node = getNode(nodeId)
    if (!node) return null
    
    const isProcedure = node.type === 'procedure'
    const width = isProcedure ? PROCEDURE_NODE_WIDTH : NODE_WIDTH
    const height = isProcedure ? (node.measured?.height ?? 400) : NODE_HEIGHT
    
    if (type === 'source') {
      // Bottom center
      return {
        x: (node.position.x + width / 2) * zoom + viewportX,
        y: (node.position.y + height) * zoom + viewportY,
      }
    } else {
      // Top center
      return {
        x: (node.position.x + width / 2) * zoom + viewportX,
        y: node.position.y * zoom + viewportY,
      }
    }
  }

  // Group cases by node and state
  const casesByNode = useMemo(() => {
    const grouped: Record<string, Case[]> = {}
    for (const c of cases) {
      if (!grouped[c.currentNodeId]) {
        grouped[c.currentNodeId] = []
      }
      grouped[c.currentNodeId].push(c)
    }
    return grouped
  }, [cases])

  // Render dots for cases at nodes
  const renderCaseDots = () => {
    const dots: JSX.Element[] = []

    for (const [nodeId, nodeCases] of Object.entries(casesByNode)) {
      const nodeType = nodes.find(n => n.id === nodeId)?.type

      for (let i = 0; i < nodeCases.length; i++) {
        const c = nodeCases[i]
        
        if (c.state === 'transitioning') {
          // Get source and target positions for transition
          const sourcePos = getHandlePosition(c.currentNodeId, 'source')
          const nextNodeId = proceduralOrder[proceduralOrder.indexOf(c.currentNodeId) + 1]
          const targetPos = nextNodeId ? getHandlePosition(nextNodeId, 'target') : null
          
          if (sourcePos && targetPos) {
            const x = sourcePos.x + (targetPos.x - sourcePos.x) * c.progress
            const y = sourcePos.y + (targetPos.y - sourcePos.y) * c.progress
            
            dots.push(
              <div
                key={c.id}
                className="case-dot transitioning"
                style={{
                  left: x - 4,
                  top: y - 4,
                }}
              />
            )
          }
        } else if (c.state === 'at_procedure_stage' && nodeType === 'procedure') {
          // Dot at procedure stage
          const stagePos = getStagePosition(nodeId, c.currentStageIndex)
          if (stagePos) {
            const queueOffset = i * 10
            dots.push(
              <div
                key={c.id}
                className="case-dot stage"
                style={{
                  left: stagePos.x - 3 + queueOffset,
                  top: stagePos.y - 3,
                }}
              />
            )
          }
        } else {
          // Dot at node (inbox, outbox, or waiting)
          const handlePos = c.state === 'at_outbox' 
            ? getHandlePosition(nodeId, 'target')
            : getHandlePosition(nodeId, 'source')
          
          if (handlePos) {
            // Queue layout: horizontal offset
            const queueOffset = (i % 8) * 10 - (Math.min(nodeCases.length - 1, 7) * 5)
            const rowOffset = Math.floor(i / 8) * 10
            
            dots.push(
              <div
                key={c.id}
                className={`case-dot ${c.state}`}
                style={{
                  left: handlePos.x - 4 + queueOffset,
                  top: handlePos.y - 4 + (c.state === 'at_outbox' ? 8 : -8) + rowOffset,
                }}
              />
            )
          }
        }
      }
    }

    return dots
  }

  return (
    <div className="case-overlay">
      {renderCaseDots()}
    </div>
  )
}


