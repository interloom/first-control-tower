import { useState } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { BarChart3, ChevronDown, Plus } from 'lucide-react'
import './nodes.css'

interface ChartNodeData {
  label: string
}

type ChartType = 'histogram' | 'scatter' | 'timeline'

const CHART_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'histogram', label: 'Histogram' },
  { value: 'scatter', label: 'Scatter Plot' },
  { value: 'timeline', label: 'Timeline' },
]

// Mock data for histogram
const HISTOGRAM_DATA = [
  { value: 0.25, label: '0-10' },
  { value: 0.45, label: '10-20' },
  { value: 0.78, label: '20-30' },
  { value: 0.92, label: '30-40' },
  { value: 0.68, label: '40-50' },
  { value: 0.54, label: '50-60' },
  { value: 0.38, label: '60-70' },
  { value: 0.22, label: '70-80' },
]

// Mock data for scatter plot
const SCATTER_DATA = [
  { x: 15, y: 65, size: 6 },
  { x: 28, y: 42, size: 8 },
  { x: 45, y: 78, size: 5 },
  { x: 62, y: 35, size: 7 },
  { x: 78, y: 58, size: 9 },
  { x: 35, y: 82, size: 6 },
  { x: 52, y: 25, size: 8 },
  { x: 88, y: 72, size: 5 },
  { x: 22, y: 48, size: 7 },
  { x: 70, y: 88, size: 6 },
  { x: 40, y: 55, size: 8 },
  { x: 58, y: 68, size: 5 },
]

// Mock data for timeline
const TIMELINE_DATA = [
  { value: 0.3, timestamp: '9am' },
  { value: 0.5, timestamp: '10am' },
  { value: 0.45, timestamp: '11am' },
  { value: 0.7, timestamp: '12pm' },
  { value: 0.65, timestamp: '1pm' },
  { value: 0.8, timestamp: '2pm' },
  { value: 0.75, timestamp: '3pm' },
  { value: 0.9, timestamp: '4pm' },
  { value: 0.85, timestamp: '5pm' },
  { value: 0.6, timestamp: '6pm' },
]

function HistogramChart() {
  const maxValue = Math.max(...HISTOGRAM_DATA.map(d => d.value))
  const chartHeight = 140
  const barWidth = 36
  const gap = 8
  const chartWidth = HISTOGRAM_DATA.length * (barWidth + gap) - gap

  return (
    <svg width={chartWidth} height={chartHeight + 24} className="chart-svg">
      <defs>
        <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      {HISTOGRAM_DATA.map((d, i) => {
        const barHeight = (d.value / maxValue) * chartHeight
        const x = i * (barWidth + gap)
        const y = chartHeight - barHeight
        
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill="url(#barGradient)"
              className="chart-bar"
            />
            <text
              x={x + barWidth / 2}
              y={chartHeight + 16}
              textAnchor="middle"
              className="chart-label"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ScatterChart() {
  const chartWidth = 360
  const chartHeight = 140
  const padding = 20

  return (
    <svg width={chartWidth} height={chartHeight + 24} className="chart-svg">
      <defs>
        <linearGradient id="scatterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      <g className="chart-grid">
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <line
            key={`h-${i}`}
            x1={padding}
            y1={chartHeight - v * (chartHeight - padding)}
            x2={chartWidth - padding}
            y2={chartHeight - v * (chartHeight - padding)}
            stroke="#e2e8f0"
            strokeDasharray="4,4"
          />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <line
            key={`v-${i}`}
            x1={padding + v * (chartWidth - 2 * padding)}
            y1={padding}
            x2={padding + v * (chartWidth - 2 * padding)}
            y2={chartHeight}
            stroke="#e2e8f0"
            strokeDasharray="4,4"
          />
        ))}
      </g>
      {/* Data points */}
      {SCATTER_DATA.map((d, i) => (
        <circle
          key={i}
          cx={padding + (d.x / 100) * (chartWidth - 2 * padding)}
          cy={chartHeight - (d.y / 100) * (chartHeight - padding)}
          r={d.size}
          fill="url(#scatterGradient)"
          className="chart-point"
          style={{ animationDelay: `${i * 0.05}s` }}
        />
      ))}
      {/* Axis labels */}
      <text x={chartWidth / 2} y={chartHeight + 18} textAnchor="middle" className="chart-label">
        Processing Time (ms)
      </text>
    </svg>
  )
}

function TimelineChart() {
  const chartWidth = 360
  const chartHeight = 140
  const padding = 20
  
  // Generate path from data
  const points = TIMELINE_DATA.map((d, i) => {
    const x = padding + (i / (TIMELINE_DATA.length - 1)) * (chartWidth - 2 * padding)
    const y = chartHeight - d.value * (chartHeight - padding - 10)
    return { x, y }
  })
  
  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ')
  
  // Area path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`

  return (
    <svg width={chartWidth} height={chartHeight + 24} className="chart-svg">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(167, 139, 250, 0.3)" />
          <stop offset="100%" stopColor="rgba(167, 139, 250, 0)" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      <g className="chart-grid">
        {[0.25, 0.5, 0.75].map((v, i) => (
          <line
            key={`h-${i}`}
            x1={padding}
            y1={chartHeight - v * (chartHeight - padding - 10)}
            x2={chartWidth - padding}
            y2={chartHeight - v * (chartHeight - padding - 10)}
            stroke="#e2e8f0"
            strokeDasharray="4,4"
          />
        ))}
      </g>
      {/* Area fill */}
      <path d={areaD} fill="url(#areaGradient)" />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="chart-line"
      />
      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#fff"
          stroke="url(#lineGradient)"
          strokeWidth={2}
          className="chart-point"
        />
      ))}
      {/* X-axis labels */}
      {TIMELINE_DATA.filter((_, i) => i % 2 === 0).map((d, i) => {
        const idx = i * 2
        const x = padding + (idx / (TIMELINE_DATA.length - 1)) * (chartWidth - 2 * padding)
        return (
          <text key={i} x={x} y={chartHeight + 16} textAnchor="middle" className="chart-label">
            {d.timestamp}
          </text>
        )
      })}
    </svg>
  )
}

export function ChartNode({ data }: NodeProps<ChartNodeData>) {
  const [chartType, setChartType] = useState<ChartType>('histogram')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const selectedOption = CHART_OPTIONS.find(opt => opt.value === chartType)

  const renderChart = () => {
    switch (chartType) {
      case 'histogram':
        return <HistogramChart />
      case 'scatter':
        return <ScatterChart />
      case 'timeline':
        return <TimelineChart />
    }
  }

  return (
    <div className="chart-card">
      <div className="chart-header-bar">
        <div className="chart-title-group">
          <div className="chart-icon-wrapper">
            <BarChart3 size={16} />
          </div>
          <span className="chart-title">{data.label || 'Chart'}</span>
        </div>
        <div className="chart-actions">
          <div className="chart-type-dropdown">
            <button 
              className="chart-type-button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{selectedOption?.label}</span>
              <ChevronDown size={14} className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`} />
            </button>
            {isDropdownOpen && (
              <div className="chart-dropdown-menu">
                {CHART_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    className={`chart-dropdown-item ${chartType === option.value ? 'active' : ''}`}
                    onClick={() => {
                      setChartType(option.value)
                      setIsDropdownOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="action-button">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="chart-content">
        <div className="chart-container">
          {renderChart()}
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="chart-handle" />
      <Handle type="source" position={Position.Bottom} className="chart-handle" />
    </div>
  )
}



