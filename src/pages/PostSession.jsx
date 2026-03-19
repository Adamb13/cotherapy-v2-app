import { useState, useEffect } from 'react'
import {
  getLatestSession,
  getMomentsForSession,
  getKTMsForSession,
  createSession,
  updateMoment,
  updateKTM,
  createMoment,
  createKTM,
  updateSession,
  updateClient,
  createPolicyPackSnapshot,
  POLICY_PACK_TYPES
} from '../lib/db'
import { extractMomentsFromNotes, generateKTMsFromMoments } from '../lib/ai'
import { DEMO_CLIENT_ID, DEMO_THERAPIST_ID } from '../lib/supabase'

const INTEGRATION_DIRECTIONS = [
  { value: 'Reflective', icon: '🔍', description: 'Focus on insight and meaning-making' },
  { value: 'Behavioral', icon: '🎯', description: 'Focus on actions and homework completion' },
  { value: 'Cognitive', icon: '💭', description: 'Focus on thought patterns and reframing' },
  { value: 'Somatic', icon: '🧘', description: 'Focus on body awareness and grounding' },
  { value: 'Stabilization', icon: '⚓', description: 'Focus on safety and regulation' }
]

// Minimum word count for quality extraction
const MIN_WORDS_WARNING = 50
const MIN_WORDS_BLOCK = 20

