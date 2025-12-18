import { X } from 'lucide-react'
import './PreferencesModal.css'

export type GridType = 'dots' | 'lines'

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  gridType: GridType
  onGridTypeChange: (type: GridType) => void
  gridScale: number
  onGridScaleChange: (scale: number) => void
  gridOpacity: number
  onGridOpacityChange: (opacity: number) => void
  showParticleTrails: boolean
  onShowParticleTrailsChange: (show: boolean) => void
}

export function PreferencesModal({
  isOpen,
  onClose,
  gridType,
  onGridTypeChange,
  gridScale,
  onGridScaleChange,
  gridOpacity,
  onGridOpacityChange,
  showParticleTrails,
  onShowParticleTrailsChange,
}: PreferencesModalProps) {
  if (!isOpen) return null

  return (
    <div className="preferences-overlay" onClick={onClose}>
      <div className="preferences-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preferences-header">
          <h2>Preferences</h2>
          <button className="preferences-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="preferences-content">
          <section className="preferences-section">
            <h3>Canvas</h3>
            
            <div className="preference-item">
              <label className="preference-label">Grid Style</label>
              <div className="preference-control">
                <div className="grid-type-selector">
                  <button
                    className={`grid-type-option ${gridType === 'dots' ? 'active' : ''}`}
                    onClick={() => onGridTypeChange('dots')}
                  >
                    <div className="grid-preview dots-preview">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                    <span>Dots</span>
                  </button>
                  <button
                    className={`grid-type-option ${gridType === 'lines' ? 'active' : ''}`}
                    onClick={() => onGridTypeChange('lines')}
                  >
                    <div className="grid-preview lines-preview">
                      <div className="line horizontal" />
                      <div className="line horizontal" />
                      <div className="line vertical" />
                      <div className="line vertical" />
                    </div>
                    <span>Lines</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                Grid Scale
                <span className="preference-value">{gridScale}px</span>
              </label>
              <div className="preference-control">
                <input
                  type="range"
                  min="12"
                  max="48"
                  step="4"
                  value={gridScale}
                  onChange={(e) => onGridScaleChange(Number(e.target.value))}
                  className="scale-slider"
                />
                <div className="scale-labels">
                  <span>Small</span>
                  <span>Large</span>
                </div>
              </div>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                Grid Opacity
                <span className="preference-value">{Math.round(gridOpacity * 100)}%</span>
              </label>
              <div className="preference-control">
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={gridOpacity}
                  onChange={(e) => onGridOpacityChange(Number(e.target.value))}
                  className="scale-slider"
                />
                <div className="scale-labels">
                  <span>Faint</span>
                  <span>Bold</span>
                </div>
              </div>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                Case Trails
                <span className="preference-value">{showParticleTrails ? 'On' : 'Off'}</span>
              </label>
              <div className="preference-control">
                <button
                  className={`toggle-switch ${showParticleTrails ? 'active' : ''}`}
                  onClick={() => onShowParticleTrailsChange(!showParticleTrails)}
                  aria-pressed={showParticleTrails}
                >
                  <span className="toggle-knob" />
                </button>
                <p className="preference-description">
                  Show trailing tails behind cases as they flow through the workflow
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
