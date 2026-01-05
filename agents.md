# Control Tower - Project State & Design Document

## Overview

Control Tower is a workflow automation platform built with React, TypeScript, and React Flow. It visualizes **Spaces** (workflow environments) where **Cases** flow through a sequence of **Procedural Nodes**.

**Tech Stack:**
- React 18 + TypeScript
- Vite
- React Flow (`@xyflow/react`)
- Lucide React (icons)

---

## Core Concepts

### Space
A workflow environment (e.g., "Facility Management"). Each Space contains nodes and the paths that connect them.

### Cases
The entities that flow through a Space. Cases always:
- Enter via the **Inbox**
- Exit via the **Outbox**
- Pass through **Procedure nodes** along the way

### Procedural Nodes
Nodes that Cases flow through. Three types:
1. **Inbox** - Entry point (always present, cannot be deleted)
2. **Outbox** - Exit point (always present, cannot be deleted)
3. **Procedure** - Processing steps with internal Stages

### Case Paths
The edges (connections) between Procedural Nodes. Together, Procedural Nodes and Case Paths form a **Directed Acyclic Graph (DAG)** - the "spine" of the workflow.

### Other Node Types (non-procedural)
- **File** - Data/document nodes
- **Agent** - AI agent nodes
- **Table** - Data table nodes
- **Chart** - Data visualization nodes
- **Folder** - Grouping/organization nodes
- **Marker** - Annotation nodes
- **Case** - Individual case instances with status, priority, assignee, and metadata
- **Event Stream** - Real-time event visualization with animated particle flow

These do not participate in the automated Case flow.

---

## Viewing Modes

### Live Mode (Default)
- Shows Cases at their current position in real-time
- Timeline shows "Live" indicator (green, pulsing)
- Cases are visualized as animated dots traveling along Case Paths

### History Mode
- Activated when a time range is selected on the Timeline
- Shows aggregate transition counts between nodes
- Timeline displays selected time range and throughput

---

## App Shell (Global Header + Sidebar Navigation)

The app shell is consistent across views:

- **Global header/breadcrumb** (`src/components/Header.tsx`) is always visible and view-aware:
  - **Spaces**: `Spaces / Facility Management` (space selector shows chevron)
  - **Threads**: `Threads / <thread title>` (no chevron)
  - Chat toggle is shown in Spaces and hidden in Threads to avoid competing chat surfaces.
- **Sidebar nav** (`src/components/Sidebar.tsx`) includes a **Threads** entry (chat icon) alongside Spaces and other placeholders.

---

## Threads (Conversation UX)

Threads are a first-class surface separate from the right-side `ChatPanel`.

### Threads Home

- **Component**: `src/components/ThreadsScreen.tsx`
- Centered composer for starting a new thread.
- On send: creates an in-memory thread and navigates to thread detail.

### Thread Detail

- **Component**: `src/components/ThreadView.tsx`
- The first user message becomes a **pinned sticky message** at the top of the thread while the agent streams.
- Under the pinned message is a **timeline** of an agent turn:
  - Sequential **Moves**
  - Each move is either **Thinking** (monologue) or a **Tool call**
  - Ends with a **final message** distinct from the monologue
- A **bottom composer** is present for follow-ups (hooked up later).

### Visual/Interaction Details (UI-first)

- First message animates from the Threads home composer into the pinned slot (bottom → top transition).
- Streaming text fades in as segments arrive (monologue + final).
- Tool calls show a shimmer/loading state while args/results are forming/arriving.

### Mock agent stream

- For fast iteration, the thread detail uses a mock stream generator:
  - `src/services/threads/mockThreadAgent.ts`
  - Emits `thinking_*`, `tool_*`, `text_delta`, `turn_end` events compatible with `src/services/agent/types.ts`.

---

## Manual Node Placement & Edge Creation

The canvas uses **fully manual placement** - nodes appear where you create them (via right-click context menu) and stay where you drag them.

### Initial State

The canvas starts with:
- **Inbox** and **Outbox** nodes
- An initial edge connecting Inbox → Outbox

```typescript
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
```

### Creating Edges (Case Paths)

Users manually connect nodes by dragging from source to target node handles. This allows complete flexibility in designing workflow paths:

```typescript
// Edge creation via React Flow's onConnect
const onConnect = useCallback((connection: Connection) => {
  setEdges((eds) => addEdge({
    ...connection,
    type: 'default',
    style: { stroke: 'transparent', strokeWidth: 0 },
    selectable: true,
    focusable: true,
  }, eds))
}, [setEdges])
```

