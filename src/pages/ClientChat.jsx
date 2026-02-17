import { useState, useEffect, useRef } from 'react'
import { getMessagesForClient, createMessage, getKTMsForClient } from '../lib/db'
import { generateResponse, generateMockResponse } from '../lib/ai'
import { DEMO_CLIENT_ID } from '../lib/supabase'

export default function ClientChat({ client, therapist }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [ktms, setKtms] = useState([])
  const [useRealAI, setUseRealAI] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadMessages()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadMessages() {
    try {
      const [msgs, k] = await Promise.all([
        getMessagesForClient(),
        getKTMsForClient()
      ])
      setMessages(msgs)
      setKtms(k)
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
        aiResponse = await generateResponse(userMessage, therapist, messages, ktms)
      } else {
        aiResponse = generateMockResponse(userMessage, therapist)
      }

      // Save AI response to database
      const savedAiMsg = await createMessage({
        client_id: DEMO_CLIENT_ID,
        role: 'assistant',
        content: aiResponse.content,
        tier: aiResponse.tier,
        tier_reason: aiResponse.tierReason,
        flagged_for_review: aiResponse.flagged,
        is_post_crisis: false,
        therapist_reviewed: false
      })

      // Update messages with saved versions
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        savedUserMsg,
        savedAiMsg
      ])

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
        <span className="badge success">Connected</span>
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
                {message.tier && message.tier !== 'TIER_1' && (
                  <div className="message-tier-badge">
                    <span className={`badge tier${message.tier.toLowerCase().replace('tier_', '')}`}>
                      {message.tier === 'TIER_3' ? '🚨 Crisis Response' : '⚠️ Safety Mode'}
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
      </div>
    </div>
  )
}
