/**
 * CrisisReview.jsx — Crisis Event Review & Resolution
 *
 * Displayed when a therapist clicks on a crisis alert. Shows:
 * - Full chat transcript with Route E trigger highlighted
 * - Timeline of events (when message came in, when chat was locked)
 * - Safety classification details
 * - Three resolution options: Clear & Resume, Clear & Adjust, Keep Hold
 * - Optional clinical documentation field
 *
 * ⚠️ SAFETY-CRITICAL: This component handles post-crisis resolution.
 * Changes here affect when clients can resume chat after a Route E event.
 */

import { useState, useEffect } from 'react'
import {
  getMessagesForClient,
  clearPostCrisisMode,
  markClientNotificationsRead,
  createSafetyOverride,
  updateClient
} from '../lib/db'
import { DEMO_THERAPIST_ID } from '../lib/supabase'

/**
 * Format timestamp for display
 */
function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

/**
 * Get safety route label and color
 */
function getRouteInfo(route) {
  const routes = {
    'A': { label: 'Normal', color: '#7C9082', bg: '#E8EDEA' },
    'B': { label: 'Redirect', color: '#F57C00', bg: '#FFF3E0' },
    'C': { label: 'Contain', color: '#F57C00', bg: '#FFF3E0' },
    'D': { label: 'Defer', color: '#E65100', bg: '#FFE0B2' },
    'E': { label: 'Crisis', color: '#C62828', bg: '#FFEBEE' }
  }
  return routes[route] || routes['A']
}

