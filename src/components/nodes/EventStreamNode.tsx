import { useRef, useEffect, useState } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import { Radio, Plus, Settings } from 'lucide-react'
import { EventStreamPopover } from '../NodePopover'
import './nodes.css'

interface EventStreamNodeData {
  label: string
  eventsPerMinute: number
  onSpawnEvent?: () => void
}

interface EventStreamNodeProps {
  id: string
  data: EventStreamNodeData
}

interface StreamParticle {
  id: string
  x: number
  y: number
  speed: number
  size: number
  trail: { x: number; y: number }[]
  maxTrailLength: number
}

const PARTICLE_COLOR = '#4f46e5' // Indigo - matches main particle system
const MAX_PARTICLES = 30
const CANVAS_HEIGHT = 80

export function EventStreamNode({ id, data }: EventStreamNodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<StreamParticle[]>([])
  const lastSpawnTimeRef = useRef(0)
  const animationIdRef = useRef<number | null>(null)
  const [showPopover, setShowPopover] = useState(false)
  const { setNodes } = useReactFlow()

  const eventsPerMinute = data.eventsPerMinute ?? 240
  const spawnRateRef = useRef(eventsPerMinute / 60) // Events per second
  
  // Keep spawn rate ref in sync with props
  useEffect(() => {
    spawnRateRef.current = eventsPerMinute / 60
  }, [eventsPerMinute])

  // Spawn events into the main workflow based on eventsPerMinute
  useEffect(() => {
    if (!data.onSpawnEvent || eventsPerMinute <= 0) return

    const intervalMs = (60 / eventsPerMinute) * 1000
    const interval = setInterval(() => {
      data.onSpawnEvent?.()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [eventsPerMinute, data.onSpawnEvent])

  const updateData = (updates: Partial<EventStreamNodeData>) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    )
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas dimensions
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = CANVAS_HEIGHT * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${CANVAS_HEIGHT}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resizeCanvas()

    const canvasWidth = container.getBoundingClientRect().width
    const canvasHeight = CANVAS_HEIGHT

    // Spawn a new particle
    const spawnParticle = (): StreamParticle => {
      const verticalSpread = 20 // pixels from center
      const centerY = canvasHeight / 2
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        x: -5, // Start just off the left edge
        y: centerY + (Math.random() * 2 - 1) * verticalSpread,
        speed: 0.5 + Math.random() * 1, // 0.5-1.5 speed range
        size: 2 + Math.random() * 1, // 2-3px radius
        trail: [],
        maxTrailLength: 15 + Math.floor(Math.random() * 5), // 15-20 trail positions
      }
    }

    // Convert hex to rgba
    const hexToRgba = (hex: string, alpha: number): string => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    // Animation loop
    const animate = (time: number) => {
      // Spawn new particles based on eventsPerMinute setting
      const currentSpawnRate = spawnRateRef.current > 0 ? spawnRateRef.current : 0.1
      const spawnInterval = 1000 / currentSpawnRate
      if (time - lastSpawnTimeRef.current > spawnInterval && particlesRef.current.length < MAX_PARTICLES) {
        particlesRef.current.push(spawnParticle())
        lastSpawnTimeRef.current = time
      }

      // Update particles
      particlesRef.current.forEach(p => {
        // Store current position in trail
        p.trail.unshift({ x: p.x, y: p.y })
        if (p.trail.length > p.maxTrailLength) {
          p.trail.pop()
        }

        // Move particle to the right
        p.x += p.speed * 2 // pixels per frame
      })

      // Remove particles that have exited
      particlesRef.current = particlesRef.current.filter(p => p.x < canvasWidth + 20)

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      // Draw trails
      particlesRef.current.forEach(p => {
        if (p.trail.length < 2) return

        ctx.beginPath()
        ctx.moveTo(p.trail[0].x, p.trail[0].y)

        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y)
        }

        // Create gradient for trail
        const gradient = ctx.createLinearGradient(
          p.trail[0].x, p.trail[0].y,
          p.trail[p.trail.length - 1].x, p.trail[p.trail.length - 1].y
        )
        gradient.addColorStop(0, PARTICLE_COLOR)
        gradient.addColorStop(1, hexToRgba(PARTICLE_COLOR, 0))

        ctx.strokeStyle = gradient
        ctx.lineWidth = p.size * 0.8
        ctx.lineCap = 'round'
        ctx.stroke()
      })

      // Draw particle heads
      particlesRef.current.forEach(p => {
        if (p.trail.length === 0) return
        const pos = p.trail[0]

        ctx.fillStyle = PARTICLE_COLOR
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationIdRef.current = requestAnimationFrame(animate)
    }

    animationIdRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [])

  return (
    <div className="event-stream-card">
      <div className="event-stream-header-bar">
        <div className="event-stream-title-group">
          <div className="event-stream-icon-wrapper">
            <Radio size={16} />
          </div>
          <span className="event-stream-title">{data.label || 'Event Stream'}</span>
        </div>
        <div className="event-stream-actions">
          <button
            className="node-settings-btn"
            onClick={(e) => {
              e.stopPropagation()
              setShowPopover(!showPopover)
            }}
          >
            <Settings size={14} />
          </button>
          <button className="action-button">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="event-stream-content" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="event-stream-canvas"
        />
      </div>

      <div className="event-stream-footer">
        <span className="event-stream-status">Live</span>
        <span className="event-stream-rate">~{eventsPerMinute} events/min</span>
      </div>

      <Handle type="target" position={Position.Top} className="event-stream-handle" />
      <Handle type="source" position={Position.Bottom} className="event-stream-handle" />

      {showPopover && (
        <EventStreamPopover
          eventsPerMinute={eventsPerMinute}
          onEventsPerMinuteChange={(v) => updateData({ eventsPerMinute: v })}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  )
}


