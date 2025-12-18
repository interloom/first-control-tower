import { useRef, useEffect, useCallback } from 'react'
import { useReactFlow, useStore, Node, Edge } from '@xyflow/react'
import { ParticleSystem, EdgePath } from '../services/ParticleSystem'
import './ParticleCanvas.css'

interface ParticleCanvasProps {
  particleSystem: ParticleSystem
  enabled?: boolean        // Controls particle animation
  showTrajectories?: boolean  // Controls trajectory line rendering
}

/**
 * Computes edge connection points from React Flow nodes
 * Handles vertical (TB) layout with source at bottom, target at top
 */
function computeEdgePaths(nodes: Node[], edges: Edge[]): Map<string, EdgePath> {
  // Build node lookup with dimensions
  const nodeMap = new Map<string, Node & { width: number; height: number }>()
  nodes.forEach(node => {
    const el = document.querySelector(`[data-id="${node.id}"]`)
    nodeMap.set(node.id, {
      ...node,
      width: el?.clientWidth ?? node.measured?.width ?? 160,
      height: el?.clientHeight ?? node.measured?.height ?? 60,
    })
  })

  // Calculate bezier start/end points for each edge
  const edgePaths = new Map<string, EdgePath>()
  edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source)
    const targetNode = nodeMap.get(edge.target)
    if (!sourceNode || !targetNode) return

    // For TB (top-to-bottom) layout:
    // Source: bottom center of source node
    const sourceX = sourceNode.position.x + sourceNode.width / 2
    const sourceY = sourceNode.position.y + sourceNode.height

    // Target: top center of target node
    const targetX = targetNode.position.x + targetNode.width / 2
    const targetY = targetNode.position.y

    edgePaths.set(edge.id, { sourceX, sourceY, targetX, targetY })
  })

  return edgePaths
}

export function ParticleCanvas({ particleSystem, enabled = true, showTrajectories = true }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getNodes, getEdges } = useReactFlow()

  // Access React Flow store for viewport transform
  // Using the store selector to get the transform array
  const transform = useStore(state => state.transform)

  const getViewport = useCallback(() => ({
    x: transform[0],
    y: transform[1],
    zoom: transform[2],
  }), [transform])

  const updateEdgePaths = useCallback(() => {
    const nodes = getNodes()
    const edges = getEdges()
    const edgePaths = computeEdgePaths(nodes, edges)
    particleSystem.setEdgePaths(edgePaths)
    particleSystem.buildAdjacency(edges)
    
    // Update selected edges for focus state rendering
    const selectedEdgeIds = edges
      .filter(e => e.selected === true)
      .map(e => e.id)
    particleSystem.setSelectedEdges(selectedEdgeIds)
  }, [getNodes, getEdges, particleSystem])

  // Animation loop - runs continuously, reads state each frame
  useEffect(() => {
    // Need to render if either particles are enabled or trajectories should show
    if (!enabled && !showTrajectories) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTime: number | null = null
    let animationId: number
    let canvasWidth: number
    let canvasHeight: number

    function resize() {
      const container = canvas!.parentElement
      if (!container) return
      
      canvasWidth = container.clientWidth
      canvasHeight = container.clientHeight
      canvas!.width = canvasWidth * devicePixelRatio
      canvas!.height = canvasHeight * devicePixelRatio
      canvas!.style.width = canvasWidth + 'px'
      canvas!.style.height = canvasHeight + 'px'
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    function animate(time: number) {
      if (lastTime === null) lastTime = time
      const dt = Math.min(time - lastTime, 100) // Cap delta time to avoid jumps
      lastTime = time

      // Update edge paths (reads current node positions)
      updateEdgePaths()

      // Get current viewport
      const viewport = getViewport()

      // Run simulation and render
      if (enabled) {
        particleSystem.update(dt, time)
      }
      particleSystem.draw(ctx!, viewport, canvasWidth, canvasHeight, {
        showParticles: enabled,
        showTrajectories,
      })

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [particleSystem, updateEdgePaths, getViewport, enabled, showTrajectories])

  // Clear particles when disabled (but keep canvas for trajectories)
  useEffect(() => {
    if (!enabled) {
      particleSystem.clear()
    }
  }, [enabled, particleSystem])

  if (!enabled && !showTrajectories) return null

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
    />
  )
}

