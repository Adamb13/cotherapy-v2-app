import { useState, useEffect } from 'react'
import {
  getRecentMessagesForReview,
  getFlaggedMessages,
  getKTMsForClient,
  updateMessage,
  saveDSPFeedback,
  clearPostCrisisMode,
  getDyadStatus,
  DYAD_STATES,
  DYAD_STATE_INFO,
  getAvailableDyadTransitions,
  transitionDyadStatus,
  pauseDyad,
  resumeDyad,
  activateDyad,
  terminateDyad,
  getPolicyPackHistory,
  createResponseReview,
  createSafetyOverride,
  refreshLearnedPreferences,
  markClientNotificationsRead,
  POLICY_PACK_TYPES
} from '../lib/db'
import { DEMO_THERAPIST_ID, DEMO_CLIENT_ID } from '../lib/supabase'

// Reason codes for feedback (from PRD HITL spec + preference learning additions)
const FEEDBACK_REASONS = [
  { code: 'too_directive', label: 'Too directive / not exploratory enough' },
  { code: 'missed_emotion', label: 'Missed emotional cue' },
  { code: 'wrong_tone', label: 'Wrong tone (too warm or too cold)' },
  { code: 'should_contain', label: 'Should have contained, not explored' },
  { code: 'missed_ktm', label: 'Missed KTM reinforcement opportunity' },
  { code: 'off_modality', label: 'Off-modality language or technique' },
  { code: 'too_long', label: 'Response too long' },
  { code: 'too_short', label: 'Response too short' },
  { code: 'boundary_violation', label: 'Boundary violation' },
  { code: 'safety_miss', label: 'Missed safety concern' },
  { code: 'excellent', label: 'Excellent response' },
  { code: 'other', label: 'Other' }
]

// Reason codes for safety tier overrides
const SAFETY_OVERRIDE_REASONS = [
  { code: 'too_aggressive', label: 'Too aggressive (false positive)' },
  { code: 'too_permissive', label: 'Too permissive (missed risk)' },
  { code: 'context_dependent', label: 'Context-dependent (I know this client)' },
  { code: 'misread_intent', label: 'Misread client intent' },
  { code: 'other', label: 'Other' }
]

const TIER_OPTIONS = [
  { value: 'TIER_1', label: 'TIER_1 — Normal engagement' },
  { value: 'TIER_2', label: 'TIER_2 — Elevated concern (contain/soften)' },
  { value: 'TIER_3', label: 'TIER_3 — Crisis (988 + therapist alert)' }
]