export default function PostSession({ therapist, client, onClientUpdate, onNext }) {
  const [step, setStep] = useState(0)
  const [session, setSession] = useState(null)
  const [notes, setNotes] = useState('')
  const [moments, setMoments] = useState([])
  const [ktms, setKtms] = useState([])
  const [integrationDirection, setIntegrationDirection] = useState('Reflective')
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  // Session metadata
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionDuration, setSessionDuration] = useState('50')

  // Fallback questions state (when extraction fails)
  const [showFallbackQuestions, setShowFallbackQuestions] = useState(false)
  const [fallbackAnswers, setFallbackAnswers] = useState({
    mainThemes: '',
    emotionalShifts: '',
    insights: '',
    homework: ''
  })

  // Client-specific config
  const [clientConfig, setClientConfig] = useState({
    avoid_topics: '',
    contraindications: '',
    modality_override: '',
    max_turns_per_day: 20
  })

  useEffect(() => {
    loadSession()
  }, [])

  // Initialize client config from existing data
  useEffect(() => {
    if (client?.dsp_adjustments) {
      const adj = client.dsp_adjustments
      setClientConfig({
        avoid_topics: adj.avoid_topics?.join(', ') || '',
        contraindications: adj.contraindications || '',
        modality_override: adj.modality_override || '',
        max_turns_per_day: adj.max_turns_per_day || 20
      })
    }
  }, [client])

  async function loadSession() {
    try {
      const s = await getLatestSession()
      if (s) {
        setSession(s)
        setNotes(s.raw_notes || '')
        setIntegrationDirection(s.integration_directions?.[0] || 'Reflective')
        
        const [m, k] = await Promise.all([
          getMomentsForSession(s.id),
          getKTMsForSession(s.id)
        ])
        
        if (m.length > 0) {
          setMoments(m.map(moment => ({ ...moment, approved: moment.status === 'approved' ? true : moment.status === 'rejected' ? false : null })))
          setStep(1)
        }
        if (k.length > 0) {
          setKtms(k.map(ktm => ({ ...ktm, approved: ktm.status === 'approved' ? true : ktm.status === 'rejected' ? false : null })))
        }
      }
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setLoading(false)
    }
  }

  // Count words in notes
  function getWordCount(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length
  }

  async function handleAnalyze() {
    if (!notes.trim()) {
      alert('Please enter session notes first.')
      return
    }

    const wordCount = getWordCount(notes)

    // Block if too short
    if (wordCount < MIN_WORDS_BLOCK) {
      alert(`Your notes are very brief (${wordCount} words). Please add more detail about the session.`)
      return
    }

    // Warn if short but allow to proceed
    if (wordCount < MIN_WORDS_WARNING) {
      const proceed = confirm(
        `Your notes are brief (${wordCount} words). The AI works best with more detail.\n\n` +
        `Continue anyway, or cancel to add more?`
      )
      if (!proceed) return
    }

    setAnalyzing(true)
    setShowFallbackQuestions(false)

    try {
      // Extract moments using Claude (with low confidence support)
      const extractedMoments = await extractMomentsFromNotes(notes, therapist)

      if (extractedMoments.length === 0) {
        // Show fallback questions instead of blocking
        setShowFallbackQuestions(true)
        setAnalyzing(false)
        return
      }

      // Generate KTMs from the moments
      const extractedKtms = await generateKTMsFromMoments(extractedMoments, therapist)
      
      // Add IDs and metadata to moments
      const momentsWithIds = extractedMoments.map(m => ({
        ...m,
        id: crypto.randomUUID(),
        session_id: session?.id,
        client_id: DEMO_CLIENT_ID,
        status: 'pending',
        approved: null
      }))
      
      // Add IDs and metadata to KTMs
      const ktmsWithIds = extractedKtms.map(k => ({
        ...k,
        id: crypto.randomUUID(),
        session_id: session?.id,
        client_id: DEMO_CLIENT_ID,
        therapist_id: DEMO_THERAPIST_ID,
        status: 'pending',
        approved: null
      }))
      
      setMoments(momentsWithIds)
      setKtms(ktmsWithIds)
      setStep(1)
    } catch (error) {
      console.error('Error analyzing session:', error)
      alert('Error analyzing session. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Handle fallback questions submission - create moments from answers
  async function handleFallbackSubmit() {
    const manualMoments = []

    if (fallbackAnswers.mainThemes.trim()) {
      manualMoments.push({
        id: crypto.randomUUID(),
        category: 'INSIGHT',
        content: fallbackAnswers.mainThemes,
        ai_significance: 3,
        confidence: 'therapist_provided',
        session_id: session?.id,
        client_id: DEMO_CLIENT_ID,
        status: 'pending',
        approved: null
      })
    }

    if (fallbackAnswers.emotionalShifts.trim()) {
      manualMoments.push({
        id: crypto.randomUUID(),
        category: 'EMOTIONAL_SHIFT',
        content: fallbackAnswers.emotionalShifts,
        ai_significance: 4,
        confidence: 'therapist_provided',
        session_id: session?.id,
        client_id: DEMO_CLIENT_ID,
        status: 'pending',
        approved: null
      })
    }

    if (fallbackAnswers.insights.trim()) {
      manualMoments.push({
        id: crypto.randomUUID(),
        category: 'INSIGHT',
        content: fallbackAnswers.insights,
        ai_significance: 4,
        confidence: 'therapist_provided',
        session_id: session?.id,
        client_id: DEMO_CLIENT_ID,
        status: 'pending',
        approved: null
      })
    }

    if (fallbackAnswers.homework.trim()) {
      manualMoments.push({
        id: crypto.randomUUID(),
        category: 'BEHAVIORAL',
        content: `Homework assigned: ${fallbackAnswers.homework}`,
        ai_significance: 3,
        confidence: 'therapist_provided',
        session_id: session?.id,
        client_id: DEMO_CLIENT_ID,
        status: 'pending',
        approved: null
      })
    }

    if (manualMoments.length === 0) {
      alert('Please answer at least one question.')
      return
    }

    setMoments(manualMoments)
    setShowFallbackQuestions(false)
    setStep(1)

    // Generate KTMs from manual moments
    try {
      const extractedKtms = await generateKTMsFromMoments(manualMoments, therapist)
      const ktmsWithIds = extractedKtms.map(k => ({
        ...k,
        id: crypto.randomUUID(),
        session_id: session?.id,
        client_id: DEMO_CLIENT_ID,
        therapist_id: DEMO_THERAPIST_ID,
        status: 'pending',
        approved: null
      }))
      setKtms(ktmsWithIds)
    } catch (error) {
      console.error('Error generating KTMs:', error)
    }
  }

  async function handleApproveMoment(id) {
    setMoments(moments.map(m => 
      m.id === id ? { ...m, approved: true, status: 'approved' } : m
    ))
    
    const moment = moments.find(m => m.id === id)
    if (moment && session) {
      try {
        await createMoment({
          session_id: session.id,
          client_id: DEMO_CLIENT_ID,
          category: moment.category,
          content: moment.content,
          ai_significance: moment.ai_significance,
          therapist_significance: moment.ai_significance,
          status: 'approved',
          is_active: true
        })
      } catch (error) {
        console.error('Error saving moment:', error)
      }
    }
  }

  function handleRejectMoment(id) {
    setMoments(moments.map(m => 
      m.id === id ? { ...m, approved: false, status: 'rejected' } : m
    ))
  }

  async function handleApproveKTM(id) {
    setKtms(ktms.map(k => 
      k.id === id ? { ...k, approved: true, status: 'approved' } : k
    ))
    
    const ktm = ktms.find(k => k.id === id)
    if (ktm && session) {
      try {
        await createKTM({
          session_id: session.id,
          client_id: DEMO_CLIENT_ID,
          therapist_id: DEMO_THERAPIST_ID,
          content: ktm.content,
          ai_emphasis: ktm.ai_emphasis,
          therapist_emphasis: ktm.ai_emphasis,
          status: 'approved',
          is_active: true
        })
      } catch (error) {
        console.error('Error saving KTM:', error)
      }
    }
  }

  function handleRejectKTM(id) {
    setKtms(ktms.map(k => 
      k.id === id ? { ...k, approved: false, status: 'rejected' } : k
    ))
  }

  async function handleComplete() {
    if (session) {
      try {
        // Save session updates
        await updateSession(session.id, {
          integration_directions: [integrationDirection],
          review_completed: true,
          review_completed_at: new Date().toISOString()
        })

        // Save client-specific config
        if (client) {
          const dspAdjustments = {
            ...(client.dsp_adjustments || {}), // Preserve existing fields
            avoid_topics: clientConfig.avoid_topics.split(',').map(s => s.trim()).filter(Boolean),
            contraindications: clientConfig.contraindications,
            modality_override: clientConfig.modality_override || null,
            max_turns_per_day: parseInt(clientConfig.max_turns_per_day) || 20
          }
          await updateClient(client.id, { dsp_adjustments: dspAdjustments })

          // Create policy pack snapshot for audit trail
          const { client: updatedClient } = await createPolicyPackSnapshot(
            client.id,
            therapist,
            POLICY_PACK_TYPES.SESSION_START,
            `Post-session review completed. Integration: ${integrationDirection}. ${moments.filter(m => m.approved).length} moments approved.`
          )

          // Update parent with new client data (includes policy pack)
          if (onClientUpdate && updatedClient) {
            onClientUpdate(updatedClient)
          }
        }

        alert('Session review complete! Client memory and boundaries updated.')
        onNext()
      } catch (error) {
        console.error('Error completing review:', error)
      }
    }
  }

  if (loading) {
    return <div className="loading">Loading session...</div>
  }

  return (
    <div className="container">
      {/* Step 0: Notes Input */}
      {step === 0 && (
        <>
          <h2>Post-Session Review</h2>
          <p className="subtitle">Capture session details. The AI will extract clinical moments for your review.</p>

          {/* Session metadata */}
          <div className="card sand mb-24" style={{ padding: 16 }}>
            <div className="flex justify-between items-center flex-wrap gap-12">
              <div className="flex items-center gap-12">
                <span className="badge success">Client: {client?.display_name}</span>
                <span style={{ color: 'var(--warm-gray)', fontSize: 13 }}>
                  Session #{session?.session_number || 'New'}
                </span>
              </div>
              <div className="flex items-center gap-12">
                <div className="flex items-center gap-6">
                  <label style={{ fontSize: 12, color: 'var(--warm-gray)' }}>Date:</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      fontSize: 13,
                      border: '1px solid var(--sand-dark)',
                      borderRadius: 4,
                      background: 'white'
                    }}
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label style={{ fontSize: 12, color: 'var(--warm-gray)' }}>Duration:</label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      fontSize: 13,
                      border: '1px solid var(--sand-dark)',
                      borderRadius: 4,
                      background: 'white'
                    }}
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="50">50 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Fallback questions panel */}
          {showFallbackQuestions && (
            <div className="card mb-24" style={{ padding: 20, background: '#FFF8E1', border: '1px solid #FFE082' }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: '#F57C00' }}>
                Help the AI understand this session
              </div>
              <p style={{ fontSize: 13, color: '#BF360C', marginBottom: 16 }}>
                The AI couldn't extract enough detail from your notes. Answer a few quick questions:
              </p>

              <div className="flex flex-col gap-12">
                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>What were the main themes or topics discussed?</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Family conflict, work stress, relationship with mother"
                    value={fallbackAnswers.mainThemes}
                    onChange={(e) => setFallbackAnswers(prev => ({ ...prev, mainThemes: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>Any emotional shifts you noticed?</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Moved from anger to sadness when discussing childhood"
                    value={fallbackAnswers.emotionalShifts}
                    onChange={(e) => setFallbackAnswers(prev => ({ ...prev, emotionalShifts: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>Any insights or breakthroughs?</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Client recognized pattern of people-pleasing"
                    value={fallbackAnswers.insights}
                    onChange={(e) => setFallbackAnswers(prev => ({ ...prev, insights: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>Homework or focus for the week?</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Journal about moments of self-criticism"
                    value={fallbackAnswers.homework}
                    onChange={(e) => setFallbackAnswers(prev => ({ ...prev, homework: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-8 mt-16">
                <button className="btn primary" onClick={handleFallbackSubmit}>
                  Create Moments from Answers
                </button>
                <button className="btn ghost" onClick={() => setShowFallbackQuestions(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <div className="flex justify-between items-center mb-8">
              <label className="form-label" style={{ marginBottom: 0 }}>Session Notes</label>
              <span style={{
                fontSize: 12,
                color: getWordCount(notes) < MIN_WORDS_WARNING ? '#E65100' : 'var(--warm-gray)'
              }}>
                {getWordCount(notes)} words
                {getWordCount(notes) < MIN_WORDS_WARNING && getWordCount(notes) > 0 && (
                  <span style={{ marginLeft: 8 }}>· Add more detail for better extraction</span>
                )}
              </span>
            </div>
            <textarea
              className="form-textarea"
              rows="12"
              placeholder={`Paste your session notes here...

Example:
Session focused on client's recent conflict with sister. Client expressed frustration about feeling unheard in family dynamics. Explored connection to childhood pattern of seeking validation from parents. Client had significant insight recognizing this as a recurring theme. Noticed a shift to sadness when discussing relationship with sister. Did some parts work - identified a perfectionist manager part. Client deflected when I tried to bring up father's illness. Assigned journaling homework about noticing validation-seeking behaviors.`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-12 mt-24">
            <button
              className="btn primary"
              onClick={handleAnalyze}
              disabled={analyzing || !notes.trim()}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Session →'}
            </button>
            <button className="btn secondary" onClick={() => setStep(1)}>
              Skip to Manual Entry
            </button>
          </div>
        </>
      )}

      {/* Step 1: Review Moments */}
      {step === 1 && (
        <>
          <div className="flex justify-between items-center mb-24">
            <div>
              <h2>Review Clinical Moments</h2>
              <p style={{ color: 'var(--warm-gray)', fontSize: 14 }}>
                AI extracted {moments.length} moments. Approve to add to client memory.
              </p>
            </div>
            <span className="badge default">
              {moments.filter(m => m.approved === true).length}/{moments.length} approved
            </span>
          </div>
          
          <div className="flex flex-col gap-16">
            {moments.map(moment => (
              <div 
                key={moment.id}
                className="card moment-card"
                style={{ 
                  opacity: moment.approved === false ? 0.5 : 1,
                  borderLeftColor: getCategoryColor(moment.category)
                }}
              >
                <div className="moment-header">
                  <div className="moment-meta">
                    <span className={`category-badge ${moment.category.toLowerCase()}`}>
                      {moment.category.replace('_', ' ')}
                    </span>
                    {/* Confidence badge */}
                    {moment.confidence === 'low' && (
                      <span className="badge warning" style={{ fontSize: 10 }}>Low Confidence</span>
                    )}
                    {moment.confidence === 'medium' && (
                      <span className="badge default" style={{ fontSize: 10 }}>Medium</span>
                    )}
                    {moment.confidence === 'therapist_provided' && (
                      <span className="badge success" style={{ fontSize: 10 }}>Manual</span>
                    )}
                    <div className="significance-dots">
                      {[1,2,3,4,5].map(n => (
                        <div
                          key={n}
                          className={`significance-dot ${n <= moment.ai_significance ? 'active' : ''}`}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--warm-gray)' }}>
                      Significance: {moment.ai_significance}/5
                    </span>
                  </div>
                  {moment.approved !== null && (
                    <span className={`badge ${moment.approved ? 'success' : 'danger'}`}>
                      {moment.approved ? 'Approved' : 'Rejected'}
                    </span>
                  )}
                </div>
                <p className="moment-content">{moment.content}</p>
                {moment.approved === null && (
                  <div className="moment-actions">
                    <button 
                      className="btn primary small"
                      onClick={() => handleApproveMoment(moment.id)}
                    >
                      ✓ Approve
                    </button>
                    <button 
                      className="btn ghost small"
                      onClick={() => handleRejectMoment(moment.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="nav-footer">
            <button className="btn ghost" onClick={() => setStep(0)}>
              ← Back to Notes
            </button>
            <button className="btn primary" onClick={() => setStep(2)}>
              Review Key Messages →
            </button>
          </div>
        </>
      )}

      {/* Step 2: Review KTMs */}
      {step === 2 && (
        <>
          <div className="flex justify-between items-center mb-24">
            <div>
              <h2>Key Therapeutic Messages</h2>
              <p style={{ color: 'var(--warm-gray)', fontSize: 14 }}>
                AI-proposed messages for intersession reinforcement. Approve to use in client chat.
              </p>
            </div>
          </div>
          
          <div className="card info mb-24" style={{ padding: 16, border: 'none' }}>
            <div className="flex items-center gap-12">
              <span style={{ fontSize: 20 }}>💡</span>
              <div style={{ fontSize: 13, color: 'var(--sage-dark)', lineHeight: 1.6 }}>
                <strong>KTMs</strong> are therapist-approved messages the AI can use to reinforce session insights. Higher emphasis = more frequent reinforcement.
              </div>
            </div>
          </div>
          
          {ktms.length > 0 ? (
            <div className="flex flex-col gap-16">
              {ktms.map(ktm => (
                <div 
                  key={ktm.id}
                  className="card"
                  style={{ opacity: ktm.approved === false ? 0.5 : 1 }}
                >
                  <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-8">
                      <span style={{ fontSize: 11, color: 'var(--warm-gray)' }}>
                        Emphasis: {ktm.ai_emphasis}/5
                      </span>
                      <div className="significance-dots">
                        {[1,2,3,4,5].map(n => (
                          <div 
                            key={n}
                            className={`significance-dot coral ${n <= ktm.ai_emphasis ? 'active' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                    {ktm.approved !== null && (
                      <span className={`badge ${ktm.approved ? 'success' : 'danger'}`}>
                        {ktm.approved ? 'Approved' : 'Rejected'}
                      </span>
                    )}
                  </div>
                  <div className="ktm-quote">"{ktm.content}"</div>
                  {ktm.approved === null && (
                    <div className="moment-actions">
                      <button 
                        className="btn primary small"
                        onClick={() => handleApproveKTM(ktm.id)}
                      >
                        ✓ Approve
                      </button>
                      <button 
                        className="btn ghost small"
                        onClick={() => handleRejectKTM(ktm.id)}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: 'var(--warm-gray)' }}>No KTMs generated. Approve some moments first, or continue to set integration direction.</p>
            </div>
          )}
          
          <div className="nav-footer">
            <button className="btn ghost" onClick={() => setStep(1)}>
              ← Back to Moments
            </button>
            <button className="btn primary" onClick={() => setStep(3)}>
              Set Integration Direction →
            </button>
          </div>
        </>
      )}

      {/* Step 3: Integration Direction */}
      {step === 3 && (
        <>
          <h2>Integration Direction</h2>
          <p className="subtitle">What should intersession AI focus on until the next session?</p>

          <div className="flex flex-col gap-12">
            {INTEGRATION_DIRECTIONS.map(dir => (
              <div
                key={dir.value}
                className={`card selectable ${integrationDirection === dir.value ? 'selected' : ''}`}
                style={{ padding: 16 }}
                onClick={() => setIntegrationDirection(dir.value)}
              >
                <div className="flex items-center gap-12">
                  <span style={{ fontSize: 24 }}>{dir.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{dir.value}</div>
                    <div style={{ fontSize: 13, color: 'var(--warm-gray)' }}>{dir.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="nav-footer">
            <button className="btn ghost" onClick={() => setStep(2)}>
              ← Back to KTMs
            </button>
            <button className="btn primary" onClick={() => setStep(4)}>
              Client Boundaries →
            </button>
          </div>
        </>
      )}

      {/* Step 4: Client-Specific Boundaries */}
      {step === 4 && (
        <>
          <h2>Client Boundaries</h2>
          <p className="subtitle">Set client-specific constraints for AI interactions with {client?.display_name}.</p>

          <div className="card info mb-24" style={{ padding: 16, border: 'none' }}>
            <div className="flex items-center gap-12">
              <span style={{ fontSize: 20 }}>ℹ️</span>
              <div style={{ fontSize: 13, color: 'var(--sage-dark)', lineHeight: 1.6 }}>
                These override your therapist-level defaults for this client only.
                Leave blank to use your defaults.
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Topics to Avoid (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., divorce proceedings, sister relationship, work stress"
              value={clientConfig.avoid_topics}
              onChange={(e) => setClientConfig({ ...clientConfig, avoid_topics: e.target.value })}
            />
            <div style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4 }}>
              AI will redirect away from these topics
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Clinical Considerations</label>
            <textarea
              className="form-textarea"
              placeholder="e.g., History of dissociation - avoid deep exploration without grounding first..."
              rows="3"
              value={clientConfig.contraindications}
              onChange={(e) => setClientConfig({ ...clientConfig, contraindications: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Modality Override</label>
              <select
                className="form-select"
                value={clientConfig.modality_override}
                onChange={(e) => setClientConfig({ ...clientConfig, modality_override: e.target.value })}
              >
                <option value="">Use my default ({therapist?.modality})</option>
                <option value="IFS">IFS</option>
                <option value="CBT">CBT</option>
                <option value="Psychodynamic">Psychodynamic</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Daily Message Limit</label>
              <select
                className="form-select"
                value={clientConfig.max_turns_per_day}
                onChange={(e) => setClientConfig({ ...clientConfig, max_turns_per_day: e.target.value })}
              >
                <option value="5">5 messages/day (minimal)</option>
                <option value="10">10 messages/day (conservative)</option>
                <option value="20">20 messages/day (standard)</option>
                <option value="30">30 messages/day (expanded)</option>
                <option value="50">50 messages/day (maximum)</option>
              </select>
            </div>
          </div>

          <div className="nav-footer">
            <button className="btn ghost" onClick={() => setStep(3)}>
              ← Back to Direction
            </button>
            <button className="btn primary" onClick={handleComplete}>
              Complete Review ✓
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function getCategoryColor(category) {
  const colors = {
    'INSIGHT': '#1565C0',
    'EMOTIONAL_SHIFT': '#C2185B',
    'PARTS_WORK': '#2E7D32',
    'RESISTANCE': '#E65100',
    'KEY_MEMORY': '#7B1FA2',
    'TRANSFERENCE': '#00838F',
    'SOMATIC': '#BF360C',
    'COGNITIVE_DISTORTION': '#37474F'
  }
  return colors[category] || '#7C9082'
}
