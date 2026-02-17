import { useState, useEffect } from 'react'
import { getRecentMessagesForReview, getFlaggedMessages, getKTMsForClient, updateMessage, saveDSPFeedback } from '../lib/db'
import { DEMO_THERAPIST_ID, DEMO_CLIENT_ID } from '../lib/supabase'

export default function PreSession({ therapist, client }) {
  const [tab, setTab] = useState('summary')
  const [messages, setMessages] = useState([])
  const [flaggedMessages, setFlaggedMessages] = useState([])
  const [ktms, setKtms] = useState([])
  const [loading, setLoading] = useState(true)
  
  // DSP Feedback state - 6 dimensions
  const [dspFeedback, setDspFeedback] = useState({
    empathic_attunement: null,
    interpretation: null,
    affect_regulation: null,
    ktm_application: null,
    boundaries: null,
    model_adherence: null
  })
  const [dspComments, setDspComments] = useState('')
  const [submittingDSP, setSubmittingDSP] = useState(false)
  const [dspSubmitted, setDspSubmitted] = useState(false)
  
  // Track reviewed exchanges and feedback
  const [reviewedExchanges, setReviewedExchanges] = useState({})
  const [feedbackOpen, setFeedbackOpen] = useState(null)
  const [exchangeFeedback, setExchangeFeedback] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [msgs, flagged, k] = await Promise.all([
        getRecentMessagesForReview(),
        getFlaggedMessages(),
        getKTMsForClient()
      ])
      setMessages(msgs)
      setFlaggedMessages(flagged)
      setKtms(k)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark exchange as "Good"
  async function handleMarkGood(exchange, index) {
    try {
      if (exchange.ai?.id) {
        await updateMessage(exchange.ai.id, { 
          review_status: 'approved',
          flagged_for_review: false 
        })
      }
      setReviewedExchanges(prev => ({ ...prev, [index]: 'good' }))
    } catch (error) {
      console.error('Error marking as good:', error)
    }
  }

  // Toggle feedback input for an exchange
  function handleToggleFeedback(index) {
    setFeedbackOpen(feedbackOpen === index ? null : index)
  }

  // Submit feedback for a specific exchange
  async function handleSubmitExchangeFeedback(exchange, index) {
    const feedback = exchangeFeedback[index]
    if (!feedback?.trim()) return
    
    try {
      if (exchange.ai?.id) {
        await updateMessage(exchange.ai.id, { 
          review_status: 'feedback',
          therapist_feedback: feedback,
          flagged_for_review: false
        })
      }
      setReviewedExchanges(prev => ({ ...prev, [index]: 'feedback' }))
      setFeedbackOpen(null)
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  // Submit overall DSP feedback
  async function handleSubmitDSPFeedback() {
    const hasAnyFeedback = Object.values(dspFeedback).some(v => v !== null) || dspComments.trim()
    if (!hasAnyFeedback) return
    
    setSubmittingDSP(true)
    try {
      await saveDSPFeedback({
        therapist_id: therapist?.id || DEMO_THERAPIST_ID,
        client_id: client?.id || DEMO_CLIENT_ID,
        empathic_attunement: dspFeedback.empathic_attunement,
        interpretation: dspFeedback.interpretation,
        affect_regulation: dspFeedback.affect_regulation,
        ktm_application: dspFeedback.ktm_application,
        boundaries: dspFeedback.boundaries,
        model_adherence: dspFeedback.model_adherence,
        comments: dspComments || null,
        created_at: new Date().toISOString()
      })
      setDspSubmitted(true)
    } catch (error) {
      console.error('Error submitting DSP feedback:', error)
      alert('Error saving feedback. Check console for details.')
    } finally {
      setSubmittingDSP(false)
    }
  }

  // Helper to set a feedback dimension
  function setFeedbackDimension(dimension, value) {
    setDspFeedback(prev => ({ ...prev, [dimension]: value }))
  }

  // Group messages into exchanges (client + AI response pairs)
  const exchanges = []
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      const userMsg = messages[i]
      const aiMsg = messages[i + 1]?.role === 'assistant' ? messages[i + 1] : null
      exchanges.push({ user: userMsg, ai: aiMsg })
      if (aiMsg) i++
    }
  }

  // Stats
  const stats = {
    messageCount: messages.length,
    avgLength: messages.length > 0 
      ? Math.round(messages.filter(m => m.role === 'user').reduce((sum, m) => sum + m.content.split(' ').length, 0) / Math.max(1, messages.filter(m => m.role === 'user').length))
      : 0,
    tier2Count: messages.filter(m => m.tier === 'TIER_2').length,
    tier3Count: messages.filter(m => m.tier === 'TIER_3').length
  }

  // Themes (simple extraction from messages)
  const themes = extractThemes(messages)

  if (loading) {
    return <div className="loading">Loading pre-session data...</div>
  }

  // Feedback dimension component
  const FeedbackDimension = ({ label, dimension, options }) => (
    <div className="feedback-question">
      <div className="feedback-question-label">{label}</div>
      <div className="feedback-options">
        {options.map(option => (
          <button
            key={option.value}
            className={`btn small ${dspFeedback[dimension] === option.value ? 'primary' : 'secondary'}`}
            onClick={() => setFeedbackDimension(dimension, option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="container wide">
      <div className="flex justify-between items-center mb-32">
        <div>
          <h2>Pre-Session Review</h2>
          <div style={{ color: 'var(--warm-gray)', fontSize: 14 }}>
            <strong>{client?.display_name}</strong> · Last 7 days
          </div>
        </div>
        <span className="badge success">Next Session: Tomorrow 2pm</span>
      </div>
      
      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${tab === 'summary' ? 'active' : ''}`}
          onClick={() => setTab('summary')}
        >
          Summary
        </button>
        <button 
          className={`tab ${tab === 'excerpts' ? 'active' : ''}`}
          onClick={() => setTab('excerpts')}
        >
          Excerpts
        </button>
        <button 
          className={`tab ${tab === 'feedback' ? 'active' : ''}`}
          onClick={() => setTab('feedback')}
        >
          DSP Feedback
        </button>
      </div>
      
      {/* Summary Tab */}
      {tab === 'summary' && (
        <>
          <div className="grid-4 mb-32">
            <div className="card stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-value">{stats.messageCount}</div>
              <div className="stat-label">Messages</div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-value">{stats.avgLength} words</div>
              <div className="stat-label">Avg Length</div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">{stats.tier2Count}</div>
              <div className="stat-label">Tier-2 Events</div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">🚨</div>
              <div className="stat-value">{stats.tier3Count}</div>
              <div className="stat-label">Tier-3 Events</div>
            </div>
          </div>
          
          <div className="grid-2">
            <div className="card">
              <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                Themes Discussed
              </h3>
              <div className="flex flex-wrap gap-8">
                {themes.length > 0 ? themes.map((theme, i) => (
                  <span key={i} className="badge default">{theme}</span>
                )) : (
                  <span style={{ color: 'var(--warm-gray)', fontSize: 13 }}>No themes detected</span>
                )}
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                Key Therapeutic Messages
              </h3>
              {ktms.length > 0 ? (
                <div className="flex flex-col gap-12">
                  {ktms.slice(0, 3).map((ktm, i) => (
                    <div key={i} style={{ 
                      padding: '10px 12px', 
                      background: 'var(--sage-light)', 
                      borderRadius: 8,
                      fontSize: 13 
                    }}>
                      <div style={{ fontWeight: 500, color: 'var(--sage-dark)', marginBottom: 4 }}>
                        {ktm.title || `KTM ${i + 1}`}
                      </div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        {ktm.content}
                      </div>
                      {ktm.times_used > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--warm-gray)', marginTop: 6 }}>
                          Used {ktm.times_used} time{ktm.times_used !== 1 ? 's' : ''} this week
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ color: 'var(--warm-gray)', fontSize: 13 }}>No KTMs configured</span>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Excerpts Tab */}
      {tab === 'excerpts' && (
        <>
          <div className="card info mb-24" style={{ padding: 16, border: 'none' }}>
            <div className="flex items-center gap-8">
              <span>🔍</span>
              <span style={{ fontSize: 13, color: 'var(--sage-dark)' }}>
                Showing {exchanges.length} excerpts. <strong>{flaggedMessages.length} flagged for review.</strong>
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-16">
            {exchanges.length > 0 ? exchanges.map((exchange, i) => (
              <div 
                key={i}
                className={`card excerpt-card ${exchange.ai?.flagged_for_review ? 'flagged' : ''} ${reviewedExchanges[i] ? 'reviewed' : ''}`}
              >
                <div className="excerpt-header">
                  <div className="excerpt-meta">
                    <span style={{ fontSize: 13, color: 'var(--warm-gray)' }}>
                      {new Date(exchange.user.created_at).toLocaleDateString()}
                    </span>
                    {exchange.ai?.tier && exchange.ai.tier !== 'TIER_1' && (
                      <span className={`badge tier${exchange.ai.tier.toLowerCase().replace('tier_', '')}`}>
                        {exchange.ai.tier}
                      </span>
                    )}
                    {reviewedExchanges[i] && (
                      <span className={`badge ${reviewedExchanges[i] === 'good' ? 'success' : 'default'}`}>
                        {reviewedExchanges[i] === 'good' ? '✓ Approved' : '📝 Feedback Sent'}
                      </span>
                    )}
                  </div>
                  {exchange.ai?.flagged_for_review && !reviewedExchanges[i] && (
                    <span className="badge warning">Flagged</span>
                  )}
                </div>
                <div className="excerpt-client">
                  <div className="excerpt-label">Client</div>
                  <div className="excerpt-text">{exchange.user.content}</div>
                </div>
                {exchange.ai && (
                  <div className="excerpt-ai">
                    <div className="excerpt-label">AI Response</div>
                    <div className="excerpt-text">{exchange.ai.content}</div>
                  </div>
                )}
                
                {/* Feedback input (shown when open) */}
                {feedbackOpen === i && (
                  <div style={{ marginTop: 16, padding: 16, background: 'var(--sage-light)', borderRadius: 8 }}>
                    <textarea
                      className="form-textarea"
                      placeholder="Enter feedback on this AI response..."
                      rows="3"
                      value={exchangeFeedback[i] || ''}
                      onChange={(e) => setExchangeFeedback(prev => ({ ...prev, [i]: e.target.value }))}
                      style={{ marginBottom: 12 }}
                    />
                    <div className="flex gap-8">
                      <button 
                        className="btn small primary"
                        onClick={() => handleSubmitExchangeFeedback(exchange, i)}
                      >
                        Submit
                      </button>
                      <button 
                        className="btn small ghost"
                        onClick={() => setFeedbackOpen(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Action buttons */}
                {!reviewedExchanges[i] && feedbackOpen !== i && (
                  <div className="flex justify-between items-center mt-16">
                    <div className="flex gap-8">
                      <button 
                        className="btn small secondary"
                        onClick={() => handleMarkGood(exchange, i)}
                      >
                        ✓ Good
                      </button>
                      <button 
                        className="btn small ghost"
                        onClick={() => handleToggleFeedback(i)}
                      >
                        Feedback
                      </button>
                    </div>
                    <button className="btn small ghost">View Full Exchange</button>
                  </div>
                )}
              </div>
            )) : (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ color: 'var(--warm-gray)' }}>No intersession messages yet</p>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* DSP Feedback Tab */}
      {tab === 'feedback' && (
        <>
          {dspSubmitted ? (
            <div className="card success" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <h3>Feedback Submitted</h3>
              <p style={{ color: 'var(--warm-gray)', marginTop: 8 }}>
                Your feedback will help refine the DSP for {client?.display_name || 'this client'}.
              </p>
              <button 
                className="btn secondary mt-16"
                onClick={() => {
                  setDspSubmitted(false)
                  setDspFeedback({
                    empathic_attunement: null,
                    interpretation: null,
                    affect_regulation: null,
                    ktm_application: null,
                    boundaries: null,
                    model_adherence: null
                  })
                  setDspComments('')
                }}
              >
                Submit More Feedback
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--warm-gray)', marginBottom: 24 }}>
                Rate AI performance across therapeutic dimensions to refine the DSP.
              </p>
              
              <div className="card mb-24">
                <FeedbackDimension 
                  label="Empathic Attunement"
                  dimension="empathic_attunement"
                  options={[
                    { value: 'insufficient', label: 'Insufficient' },
                    { value: 'appropriate', label: 'Appropriate' },
                    { value: 'excessive', label: 'Excessive' }
                  ]}
                />
                
                <FeedbackDimension 
                  label="Interpretation (timing of insight-oriented interventions)"
                  dimension="interpretation"
                  options={[
                    { value: 'premature', label: 'Premature' },
                    { value: 'well_timed', label: 'Well-timed' },
                    { value: 'missed', label: 'Missed Opportunity' }
                  ]}
                />
                
                <FeedbackDimension 
                  label="Affect Regulation (somatic cues, distraction, topic shifts)"
                  dimension="affect_regulation"
                  options={[
                    { value: 'under_regulated', label: 'Under-regulated' },
                    { value: 'appropriate', label: 'Appropriate' },
                    { value: 'over_managed', label: 'Over-managed' }
                  ]}
                />
                
                <FeedbackDimension 
                  label="KTM Application"
                  dimension="ktm_application"
                  options={[
                    { value: 'missed', label: 'Missed' },
                    { value: 'appropriate', label: 'Appropriate' },
                    { value: 'forced', label: 'Forced/Overused' }
                  ]}
                />
                
                <FeedbackDimension 
                  label="Boundaries (respected off-limit areas and directives)"
                  dimension="boundaries"
                  options={[
                    { value: 'violated', label: 'Violated' },
                    { value: 'respected', label: 'Respected' },
                    { value: 'overly_rigid', label: 'Overly Rigid' }
                  ]}
                />
                
                <FeedbackDimension 
                  label="Model Adherence (consistency with therapeutic approach)"
                  dimension="model_adherence"
                  options={[
                    { value: 'not_adherent', label: 'Not Adherent' },
                    { value: 'partially_adherent', label: 'Partially Adherent' },
                    { value: 'fully_adherent', label: 'Fully Adherent' }
                  ]}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Comments</label>
                <textarea 
                  className="form-textarea"
                  placeholder="Additional observations, specific examples, or suggestions..."
                  rows="4"
                  value={dspComments}
                  onChange={(e) => setDspComments(e.target.value)}
                />
              </div>
              
              <button 
                className="btn primary mt-16"
                onClick={handleSubmitDSPFeedback}
                disabled={submittingDSP}
              >
                {submittingDSP ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}

function extractThemes(messages) {
  const keywords = [
    'validation', 'sister', 'family', 'perfectionist', 'work', 
    'anxiety', 'stress', 'relationship', 'pattern', 'awareness'
  ]
  const foundThemes = []
  const text = messages.map(m => m.content.toLowerCase()).join(' ')
  
  for (const keyword of keywords) {
    if (text.includes(keyword) && !foundThemes.includes(keyword)) {
      foundThemes.push(keyword.charAt(0).toUpperCase() + keyword.slice(1))
    }
  }
  
  return foundThemes.slice(0, 5)
}
