import { Case } from '../services/CaseEngine'
import './CaseDot.css'

interface CaseDotProps {
  caseItem: Case
  x: number
  y: number
  queueIndex?: number
}

export function CaseDot({ x, y, queueIndex = 0 }: CaseDotProps) {
  // Offset for queued dots
  const offsetX = (queueIndex % 4) * 10
  const offsetY = Math.floor(queueIndex / 4) * 10

  return (
    <div
      className="case-dot"
      style={{
        transform: `translate(${x + offsetX}px, ${y + offsetY}px)`,
      }}
    />
  )
}

interface TransitioningDotProps {
  caseItem: Case
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export function TransitioningDot({ caseItem, fromX, fromY, toX, toY }: TransitioningDotProps) {
  const x = fromX + (toX - fromX) * caseItem.progress
  const y = fromY + (toY - fromY) * caseItem.progress

  return (
    <div
      className="case-dot transitioning"
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    />
  )
}


