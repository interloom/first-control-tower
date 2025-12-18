import { Node } from '@xyflow/react'
import { DEFAULT_PROCEDURE_STAGES, ProcedureStage } from '../components/nodes/ProcedureNode'

// Case state types
export type CaseState = 
  | 'at_inbox'
  | 'transitioning'
  | 'at_procedure'
  | 'at_procedure_stage'
  | 'at_outbox'

export interface Case {
  id: string
  state: CaseState
  currentNodeId: string
  currentStageIndex: number // -1 if not at a procedure, 0+ for stage index
  progress: number // 0-1 for transitions/stage progress
  spawnedAt: number
  stateStartedAt: number
}

export interface CaseEngineConfig {
  transitionDuration: number // ms for edge transitions (100ms)
  stageDuration: number // ms per procedure stage (500ms)
}

export interface InboxConfig {
  casesPerMinute: number
  holdDurationMin: number
  holdDurationMax: number
}

export interface OutboxConfig {
  retentionSeconds: number
}

export interface ProcedureConfig {
  stages: ProcedureStage[]
}

const DEFAULT_CONFIG: CaseEngineConfig = {
  transitionDuration: 100,
  stageDuration: 500,
}

export class CaseEngine {
  private cases: Map<string, Case> = new Map()
  private config: CaseEngineConfig
  private proceduralOrder: string[] = []
  private nodes: Node[] = []
  private lastSpawnTime: number = 0
  private animationFrameId: number | null = null
  private onUpdate: (cases: Case[]) => void
  private caseIdCounter: number = 0

  constructor(onUpdate: (cases: Case[]) => void, config: Partial<CaseEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.onUpdate = onUpdate
  }

  setProceduralOrder(order: string[]) {
    this.proceduralOrder = order
  }

  setNodes(nodes: Node[]) {
    this.nodes = nodes
  }

  private getInboxConfig(): InboxConfig {
    const inbox = this.nodes.find(n => n.id === 'inbox')
    return {
      casesPerMinute: inbox?.data?.casesPerMinute ?? 2,
      holdDurationMin: inbox?.data?.holdDurationMin ?? 500,
      holdDurationMax: inbox?.data?.holdDurationMax ?? 2000,
    }
  }

  private getOutboxConfig(): OutboxConfig {
    const outbox = this.nodes.find(n => n.id === 'outbox')
    return {
      retentionSeconds: outbox?.data?.retentionSeconds ?? 3,
    }
  }

  private getProcedureConfig(nodeId: string): ProcedureConfig {
    const node = this.nodes.find(n => n.id === nodeId)
    return {
      stages: node?.data?.stages ?? DEFAULT_PROCEDURE_STAGES,
    }
  }

  private getNextNodeId(currentNodeId: string): string | null {
    const currentIndex = this.proceduralOrder.indexOf(currentNodeId)
    if (currentIndex === -1 || currentIndex >= this.proceduralOrder.length - 1) {
      return null
    }
    return this.proceduralOrder[currentIndex + 1]
  }

  private getNodeType(nodeId: string): string | null {
    const node = this.nodes.find(n => n.id === nodeId)
    return node?.type ?? null
  }

  private spawnCase() {
    const id = `case-${++this.caseIdCounter}`
    const now = Date.now()
    const inboxConfig = this.getInboxConfig()
    
    const newCase: Case = {
      id,
      state: 'at_inbox',
      currentNodeId: 'inbox',
      currentStageIndex: -1,
      progress: 0,
      spawnedAt: now,
      stateStartedAt: now,
    }

    // Set hold duration for inbox (random within range)
    const holdDuration = inboxConfig.holdDurationMin + 
      Math.random() * (inboxConfig.holdDurationMax - inboxConfig.holdDurationMin)
    
    ;(newCase as Case & { holdDuration?: number }).holdDuration = holdDuration

    this.cases.set(id, newCase)
  }

