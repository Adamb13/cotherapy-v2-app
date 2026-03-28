import { useState, useEffect } from 'react'
import {
  getLatestSession,
  getMomentsForSession,
  getKTMsForSession,
  getSessionsForClient,
  createSession,
  updateMoment,
  updateKTM,
  createMoment,
  createKTM,
  updateSession,
  updateClient,
  createPolicyPackSnapshot,
  createMomentReview,
  POLICY_PACK_TYPES
} from '../lib/db'
import { extractMomentsFromNotes, generateKTMsFromMoments } from '../lib/ai'
import { DEMO_CLIENT_ID, DEMO_THERAPIST_ID } from '../lib/supabase'

/**
 * PostSession — Session Notes Workspace (60/40 Split Panel)
 *
 * Left panel (60%): Session notes editor + extracted moments + KTMs
 * Right panel (40%): Intersession configuration (always visible)
 *
 * Both panels scroll independently. Notes are the permanent clinical record.
 * The AI never sees raw notes — only approved moments and KTMs feed into coaching.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Brand palette — every selected/active state uses sageLight bg + sage border + teal text
const BRAND = {
  teal: '#1a3a3a',           // Primary buttons, headings, selected text
  sage: '#7d9a8c',           // Borders on selected/active items, focus rings
  sageLight: '#f0f5f2',      // Selected state backgrounds (consistent everywhere)
  panelBg: '#faf9f6',        // Right panel warm neutral background
}

// Integration directions with full descriptions
const INTEGRATION_DIRECTIONS = [
  { value: 'Reflective', description: 'Explore feelings, process session themes' },
  { value: 'Behavioral', description: 'Reinforce homework, track behavioral goals' },
  { value: 'Cognitive', description: 'Challenge distortions, practice reframing' },
  { value: 'Somatic', description: 'Body awareness, grounding exercises' },
  { value: 'Stabilization', description: 'Containment, resourcing, safety focus' }
]

// TIM levels from PRD — labels in sentence case
const TIM_LEVELS = [
  { value: 1, label: 'Reflect & resource' },
  { value: 2, label: 'Support & reinforce' },
  { value: 3, label: 'Guided exploration' },
  { value: 4, label: 'Active integration' },
  { value: 5, label: 'Deep engagement' }
]

// Moment categories
const MOMENT_CATEGORIES = [
  'KEY_MEMORY', 'INSIGHT', 'TRANSFERENCE', 'SOMATIC',
  'EMOTIONAL_SHIFT', 'RESISTANCE', 'PARTS_WORK', 'COGNITIVE_DISTORTION'
]

// Reason codes for moment review
const MOMENT_REASON_CODES = [
  { code: 'excellent', label: 'Excellent extraction' },
  { code: 'significance_too_high', label: 'Significance rated too high' },
  { code: 'significance_too_low', label: 'Significance rated too low' },
  { code: 'wrong_category', label: 'Wrong moment category' },
  { code: 'missing_context', label: 'Missing important context' },
  { code: 'not_clinically_relevant', label: 'Not clinically relevant' },
  { code: 'needs_editing', label: 'Content needs editing' },
  { code: 'other', label: 'Other' }
]

// Minimum word counts
const MIN_WORDS_WARNING = 50
const MIN_WORDS_BLOCK = 20

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PostSession({ therapist, client, onClientUpdate, onNext, onBack, onViewCrisis, startFresh = false }) {
  // Session state
  const [session, setSession] = useState(null)
  const [notes, setNotes] = useState('')
  const [originalNotes, setOriginalNotes] = useState('') // Track if notes changed since extraction
  const [moments, setMoments] = useState([])
  const [ktms, setKtms] = useState([])
  const [sessionHistory, setSessionHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [hasExtracted, setHasExtracted] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)

  // Session metadata
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionDuration, setSessionDuration] = useState('50')

  // Intersession config (right panel)
  const [integrationDirection, setIntegrationDirection] = useState('Reflective')
  const [clientConfig, setClientConfig] = useState({
    avoid_topics: '',
    contraindications: '',
    tim_level: 3,
    next_session_date: ''
  })

  // Moment review state
  const [momentReasonOpen, setMomentReasonOpen] = useState(null)
  const [momentReasons, setMomentReasons] = useState({})

  // Fallback questions
  const [showFallbackQuestions, setShowFallbackQuestions] = useState(false)
  const [fallbackAnswers, setFallbackAnswers] = useState({
    mainThemes: '',
    emotionalShifts: '',
    insights: '',
    homework: ''
  })

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadSession()
    loadSessionHistory()
  }, [])

  useEffect(() => {
    if (client) {
      const adj = client.dsp_adjustments || {}
      setClientConfig({
        avoid_topics: adj.avoid_topics?.join(', ') || '',
        contraindications: adj.contraindications || '',
        tim_level: adj.tim_level || 3,
        next_session_date: client.next_session_date
          ? new Date(client.next_session_date).toISOString().slice(0, 16)
          : ''
      })
    }
  }, [client])

  async function loadSession() {
    try {
      const s = await getLatestSession()
      if (s && !startFresh) {
        setSession(s)
        setNotes(s.raw_notes || '')
        setOriginalNotes(s.raw_notes || '')
        setIntegrationDirection(s.integration_directions?.[0] || 'Reflective')
        setHasSaved(true)

        const [m, k] = await Promise.all([
          getMomentsForSession(s.id),
          getKTMsForSession(s.id)
        ])

        if (m.length > 0) {
          setMoments(m.map(moment => ({
            ...moment,
            approved: moment.status === 'approved' ? true : moment.status === 'rejected' ? false : null
          })))
          setHasExtracted(true)
        }
        if (k.length > 0) {
          setKtms(k.map(ktm => ({
            ...ktm,
            approved: ktm.status === 'approved' ? true : ktm.status === 'rejected' ? false : null
          })))
        }
      }
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadSessionHistory() {
    try {
      if (client?.id) {
        const sessions = await getSessionsForClient(client.id)
        setSessionHistory(sessions || [])
      }
    } catch (error) {
      console.error('Error loading session history:', error)
    }
  }

  // ============================================================================
  // NOTES SAVE & EXTRACTION
  // ============================================================================

  function getWordCount(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length
  }

  // Check if notes have changed since last extraction
  const notesChanged = hasExtracted && notes !== originalNotes

  async function handleSaveNotes() {
    if (!notes.trim()) return
    setSaving(true)

    try {
      let currentSession = session
      if (!currentSession) {
        currentSession = await createSession({
          client_id: client?.id || DEMO_CLIENT_ID,
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
          session_date: sessionDate,
          duration_minutes: parseInt(sessionDuration) || 50,
          raw_notes: notes,
          integration_directions: [integrationDirection]
        })
        setSession(currentSession)
      } else {
        await updateSession(currentSession.id, {
          raw_notes: notes,
          session_date: sessionDate,
          duration_minutes: parseInt(sessionDuration) || 50
        })
      }
      setHasSaved(true)
      setOriginalNotes(notes)
    } catch (error) {
      console.error('Error saving notes:', error)
      alert(`Error saving notes: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndExtract() {
    if (!notes.trim()) {
      alert('Please enter session notes first.')
      return
    }

    const wordCount = getWordCount(notes)
    if (wordCount < MIN_WORDS_BLOCK) {
      alert(`Your notes are very brief (${wordCount} words). Please add more detail.`)
      return
    }
    if (wordCount < MIN_WORDS_WARNING) {
      const proceed = confirm(
        `Your notes are brief (${wordCount} words). The AI works best with more detail.\n\nContinue anyway?`
      )
      if (!proceed) return
    }

    setExtracting(true)
    setShowFallbackQuestions(false)

    try {
      // Save notes first
      let currentSession = session
      if (!currentSession) {
        currentSession = await createSession({
          client_id: client?.id || DEMO_CLIENT_ID,
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
          session_date: sessionDate,
          duration_minutes: parseInt(sessionDuration) || 50,
          raw_notes: notes,
          integration_directions: [integrationDirection]
        })
        setSession(currentSession)
      } else {
        await updateSession(currentSession.id, {
          raw_notes: notes,
          session_date: sessionDate,
          duration_minutes: parseInt(sessionDuration) || 50
        })
      }
      setHasSaved(true)
      setOriginalNotes(notes)

      // Extract moments
      let extractedMoments
      try {
        extractedMoments = await extractMomentsFromNotes(notes, therapist)
      } catch (aiError) {
        console.error('Error extracting moments:', aiError)
        alert(`Error analyzing notes: ${aiError.message}`)
        setExtracting(false)
        return
      }

      if (extractedMoments.length === 0) {
        setShowFallbackQuestions(true)
        setExtracting(false)
        return
      }

      // Generate KTMs
      let extractedKtms = []
      const highSigMoments = extractedMoments.filter(m => m.ai_significance >= 3)
      if (highSigMoments.length > 0) {
        try {
          extractedKtms = await generateKTMsFromMoments(extractedMoments, therapist)
        } catch (ktmError) {
          console.error('Error generating KTMs:', ktmError)
        }
      }

      const clientId = client?.id || DEMO_CLIENT_ID
      const therapistId = therapist?.id || DEMO_THERAPIST_ID

      const momentsWithIds = extractedMoments.map(m => ({
        ...m,
        id: crypto.randomUUID(),
        session_id: currentSession.id,
        client_id: clientId,
        status: 'pending',
        approved: null
      }))

      const ktmsWithIds = extractedKtms.map(k => ({
        ...k,
        id: crypto.randomUUID(),
        session_id: currentSession.id,
        client_id: clientId,
        therapist_id: therapistId,
        status: 'pending',
        approved: null
      }))

      setMoments(momentsWithIds)
      setKtms(ktmsWithIds)
      setHasExtracted(true)
    } catch (error) {
      console.error('Error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setExtracting(false)
    }
  }

  async function handleFallbackSubmit() {
    let currentSession = session
    if (!currentSession) {
      try {
        currentSession = await createSession({
          client_id: client?.id || DEMO_CLIENT_ID,
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
          session_date: sessionDate,
          duration_minutes: parseInt(sessionDuration) || 50,
          raw_notes: notes,
          integration_directions: [integrationDirection]
        })
        setSession(currentSession)
      } catch (error) {
        console.error('Error creating session:', error)
        alert('Error creating session.')
        return
      }
    }

    const clientId = client?.id || DEMO_CLIENT_ID
    const therapistId = therapist?.id || DEMO_THERAPIST_ID
    const manualMoments = []

    if (fallbackAnswers.mainThemes.trim()) {
      manualMoments.push({
        id: crypto.randomUUID(),
        category: 'INSIGHT',
        content: fallbackAnswers.mainThemes,
        ai_significance: 3,
        confidence: 'therapist_provided',
        session_id: currentSession.id,
        client_id: clientId,
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
        session_id: currentSession.id,
        client_id: clientId,
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
        session_id: currentSession.id,
        client_id: clientId,
        status: 'pending',
        approved: null
      })
    }
    if (fallbackAnswers.homework.trim()) {
      manualMoments.push({
        id: crypto.randomUUID(),
        category: 'BEHAVIORAL',
        content: `Homework: ${fallbackAnswers.homework}`,
        ai_significance: 3,
        confidence: 'therapist_provided',
        session_id: currentSession.id,
        client_id: clientId,
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
    setHasExtracted(true)

    try {
      const extractedKtms = await generateKTMsFromMoments(manualMoments, therapist)
      const ktmsWithIds = extractedKtms.map(k => ({
        ...k,
        id: crypto.randomUUID(),
        session_id: currentSession.id,
        client_id: clientId,
        therapist_id: therapistId,
        status: 'pending',
        approved: null
      }))
      setKtms(ktmsWithIds)
    } catch (error) {
      console.error('Error generating KTMs:', error)
    }
  }

  // ============================================================================
  // MOMENT & KTM APPROVAL
  // ============================================================================

  async function handleApproveMoment(id) {
    const moment = moments.find(m => m.id === id)
    if (!moment) return

    setMoments(moments.map(m =>
      m.id === id ? { ...m, approved: true, status: 'approved' } : m
    ))

    if (session) {
      try {
        await createMoment({
          session_id: session.id,
          client_id: client?.id || DEMO_CLIENT_ID,
          category: moment.category,
          content: moment.content,
          ai_significance: moment.ai_significance,
          therapist_significance: moment.ai_significance,
          status: 'approved',
          is_active: true
        })
        await createMomentReview({
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
          client_id: client?.id || DEMO_CLIENT_ID,
          session_id: session.id,
          moment_id: id,
          action: 'approved',
          original_text: moment.content,
          reason_code: 'excellent'
        })
      } catch (error) {
        console.error('Error saving moment:', error)
      }
    }
  }

  function handleStartReject(id) {
    setMomentReasonOpen(id)
  }

  async function handleRejectMoment(id) {
    const reason = momentReasons[id]
    if (!reason) {
      alert('Please select a reason.')
      return
    }

    const moment = moments.find(m => m.id === id)
    if (!moment) return

    setMoments(moments.map(m =>
      m.id === id ? { ...m, approved: false, status: 'rejected' } : m
    ))
    setMomentReasonOpen(null)

    if (session) {
      try {
        await createMomentReview({
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
          client_id: client?.id || DEMO_CLIENT_ID,
          session_id: session.id,
          moment_id: id,
          action: 'rejected',
          original_text: moment.content,
          reason_code: reason
        })
      } catch (error) {
        console.error('Error saving moment review:', error)
      }
    }
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
          client_id: client?.id || DEMO_CLIENT_ID,
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
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

  // ============================================================================
  // RIGHT PANEL SAVE (INTERSESSION CONFIG)
  // ============================================================================

  async function handleSaveConfig() {
    setSaving(true)

    try {
      // Update session if exists
      if (session) {
        await updateSession(session.id, {
          integration_directions: [integrationDirection],
          review_completed: true,
          review_completed_at: new Date().toISOString()
        })
      }

      // Save client config
      if (client) {
        const dspAdjustments = {
          ...(client.dsp_adjustments || {}),
          avoid_topics: clientConfig.avoid_topics.split(',').map(s => s.trim()).filter(Boolean),
          contraindications: clientConfig.contraindications,
          tim_level: parseInt(clientConfig.tim_level) || 3
        }

        const clientUpdate = { dsp_adjustments: dspAdjustments }
        if (clientConfig.next_session_date) {
          clientUpdate.next_session_date = new Date(clientConfig.next_session_date).toISOString()
        }

        try {
          await updateClient(client.id, clientUpdate)
        } catch (clientError) {
          if (clientError.message?.includes('next_session_date')) {
            await updateClient(client.id, { dsp_adjustments: dspAdjustments })
          } else {
            throw clientError
          }
        }

        // Create policy pack snapshot
        const approvedMoments = moments.filter(m => m.approved).length
        const { client: updatedClient } = await createPolicyPackSnapshot(
          client.id,
          therapist,
          POLICY_PACK_TYPES.SESSION_START,
          `Session review. Integration: ${integrationDirection}. ${approvedMoments} moments approved.`
        )

        if (onClientUpdate && updatedClient) {
          onClientUpdate(updatedClient)
        }
      }

      alert('Saved! Client settings and Policy Pack updated.')
      onNext()
    } catch (error) {
      console.error('Error saving:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return <div className="loading">Loading session...</div>
  }

  const approvedMomentsCount = moments.filter(m => m.approved === true).length
  const approvedKtmsCount = ktms.filter(k => k.approved === true).length
  const isPostCrisis = client?.dsp_adjustments?.is_post_crisis

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Crisis Banner — full width above both panels */}
      {isPostCrisis && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 24px',
          background: 'white',
          borderLeft: '4px solid #C62828',
          borderBottom: '1px solid #eee',
          flexShrink: 0
        }}>
          <span style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2px solid #C62828',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#C62828',
            fontSize: 12,
            fontWeight: 700
          }}>!</span>
          <span style={{ color: 'var(--charcoal)', fontSize: 14 }}>
            Crisis event detected — chat is locked.{' '}
            <button
              onClick={onViewCrisis}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#C62828',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Review
            </button>
            {' '}to resume.
          </span>
        </div>
      )}

      {/* Main split panel container */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}
        className="split-panel-container"
      >
        {/* ================================================================
            LEFT PANEL (60%) — Session Notes + Moments + KTMs
            ================================================================ */}
        <div style={{
          flex: '0 0 60%',
          overflow: 'auto',
          padding: 24,
          background: 'white'
        }}
          className="left-panel"
        >
          {/* Breadcrumb */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
            fontSize: 14
          }}>
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: BRAND.teal,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>←</span>
              {client?.display_name || 'Client'}
            </button>
            <span style={{ color: '#999' }}>/</span>
            <span style={{ color: '#666' }}>Session notes</span>
          </div>

          {/* Section: Session notes */}
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4, color: BRAND.teal }}>
              Session notes
            </h2>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.4 }}>
              Paste or type notes from your session. AI will extract clinical moments for review.
            </p>

            {/* Date and duration inline */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#666' }}>Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    fontSize: 13,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#666' }}>Duration</label>
                <select
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    fontSize: 13,
                    border: '1px solid #ddd',
                    borderRadius: 6,
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

            {/* Notes textarea */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={"Paste your session notes here...\n\nInclude themes discussed, emotional shifts, client insights, homework assigned, and any significant moments from the session. The more detail you provide, the better the AI can extract meaningful clinical moments."}
              style={{
                width: '100%',
                minHeight: 'max(calc(100vh - 300px), 350px)',
                padding: 16,
                fontSize: 15,
                lineHeight: 1.7,
                border: '1px solid #ddd',
                borderRadius: 6,
                resize: 'vertical',
                fontFamily: 'inherit',
                background: 'white'
              }}
            />

            {/* Notes changed prompt */}
            {notesChanged && (
              <div style={{
                fontSize: 12,
                color: '#E65100',
                marginTop: 8,
                padding: '8px 12px',
                background: '#FFF8E1',
                borderRadius: 4
              }}>
                Notes changed since last extraction. Re-extract to update moments.
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={handleSaveNotes}
                disabled={saving || !notes.trim()}
                style={{
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  background: 'transparent',
                  color: BRAND.teal,
                  border: `1px solid ${BRAND.sage}`,
                  borderRadius: 6,
                  cursor: saving || !notes.trim() ? 'not-allowed' : 'pointer',
                  opacity: saving || !notes.trim() ? 0.5 : 1
                }}
              >
                {saving ? 'Saving...' : hasSaved ? 'Update notes' : 'Save notes'}
              </button>
              <button
                onClick={handleSaveAndExtract}
                disabled={extracting || !notes.trim()}
                style={{
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  background: BRAND.teal,
                  color: BRAND.sageLight,
                  border: 'none',
                  borderRadius: 6,
                  cursor: extracting || !notes.trim() ? 'not-allowed' : 'pointer',
                  opacity: extracting || !notes.trim() ? 0.5 : 1
                }}
              >
                {extracting ? 'Extracting...' : hasExtracted ? 'Update & extract' : 'Save & extract moments'}
              </button>
            </div>
          </section>

          {/* Fallback questions */}
          {showFallbackQuestions && (
            <section style={{
              marginBottom: 32,
              padding: 20,
              background: '#FFF8E1',
              border: '1px solid #FFE082',
              borderRadius: 8
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4, color: '#F57C00' }}>
                Help the AI understand this session
              </div>
              <p style={{ fontSize: 12, color: '#BF360C', marginBottom: 16 }}>
                The AI couldn't extract enough detail. Answer a few quick questions:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Main themes?</label>
                  <input
                    type="text"
                    placeholder="e.g., Family conflict, work stress"
                    value={fallbackAnswers.mainThemes}
                    onChange={(e) => setFallbackAnswers(prev => ({ ...prev, mainThemes: e.target.value }))}
                    style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Emotional shifts?</label>
                  <input
                    type="text"
                    placeholder="e.g., Anger to sadness"
                    value={fallbackAnswers.emotionalShifts}
                    onChange={(e) => setFallbackAnswers(prev => ({ ...prev, emotionalShifts: e.target.value }))}
                    style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Insights?</label>
                  <input
                    type="text"
                    placeholder="e.g., Client recognized a pattern"
                    value={fallbackAnswers.insights}
                    onChange={(e) => setFallbackAnswers(prev => ({ ...prev, insights: e.target.value }))}
                    style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Homework?</label>
                  <input
                    type="text"
                    placeholder="e.g., Journal about self-criticism"
                    value={fallbackAnswers.homework}
                    onChange={(e) => setFallbackAnswers(prev => ({ ...prev, homework: e.target.value }))}
                    style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  onClick={handleFallbackSubmit}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    background: BRAND.teal,
                    color: BRAND.sageLight,
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Create Moments
                </button>
                <button
                  onClick={() => setShowFallbackQuestions(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    background: 'transparent',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {/* Section: Moments */}
          {hasExtracted && moments.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 500, color: BRAND.teal }}>
                  Clinical moments
                </h2>
                <span style={{ fontSize: 12, color: '#666' }}>
                  {approvedMomentsCount}/{moments.length} approved
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {moments.map(moment => (
                  <MomentCard
                    key={moment.id}
                    moment={moment}
                    isReasonOpen={momentReasonOpen === moment.id}
                    reason={momentReasons[moment.id] || ''}
                    onApprove={() => handleApproveMoment(moment.id)}
                    onStartReject={() => handleStartReject(moment.id)}
                    onReject={() => handleRejectMoment(moment.id)}
                    onCancelReject={() => setMomentReasonOpen(null)}
                    onReasonChange={(val) => setMomentReasons(prev => ({ ...prev, [moment.id]: val }))}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section: KTMs */}
          {hasExtracted && ktms.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 500, color: BRAND.teal }}>
                  Key therapeutic messages
                </h2>
                <span style={{ fontSize: 12, color: '#666' }}>
                  {approvedKtmsCount}/{ktms.length} approved
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ktms.map(ktm => (
                  <KTMCard
                    key={ktm.id}
                    ktm={ktm}
                    onApprove={() => handleApproveKTM(ktm.id)}
                    onReject={() => handleRejectKTM(ktm.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section: Session History (collapsible) */}
          {sessionHistory.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#666'
                }}
              >
                <span style={{ transform: showHistory ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▶</span>
                Session history ({sessionHistory.length} sessions)
              </button>

              {showHistory && (
                <div style={{ marginTop: 12, paddingLeft: 16 }}>
                  {sessionHistory.slice(0, 5).map((s, i) => (
                    <div key={s.id} style={{
                      padding: '10px 12px',
                      marginBottom: 8,
                      background: '#f9f9f9',
                      borderRadius: 4,
                      fontSize: 13
                    }}>
                      <div style={{ fontWeight: 500 }}>
                        Session {sessionHistory.length - i} — {new Date(s.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {s.raw_notes && (
                        <div style={{ color: '#666', marginTop: 4, fontSize: 12 }}>
                          {s.raw_notes.slice(0, 150)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Divider — subtle left border to separate panels */}
        <div style={{ width: 0, borderLeft: '0.5px solid #e0e0e0', flexShrink: 0 }} />

        {/* ================================================================
            RIGHT PANEL (40%) — Intersession Setup
            ================================================================ */}
        <div style={{
          flex: '0 0 40%',
          overflow: 'auto',
          padding: 24,
          background: BRAND.panelBg
        }}
          className="right-panel"
        >
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4, color: BRAND.teal }}>
            Intersession setup
          </h2>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.4 }}>
            Configure AI behavior between now and the next session
          </p>

          {/* Integration direction — radio card style */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 10, color: BRAND.teal }}>
              Integration direction
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {INTEGRATION_DIRECTIONS.map(dir => {
                const selected = integrationDirection === dir.value
                return (
                  <button
                    key={dir.value}
                    onClick={() => setIntegrationDirection(dir.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: selected ? BRAND.sageLight : 'white',
                      border: selected ? `1px solid ${BRAND.sage}` : '0.5px solid #e0e0e0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {/* Radio circle indicator */}
                    <span style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: selected ? 'none' : `1.5px solid ${BRAND.sage}`,
                      background: selected ? BRAND.teal : 'transparent',
                      boxShadow: selected ? `inset 0 0 0 3px ${BRAND.sageLight}` : 'none',
                      flexShrink: 0
                    }} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13, color: selected ? BRAND.teal : '#333' }}>
                        {dir.value}
                      </div>
                      <div style={{ fontSize: 11, color: selected ? '#4a6a5a' : '#888', marginTop: 1 }}>
                        {dir.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Therapeutic intensity (TIM) — compact boxes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 10, color: BRAND.teal }}>
              Therapeutic intensity (TIM)
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {TIM_LEVELS.map(level => {
                const selected = clientConfig.tim_level === level.value
                return (
                  <button
                    key={level.value}
                    onClick={() => setClientConfig({ ...clientConfig, tim_level: level.value })}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      background: selected ? BRAND.sageLight : 'white',
                      color: selected ? BRAND.teal : '#333',
                      border: selected ? `1px solid ${BRAND.sage}` : '0.5px solid #e0e0e0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{level.value}</span>
                    <span style={{
                      fontSize: 9,
                      lineHeight: 1.2,
                      color: selected ? '#4a6a5a' : '#888',
                      fontWeight: selected ? 500 : 400
                    }}>
                      {level.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Topics to avoid */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: BRAND.teal }}>
              Topics to avoid
            </label>
            <input
              type="text"
              placeholder="e.g., divorce proceedings, sister relationship"
              value={clientConfig.avoid_topics}
              onChange={(e) => setClientConfig({ ...clientConfig, avoid_topics: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 13,
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white'
              }}
            />
            <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
              AI will redirect away from these topics
            </div>
          </div>

          {/* Clinical considerations */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: BRAND.teal }}>
              Clinical considerations
            </label>
            <textarea
              placeholder="e.g., History of dissociation — avoid deep exploration without grounding first"
              value={clientConfig.contraindications}
              onChange={(e) => setClientConfig({ ...clientConfig, contraindications: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 13,
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                resize: 'vertical',
                lineHeight: 1.5
              }}
            />
          </div>

          {/* Next session — date and time fields, equal 50/50 width */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: BRAND.teal }}>
              Next session
            </label>
            <div style={{ display: 'flex', gap: 8, maxWidth: 280 }}>
              <input
                type="text"
                placeholder="Date"
                value={clientConfig.next_session_date ? clientConfig.next_session_date.split('T')[0] : ''}
                onFocus={(e) => { e.target.type = 'date' }}
                onBlur={(e) => { if (!e.target.value) e.target.type = 'text' }}
                onChange={(e) => {
                  const currentTime = clientConfig.next_session_date?.split('T')[1] || '09:00'
                  setClientConfig({ ...clientConfig, next_session_date: e.target.value ? `${e.target.value}T${currentTime}` : '' })
                }}
                className="next-session-field"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '9px 12px',
                  fontSize: 13,
                  border: '0.5px solid #e0e0e0',
                  borderRadius: 6,
                  background: 'white'
                }}
              />
              <select
                value={clientConfig.next_session_date?.split('T')[1] || ''}
                onChange={(e) => {
                  const currentDate = clientConfig.next_session_date?.split('T')[0] || new Date().toISOString().split('T')[0]
                  setClientConfig({ ...clientConfig, next_session_date: e.target.value ? `${currentDate}T${e.target.value}` : '' })
                }}
                className="next-session-field"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '9px 12px',
                  fontSize: 13,
                  border: '0.5px solid #e0e0e0',
                  borderRadius: 6,
                  background: 'white'
                }}
              >
                <option value="">Time</option>
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(time => (
                  <option key={time} value={time}>
                    {parseInt(time) > 12 ? `${parseInt(time) - 12}:00 PM` : `${parseInt(time)}:00 ${parseInt(time) === 12 ? 'PM' : 'AM'}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Save row — right-aligned with top separator */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 16,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #eee'
          }}>
            <button
              onClick={onBack}
              style={{
                padding: '8px 12px',
                fontSize: 14,
                background: 'transparent',
                color: '#888',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              style={{
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 500,
                background: BRAND.teal,
                color: BRAND.sageLight,
                border: 'none',
                borderRadius: 6,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save & update'}
            </button>
          </div>
        </div>
      </div>

      {/* Focus states + responsive styles */}
      <style>{`
        /* Sage focus ring on all inputs — replaces default browser blue */
        .left-panel input:focus,
        .left-panel select:focus,
        .left-panel textarea:focus,
        .right-panel input:focus,
        .right-panel select:focus,
        .right-panel textarea:focus {
          outline: none;
          border-color: #7d9a8c !important;
          box-shadow: 0 0 0 2px rgba(125, 154, 140, 0.2);
        }

        /* Remove default button outlines, use sage instead */
        .right-panel button:focus-visible,
        .left-panel button:focus-visible {
          outline: 2px solid #7d9a8c;
          outline-offset: 2px;
        }

        @media (max-width: 900px) {
          .split-panel-container {
            flex-direction: column !important;
          }
          .left-panel, .right-panel {
            flex: none !important;
            width: 100% !important;
            max-height: none !important;
          }
          .left-panel textarea {
            min-height: 300px !important;
          }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function MomentCard({ moment, isReasonOpen, reason, onApprove, onStartReject, onReject, onCancelReject, onReasonChange }) {
  const categoryColors = {
    'INSIGHT': '#1565C0',
    'EMOTIONAL_SHIFT': '#C2185B',
    'PARTS_WORK': '#2E7D32',
    'RESISTANCE': '#E65100',
    'KEY_MEMORY': '#7B1FA2',
    'TRANSFERENCE': '#00838F',
    'SOMATIC': '#BF360C',
    'COGNITIVE_DISTORTION': '#37474F'
  }
  const color = categoryColors[moment.category] || '#7C9082'

  return (
    <div style={{
      padding: 14,
      background: 'white',
      borderLeft: `4px solid ${color}`,
      borderRadius: 4,
      opacity: moment.approved === false ? 0.5 : 1
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            padding: '2px 8px',
            fontSize: 10,
            fontWeight: 600,
            background: `${color}15`,
            color: color,
            borderRadius: 4,
            textTransform: 'uppercase'
          }}>
            {moment.category.replace('_', ' ')}
          </span>
          <span style={{ fontSize: 11, color: '#999' }}>
            Sig: {moment.ai_significance}/5
          </span>
        </div>
        {moment.approved !== null && (
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: moment.approved ? '#2E7D32' : '#C62828'
          }}>
            {moment.approved ? '✓ Approved' : '✗ Rejected'}
          </span>
        )}
      </div>

      <p style={{ margin: '8px 0', fontSize: 13, lineHeight: 1.5, color: '#333' }}>
        {moment.content}
      </p>

      {moment.approved === null && !isReasonOpen && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={onApprove}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 500,
              background: BRAND.teal,
              color: BRAND.sageLight,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            ✓ Approve
          </button>
          <button
            onClick={onStartReject}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              background: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Reject
          </button>
        </div>
      )}

      {isReasonOpen && (
        <div style={{ marginTop: 10, padding: 10, background: '#FFF8E1', borderRadius: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, color: '#F57C00' }}>
            Why are you rejecting this?
          </div>
          <select
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            style={{ width: '100%', padding: 6, marginBottom: 8, fontSize: 12, border: '1px solid #FFE082', borderRadius: 4 }}
          >
            <option value="">Select a reason...</option>
            {MOMENT_REASON_CODES.filter(r => r.code !== 'excellent').map(r => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onReject}
              style={{
                padding: '5px 12px',
                fontSize: 11,
                background: '#E65100',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Reject
            </button>
            <button
              onClick={onCancelReject}
              style={{
                padding: '5px 12px',
                fontSize: 11,
                background: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function KTMCard({ ktm, onApprove, onReject }) {
  return (
    <div style={{
      padding: 14,
      background: 'white',
      borderRadius: 4,
      border: '1px solid #eee',
      opacity: ktm.approved === false ? 0.5 : 1
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#999' }}>
          Emphasis: {ktm.ai_emphasis}/5
        </span>
        {ktm.approved !== null && (
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: ktm.approved ? '#2E7D32' : '#C62828'
          }}>
            {ktm.approved ? '✓ Approved' : '✗ Rejected'}
          </span>
        )}
      </div>

      <div style={{
        padding: '10px 14px',
        background: BRAND.sageLight,
        borderLeft: `3px solid ${BRAND.sage}`,
        borderRadius: 4,
        fontSize: 14,
        fontStyle: 'italic',
        color: BRAND.teal,
        lineHeight: 1.5
      }}>
        "{ktm.content}"
      </div>

      {ktm.approved === null && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={onApprove}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 500,
              background: BRAND.teal,
              color: BRAND.sageLight,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            ✓ Approve
          </button>
          <button
            onClick={onReject}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              background: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
