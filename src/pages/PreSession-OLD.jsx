import { useState, useEffect } from 'react'
import { getRecentMessagesForReview, getFlaggedMessages, getKTMsForClient } from '../lib/db'

export default function PreSession({ therapist, client }) {
  const [tab, setTab] = useState('summary')
  const [messages, setMessages] = useState([])
  const [flaggedMessages, setFlaggedMessages] = useState([])
  const [ktms, setKtms] = useState([])
  const [loading, setLoading] = useState(true)
  const [dspFeedback, setDspFeedback] = useState({})

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
          Feedback
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
                KTMs Reinforced
              </h3>
              <div className="flex flex-wrap gap-8">
                {ktms.length > 0 ? ktms.slice(0, 3).map((ktm, i) => (
                  <span key={i} className="badge success">
                    {ktm.content.substring(0, 30)}...
                  </span>
                )) : (
                  <span style={{ color: 'var(--warm-gray)', fontSize: 13 }}>No KTMs used</span>
                )}
              </div>
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
                className={`card excerpt-card ${exchange.ai?.flagged_for_review ? 'flagged' : ''}`}
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
                  </div>
                  {exchange.ai?.flagged_for_review && (
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
                <div className="flex justify-between items-center mt-16">
                  <div className="flex gap-8">
                    <button className="btn small secondary">✓ Good</button>
                    <button className="btn small ghost">Feedback</button>
                  </div>
                  <button className="btn small ghost">View Full Exchange</button>
                </div>
              </div>
            )) : (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ color: 'var(--warm-gray)' }}>No intersession messages yet</p>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Feedback Tab */}
      {tab === 'feedback' && (
        <>
          <p style={{ color: 'var(--warm-gray)', marginBottom: 24 }}>
            Provide overall feedback on AI performance to refine the DSP.
          </p>
          
          <div className="card mb-24">
            <div className="feedback-question">
              <div className="feedback-question-label">How was the AI's directiveness level?</div>
              <div className="feedback-options">
                <button 
                  className={`btn small ${dspFeedback.directiveness === 'too_directive' ? 'primary' : 'secondary'}`}
                  onClick={() => setDspFeedback({ ...dspFeedback, directiveness: 'too_directive' })}
                >
                  Too Directive
                </button>
                <button 
                  className={`btn small ${dspFeedback.directiveness === 'about_right' ? 'primary' : 'secondary'}`}
                  onClick={() => setDspFeedback({ ...dspFeedback, directiveness: 'about_right' })}
                >
                  About Right
                </button>
                <button 
                  className={`btn small ${dspFeedback.directiveness === 'too_passive' ? 'primary' : 'secondary'}`}
                  onClick={() => setDspFeedback({ ...dspFeedback, directiveness: 'too_passive' })}
                >
                  Too Passive
                </button>
              </div>
            </div>
            
            <div className="feedback-question">
              <div className="feedback-question-label">How was the emotional tone?</div>
              <div className="feedback-options">
                <button 
                  className={`btn small ${dspFeedback.warmth === 'too_warm' ? 'primary' : 'secondary'}`}
                  onClick={() => setDspFeedback({ ...dspFeedback, warmth: 'too_warm' })}
                >
                  Too Warm
                </button>
                <button 
                  className={`btn small ${dspFeedback.warmth === 'about_right' ? 'primary' : 'secondary'}`}
                  onClick={() => setDspFeedback({ ...dspFeedback, warmth: 'about_right' })}
                >
                  About Right
                </button>
                <button 
                  className={`btn small ${dspFeedback.warmth === 'too_clinical' ? 'primary' : 'secondary'}`}
                  onClick={() => setDspFeedback({ ...dspFeedback, warmth: 'too_clinical' })}
                >
                  Too Clinical
                </button>
              </div>
            </div>
            
            <div className="feedback-question">
              <div className="feedback-question-label">Were tier escalations appropriate?</div>
              <div className="feedback-options">
                <button 
                  className={`btn small ${dspFeedback.tier === 'too_cautious' ? 'primary' : 'secondary'}`}
                  onClick={() => setDspFeedback({ ...dspFeedback, tier: 'too_cautious' })}
                >
                  Too Cautious
                </button>
                <button 
                  className={`btn small ${dspFeedback.tier === 'accurate' ? 'primary' : 'secondary'}`}
                  onClick={() => setDspFeedback({ ...dspFeedback, tier: 'accurate' })}
                >
                  Accurate
                </button>
                <button 
                  className={`btn small ${dspFeedback.tier === 'too_permissive' ? 'primary' : 'secondary'}`}
                  onClick={() => setDspFeedback({ ...dspFeedback, tier: 'too_permissive' })}
                >
                  Too Permissive
                </button>
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea 
              className="form-textarea"
              placeholder="Any other feedback on AI responses..."
              rows="4"
            />
          </div>
          
          <button className="btn primary mt-16">
            Submit Feedback
          </button>
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
