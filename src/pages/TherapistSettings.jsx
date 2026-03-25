import { useState } from 'react'
import { updateTherapist, resetLearnedPreferences } from '../lib/db'

const MODALITIES = [
  { value: 'IFS', label: 'Internal Family Systems (IFS)', description: 'Parts-based, Self-led healing' },
  { value: 'CBT', label: 'Cognitive Behavioral Therapy (CBT)', description: 'Thought patterns, behavioral activation' },
  { value: 'Psychodynamic', label: 'Psychodynamic', description: 'Unconscious patterns, transference' }
]

const STEPS = ['Orientation', 'Style Preferences', 'Boundaries', 'Review']

export default function TherapistSettings({ therapist, onUpdate, onNext }) {
  // Determine if therapist is already configured (has modality set)
  const isConfigured = Boolean(therapist?.modality)

  // View mode: 'dashboard' for configured therapists, 'wizard' for first-time setup
  const [viewMode, setViewMode] = useState(isConfigured ? 'dashboard' : 'wizard')

  // Wizard state
  const [step, setStep] = useState(0)

  // Dashboard editing state - which section is being edited
  const [editing, setEditing] = useState(null) // 'orientation' | 'dsp' | 'integration' | null

  // Shared state
  const [saving, setSaving] = useState(false)
  const [resettingPrefs, setResettingPrefs] = useState(false)
  const [config, setConfig] = useState({
    modality: therapist?.modality || '',
    dsp_directiveness: therapist?.dsp_directiveness || '',
    dsp_warmth: therapist?.dsp_warmth || '',
    dsp_structure: therapist?.dsp_structure || '',
    default_integration_directions: therapist?.default_integration_directions || ['Reflective']
  })

  // Get learned preferences from therapist object
  const learnedPrefs = therapist?.dsp_learned_preferences || {}
  const hasLearnedPrefs = Object.keys(learnedPrefs).length > 0 && learnedPrefs.total_reviews > 0

  // Reset learned preferences
  async function handleResetPreferences() {
    if (!confirm('This will clear all learned preferences. The AI will start fresh. Continue?')) {
      return
    }
    setResettingPrefs(true)
    try {
      await resetLearnedPreferences(therapist.id)
      onUpdate({ ...therapist, dsp_learned_preferences: {} })
    } catch (error) {
      console.error('Error resetting preferences:', error)
      alert('Error resetting preferences')
    } finally {
      setResettingPrefs(false)
    }
  }

  // Save configuration (used by both wizard and dashboard)
  async function saveConfig() {
    setSaving(true)
    try {
      const updates = {
        modality: config.modality,
        dsp_directiveness: config.dsp_directiveness,
        dsp_warmth: config.dsp_warmth,
        dsp_structure: config.dsp_structure,
        default_integration_directions: config.default_integration_directions
      }
      const updated = await updateTherapist(therapist.id, updates)
      onUpdate(updated)
      return true
    } catch (error) {
      console.error('Error updating therapist:', error)
      alert('Error saving configuration')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Wizard: Complete setup and switch to dashboard
  async function handleWizardComplete() {
    const success = await saveConfig()
    if (success) {
      setViewMode('dashboard')
      setEditing(null)
    }
  }

  // Dashboard: Save inline edit
  async function handleSaveEdit() {
    const success = await saveConfig()
    if (success) {
      setEditing(null)
    }
  }

  // Dashboard: Cancel edit and revert changes
  function handleCancelEdit() {
    setConfig({
      modality: therapist?.modality || '',
      dsp_directiveness: therapist?.dsp_directiveness || '',
      dsp_warmth: therapist?.dsp_warmth || '',
      dsp_structure: therapist?.dsp_structure || '',
      default_integration_directions: therapist?.default_integration_directions || ['Reflective']
    })
    setEditing(null)
  }

  // ============================================================
  // DASHBOARD MODE - For configured therapists
  // ============================================================
  if (viewMode === 'dashboard') {
    return (
      <div className="container">
        <div className="flex justify-between items-center mb-24">
          <div>
            <h2>Therapist Settings</h2>
            <p style={{ color: 'var(--warm-gray)', fontSize: 14 }}>
              Your AI configuration and learned preferences
            </p>
          </div>
          <button className="btn secondary" onClick={onNext}>
            Go to Clients →
          </button>
        </div>

        {/* AI Has Learned Panel - Most Important, at Top */}
        <LearnedPreferencesPanel
          learnedPrefs={learnedPrefs}
          hasLearnedPrefs={hasLearnedPrefs}
          resettingPrefs={resettingPrefs}
          onReset={handleResetPreferences}
        />

        {/* Therapeutic Orientation Card */}
        <div className="card mb-16">
          <div className="flex justify-between items-center">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Therapeutic Orientation
            </div>
            <button
              className="btn ghost small"
              onClick={() => setEditing(editing === 'orientation' ? null : 'orientation')}
            >
              {editing === 'orientation' ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing === 'orientation' ? (
            <div style={{ marginTop: 16 }}>
              <div className="flex flex-col gap-12">
                {MODALITIES.map(mod => (
                  <div
                    key={mod.value}
                    className={`card selectable ${config.modality === mod.value ? 'selected' : ''}`}
                    onClick={() => setConfig({ ...config, modality: mod.value })}
                    style={{ padding: 12 }}
                  >
                    <div style={{ fontWeight: 600 }}>{mod.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--warm-gray)' }}>{mod.description}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-8 mt-16">
                <button className="btn primary small" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="btn ghost small" onClick={handleCancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>
              {MODALITIES.find(m => m.value === config.modality)?.label || 'Not set'}
            </div>
          )}
        </div>

        {/* Dialogue Style Card */}
        <div className="card mb-16">
          <div className="flex justify-between items-center">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dialogue Style (DSP)
            </div>
            <button
              className="btn ghost small"
              onClick={() => setEditing(editing === 'dsp' ? null : 'dsp')}
            >
              {editing === 'dsp' ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing === 'dsp' ? (
            <div style={{ marginTop: 16 }}>
              <div className="flex flex-col gap-16">
                <div>
                  <div className="form-label mb-8">Response Style</div>
                  <div className="grid-2">
                    <div
                      className={`card selectable ${config.dsp_directiveness === 'directive' ? 'selected' : ''}`}
                      style={{ padding: 12 }}
                      onClick={() => setConfig({ ...config, dsp_directiveness: 'directive' })}
                    >
                      <div style={{ fontWeight: 600 }}>Directive</div>
                    </div>
                    <div
                      className={`card selectable ${config.dsp_directiveness === 'exploratory' ? 'selected' : ''}`}
                      style={{ padding: 12 }}
                      onClick={() => setConfig({ ...config, dsp_directiveness: 'exploratory' })}
                    >
                      <div style={{ fontWeight: 600 }}>Exploratory</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="form-label mb-8">Emotional Tone</div>
                  <div className="grid-2">
                    <div
                      className={`card selectable ${config.dsp_warmth === 'warm' ? 'selected' : ''}`}
                      style={{ padding: 12 }}
                      onClick={() => setConfig({ ...config, dsp_warmth: 'warm' })}
                    >
                      <div style={{ fontWeight: 600 }}>Warm & Empathic</div>
                    </div>
                    <div
                      className={`card selectable ${config.dsp_warmth === 'grounded' ? 'selected' : ''}`}
                      style={{ padding: 12 }}
                      onClick={() => setConfig({ ...config, dsp_warmth: 'grounded' })}
                    >
                      <div style={{ fontWeight: 600 }}>Grounded & Direct</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="form-label mb-8">Structure</div>
                  <div className="grid-2">
                    <div
                      className={`card selectable ${config.dsp_structure === 'structured' ? 'selected' : ''}`}
                      style={{ padding: 12 }}
                      onClick={() => setConfig({ ...config, dsp_structure: 'structured' })}
                    >
                      <div style={{ fontWeight: 600 }}>Structured</div>
                    </div>
                    <div
                      className={`card selectable ${config.dsp_structure === 'open_ended' ? 'selected' : ''}`}
                      style={{ padding: 12 }}
                      onClick={() => setConfig({ ...config, dsp_structure: 'open_ended' })}
                    >
                      <div style={{ fontWeight: 600 }}>Open-ended</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-8 mt-16">
                <button className="btn primary small" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="btn ghost small" onClick={handleCancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-8 flex-wrap mt-8">
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
          )}
        </div>

        {/* Integration Direction Card */}
        <div className="card mb-16">
          <div className="flex justify-between items-center">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Default Integration Direction
            </div>
            <button
              className="btn ghost small"
              onClick={() => setEditing(editing === 'integration' ? null : 'integration')}
            >
              {editing === 'integration' ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing === 'integration' ? (
            <div style={{ marginTop: 16 }}>
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
              <div className="flex gap-8 mt-16">
                <button className="btn primary small" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="btn ghost small" onClick={handleCancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 16, fontWeight: 500, marginTop: 8 }}>
              {config.default_integration_directions[0]}
            </div>
          )}
        </div>

        {/* Run Full Setup Link */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            className="btn ghost"
            onClick={() => {
              setViewMode('wizard')
              setStep(0)
            }}
            style={{ fontSize: 13, color: 'var(--warm-gray)' }}
          >
            Run Full Setup Wizard Again
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // WIZARD MODE - For first-time setup
  // ============================================================
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

      {/* Step 0: Orientation */}
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

      {/* Step 1: Style Preferences */}
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

      {/* Step 2: Boundaries */}
      {step === 2 && (
        <>
          <h2>Safety & Scope Boundaries</h2>
          <p className="subtitle">Configure default safety settings for AI interactions.</p>

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

          <div className="card sand mb-24" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--warm-gray)' }}>
              <strong>Note:</strong> Client-specific boundaries (topics to avoid, contraindications) are configured per-client in Client Setup.
            </div>
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

      {/* Step 3: Review */}
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
          onClick={() => {
            if (step === 0 && isConfigured) {
              // If already configured and on step 0, go back to dashboard
              setViewMode('dashboard')
            } else {
              setStep(step - 1)
            }
          }}
          disabled={step === 0 && !isConfigured}
        >
          ← Back
        </button>
        {step < 3 ? (
          <button className="btn primary" onClick={() => setStep(step + 1)}>
            Continue →
          </button>
        ) : (
          <button className="btn primary" onClick={handleWizardComplete} disabled={saving}>
            {saving ? 'Saving...' : 'Complete Setup ✓'}
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Learned Preferences Panel Component
// Displays what the AI has learned from therapist feedback
// ============================================================
function LearnedPreferencesPanel({ learnedPrefs, hasLearnedPrefs, resettingPrefs, onReset }) {
  return (
    <div className="card mb-24" style={{ background: '#E8F5E9', border: '1px solid #A5D6A7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#2E7D32' }}>
          Your AI Has Learned
        </div>
        {hasLearnedPrefs && (
          <button
            onClick={onReset}
            disabled={resettingPrefs}
            style={{
              background: 'transparent',
              border: '1px solid #A5D6A7',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              color: '#2E7D32',
              cursor: 'pointer'
            }}
          >
            {resettingPrefs ? 'Resetting...' : 'Reset All'}
          </button>
        )}
      </div>

      {!hasLearnedPrefs ? (
        <div style={{ fontSize: 13, color: '#558B2F' }}>
          No learned preferences yet. As you review AI responses in PreSession and provide feedback, the AI will learn your style.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#2E7D32', marginBottom: 12 }}>
            Based on <strong>{learnedPrefs.total_reviews}</strong> reviews
          </div>

          {/* Active Adjustments */}
          {(() => {
            const adjustments = []
            if (learnedPrefs.reduce_directiveness?.active) {
              adjustments.push({ label: 'Be less directive', count: learnedPrefs.reduce_directiveness.count })
            }
            if (learnedPrefs.tone_adjustment_needed?.active) {
              adjustments.push({ label: 'Adjust tone', count: learnedPrefs.tone_adjustment_needed.count })
            }
            if (learnedPrefs.modality_drift_detected?.active) {
              adjustments.push({ label: 'Stay on modality', count: learnedPrefs.modality_drift_detected.count })
            }
            if (learnedPrefs.prefer_shorter?.active) {
              adjustments.push({ label: 'Shorter responses', count: learnedPrefs.prefer_shorter.count })
            }
            if (learnedPrefs.prefer_longer?.active) {
              adjustments.push({ label: 'Longer responses', count: learnedPrefs.prefer_longer.count })
            }
            if (learnedPrefs.over_exploring?.active) {
              adjustments.push({ label: 'Contain more', count: learnedPrefs.over_exploring.count })
            }
            if (learnedPrefs.improve_empathy?.active) {
              adjustments.push({ label: 'More empathy', count: learnedPrefs.improve_empathy.count })
            }
            if (learnedPrefs.use_ktms_more?.active) {
              adjustments.push({ label: 'Use KTMs more', count: learnedPrefs.use_ktms_more.count })
            }

            if (adjustments.length === 0) {
              return (
                <div style={{ fontSize: 13, color: '#558B2F', marginBottom: 12 }}>
                  No pattern thresholds reached yet (need 3+ similar corrections).
                </div>
              )
            }

            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {adjustments.map((adj, i) => (
                  <span key={i} style={{
                    background: '#C8E6C9',
                    color: '#2E7D32',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    {adj.label} ({adj.count}x)
                  </span>
                ))}
              </div>
            )
          })()}

          {/* Correction Examples */}
          {learnedPrefs.correction_examples?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2E7D32', marginBottom: 8 }}>
                Recent Corrections ({learnedPrefs.correction_examples.length})
              </div>
              {learnedPrefs.correction_examples.slice(0, 2).map((ex, i) => (
                <div key={i} style={{
                  background: 'white',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 8,
                  fontSize: 12
                }}>
                  <div style={{ color: '#C62828', marginBottom: 4 }}>
                    <strong>Original:</strong> "{ex.original.slice(0, 80)}{ex.original.length > 80 ? '...' : ''}"
                  </div>
                  <div style={{ color: '#2E7D32' }}>
                    <strong>You preferred:</strong> "{ex.edited.slice(0, 100)}{ex.edited.length > 100 ? '...' : ''}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