  private updateCase(caseItem: Case, now: number): Case | null {
    const elapsed = now - caseItem.stateStartedAt

    switch (caseItem.state) {
      case 'at_inbox': {
        const holdDuration = (caseItem as Case & { holdDuration?: number }).holdDuration ?? 1000
        if (elapsed >= holdDuration) {
          const nextNodeId = this.getNextNodeId(caseItem.currentNodeId)
          if (nextNodeId) {
            return {
              ...caseItem,
              state: 'transitioning',
              progress: 0,
              stateStartedAt: now,
              // Store target node for transition
            }
          }
        }
        return caseItem
      }

      case 'transitioning': {
        const progress = Math.min(1, elapsed / this.config.transitionDuration)
        if (progress >= 1) {
          const nextNodeId = this.getNextNodeId(caseItem.currentNodeId)
          if (!nextNodeId) return caseItem
          
          const nextType = this.getNodeType(nextNodeId)
          
          if (nextType === 'outbox') {
            return {
              ...caseItem,
              state: 'at_outbox',
              currentNodeId: nextNodeId,
              currentStageIndex: -1,
              progress: 0,
              stateStartedAt: now,
            }
          } else if (nextType === 'procedure') {
            return {
              ...caseItem,
              state: 'at_procedure_stage',
              currentNodeId: nextNodeId,
              currentStageIndex: 0,
              progress: 0,
              stateStartedAt: now,
            }
          }
        }
        return { ...caseItem, progress }
      }

      case 'at_procedure_stage': {
        const progress = Math.min(1, elapsed / this.config.stageDuration)
        const procConfig = this.getProcedureConfig(caseItem.currentNodeId)
        
        if (progress >= 1) {
          // Move to next stage or transition to next node
          if (caseItem.currentStageIndex < procConfig.stages.length - 1) {
            return {
              ...caseItem,
              currentStageIndex: caseItem.currentStageIndex + 1,
              progress: 0,
              stateStartedAt: now,
            }
          } else {
            // Done with all stages, transition to next node
            return {
              ...caseItem,
              state: 'transitioning',
              progress: 0,
              stateStartedAt: now,
            }
          }
        }
        return { ...caseItem, progress }
      }

      case 'at_outbox': {
        const outboxConfig = this.getOutboxConfig()
        if (elapsed >= outboxConfig.retentionSeconds * 1000) {
          // Remove case
          return null
        }
        return { ...caseItem, progress: elapsed / (outboxConfig.retentionSeconds * 1000) }
      }

      default:
        return caseItem
    }
  }

  private tick = () => {
    const now = Date.now()
    const inboxConfig = this.getInboxConfig()

    // Spawn new cases based on rate
    if (inboxConfig.casesPerMinute > 0) {
      const spawnInterval = 60000 / inboxConfig.casesPerMinute
      if (now - this.lastSpawnTime >= spawnInterval) {
        this.spawnCase()
        this.lastSpawnTime = now
      }
    }

    // Update all cases
    const casesToRemove: string[] = []
    for (const [id, caseItem] of this.cases) {
      const updated = this.updateCase(caseItem, now)
      if (updated === null) {
        casesToRemove.push(id)
      } else {
        this.cases.set(id, updated)
      }
    }

    // Remove completed cases
    for (const id of casesToRemove) {
      this.cases.delete(id)
    }

    // Notify listeners
    this.onUpdate(Array.from(this.cases.values()))

    // Continue animation loop
    this.animationFrameId = requestAnimationFrame(this.tick)
  }

  start() {
    if (this.animationFrameId !== null) return
    this.lastSpawnTime = Date.now()
    this.animationFrameId = requestAnimationFrame(this.tick)
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  reset() {
    this.stop()
    this.cases.clear()
    this.caseIdCounter = 0
    this.onUpdate([])
  }

  getCases(): Case[] {
    return Array.from(this.cases.values())
  }

  // Get cases at a specific node
  getCasesAtNode(nodeId: string): Case[] {
    return this.getCases().filter(c => 
      c.currentNodeId === nodeId && c.state !== 'transitioning'
    )
  }

  // Get cases transitioning from a node
  getCasesTransitioningFrom(nodeId: string): Case[] {
    return this.getCases().filter(c => 
      c.currentNodeId === nodeId && c.state === 'transitioning'
    )
  }
}

