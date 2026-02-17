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
  updateSession
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

export default function PostSession({ therapist, client, onNext }) {
  const [step, setStep] = useState(0)
  const [session, setSession] = useState(null)
  const [notes, setNotes] = useState('')
  const [moments, setMoments] = useState([])
  const [ktms, setKtms] = useState([])
  const [integrationDirection, setIntegrationDirection] = useState('Reflective')
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    loadSession()
  }, [])

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

  async function handleAnalyze() {
    if (!notes.trim()) {
      alert('Please enter session notes first.')
      return
    }

    setAnalyzing(true)
    
    try {
      // Extract moments using Claude
      const extractedMoments = await extractMomentsFromNotes(notes, therapist)
      
      if (extractedMoments.length === 0) {
        alert('No clinical moments detected. Try adding more detail to your notes.')
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
        await updateSession(session.id, {
          integration_directions: [integrationDirection],
          review_completed: true,
          review_completed_at: new Date().toISOString()
        })
        alert('Session review complete! Client memory updated.')
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
          <p className="subtitle">Paste your session notes. The AI will extract clinical moments for your review.</p>
          
          <div className="card sand mb-24" style={{ padding: 16 }}>
            <div className="flex items-center gap-8">
              <span className="badge success">Client: {client?.display_name}</span>
              <span style={{ color: 'var(--warm-gray)', fontSize: 13 }}>
                Session #{session?.session_number || 'New'} · {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Session Notes</label>
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