### Edge Selection & Deletion

Edges can be selected and deleted:
- **Click on an edge** to select it (shows blue highlight via particle system)
- **Press Delete or Backspace** to delete selected edges
- Selected edges are rendered with `rgba(59, 130, 246, 0.8)` (blue) and thicker stroke

The selection state is passed to the ParticleSystem which renders the visual feedback:
```typescript
// In ParticleCanvas.tsx
const selectedEdgeIds = edges.filter(e => e.selected === true).map(e => e.id)
particleSystem.setSelectedEdges(selectedEdgeIds)
```

### Workflow Design
- Drag edges from Inbox → Procedure nodes → Outbox to create flow paths
- Support for branching (true DAG) - nodes can have multiple incoming/outgoing connections
- The particle system automatically follows whatever edges exist

---

## Node Configurations

### Inbox Node
Configurable via popover (click to open):
- `casesPerMinute`: Rate of new cases entering (default: 2)
- `holdDurationMin`: Minimum hold time in ms (default: 500)
- `holdDurationMax`: Maximum hold time in ms (default: 2000)

### Outbox Node
Configurable via popover:
- `retentionSeconds`: Time before case is permanently deleted (default: 3)

### Procedure Node
Contains internal **Stages** - sequential steps that Cases must complete:
```typescript
interface ProcedureStage {
  label: string
  type: 'ai' | 'manual' | 'user' | 'approval' | 'default'
}
```

Default stages are defined in `DEFAULT_PROCEDURE_STAGES` (exported from `ProcedureNode.tsx`).

### Case Node
Represents an individual case instance with detailed metadata. Same width as Procedure node (340px).

```typescript
type CaseStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
type CasePriority = 'low' | 'medium' | 'high' | 'urgent'

interface CaseData {
  label: string           // Case title
  caseId?: string         // Auto-generated if not provided (e.g., "#ABC123")
  status?: CaseStatus     // Default: 'open'
  priority?: CasePriority // Default: 'medium'
  assignee?: string       // Default: 'Unassigned'
  createdAt?: string      // Default: current date
  dueDate?: string        // Optional due date
  tags?: string[]         // Optional tag labels
}
```

**Visual design:**
- Orange color theme (briefcase icon)
- Status badge with icon (colored by status)
- Priority badge (colored by severity)
- Detail rows for assignee, created date, due date
- Optional tags displayed as chips

### Event Stream Node
Visualizes real-time event flow with an embedded canvas-based particle animation. Can spawn particles into the workflow like the Inbox node.

```typescript
interface EventStreamNodeData {
  label: string
  eventsPerMinute: number  // Default: 240
  onSpawnEvent?: () => void  // Callback to spawn particles (set by Canvas.tsx)
}
```

**Visual design:**
- Teal/cyan color theme (radio icon)
- Embedded canvas showing animated particles flowing left-to-right
- Footer displays "Live" status and current events/min rate
- Settings gear icon to configure events per minute

**Spawning particles:**
- Event Stream nodes automatically spawn particles at the configured rate
- **Important:** The node must have outgoing edges connected to other nodes for particles to flow
- Particles follow the graph edges from the Event Stream node to connected nodes
- Uses `particleSystem.spawnFrom(nodeId)` to spawn from the node's position

---

## Animation System (Canvas-based Particles)

Cases flowing through the workflow are visualized using a **canvas-based particle system** that renders smooth, performant animations with trailing effects.

### Architecture

The system uses an HTML5 Canvas overlay positioned above the React Flow background but below the nodes. This approach:
- Runs outside React's render cycle for 60fps performance
- Syncs with React Flow's viewport (pan/zoom) each frame
- Uses bezier curves matching React Flow's edge paths

### Key Files

**`src/services/ParticleSystem.ts`** - Core simulation engine:
- Spawns particles from the inbox node (or any specified node)
- Computes positions along cubic bezier curves
- Maintains particle trails for the fading tail effect
- Renders trajectory lines with selection highlighting
- Framework-agnostic, pure TypeScript

**`src/components/ParticleCanvas.tsx`** - React integration:
- Renders as a child of `<ReactFlow>` to access viewport store
- Manages the animation loop via `requestAnimationFrame`
- Computes edge paths from current node positions each frame
- Passes selected edge IDs to ParticleSystem for highlight rendering

