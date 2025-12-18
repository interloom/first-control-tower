/**
 * ParticleSystem - Canvas-based particle animation for case flow visualization
 * Particles flow from inbox through procedure nodes to outbox with fading trails
 */

export interface EdgePath {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

export interface Particle {
  id: string
  edgePath: string[]           // Array of edge IDs this particle will traverse
  edgeIndex: number            // Current index in edgePath
  progress: number             // 0-1 progress along current edge
  speed: number                // Speed multiplier (varies per particle)
  color: string                // Hex color
  trail: { x: number; y: number }[]  // Recent positions for trail rendering
  maxTrailLength: number       // Max trail points to keep
  size: number                 // Particle radius in pixels
  lateralOffset: number        // Random offset perpendicular to path (-1 to 1)
}

export interface Viewport {
  x: number   // Pan X offset
  y: number   // Pan Y offset
  zoom: number
}

export interface ParticleSystemConfig {
  maxParticles?: number
  spawnRate?: number           // particles per second
  flowSpeed?: number           // speed multiplier
  colors?: string[]
  trailLength?: number
  particleSizeRange?: [number, number]
  speedVariation?: [number, number]
  startNodeId?: string | null
  showTrails?: boolean         // whether to render trailing tails
  trajectoryColor?: string     // color for the trajectory lines
  trajectoryOpacity?: number   // opacity for trajectory lines (0-1)
  trajectoryWidth?: number     // width of trajectory lines in pixels
  lateralSpread?: number       // max lateral displacement in pixels (0 = disabled)
}

export interface DrawOptions {
  showParticles?: boolean
  showTrajectories?: boolean
}

interface EdgeInfo {
  edgeId: string
  target: string
  weight: number
}

export class ParticleSystem {
  particles: Particle[] = []
  private edgePaths: Map<string, EdgePath> = new Map()
  private adjacency: Map<string, EdgeInfo[]> = new Map()
  private selectedEdgeIds: Set<string> = new Set()
  
  private config: Required<ParticleSystemConfig>
  private _lastSpawnTime = 0
  private _completedCount = 0
  private _recentCompletions: number[] = []

  constructor(config: ParticleSystemConfig = {}) {
    this.config = {
      maxParticles: config.maxParticles ?? 50,
      spawnRate: config.spawnRate ?? 3,
      flowSpeed: config.flowSpeed ?? 1,
      colors: config.colors ?? ['#6366f1', '#8b5cf6', '#a78bfa'],
      trailLength: config.trailLength ?? 25,
      particleSizeRange: config.particleSizeRange ?? [3, 5],
      speedVariation: config.speedVariation ?? [0.4, 0.8],
      startNodeId: config.startNodeId ?? null,
      showTrails: config.showTrails ?? true,
      trajectoryColor: config.trajectoryColor ?? '#000000',
      trajectoryOpacity: config.trajectoryOpacity ?? 0.06,
      trajectoryWidth: config.trajectoryWidth ?? 1.5,
      lateralSpread: config.lateralSpread ?? 0,
    }
  }

  // ---------------------------------------------------------------------------
  // CONFIGURATION METHODS
  // ---------------------------------------------------------------------------

  setEdgePaths(paths: Map<string, EdgePath>) {
    this.edgePaths = paths
  }

  setSelectedEdges(edgeIds: string[]) {
    this.selectedEdgeIds = new Set(edgeIds)
  }

  /**
   * Build adjacency graph from React Flow edges
   */
  buildAdjacency(edges: Array<{ id: string; source: string; target: string; data?: { weight?: number } }>) {
    this.adjacency.clear()
    edges.forEach(edge => {
      if (!this.adjacency.has(edge.source)) {
        this.adjacency.set(edge.source, [])
      }
      this.adjacency.get(edge.source)!.push({
        edgeId: edge.id,
        target: edge.target,
        weight: edge.data?.weight ?? 1,
      })
    })
  }

  updateConfig(updates: Partial<ParticleSystemConfig>) {
    Object.assign(this.config, updates)
  }

  setStartNodeId(nodeId: string | null) {
    this.config.startNodeId = nodeId
  }

  // ---------------------------------------------------------------------------
  // CORE SIMULATION - Called every animation frame
  // ---------------------------------------------------------------------------

  update(dt: number, time: number) {
    this._spawnParticle(time)
    this._updateParticles(dt)
    this._cleanupCompletions()
  }

