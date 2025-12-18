import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import './Timeline.css'

interface TimelineProps {
  isLiveMode?: boolean
  onRangeSelect?: (start: Date | null, end: Date | null, throughput: number | null) => void
  onLiveModeClick?: () => void
  onHistoryModeClick?: () => void
}

// Generate pseudo-random waveform heights based on seed
function generateWaveform(count: number): number[] {
  const heights: number[] = []
  let seed = 42
  
  for (let i = 0; i < count; i++) {
    // Simple seeded random for consistent waveform
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const random = seed / 0x7fffffff
    
    // Create natural-looking audio waveform patterns
    const baseHeight = 0.15 + random * 0.45
    const pulse = Math.sin(i * 0.1) * 0.15
    const variance = Math.sin(i * 0.03) * 0.2
    const spike = random > 0.92 ? random * 0.4 : 0
    
    heights.push(Math.min(1, Math.max(0.08, baseHeight + pulse + variance + spike)))
  }
  
  return heights
}

export function Timeline({ isLiveMode = true, onRangeSelect, onLiveModeClick, onHistoryModeClick }: TimelineProps) {
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; index: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const barCount = 240
  const waveform = useMemo(() => generateWaveform(barCount), [barCount])
  
  // Generate time labels (24 hours)
  const timeLabels = useMemo(() => {
    const labels: string[] = []
    for (let i = 0; i <= 24; i += 4) {
      labels.push(`${i.toString().padStart(2, '0')}:00`)
    }
    return labels
  }, [])

  const getBarIndex = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    return Math.floor(percentage * barCount)
  }, [barCount])

  const indexToTime = useCallback((index: number): Date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const minutesPerBar = (24 * 60) / barCount
    today.setMinutes(index * minutesPerBar)
    return today
  }, [barCount])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const index = getBarIndex(e.clientX)
    setIsDragging(true)
    setDragStart(index)
    setSelection({ start: index, end: index })
  }, [getBarIndex])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const currentIndex = getBarIndex(e.clientX)
    
    setHoverPosition({ x, index: currentIndex })
    
    if (!isDragging || dragStart === null) return
    setSelection({
      start: Math.min(dragStart, currentIndex),
      end: Math.max(dragStart, currentIndex),
    })
  }, [isDragging, dragStart, getBarIndex])

  const handleMouseLeave = useCallback(() => {
    setHoverPosition(null)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (isDragging && selection && onRangeSelect) {
      const startTime = indexToTime(selection.start)
      const endTime = indexToTime(selection.end)
      // Calculate throughput for the selected range
      let total = 0
      for (let i = selection.start; i <= selection.end; i++) {
        total += Math.round(waveform[i] * 100)
      }
      onRangeSelect(startTime, endTime, total)
    }
    setIsDragging(false)
    setDragStart(null)
  }, [isDragging, selection, indexToTime, onRangeSelect, waveform])

  const handleClick = useCallback((e: React.MouseEvent) => {
    // If selection exists and click is outside selection, clear it
    if (selection && !isDragging) {
      const index = getBarIndex(e.clientX)
      if (index < selection.start || index > selection.end) {
        setSelection(null)
        onRangeSelect?.(null, null, null)
      }
    }
  }, [selection, isDragging, getBarIndex, onRangeSelect])

  const handleModeChange = useCallback((mode: 'live' | 'history') => {
    if (mode === 'live') {
      setSelection(null)
      onRangeSelect?.(null, null, null)
      onLiveModeClick?.()
    } else {
      onHistoryModeClick?.()
    }
  }, [onRangeSelect, onLiveModeClick, onHistoryModeClick])

  // Format selected time range for display
  const selectionLabel = useMemo(() => {
    if (!selection) return null
    const start = indexToTime(selection.start)
    const end = indexToTime(selection.end)
    const formatTime = (d: Date) => 
      `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    return `${formatTime(start)} – ${formatTime(end)}`
  }, [selection, indexToTime])

  // Calculate throughput based on selected bars
  const throughput = useMemo(() => {
    if (!selection) return null
    let total = 0
    for (let i = selection.start; i <= selection.end; i++) {
      // Scale waveform height to case count (0-100 cases per bar)
      total += Math.round(waveform[i] * 100)
    }
    return total
  }, [selection, waveform])

  // Format hover time for tooltip
  const hoverTimeLabel = useMemo(() => {
    if (!hoverPosition) return null
    const time = indexToTime(hoverPosition.index)
    return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
  }, [hoverPosition, indexToTime])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp()
      }
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging, handleMouseUp])

  return (
    <div className={`timeline ${isLiveMode ? 'timeline-live' : 'timeline-history'}`}>
      {/* Segmented Picker */}
      <div className="timeline-mode-picker">
        <button 
          className={`timeline-mode-btn ${!isLiveMode ? 'active' : ''}`}
          onClick={() => handleModeChange('history')}
        >
          History
        </button>
        <button 
          className={`timeline-mode-btn ${isLiveMode ? 'active' : ''}`}
          onClick={() => handleModeChange('live')}
        >
          <span className="timeline-live-dot" />
          Live
        </button>
      </div>

      {/* History Mode Content - Only shown when not in live mode */}
      {!isLiveMode && (
        <div className="timeline-history-content">
          {/* Selection info */}
          {selectionLabel && (
            <div className="timeline-selection-info">
              <span className="timeline-selection-label">{selectionLabel}</span>
              <span className="timeline-throughput">Throughput: {throughput?.toLocaleString()}</span>
            </div>
          )}
          
          {/* Waveform */}
          <div 
            className="timeline-waveform-container"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          >
            {/* Hover indicator */}
            {hoverPosition && !isDragging && (
              <div 
                className="timeline-hover-indicator"
                style={{ left: `${hoverPosition.x}px` }}
              >
                <div className="timeline-hover-tooltip">{hoverTimeLabel}</div>
              </div>
            )}

            {/* Selection highlight */}
            {selection && (
              <div 
                className="timeline-selection"
                style={{
                  left: `${(selection.start / barCount) * 100}%`,
                  width: `${((selection.end - selection.start + 1) / barCount) * 100}%`,
                }}
              />
            )}
            
            {/* Waveform bars */}
            <div className="timeline-waveform">
              {waveform.map((height, i) => {
                const isSelected = selection && i >= selection.start && i <= selection.end
                return (
                  <div
                    key={i}
                    className={`timeline-bar ${isSelected ? 'selected' : ''}`}
                    style={{
                      height: `${height * 100}%`,
                    }}
                  />
                )
              })}
            </div>
            
            {/* Time labels */}
            <div className="timeline-labels">
              {timeLabels.map((label, i) => (
                <span key={i} className="timeline-label">{label}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