### Configuration (in Canvas.tsx)

```typescript
const [particleSystem] = useState(() => new ParticleSystem({
  startNodeId: 'inbox',
  maxParticles: 50,
  spawnRate: casesPerMinute / 60,  // Synced with inbox settings
  flowSpeed: 1,
  colors: ['#4f46e5'],             // Matches procedure icon color
  trailLength: 18,
  particleSizeRange: [2, 2],       // Constant 2px radius
  speedVariation: [0.4, 0.8],
}))
```

### Visual Design
- **Color:** Indigo (`#4f46e5`) - matches the procedure node icon
- **No glow:** Clean, flat appearance
- **Trails:** Fade from solid to transparent (same hue, not to black)
- **Size:** 2px radius, constant (not randomized)

### Z-Index Layering
1. Procedural nodes & UI (top)
2. Particle animation layer
3. Case path edges (very subtle: `rgba(0,0,0,0.06)`)
4. Canvas grid background (bottom)

### Integration with Inbox Settings
The particle spawn rate is driven by the inbox node's "New cases per minute" setting:
```typescript
useEffect(() => {
  const inboxNode = nodes.find(n => n.id === 'inbox')
  const casesPerMinute = inboxNode?.data?.casesPerMinute ?? 2
  particleSystem.updateConfig({ spawnRate: casesPerMinute / 60 })
}, [nodes, particleSystem])
```

### Spawning from Specific Nodes

The `spawnFrom(nodeId)` method allows spawning particles from any node (used by Event Stream nodes):
```typescript
// Spawn a particle that follows edges starting from the given node
particleSystem.spawnFrom(nodeId)
```

Event Stream nodes use this to spawn particles from their position:
```typescript
// In Canvas.tsx - Event Stream nodes get a callback to spawn particles
data: {
  ...node.data,
  onSpawnEvent: () => particleSystem.spawnFrom(nodeId),
}
```

### Enabling/Disabling
Controlled by `isLiveMode` state - particles only render when in Live Mode.

---

## File Structure

```
src/
├── components/
│   ├── Canvas.tsx          # Main canvas with React Flow
│   ├── Canvas.css
│   ├── ParticleCanvas.tsx  # Canvas overlay for case animations
│   ├── ParticleCanvas.css
│   ├── CaseOverlay.tsx     # Legacy DOM-based rendering (unused)
│   ├── CaseOverlay.css
│   ├── CanvasOutline.tsx   # Layers sidebar
│   ├── CanvasOutline.css
│   ├── ContextMenu.tsx     # Right-click menu
│   ├── ContextMenu.css
│   ├── NodePopover.tsx     # Configuration popovers
│   ├── NodePopover.css
│   ├── NodeToolbar.tsx     # Selection toolbar
│   ├── NodeToolbar.css
│   ├── Timeline.tsx        # Bottom timeline
│   ├── Timeline.css
│   ├── Header.tsx
│   ├── Header.css
│   ├── ChatPanel.tsx       # AI chat sidebar
│   ├── ChatPanel.css
│   ├── ThreadsScreen.tsx   # Threads home (centered composer)
│   ├── ThreadsScreen.css
│   ├── ThreadView.tsx      # Thread detail (pinned message + timeline)
│   ├── ThreadView.css
│   ├── thread/
│   │   ├── MoveBlocks.tsx  # Reusable move/timeline blocks for threads
│   │   └── MoveBlocks.css
│   ├── NodePill.tsx        # Reusable pill component for nodes/spaces
│   ├── NodePill.css
│   ├── MentionInput.tsx    # Rich text input with @mentions
│   ├── MentionDropdown.tsx # Autocomplete dropdown for mentions
│   ├── Sidebar.tsx
│   ├── Sidebar.css
│   └── nodes/
│       ├── InboxNode.tsx
│       ├── OutboxNode.tsx
│       ├── ProcedureNode.tsx
│       ├── FileNode.tsx
│       ├── AgentNode.tsx
│       ├── TableNode.tsx
│       ├── ChartNode.tsx
│       ├── FolderNode.tsx
│       ├── MarkerNode.tsx
│       ├── CaseNode.tsx
│       ├── EventStreamNode.tsx
│       └── nodes.css
├── services/
│   ├── ParticleSystem.ts   # Canvas-based particle animation engine
│   ├── CaseEngine.ts       # Legacy animation engine (unused)
│   ├── threads/
│   │   └── mockThreadAgent.ts # Mock agent event stream for thread UI
│   └── agent/              # AI agent service
│       ├── index.ts        # Public exports
│       ├── client.ts       # AgentClient - API & tool loop
│       ├── prompts.ts      # System prompts
│       ├── tools.ts        # Tool definitions
│       ├── types.ts        # TypeScript types
│       └── mockResponses.ts
├── App.tsx
├── App.css
├── main.tsx
└── index.css
```

