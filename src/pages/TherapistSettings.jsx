import { useState } from 'react'
import { updateTherapist } from '../lib/db'

const MODALITIES = [
  { value: 'IFS', label: 'Internal Family Systems (IFS)', description: 'Parts-based, Self-led healing' },
  { value: 'CBT', label: 'Cognitive Behavioral Therapy (CBT)', description: 'Thought patterns, behavioral activation' },
  { value: 'Psychodynamic', label: 'Psychodynamic', description: 'Unconscious patterns, transference' }
]

const STEPS = ['Orientation', 'Style Preferences', 'Boundaries', 'Review']

export default function TherapistSettings({ therapist, onUpdate, onNext }) {
  const [step, setStep] = useState(0)
  const [complete, setComplete] = useState(false)
  const [config, setConfig] = useState({
    modality: therapist?.modality || '',
    dsp_directiveness: therapist?.dsp_directiveness || '',
    dsp_warmth: therapist?.dsp_warmth || '',
    dsp_structure: therapist?.dsp_structure || '',
    avoid_topics: therapist?.avoid_topics?.join(', ') || '',
    contraindications: therapist?.contraindications || '',
    default_integration_directions: therapist?.default_integration_directions || ['Reflective']
  })

  async function handleComplete() {
    try {
      const updates = {
        modality: config.modality,
        dsp_directiveness: config.dsp_directiveness,
        dsp_warmth: config.dsp_warmth,
        dsp_structure: config.dsp_structure,
        avoid_topics: config.avoid_topics.split(',').map(s => s.trim()).filter(Boolean),
        contraindications: config.contraindications,
        default_integration_directions: config.default_integration_directions
      }
      const updated = await updateTherapist(therapist.id, updates)
      onUpdate(updated)
      setComplete(true)
    } catch (error) {
      console.error('Error updating therapist:', error)
      alert('Error saving configuration')
    }
  }

  if (complete) {
    return (
      <div className="container">
        <div className="complete-screen">
          <div className="complete-icon">✓</div>
          <h2>Configuration Complete</h2>
          <p className="subtitle">Your TAM and DSP have been saved. You can update them anytime.</p>
          <div className="complete-actions">
            <button className="btn primary" onClick={() => setComplete(false)}>
              Edit Configuration
            </button>
            <button className="btn secondary" onClick={onNext}>
              Go to Client Setup →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Progress Steps */}
      <div className="progress-steps">
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={`progress-step ${i < step ? 'completed' : ''} ${i === step ? 'active' : ''}`}>
              <div className="progress-step-number">{i < step ? '✓' : i + 1}</div>
              <span className="progress-step-label">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`progress-line ${i < step ? 'completed' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 0 && (
        <>
          <h2>What's your therapeutic orientation?</h2>
          <p className="subtitle">This helps us align AI responses with your clinical framework.</p>
          
          <div className="flex flex-col gap-12">
            {MODALITIES.map(mod => (
              <div 
                key={mod.value}
                className={`card selectable ${config.modality === mod.value ? 'selected' : ''}`}
                onClick={() => setConfig({ ...config, modality: mod.value })}
              >
                <div className="radio-option">
                  <div className="radio-circle">
                    <div className="radio-circle-inner" />
                  </div>
                  <div className="radio-content">
                    <h4>{mod.label}</h4>
                    <p>{mod.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h2>Dialogue Style Preferences</h2>
          <p className="subtitle">These preferences shape how AI communicates with your clients.</p>
          
          <div className="flex flex-col gap-24">
            <div>
              <div className="form-label mb-12">Which response style works better for your clients?</div>
              <div className="grid-2">
                <div 
                  className={`card selectable ${config.dsp_directiveness === 'directive' ? 'selected' : ''}`}
                  style={{ padding: 16 }}
                  onClick={() => setConfig({ ...config, dsp_directiveness: 'directive' })}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Directive</div>
                  <div style={{ fontSize: 13, color: 'var(--warm-gray)', fontStyle: 'italic' }}>
                    "It sounds like trying X might help here..."
                  </div>
                </div>
                <div 
                  className={`card selectable ${config.dsp_directiveness === 'exploratory' ? 'selected' : ''}`}
                  style={{ padding: 16 }}
                  onClick={() => setConfig({ ...config, dsp_directiveness: 'exploratory' })}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Exploratory</div>
                  <div style={{ fontSize: 13, color: 'var(--warm-gray)', fontStyle: 'italic' }}>
                    "What do you think might help here?"
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="form-label mb-12">Which emotional tone fits your approach?</div>
              <div className="grid-2">
                <div 
                  className={`card selectable ${config.dsp_warmth === 'warm' ? 'selected' : ''}`}
                  style={{ padding: 16 }}
                  onClick={() => setConfig({ ...config, dsp_warmth: 'warm' })}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Warm & Empathic</div>
                  <div style={{ fontSize: 13, color: 'var(--warm-gray)', fontStyle: 'italic' }}>
                    "That sounds really difficult."
                  </div>
                </div>
                <div 
                  className={`card selectable ${config.dsp_warmth === 'grounded' ? 'selected' : ''}`}
                  style={{ padding: 16 }}
                  onClick={() => setConfig({ ...config, dsp_warmth: 'grounded' })}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Grounded & Direct</div>
                  <div style={{ fontSize: 13, color: 'var(--warm-gray)', fontStyle: 'italic' }}>
                    "I hear you. Let's look at this."
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="form-label mb-12">How should AI structure intersession support?</div>
              <div className="grid-2">
                <div 
                  className={`card selectable ${config.dsp_structure === 'structured' ? 'selected' : ''}`}
                  style={{ padding: 16 }}
                  onClick={() => setConfig({ ...config, dsp_structure: 'structured' })}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Structured</div>
                  <div style={{ fontSize: 13, color: 'var(--warm-gray)', fontStyle: 'italic' }}>
                    "Let's try a quick grounding exercise..."
                  </div>
                </div>
                <div 
                  className={`card selectable ${config.dsp_structure === 'open_ended' ? 'selected' : ''}`}
                  style={{ padding: 16 }}
                  onClick={() => setConfig({ ...config, dsp_structure: 'open_ended' })}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Open-ended</div>
                  <div style={{ fontSize: 13, color: 'var(--warm-gray)', fontStyle: 'italic' }}>
                    "Tell me more about what you're noticing."
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2>Safety & Scope Boundaries</h2>
          <p className="subtitle">Define what the AI should and shouldn't engage with.</p>
          
          <div className="card info mb-24" style={{ padding: 16 }}>
            <div className="flex gap-12">
              <span style={{ fontSize: 20 }}>ℹ</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--sage-dark)', marginBottom: 4 }}>
                  Three-Tier Safety System
                </div>
                <div style={{ fontSize: 13, color: 'var(--sage-dark)', lineHeight: 1.5 }}>
                  <strong>Tier-1:</strong> Full engagement with modality-appropriate techniques<br/>
                  <strong>Tier-2:</strong> Contain & resource only (trauma, SI without plan, dissociation)<br/>
                  <strong>Tier-3:</strong> Crisis protocol with immediate therapist alert
                </div>
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Topics to avoid (comma-separated)</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="e.g., specific trauma details, medication dosing, legal advice"
              value={config.avoid_topics}
              onChange={(e) => setConfig({ ...config, avoid_topics: e.target.value })}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Contraindications or special considerations</label>
            <textarea 
              className="form-textarea"
              placeholder="Any specific clinical considerations the AI should be aware of..."
              value={config.contraindications}
              onChange={(e) => setConfig({ ...config, contraindications: e.target.value })}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Default Integration Direction</label>
            <select 
              className="form-select"
              value={config.default_integration_directions[0]}
              onChange={(e) => setConfig({ ...config, default_integration_directions: [e.target.value] })}
            >
              <option value="Reflective">Reflective — Focus on insight and meaning-making</option>
              <option value="Behavioral">Behavioral — Focus on actions and homework</option>
              <option value="Cognitive">Cognitive — Focus on thought patterns</option>
              <option value="Somatic">Somatic — Focus on body awareness</option>
              <option value="Stabilization">Stabilization — Focus on grounding and safety</option>
            </select>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2>Review Your Configuration</h2>
          <p className="subtitle">This creates your Therapeutic Alignment Model (TAM) and seeds your Dialogue Style Parameters (DSP).</p>
          
          <div className="flex flex-col gap-16">
            <div className="card sand">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Therapeutic Orientation
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {MODALITIES.find(m => m.value === config.modality)?.label || 'Not selected'}
              </div>
            </div>
            
            <div className="card sand">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Dialogue Style Parameters (DSP)
              </div>
              <div className="flex gap-8 flex-wrap">
                {config.dsp_directiveness && (
                  <span className="badge default">
                    {config.dsp_directiveness === 'directive' ? 'Directive' : 'Exploratory'}
                  </span>
                )}
                {config.dsp_warmth && (
                  <span className="badge default">
                    {config.dsp_warmth === 'warm' ? 'Warm' : 'Grounded'}
                  </span>
                )}
                {config.dsp_structure && (
                  <span className="badge default">
                    {config.dsp_structure === 'structured' ? 'Structured' : 'Open-ended'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="card sand">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Integration Direction
              </div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {config.default_integration_directions[0]}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="nav-footer">
        <button 
          className="btn ghost" 
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
        >
          ← Back
        </button>
        {step < 3 ? (
          <button className="btn primary" onClick={() => setStep(step + 1)}>
            Continue →
          </button>
        ) : (
          <button className="btn primary" onClick={handleComplete}>
            Complete Setup ✓
          </button>
        )}
      </div>
    </div>
  )
}
