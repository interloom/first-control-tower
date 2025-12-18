import { useEffect, useRef } from 'react'
import { Minus, Plus } from 'lucide-react'
import './NodePopover.css'

interface StepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

function Stepper({ label, value, onChange, min = 0, max = 100, step = 1, unit }: StepperProps) {
  const decrement = () => onChange(Math.max(min, value - step))
  const increment = () => onChange(Math.min(max, value + step))

  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button className="stepper-btn" onClick={decrement} disabled={value <= min}>
          <Minus size={12} />
        </button>
        <span className="stepper-value">
          {value}{unit && <span className="stepper-unit">{unit}</span>}
        </span>
        <button className="stepper-btn" onClick={increment} disabled={value >= max}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}

interface RangeStepperProps {
  label: string
  minValue: number
  maxValue: number
  onMinChange: (value: number) => void
  onMaxChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

function RangeStepper({ 
  label, 
  minValue, 
  maxValue, 
  onMinChange, 
  onMaxChange, 
  min = 0, 
  max = 10000, 
  step = 100,
  unit 
}: RangeStepperProps) {
  return (
    <div className="range-stepper">
      <span className="stepper-label">{label}</span>
      <div className="range-stepper-row">
        <div className="range-input">
          <span className="range-input-label">Min</span>
          <div className="stepper-controls compact">
            <button className="stepper-btn" onClick={() => onMinChange(Math.max(min, minValue - step))} disabled={minValue <= min}>
              <Minus size={10} />
            </button>
            <span className="stepper-value small">
              {minValue}{unit && <span className="stepper-unit">{unit}</span>}
            </span>
            <button className="stepper-btn" onClick={() => onMinChange(Math.min(maxValue, minValue + step))} disabled={minValue >= maxValue}>
              <Plus size={10} />
            </button>
          </div>
        </div>
        <div className="range-input">
          <span className="range-input-label">Max</span>
          <div className="stepper-controls compact">
            <button className="stepper-btn" onClick={() => onMaxChange(Math.max(minValue, maxValue - step))} disabled={maxValue <= minValue}>
              <Minus size={10} />
            </button>
            <span className="stepper-value small">
              {maxValue}{unit && <span className="stepper-unit">{unit}</span>}
            </span>
            <button className="stepper-btn" onClick={() => onMaxChange(Math.min(max, maxValue + step))} disabled={maxValue >= max}>
              <Plus size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface NodePopoverProps {
  children: React.ReactNode
  onClose: () => void
}

export function NodePopover({ children, onClose }: NodePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as HTMLElement)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div className="node-popover" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}

interface InboxPopoverProps {
  casesPerMinute: number
  holdDurationMin: number
  holdDurationMax: number
  onCasesPerMinuteChange: (value: number) => void
  onHoldDurationMinChange: (value: number) => void
  onHoldDurationMaxChange: (value: number) => void
  onGenerateCase?: () => void
  onClose: () => void
}

export function InboxPopover({
  casesPerMinute,
  holdDurationMin,
  holdDurationMax,
  onCasesPerMinuteChange,
  onHoldDurationMinChange,
  onHoldDurationMaxChange,
  onGenerateCase,
  onClose,
}: InboxPopoverProps) {
  return (
    <NodePopover onClose={onClose}>
      <div className="popover-header">Inbox Settings</div>
      <div className="popover-content">
        <Stepper
          label="New cases per minute"
          value={casesPerMinute}
          onChange={onCasesPerMinuteChange}
          min={0}
          max={200}
          step={20}
          unit="/min"
        />
        <div className="popover-divider" />
        <RangeStepper
          label="Hold duration (ms)"
          minValue={holdDurationMin}
          maxValue={holdDurationMax}
          onMinChange={onHoldDurationMinChange}
          onMaxChange={onHoldDurationMaxChange}
          min={0}
          max={10000}
          step={100}
          unit="ms"
        />
        {onGenerateCase && (
          <>
            <div className="popover-divider" />
            <button className="generate-case-btn" onClick={onGenerateCase}>
              Generate New Case
            </button>
          </>
        )}
      </div>
    </NodePopover>
  )
}

interface OutboxPopoverProps {
  retentionSeconds: number
  onRetentionSecondsChange: (value: number) => void
  onClose: () => void
}

export function OutboxPopover({
  retentionSeconds,
  onRetentionSecondsChange,
  onClose,
}: OutboxPopoverProps) {
  return (
    <NodePopover onClose={onClose}>
      <div className="popover-header">Outbox Settings</div>
      <div className="popover-content">
        <Stepper
          label="Retention before deletion"
          value={retentionSeconds}
          onChange={onRetentionSecondsChange}
          min={1}
          max={60}
          step={1}
          unit="s"
        />
      </div>
    </NodePopover>
  )
}

interface EventStreamPopoverProps {
  eventsPerMinute: number
  onEventsPerMinuteChange: (value: number) => void
  onClose: () => void
}

export function EventStreamPopover({
  eventsPerMinute,
  onEventsPerMinuteChange,
  onClose,
}: EventStreamPopoverProps) {
  return (
    <NodePopover onClose={onClose}>
      <div className="popover-header">Event Stream Settings</div>
      <div className="popover-content">
        <Stepper
          label="Events per minute"
          value={eventsPerMinute}
          onChange={onEventsPerMinuteChange}
          min={0}
          max={1000}
          step={20}
          unit="/min"
        />
      </div>
    </NodePopover>
  )
}