---

## Key State in Canvas.tsx

```typescript
// Node and edge state (starts with Inbox → Outbox edge)
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

// Live vs History mode
const [isLiveMode, setIsLiveMode] = useState(true)

// Particle system for case flow animation
const [particleSystem] = useState(() => new ParticleSystem({...}))
```

### Keyboard Shortcuts
- **Delete / Backspace** - Delete selected edges or nodes (Inbox/Outbox cannot be deleted)

---

## Sidebar (CanvasOutline)

- Shows all nodes in the canvas
- Sorted by type: **Inbox** → **Procedures** → **Outbox** → **Other nodes**
- Click to select node on canvas

---

## Timeline Component

- Shows a waveform visualization representing case throughput over 24 hours
- **Drag to select** a time range → switches to History Mode
- **Click "Live"** → returns to Live Mode
- Displays throughput count when a range is selected

---

## Chat Panel & Agent System

The ChatPanel provides an AI assistant sidebar powered by Claude. It features a context-aware messaging system that automatically provides the agent with information about what the user is currently viewing.

### Context Pills

Above the chat input, **context pills** show the user's current focus:

1. **Space Pill** (always visible) - Shows the current Space being viewed (e.g., "Facility Management")
2. **Selection Pill** (conditional) - Shows the currently selected node, if any

### Agent Context Injection

When a user sends a message, contextual information is automatically prepended using XML tags:

```xml
<context>
  <current_space id="facility-management">Facility Management</current_space>
  <selected_nodes>
    <node type="procedure" id="triage-1">Triage</node>
  </selected_nodes>
</context>

What does this procedure do?
```

**Key design decisions:**
- **XML format** - Claude understands XML-style structured data natively; matches patterns used by Cursor, Copilot, etc.
- **UI vs API separation** - The UI shows only the user's message; the API receives context + message
- **System prompt awareness** - The agent's system prompt explains the context format so it can interpret "this", "here", etc.

### Implementation

```typescript
// src/components/ChatPanel.tsx
function formatContextForAgent(
  currentSpace?: CurrentSpaceInfo | null,
  selectedNodes?: SelectedNodeInfo[]
): string {
  if (!currentSpace && (!selectedNodes || selectedNodes.length === 0)) return ''
  
  const parts: string[] = ['<context>']
  if (currentSpace) {
    parts.push(`  <current_space id="${currentSpace.id}">${currentSpace.label}</current_space>`)
  }
  if (selectedNodes && selectedNodes.length > 0) {
    parts.push('  <selected_nodes>')
    for (const node of selectedNodes) {
      parts.push(`    <node type="${node.type}" id="${node.id}">${node.label}</node>`)
    }
    parts.push('  </selected_nodes>')
  }
  parts.push('</context>')
  
  return parts.join('\n')
}
```

### Agent Service Architecture

```
src/services/agent/
├── index.ts          # Public exports
├── client.ts         # AgentClient - handles API calls & tool loop
├── prompts.ts        # System prompts (includes context format docs)
├── tools.ts          # Tool definitions (think, read_file, create_procedure, etc.)
├── types.ts          # TypeScript types for messages, events, moves
└── mockResponses.ts  # Mock tool responses for development
```

### Extending Context

The context system can be extended to include:
- Procedure stages when a procedure is selected
- Connected nodes (upstream/downstream)
- Case statistics
- Canvas viewport/zoom level

---

## Next Steps / TODOs

1. ~~**Fix Case animation**~~ ✅ Implemented canvas-based particle system with bezier curve interpolation

2. **History Mode implementation** - When a time range is selected:
   - Show aggregate counts on edges (e.g., "247 cases")
   - Filter/highlight nodes based on activity

3. **Branching UI** - Visual tools for creating conditional branches in the workflow

4. **Procedure Stage editing** - UI for adding/removing/reordering stages within a Procedure node

5. **Data persistence** - Save/load workflow configurations

---

## Running the Project

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/`