export default function PreSession({ therapist, client, onClientUpdate }) {
  const [tab, setTab] = useState('summary')
  const [messages, setMessages] = useState([])
  const [flaggedMessages, setFlaggedMessages] = useState([])
  const [ktms, setKtms] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearingCrisis, setClearingCrisis] = useState(false)

  // Dyad state machine
  const [dyadTransitioning, setDyadTransitioning] = useState(false)
  const [showDyadMenu, setShowDyadMenu] = useState(false)
  
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
  const [selectedReasons, setSelectedReasons] = useState({}) // { exchangeIndex: ['reason_code', ...] }
  const [editedResponses, setEditedResponses] = useState({}) // { exchangeIndex: 'what AI should have said' }

  // Safety override state
  const [safetyOverrideOpen, setSafetyOverrideOpen] = useState(null) // Which exchange index is showing override UI
  const [safetyOverrides, setSafetyOverrides] = useState({}) // { exchangeIndex: { tier: 'TIER_X', reason: 'code' } }

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

  // Mark exchange as "Good" - writes to response_reviews table
  async function handleMarkGood(exchange, index) {
    try {
      if (exchange.ai?.id) {
        await updateMessage(exchange.ai.id, {
          review_status: 'approved',
          flagged_for_review: false
        })

        // Write to response_reviews for preference learning
        await createResponseReview({
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
          client_id: client?.id || DEMO_CLIENT_ID,
          message_id: exchange.ai.id,
          action: 'approved',
          original_response: exchange.ai.content,
          edited_response: null,
          reason_codes: ['excellent'],
          feeds_dsp: true
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

  // Submit feedback for a specific exchange - writes to response_reviews table
  async function handleSubmitExchangeFeedback(exchange, index) {
    const reasons = selectedReasons[index] || []
    const editedResponse = editedResponses[index] || null
    const otherComment = exchangeFeedback[index] || null

    // Require at least one reason code
    if (reasons.length === 0) {
      alert('Please select at least one reason for the feedback.')
      return
    }

    try {
      if (exchange.ai?.id) {
        // Update the message status
        await updateMessage(exchange.ai.id, {
          review_status: 'needs_improvement',
          flagged_for_review: false
        })

        // Write to response_reviews for preference learning
        await createResponseReview({
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
          client_id: client?.id || DEMO_CLIENT_ID,
          message_id: exchange.ai.id,
          action: editedResponse ? 'edited' : 'flagged',
          original_response: exchange.ai.content,
          edited_response: editedResponse,
          reason_codes: reasons,
          feeds_dsp: true,
          notes: otherComment
        })

        // Refresh learned preferences based on all reviews
        await refreshLearnedPreferences(therapist?.id || DEMO_THERAPIST_ID)
      }
      setReviewedExchanges(prev => ({ ...prev, [index]: 'needs_work' }))
      setFeedbackOpen(null)
      setSelectedReasons(prev => ({ ...prev, [index]: [] }))
      setEditedResponses(prev => ({ ...prev, [index]: '' }))
      setExchangeFeedback(prev => ({ ...prev, [index]: '' }))
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  // Submit safety override - writes to safety_overrides table
  async function handleSubmitSafetyOverride(exchange, index) {
    const override = safetyOverrides[index]
    if (!override?.tier || !override?.reason) {
      alert('Please select both a tier and a reason.')
      return
    }

    try {
      await createSafetyOverride({
        therapist_id: therapist?.id || DEMO_THERAPIST_ID,
        client_id: client?.id || DEMO_CLIENT_ID,
        message_id: exchange.user.id,
        original_tier: exchange.ai?.tier || 'TIER_1',
        corrected_tier: override.tier,
        client_message_text: exchange.user.content,
        reason_code: override.reason
      })

      setSafetyOverrideOpen(null)
      setSafetyOverrides(prev => ({ ...prev, [index]: {} }))
      alert('Safety override saved. This feedback will help improve safety routing.')
    } catch (error) {
      console.error('Error submitting safety override:', error)
      alert('Error saving override. Please try again.')
    }
  }

  // Toggle reason code selection
  function toggleReason(index, reasonCode) {
    setSelectedReasons(prev => {
      const current = prev[index] || []
      if (current.includes(reasonCode)) {
        return { ...prev, [index]: current.filter(r => r !== reasonCode) }
      } else {
        return { ...prev, [index]: [...current, reasonCode] }
      }
    })
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

  // Dyad state transitions
  const currentDyadStatus = getDyadStatus(client)
  const dyadInfo = DYAD_STATE_INFO[currentDyadStatus]
  const availableTransitions = getAvailableDyadTransitions(currentDyadStatus)

  async function handleDyadTransition(newStatus) {
    if (!client?.id) return

    setDyadTransitioning(true)
    setShowDyadMenu(false)
    try {
      let updated
      switch (newStatus) {
        case DYAD_STATES.PAUSED:
          updated = await pauseDyad(client.id, 'Paused by therapist')
          break
        case DYAD_STATES.ACTIVE:
          if (currentDyadStatus === DYAD_STATES.PAUSED) {
            updated = await resumeDyad(client.id)
          } else {
            updated = await activateDyad(client.id)
          }
          break
        case DYAD_STATES.TERMINATED:
          if (!confirm('Are you sure you want to terminate this client relationship? This cannot be undone.')) {
            setDyadTransitioning(false)
            return
          }
          updated = await terminateDyad(client.id)
          break
        default:
          updated = await transitionDyadStatus(client.id, newStatus)
      }
      if (onClientUpdate) {
        onClientUpdate(updated)
      }
    } catch (error) {
      console.error('Error transitioning dyad:', error)
      alert('Error updating client status: ' + error.message)
    } finally {
      setDyadTransitioning(false)
    }
  }

  // Clear post-crisis mode and mark crisis notifications as read
  async function handleClearCrisis() {
    if (!client?.id) return

    setClearingCrisis(true)
    try {
      const updated = await clearPostCrisisMode(client.id)

      // Mark any crisis notifications for this client as read
      await markClientNotificationsRead(client.id, therapist?.id || DEMO_THERAPIST_ID)

      if (onClientUpdate) {
        onClientUpdate(updated)
      }
    } catch (error) {
      console.error('Error clearing crisis mode:', error)
      alert('Error clearing crisis mode. Please try again.')
    } finally {
      setClearingCrisis(false)
    }
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
      {/* Post-Crisis Alert */}
      {client?.dsp_adjustments?.is_post_crisis && (
        <div className="card" style={{
          padding: 16,
          marginBottom: 24,
          background: '#FFF3E0',
          border: '2px solid #FF9800'
        }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-12">
              <span style={{ fontSize: 24 }}>🚨</span>
              <div>
                <div style={{ fontWeight: 600, color: '#E65100' }}>Crisis Protocol Triggered</div>
                <div style={{ fontSize: 13, color: '#BF360C' }}>
                  Client triggered safety escalation on {new Date(client.dsp_adjustments.post_crisis_at || Date.now()).toLocaleDateString()}.
                  Chat is locked until you clear this.
                </div>
              </div>
            </div>
            <button
              className="btn primary"
              onClick={handleClearCrisis}
              disabled={clearingCrisis}
              style={{ background: '#E65100' }}
            >
              {clearingCrisis ? 'Clearing...' : 'Clear & Restore Chat'}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-32">
        <div>
          <h2>Pre-Session Review</h2>
          <div style={{ color: 'var(--warm-gray)', fontSize: 14 }}>
            <strong>{client?.display_name}</strong> · Last 7 days
          </div>
        </div>
        <div className="flex items-center gap-16">
          {/* Dyad Status with dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDyadMenu(!showDyadMenu)}
              disabled={dyadTransitioning || currentDyadStatus === DYAD_STATES.TERMINATED}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: dyadInfo?.color + '15',
                border: `1px solid ${dyadInfo?.color}`,
                borderRadius: 8,
                cursor: currentDyadStatus === DYAD_STATES.TERMINATED ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
                color: dyadInfo?.color
              }}
            >
              <span>{dyadInfo?.icon}</span>
              <span>{dyadTransitioning ? 'Updating...' : dyadInfo?.label}</span>
              {currentDyadStatus !== DYAD_STATES.TERMINATED && (
                <span style={{ marginLeft: 4, opacity: 0.6 }}>▼</span>
              )}
            </button>

            {/* Dropdown menu */}
            {showDyadMenu && availableTransitions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'white',
                  borderRadius: 8,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  border: '1px solid var(--sand-dark)',
                  minWidth: 200,
                  zIndex: 100,
                  overflow: 'hidden'
                }}
              >
                {availableTransitions.map(status => {
                  const info = DYAD_STATE_INFO[status]
                  return (
                    <button
                      key={status}
                      onClick={() => handleDyadTransition(status)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        textAlign: 'left',
                        borderBottom: '1px solid var(--sand)'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--sand)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 16 }}>{info?.icon}</span>
                      <div>
                        <div style={{ fontWeight: 500, color: info?.color }}>{info?.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--warm-gray)' }}>
                          {info?.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showDyadMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99
          }}
          onClick={() => setShowDyadMenu(false)}
        />
      )}
      
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
        <button
          className={`tab ${tab === 'config' ? 'active' : ''}`}
          onClick={() => setTab('config')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Config History
          <span style={{
            fontSize: 9,
            padding: '2px 5px',
            background: '#FFE082',
            color: '#F57C00',
            borderRadius: 4,
            fontWeight: 600
          }}>DEMO</span>
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
                    {/* Tier badge with override button */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className={`badge tier${(exchange.ai?.tier || 'TIER_1').toLowerCase().replace('tier_', '')}`}>
                        {exchange.ai?.tier || 'TIER_1'}
                      </span>
                      <button
                        onClick={() => setSafetyOverrideOpen(safetyOverrideOpen === i ? null : i)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--warm-gray)',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                        title="Override safety classification"
                      >
                        Override
                      </button>
                    </span>
                    {reviewedExchanges[i] && (
                      <span className={`badge ${reviewedExchanges[i] === 'good' ? 'success' : 'warning'}`}>
                        {reviewedExchanges[i] === 'good' ? '👍 Approved' : '👎 Feedback Sent'}
                      </span>
                    )}
                  </div>
                  {exchange.ai?.flagged_for_review && !reviewedExchanges[i] && (
                    <span className="badge warning">Flagged</span>
                  )}
                </div>

                {/* Safety override panel */}
                {safetyOverrideOpen === i && (
                  <div style={{ margin: '12px 0', padding: 12, background: '#E3F2FD', borderRadius: 8, border: '1px solid #90CAF9' }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: '#1565C0', fontSize: 13 }}>
                      Override Safety Classification
                    </div>
                    <div style={{ fontSize: 12, color: '#1976D2', marginBottom: 12 }}>
                      Current: <strong>{exchange.ai?.tier || 'TIER_1'}</strong> — What should it be?
                    </div>
                    <div className="flex gap-12 mb-12">
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 11, color: '#1565C0', marginBottom: 4 }}>Correct Tier</label>
                        <select
                          value={safetyOverrides[i]?.tier || ''}
                          onChange={(e) => setSafetyOverrides(prev => ({
                            ...prev,
                            [i]: { ...prev[i], tier: e.target.value }
                          }))}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            fontSize: 13,
                            border: '1px solid #90CAF9',
                            borderRadius: 6,
                            background: 'white'
                          }}
                        >
                          <option value="">Select tier...</option>
                          {TIER_OPTIONS.map(tier => (
                            <option key={tier.value} value={tier.value}>{tier.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 11, color: '#1565C0', marginBottom: 4 }}>Reason</label>
                        <select
                          value={safetyOverrides[i]?.reason || ''}
                          onChange={(e) => setSafetyOverrides(prev => ({
                            ...prev,
                            [i]: { ...prev[i], reason: e.target.value }
                          }))}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            fontSize: 13,
                            border: '1px solid #90CAF9',
                            borderRadius: 6,
                            background: 'white'
                          }}
                        >
                          <option value="">Select reason...</option>
                          {SAFETY_OVERRIDE_REASONS.map(reason => (
                            <option key={reason.code} value={reason.code}>{reason.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-8">
                      <button
                        className="btn small"
                        onClick={() => handleSubmitSafetyOverride(exchange, i)}
                        style={{ background: '#1565C0', color: 'white' }}
                      >
                        Save Override
                      </button>
                      <button
                        className="btn small ghost"
                        onClick={() => {
                          setSafetyOverrideOpen(null)
                          setSafetyOverrides(prev => ({ ...prev, [i]: {} }))
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
                
                {/* Feedback panel with reason codes (shown when thumbs down clicked) */}
                {feedbackOpen === i && (
                  <div style={{ marginTop: 16, padding: 16, background: '#FFF8E1', borderRadius: 8, border: '1px solid #FFE082' }}>
                    <div style={{ fontWeight: 600, marginBottom: 12, color: '#F57C00' }}>
                      What needed improvement?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                      {FEEDBACK_REASONS.filter(r => r.code !== 'excellent').map(reason => (
                        <label
                          key={reason.code}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            background: (selectedReasons[i] || []).includes(reason.code) ? '#FFE082' : 'white',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                            border: '1px solid #FFE082'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={(selectedReasons[i] || []).includes(reason.code)}
                            onChange={() => toggleReason(i, reason.code)}
                            style={{ accentColor: '#F57C00' }}
                          />
                          {reason.label}
                        </label>
                      ))}
                    </div>

                    {/* "Other" comment field - shown when Other is selected */}
                    {(selectedReasons[i] || []).includes('other') && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#F57C00', marginBottom: 6 }}>
                          Please describe the issue:
                        </label>
                        <textarea
                          className="form-textarea"
                          placeholder="Describe what was wrong with this response..."
                          rows="2"
                          value={exchangeFeedback[i] || ''}
                          onChange={(e) => setExchangeFeedback(prev => ({ ...prev, [i]: e.target.value }))}
                          style={{ fontSize: 13 }}
                        />
                      </div>
                    )}

                    {/* Edited response field - what should the AI have said? */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#F57C00', marginBottom: 6 }}>
                        What should the AI have said instead? (optional but valuable)
                      </label>
                      <textarea
                        className="form-textarea"
                        placeholder="Type the response you would have preferred..."
                        rows="3"
                        value={editedResponses[i] || ''}
                        onChange={(e) => setEditedResponses(prev => ({ ...prev, [i]: e.target.value }))}
                        style={{ fontSize: 13 }}
                      />
                    </div>

                    <div className="flex gap-8">
                      <button
                        className="btn small primary"
                        onClick={() => handleSubmitExchangeFeedback(exchange, i)}
                        style={{ background: '#F57C00' }}
                      >
                        Submit Feedback
                      </button>
                      <button
                        className="btn small ghost"
                        onClick={() => {
                          setFeedbackOpen(null)
                          setSelectedReasons(prev => ({ ...prev, [i]: [] }))
                          setEditedResponses(prev => ({ ...prev, [i]: '' }))
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons - Thumbs up/down */}
                {!reviewedExchanges[i] && feedbackOpen !== i && (
                  <div className="flex justify-between items-center mt-16">
                    <div className="flex gap-8">
                      <button
                        className="btn small"
                        onClick={() => handleMarkGood(exchange, i)}
                        style={{
                          background: '#E8F5E9',
                          color: '#2E7D32',
                          border: '1px solid #A5D6A7',
                          padding: '6px 16px'
                        }}
                        title="Approve this response"
                      >
                        👍
                      </button>
                      <button
                        className="btn small"
                        onClick={() => handleToggleFeedback(i)}
                        style={{
                          background: '#FFF3E0',
                          color: '#E65100',
                          border: '1px solid #FFCC80',
                          padding: '6px 16px'
                        }}
                        title="Needs improvement"
                      >
                        👎
                      </button>
                    </div>
                    <button className="btn small ghost">View Full</button>
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

      {/* Config History Tab */}
      {tab === 'config' && (
        <>
          <div className="card mb-24" style={{ padding: 16, background: '#FFF8E1', border: '1px dashed #FFE082' }}>
            <div className="flex items-center gap-8">
              <span>🔧</span>
              <span style={{ fontSize: 13, color: '#F57C00' }}>
                <strong>Demo Only:</strong> This audit view would be in an admin panel in production. Policy Packs track configuration snapshots for compliance and rollback.
              </span>
            </div>
          </div>

          {(() => {
            const policyPacks = getPolicyPackHistory(client)
            const typeLabels = {
              [POLICY_PACK_TYPES.THERAPIST_CONFIG]: { label: 'Therapist Config', icon: '⚙️', color: '#1565C0' },
              [POLICY_PACK_TYPES.CLIENT_ACTIVATION]: { label: 'Activation', icon: '✓', color: '#2E7D32' },
              [POLICY_PACK_TYPES.SESSION_START]: { label: 'Session', icon: '📝', color: '#7B1FA2' },
              [POLICY_PACK_TYPES.MANUAL_SNAPSHOT]: { label: 'Snapshot', icon: '📷', color: '#F57C00' },
              [POLICY_PACK_TYPES.CONFIG_CHANGE]: { label: 'Config Change', icon: '🔄', color: '#00838F' }
            }

            if (policyPacks.length === 0) {
              return (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📋</div>
                  <p style={{ color: 'var(--warm-gray)' }}>
                    No configuration history yet. Policy packs are created when you complete a post-session review or change client settings.
                  </p>
                </div>
              )
            }

            return (
              <div className="flex flex-col gap-12">
                {policyPacks.slice().reverse().map((pack, i) => {
                  const typeInfo = typeLabels[pack.type] || typeLabels[POLICY_PACK_TYPES.CONFIG_CHANGE]
                  return (
                    <div key={pack.version} className="card" style={{ padding: 16 }}>
                      <div className="flex justify-between items-start mb-12">
                        <div className="flex items-center gap-8">
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            background: typeInfo.color + '15',
                            color: typeInfo.color,
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 500
                          }}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--warm-gray)' }}>
                            v{pack.version}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--warm-gray)' }}>
                          {new Date(pack.created_at).toLocaleString()}
                        </span>
                      </div>

                      {pack.notes && (
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>
                          {pack.notes}
                        </p>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--warm-gray)' }}>
                            Therapist Config
                          </div>
                          <div>Modality: {pack.therapist_config?.modality || 'N/A'}</div>
                          <div>Directiveness: {pack.therapist_config?.dsp_directiveness || 'N/A'}</div>
                          <div>Warmth: {pack.therapist_config?.dsp_warmth || 'N/A'}</div>
                        </div>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--warm-gray)' }}>
                            Client Config
                          </div>
                          <div>Dyad Status: {pack.client_config?.dyad_status || 'N/A'}</div>
                          <div>Modality Override: {pack.client_config?.dsp_adjustments?.modality_override || 'None'}</div>
                          <div>Daily Limit: {pack.client_config?.dsp_adjustments?.max_turns_per_day || 20} msgs</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
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