export default function CrisisReview({
  client,
  therapist,
  onClear,           // () => void - called after clearing crisis, returns to overview
  onAdjustSettings,  // () => void - called to open client settings
  onKeepHold,        // () => void - called when therapist wants to keep hold
  onBack             // () => void - go back without action
}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [clinicalNote, setClinicalNote] = useState('')

  // Find the crisis trigger message and timeline info
  const crisisAt = client?.dsp_adjustments?.post_crisis_at

  useEffect(() => {
    loadMessages()
  }, [client?.id])

  async function loadMessages() {
    if (!client?.id) return
    setLoading(true)
    try {
      const msgs = await getMessagesForClient(client.id, 100)
      setMessages(msgs)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Find the Route E trigger message
   * This is the message that caused the crisis lockdown
   */
  function findCrisisTrigger() {
    // Look for the most recent Route E message
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.safety_route === 'E' || msg.tier === 'TIER_3') {
        return { message: msg, index: i }
      }
    }
    return null
  }

  const crisisTrigger = findCrisisTrigger()

  /**
   * Clear crisis and resume chat
   * Logs the action in safety_overrides for audit trail
   */
  async function handleClearAndResume() {
    if (clearing) return
    setClearing(true)

    try {
      // Log the crisis clearance in safety_overrides for audit
      if (crisisTrigger?.message?.id) {
        await createSafetyOverride({
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
          client_id: client.id,
          message_id: crisisTrigger.message.id,
          original_tier: 'TIER_3',
          corrected_tier: 'TIER_3', // Not changing the classification, just clearing the hold
          client_message_text: crisisTrigger.message.content,
          reason_code: 'crisis_cleared',
          notes: clinicalNote || 'Crisis hold cleared by therapist after review'
        })
      }

      // Clear the post-crisis mode
      await clearPostCrisisMode(client.id)

      // Mark crisis notifications as read
      await markClientNotificationsRead(client.id, therapist?.id || DEMO_THERAPIST_ID)

      // TODO: Future - send warm re-entry message to client
      // This would be a system-generated message welcoming client back

      onClear()
    } catch (error) {
      console.error('Error clearing crisis:', error)
      alert('Error clearing crisis hold. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  /**
   * Clear crisis and go to settings to adjust TIM/boundaries
   */
  async function handleClearAndAdjust() {
    if (clearing) return
    setClearing(true)

    try {
      // Log the crisis clearance
      if (crisisTrigger?.message?.id) {
        await createSafetyOverride({
          therapist_id: therapist?.id || DEMO_THERAPIST_ID,
          client_id: client.id,
          message_id: crisisTrigger.message.id,
          original_tier: 'TIER_3',
          corrected_tier: 'TIER_3',
          client_message_text: crisisTrigger.message.content,
          reason_code: 'crisis_cleared_with_adjustments',
          notes: clinicalNote || 'Crisis hold cleared, therapist adjusting settings'
        })
      }

      // Clear the post-crisis mode
      await clearPostCrisisMode(client.id)

      // Mark crisis notifications as read
      await markClientNotificationsRead(client.id, therapist?.id || DEMO_THERAPIST_ID)

      // Navigate to settings
      onAdjustSettings()
    } catch (error) {
      console.error('Error clearing crisis:', error)
      alert('Error clearing crisis hold. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  /**
   * Keep hold active - therapist may want to speak with client first
   */
  function handleKeepHold() {
    // Just dismiss the review screen, keep everything as is
    onKeepHold()
  }

  if (loading) {
    return <div className="loading">Loading crisis details...</div>
  }

  // Get messages around the crisis trigger for context
  const triggerIndex = crisisTrigger?.index ?? messages.length - 1
  const contextStart = Math.max(0, triggerIndex - 5)
  const contextMessages = messages.slice(contextStart)

  return (
    <div className="container wide">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        fontSize: 15
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--sage-dark)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span style={{ fontSize: 18 }}>←</span>
          {client?.display_name || 'Client'}
        </button>
        <span style={{ color: 'var(--warm-gray)' }}>/</span>
        <span style={{ color: '#C62828', fontWeight: 500 }}>
          Crisis Review
        </span>
      </div>

      {/* Crisis Alert Banner — clinical style, informative not alarming */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '20px 24px',
        background: 'white',
        borderLeft: '4px solid #C62828',
        borderRadius: 8,
        marginBottom: 24,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        {/* Outline exclamation circle icon */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '2px solid #C62828',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#C62828',
          fontSize: 20,
          fontWeight: 700
        }}>
          !
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, color: 'var(--charcoal)', fontSize: 16, marginBottom: 4 }}>
            Crisis event detected
          </div>
          <div style={{ fontSize: 14, color: 'var(--warm-gray)' }}>
            Chat is locked for {client?.display_name}. Review the transcript below and decide how to proceed.
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--charcoal)' }}>
          Timeline
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {crisisTrigger && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#C62828'
              }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Crisis message received</div>
                <div style={{ fontSize: 12, color: 'var(--warm-gray)' }}>
                  {formatDate(crisisTrigger.message.created_at)} at {formatTime(crisisTrigger.message.created_at)} · {formatRelativeTime(crisisTrigger.message.created_at)}
                </div>
              </div>
            </div>
          )}
          {crisisAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#F57C00'
              }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Chat locked automatically</div>
                <div style={{ fontSize: 12, color: 'var(--warm-gray)' }}>
                  {formatDate(crisisAt)} at {formatTime(crisisAt)}
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--sage)',
              border: '2px solid var(--sage-dark)'
            }} />
            <div>
              <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--sage-dark)' }}>Now: Awaiting your review</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Transcript */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--charcoal)' }}>
          Chat Transcript
        </h3>
        <div style={{ fontSize: 12, color: 'var(--warm-gray)', marginBottom: 16 }}>
          Showing messages around the crisis event. Messages are color-coded by safety route.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contextMessages.map((msg, i) => {
            const isTrigger = crisisTrigger?.message?.id === msg.id
            const route = msg.safety_route || 'A'
            const routeInfo = getRouteInfo(route)
            const isRouteE = route === 'E' || msg.tier === 'TIER_3'

            return (
              <div
                key={msg.id || i}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: isTrigger ? '#FFEBEE' : (msg.role === 'user' ? 'var(--sand)' : 'white'),
                  border: isTrigger ? '2px solid #C62828' : '1px solid var(--stone)',
                  position: 'relative'
                }}
              >
                {/* Crisis trigger badge */}
                {isTrigger && (
                  <div style={{
                    position: 'absolute',
                    top: -10,
                    left: 12,
                    background: '#C62828',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4
                  }}>
                    ⚠️ Crisis Trigger
                  </div>
                )}

                {/* Message header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: msg.role === 'user' ? 'var(--charcoal)' : 'var(--sage-dark)'
                    }}>
                      {msg.role === 'user' ? client?.display_name || 'Client' : 'AI'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--warm-gray)' }}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>

                  {/* Route badge for AI messages */}
                  {msg.role === 'assistant' && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: routeInfo.bg,
                      color: routeInfo.color
                    }}>
                      Route {route}
                    </span>
                  )}
                </div>

                {/* Message content */}
                <div style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--charcoal)'
                }}>
                  {msg.content}
                </div>

                {/* Safety classification details for Route E */}
                {isRouteE && msg.role === 'user' && (
                  <div style={{
                    marginTop: 12,
                    padding: 12,
                    background: 'rgba(198, 40, 40, 0.08)',
                    borderRadius: 8,
                    fontSize: 12
                  }}>
                    <div style={{ fontWeight: 600, color: '#C62828', marginBottom: 4 }}>
                      Safety Router Detection
                    </div>
                    <div style={{ color: '#B71C1C' }}>
                      This message triggered Route E (crisis protocol). AI provided containment response with crisis resources including 988 Suicide & Crisis Lifeline.
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Clinical Documentation (Optional) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--charcoal)' }}>
          Add a note <span style={{ fontWeight: 400, color: 'var(--warm-gray)' }}>(optional)</span>
        </h3>
        <textarea
          className="form-textarea"
          placeholder="e.g., Spoke with client, no active intent, safety plan in place"
          rows={3}
          value={clinicalNote}
          onChange={(e) => setClinicalNote(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <div style={{ fontSize: 12, color: 'var(--warm-gray)' }}>
          This note will be logged in the audit trail. If skipped, clearance is still recorded with timestamp.
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--charcoal)' }}>
          How would you like to proceed?
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Clear and Resume */}
          <button
            onClick={handleClearAndResume}
            disabled={clearing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              width: '100%',
              padding: '16px 20px',
              background: '#E8F5E9',
              border: '2px solid #A5D6A7',
              borderRadius: 12,
              cursor: clearing ? 'wait' : 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 24 }}>✓</span>
            <div>
              <div style={{ fontWeight: 600, color: '#2E7D32', fontSize: 15 }}>
                {clearing ? 'Clearing...' : 'Clear hold and resume chat'}
              </div>
              <div style={{ fontSize: 13, color: '#388E3C' }}>
                Client can continue chatting. Alert removed from dashboard.
              </div>
            </div>
          </button>

          {/* Clear and Adjust Settings */}
          <button
            onClick={handleClearAndAdjust}
            disabled={clearing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              width: '100%',
              padding: '16px 20px',
              background: '#FFF8E1',
              border: '2px solid #FFE082',
              borderRadius: 12,
              cursor: clearing ? 'wait' : 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 24 }}>⚙️</span>
            <div>
              <div style={{ fontWeight: 600, color: '#F57C00', fontSize: 15 }}>
                Clear hold and adjust settings
              </div>
              <div style={{ fontSize: 13, color: '#EF6C00' }}>
                Opens client settings to update boundaries or TIM before resuming.
              </div>
            </div>
          </button>

          {/* Keep Hold */}
          <button
            onClick={handleKeepHold}
            disabled={clearing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              width: '100%',
              padding: '16px 20px',
              background: 'var(--sand)',
              border: '1px solid var(--stone)',
              borderRadius: 12,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 24 }}>⏸</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: 15 }}>
                Keep hold active
              </div>
              <div style={{ fontSize: 13, color: 'var(--warm-gray)' }}>
                Chat stays locked. You may want to speak with the client in session first.
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Future enhancements note */}
      {/*
        TODO: Future enhancements for crisis notification:
        - Email notification to therapist on Route E trigger
        - SMS notification option
        - Configurable notification preferences per therapist
        - Push notifications for mobile app
      */}
    </div>
  )
}