  private _spawnParticle(time: number) {
    if (!this.config.startNodeId) return
    if (this.particles.length >= this.config.maxParticles) return

    const spawnInterval = 1000 / this.config.spawnRate
    if (time - this._lastSpawnTime < spawnInterval) return

    this._lastSpawnTime = time

    const edgePath = this._generatePath(this.config.startNodeId)
    if (edgePath.length === 0) return

    const [minSize, maxSize] = this.config.particleSizeRange
    const [minSpeed, maxSpeed] = this.config.speedVariation

    this.particles.push({
      id: Math.random().toString(36).substr(2, 9),
      edgePath,
      edgeIndex: 0,
      progress: 0,
      speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
      color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
      trail: [],
      maxTrailLength: this.config.trailLength,
      size: minSize + Math.random() * (maxSize - minSize),
      lateralOffset: Math.random() * 2 - 1,  // Random offset -1 to 1
    })
  }

  /**
   * Generate a random path through the graph following edge weights
   */
  private _generatePath(startNodeId: string): string[] {
    const path: string[] = []
    let current = startNodeId

    while (this.adjacency.has(current) && this.adjacency.get(current)!.length > 0) {
      const edges = this.adjacency.get(current)!

      // Weighted random selection
      const totalWeight = edges.reduce((sum, e) => sum + e.weight, 0)
      let r = Math.random() * totalWeight
      let chosen = edges[0]

      for (const edge of edges) {
        r -= edge.weight
        if (r <= 0) {
          chosen = edge
          break
        }
      }

      path.push(chosen.edgeId)
      current = chosen.target
    }

    return path
  }

  private _updateParticles(dt: number) {
    const toRemove: number[] = []

    this.particles.forEach((p, index) => {
      // Check if particle completed all edges
      if (p.edgeIndex >= p.edgePath.length) {
        toRemove.push(index)
        this._completedCount++
        this._recentCompletions.push(Date.now())
        return
      }

      // Advance progress
      const speedMultiplier = this.config.flowSpeed * p.speed
      p.progress += dt * speedMultiplier * 0.001

      // Get position along current edge
      const currentEdgeId = p.edgePath[p.edgeIndex]
      const edgeData = this.edgePaths.get(currentEdgeId)

      if (edgeData) {
        const pos = this._getPositionAlongEdge(edgeData, p.progress, p.lateralOffset)
        if (pos) {
          p.trail.unshift({ x: pos.x, y: pos.y })
          if (p.trail.length > p.maxTrailLength) {
            p.trail.pop()
          }
        }
      }

      // Move to next edge when progress >= 1
      if (p.progress >= 1) {
        p.progress = 0
        p.edgeIndex++
      }
    })

    // Remove completed particles (reverse order to maintain indices)
    toRemove.reverse().forEach(i => this.particles.splice(i, 1))
  }

  /**
   * Calculate position along a bezier curve with optional lateral offset
   * Uses same curve shape as React Flow's default bezier edges
   */
  private _getPositionAlongEdge(
    edgeData: EdgePath, 
    t: number, 
    lateralOffset: number = 0
  ): { x: number; y: number } | null {
    const { sourceX, sourceY, targetX, targetY } = edgeData

    // Control points for cubic bezier (matches React Flow's bezier edge for TB direction)
    const centerY = (sourceY + targetY) / 2
    const p0 = { x: sourceX, y: sourceY }
    const p1 = { x: sourceX, y: centerY }   // Vertical from source
    const p2 = { x: targetX, y: centerY }   // Horizontal to target X
    const p3 = { x: targetX, y: targetY }

    // Cubic bezier formula
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    const t2 = t * t
    const t3 = t2 * t

    let x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x
    let y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y

    // Apply lateral offset if spread is enabled
    const { lateralSpread } = this.config
    if (lateralSpread > 0 && lateralOffset !== 0) {
      // Calculate the derivative (tangent) of the bezier curve at t
      const dx = 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x)
      const dy = 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y)

