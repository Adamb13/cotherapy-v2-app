import { useState, useEffect, useRef } from 'react'
import { getMessagesForClient, createMessage, getKTMsForClient, getTodaysTurnCount, getMaxTurnsPerDay, setPostCrisisMode, getDyadStatus, DYAD_STATES, DYAD_STATE_INFO } from '../lib/db'
import { generateResponse, generateMockResponse } from '../lib/ai'
import { DEMO_CLIENT_ID } from '../lib/supabase'

export default function ClientChat({ client, therapist }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [ktms, setKtms] = useState([])
  const [useRealAI, setUseRealAI] = useState(true) // Using real Claude API
  const [turnCount, setTurnCount] = useState(0)
  const [showDebug, setShowDebug] = useState(true) // Demo mode - shows route/tier info
  const maxTurns = getMaxTurnsPerDay(client)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadMessages()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadMessages() {
    try {
      const [msgs, k, turns] = await Promise.all([
        getMessagesForClient(),
        getKTMsForClient(),
        getTodaysTurnCount()
      ])
      setMessages(msgs)
      setKtms(k)
      setTurnCount(turns)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSend() {
    if (!input.trim() || sending) return

    // Check turn limit
    if (turnCount >= maxTurns) {
      alert('You have reached your daily message limit. Your therapist can adjust this if needed.')
      return
    }

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    // Optimistically add user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      client_id: DEMO_CLIENT_ID,
      role: 'user',
      content: userMessage,
      tier: 'TIER_1',
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      // Save user message to database
      const savedUserMsg = await createMessage({
        client_id: DEMO_CLIENT_ID,
        role: 'user',
        content: userMessage,
        tier: 'TIER_1',
        flagged_for_review: false,
        is_post_crisis: false,
        therapist_reviewed: false
      })

      // Generate AI response
      let aiResponse
      if (useRealAI && import.meta.env.VITE_ANTHROPIC_API_KEY) {
        aiResponse = await generateResponse(userMessage, therapist, messages, ktms, client)
      } else {
        aiResponse = generateMockResponse(userMessage, therapist, client)
      }

      // Save AI response to database
      const savedAiMsg = await createMessage({
        client_id: DEMO_CLIENT_ID,
        role: 'assistant',
        content: aiResponse.content,
        tier: aiResponse.tier,
        tier_reason: aiResponse.tierReason,
        // route: aiResponse.route, // Column doesn't exist in DB yet
        flagged_for_review: aiResponse.flagged,
        is_post_crisis: aiResponse.route === 'E',
        therapist_reviewed: false
      })

      // Trigger post-crisis mode if Route E
      if (aiResponse.route === 'E') {
        await setPostCrisisMode(DEMO_CLIENT_ID, true)
        // The UI will update on next render when client prop changes
      }

      // Update messages with saved versions
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        savedUserMsg,
        savedAiMsg
      ])

      // Increment turn count
      setTurnCount(prev => prev + 1)

    } catch (error) {
      console.error('Error sending message:', error)
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
      alert('Error sending message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return <div className="loading">Loading chat...</div>
  }

  // Show post-crisis screen if in post-crisis mode
  if (client?.dsp_adjustments?.is_post_crisis) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <div>
            <div className="chat-header-title">Intersession Support</div>
            <div className="chat-header-subtitle">
              Working with {therapist?.full_name || 'your therapist'}
            </div>
          </div>
          <span className="badge warning">Safety Hold</span>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32
        }}>
          <div className="card" style={{ maxWidth: 480, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💙</div>
            <h3 style={{ marginBottom: 12 }}>Your Therapist Has Been Notified</h3>
            <p style={{ color: 'var(--warm-gray)', marginBottom: 24, lineHeight: 1.6 }}>
              Based on your recent conversation, your therapist wants to check in with you directly.
              Chat will resume after they've connected with you.
            </p>
            <div className="card info" style={{ padding: 16, textAlign: 'left', border: 'none' }}>
              <div style={{ fontWeight: 600, color: 'var(--sage-dark)', marginBottom: 8 }}>
                Need immediate support right now?
              </div>
              <div style={{ fontSize: 13, color: 'var(--sage-dark)', lineHeight: 1.6 }}>
                <strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988<br/>
                <strong>Crisis Text Line:</strong> Text HOME to 741741<br/>
                <strong>Emergency:</strong> Call 911 or go to your nearest ER
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get dyad status for state-based screens
  const dyadStatus = getDyadStatus(client)
  const dyadInfo = DYAD_STATE_INFO[dyadStatus]

  // Show screen based on dyad state
  if (dyadStatus !== DYAD_STATES.ACTIVE) {
    // Determine appropriate message based on state
    const stateScreens = {
      [DYAD_STATES.INVITED]: {
        icon: '📧',
        title: 'Invitation Pending',
        message: 'Your therapist has invited you to use AI intersession support. Accept the invitation to get started.',
        badge: 'Invited'
      },
      [DYAD_STATES.PENDING_CONFIG]: {
        icon: '⚙️',
        title: 'Your AI Support is Being Personalized',
        message: 'Your therapist is configuring your intersession support. You\'ll be notified when it\'s ready.',
        badge: 'Pending Config'
      },
      [DYAD_STATES.PAUSED]: {
        icon: '⏸',
        title: 'Support Temporarily Paused',
        message: 'Your therapist has temporarily paused AI support. This is often done during important treatment transitions. Your therapist will let you know when it resumes.',
        badge: 'Paused'
      },
      [DYAD_STATES.TERMINATED]: {
        icon: '✕',
        title: 'Support Ended',
        message: 'Your intersession AI support has ended. If you believe this is an error, please contact your therapist.',
        badge: 'Ended'
      }
    }

    const screen = stateScreens[dyadStatus] || stateScreens[DYAD_STATES.PENDING_CONFIG]

    return (
      <div className="chat-container">
        <div className="chat-header">
          <div>
            <div className="chat-header-title">Intersession Support</div>
            <div className="chat-header-subtitle">
              Working with {therapist?.full_name || 'your therapist'}
            </div>
          </div>
          <span className="badge warning">{screen.badge}</span>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32
        }}>
          <div className="card" style={{ maxWidth: 480, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{screen.icon}</div>
            <h3 style={{ marginBottom: 12 }}>{screen.title}</h3>
            <p style={{ color: 'var(--warm-gray)', marginBottom: 24, lineHeight: 1.6 }}>
              {screen.message}
            </p>
            <div className="card info" style={{ padding: 16, textAlign: 'left', border: 'none' }}>
              <div style={{ fontWeight: 600, color: 'var(--sage-dark)', marginBottom: 8 }}>
                Need immediate support?
              </div>
              <div style={{ fontSize: 13, color: 'var(--sage-dark)', lineHeight: 1.6 }}>
                <strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988<br/>
                <strong>Crisis Text Line:</strong> Text HOME to 741741<br/>
                <strong>Emergency:</strong> Call 911 or go to your nearest ER
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div>
          <div className="chat-header-title">Intersession Support</div>
          <div className="chat-header-subtitle">
            Working with {therapist?.full_name || 'your therapist'}
          </div>
        </div>
        <div className="flex items-center gap-12">
          <button
            onClick={() => setShowDebug(!showDebug)}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              background: showDebug ? 'var(--warm-gray)' : 'transparent',
              color: showDebug ? 'white' : 'var(--warm-gray)',
              border: '1px solid var(--warm-gray)',
              borderRadius: 12,
              cursor: 'pointer'
            }}
          >
            {showDebug ? '🔧 Debug ON' : '🔧 Debug'}
          </button>
          <span className="badge success">Connected</span>
        </div>
      </div>

      {/* Info Panel */}
      <div className="chat-info-panel">
        <strong>Welcome back, {client?.display_name}.</strong> I'm here to support you between sessions. 
        Remember, for immediate crises, please call 988 or contact your therapist directly.
      </div>

      {/* Messages */}
      <div className="chat-messages">
        <div className="chat-messages-inner">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`message ${message.role} ${message.tier?.toLowerCase()}`}
            >
              <div className="message-bubble">
                {showDebug && message.tier && message.tier !== 'TIER_1' && (
                  <div className="message-tier-badge" style={{
                    background: '#f5f5f5',
                    border: '1px dashed #ccc',
                    borderRadius: 4,
                    padding: '4px 8px',
                    marginBottom: 8,
                    fontSize: 10
                  }}>
                    <span style={{ color: '#666' }}>🔧 DEMO: </span>
                    <span className={`badge tier${message.tier.toLowerCase().replace('tier_', '')}`} style={{ fontSize: 10 }}>
                      {message.tier === 'TIER_3' ? 'Route E - Crisis' : 'Route B - Contain'}
                    </span>
                    <span style={{ color: '#999', marginLeft: 8 }}>
                      (hidden in production)
                    </span>
                  </div>
                )}
                {message.content}
                <div className="message-time">
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {sending && (
            <div className="message assistant">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="chat-input-container">
        {turnCount >= maxTurns ? (
          <div style={{
            padding: '16px 24px',
            textAlign: 'center',
            background: 'var(--sand)',
            borderTop: '1px solid var(--sand-dark)'
          }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Daily limit reached</div>
            <div style={{ fontSize: 13, color: 'var(--warm-gray)' }}>
              You've used all {maxTurns} messages for today. Check back tomorrow or contact your therapist.
            </div>
          </div>
        ) : (
          <>
            <div style={{
              padding: '4px 24px',
              fontSize: 11,
              color: turnCount >= maxTurns - 3 ? 'var(--error)' : 'var(--warm-gray)',
              textAlign: 'right',
              background: 'var(--sand)'
            }}>
              {maxTurns - turnCount} message{maxTurns - turnCount !== 1 ? 's' : ''} remaining today
            </div>
            <div className="chat-input-inner">
              <input
                type="text"
                className="chat-input"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button
                className="btn primary chat-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