      // Normalize and get perpendicular (rotate 90 degrees)
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) {
        const nx = -dy / len  // Perpendicular x (rotated 90 degrees)
        const ny = dx / len   // Perpendicular y

        // Apply the lateral offset
        x += nx * lateralOffset * lateralSpread
        y += ny * lateralOffset * lateralSpread
      }
    }

    return { x, y }
  }

  private _cleanupCompletions() {
    const fiveSecondsAgo = Date.now() - 5000
    this._recentCompletions = this._recentCompletions.filter(t => t > fiveSecondsAgo)
  }

  // ---------------------------------------------------------------------------
  // RENDERING - Called every animation frame after update()
  // ---------------------------------------------------------------------------

  draw(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    canvasWidth: number,
    canvasHeight: number,
    options: DrawOptions = {}
  ) {
    const { showParticles = true, showTrajectories = true } = options
    const { x: panX, y: panY, zoom } = viewport

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.save()

    // Apply React Flow's viewport transform
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    // Draw trajectory lines first (underneath particles)
    if (showTrajectories) {
      this._drawTrajectories(ctx)
    }

    if (showParticles) {
      if (this.config.showTrails) {
        this._drawTrails(ctx)
      }
      this._drawParticles(ctx)
    }

    ctx.restore()
  }

  /**
   * Draw the trajectory lines (bezier curves) for all edges
   * Uses the same bezier math as particle movement for perfect alignment
   */
  private _drawTrajectories(ctx: CanvasRenderingContext2D) {
    const { trajectoryColor, trajectoryOpacity, trajectoryWidth } = this.config
    
    ctx.lineCap = 'round'

    // First pass: draw all non-selected edges with normal styling
    this.edgePaths.forEach((edgeData, edgeId) => {
      if (this.selectedEdgeIds.size > 0 && this.selectedEdgeIds.has(edgeId)) {
        return // Skip selected edges in first pass
      }
      
      const { sourceX, sourceY, targetX, targetY } = edgeData
      const centerY = (sourceY + targetY) / 2

      ctx.strokeStyle = this._hexToRgba(trajectoryColor, trajectoryOpacity)
      ctx.lineWidth = trajectoryWidth

      ctx.beginPath()
      ctx.moveTo(sourceX, sourceY)
      ctx.bezierCurveTo(
        sourceX, centerY,
        targetX, centerY,
        targetX, targetY
      )
      ctx.stroke()
    })

    // Second pass: draw selected edges on top with highlight styling
    if (this.selectedEdgeIds.size > 0) {
      this.edgePaths.forEach((edgeData, edgeId) => {
        if (!this.selectedEdgeIds.has(edgeId)) return
        
        const { sourceX, sourceY, targetX, targetY } = edgeData
        const centerY = (sourceY + targetY) / 2

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)' // Blue-500
        ctx.lineWidth = trajectoryWidth + 1.5

        ctx.beginPath()
        ctx.moveTo(sourceX, sourceY)
        ctx.bezierCurveTo(
          sourceX, centerY,
          targetX, centerY,
          targetX, targetY
        )
        ctx.stroke()
      })
    }
  }

  private _drawTrails(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => {
      if (p.trail.length < 2) return

      ctx.beginPath()
      ctx.moveTo(p.trail[0].x, p.trail[0].y)

      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y)
      }

      // Gradient from solid to same color at 0% opacity
      const gradient = ctx.createLinearGradient(
        p.trail[0].x, p.trail[0].y,
        p.trail[p.trail.length - 1].x, p.trail[p.trail.length - 1].y
      )
      gradient.addColorStop(0, p.color)
      gradient.addColorStop(1, this._hexToRgba(p.color, 0))

      ctx.strokeStyle = gradient
      ctx.lineWidth = p.size * 0.8
      ctx.lineCap = 'round'
      ctx.stroke()
    })
  }

  /** Convert hex color to rgba string */
  private _hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  private _drawParticles(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => {
      if (p.trail.length === 0) return
      const pos = p.trail[0]

      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // ---------------------------------------------------------------------------
  // STATISTICS - For UI display
  // ---------------------------------------------------------------------------

  getStats() {
    return {
      activeCount: this.particles.length,
      completedCount: this._completedCount,
      throughputPerSecond: (this._recentCompletions.length / 5).toFixed(1),
    }
  }

  // Clear all particles
  clear() {
    this.particles = []
  }

  // Manually spawn a single particle on demand
  spawnOne() {
    if (!this.config.startNodeId) return
    if (this.particles.length >= this.config.maxParticles) return

    const edgePath = this._generatePath(this.config.startNodeId)
    if (edgePath.length === 0) return

    const [minSize, maxSize] = this.config.particleSizeRange
    const [minSpeed, maxSpeed] = this.config.speedVariation

    this.particles.push({
      id: Math.random().toString(36).substr(2, 9),
      edgePath,
      edgeIndex: 0,
      progress: 0,
      speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
      color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
      trail: [],
      maxTrailLength: this.config.trailLength,
      size: minSize + Math.random() * (maxSize - minSize),
      lateralOffset: Math.random() * 2 - 1,  // Random offset -1 to 1
    })
  }

  // Spawn a particle from a specific node (for Event Streams, etc.)
  spawnFrom(nodeId: string) {
    if (this.particles.length >= this.config.maxParticles) return

    const edgePath = this._generatePath(nodeId)
    if (edgePath.length === 0) return

    const [minSize, maxSize] = this.config.particleSizeRange
    const [minSpeed, maxSpeed] = this.config.speedVariation

    this.particles.push({
      id: Math.random().toString(36).substr(2, 9),
      edgePath,
      edgeIndex: 0,
      progress: 0,
      speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
      color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
      trail: [],
      maxTrailLength: this.config.trailLength,
      size: minSize + Math.random() * (maxSize - minSize),
      lateralOffset: Math.random() * 2 - 1,
    })
  }
}
