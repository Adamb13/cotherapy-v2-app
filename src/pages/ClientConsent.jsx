import { useState } from 'react'
import { acceptClientConsent } from '../lib/db'

// Informed consent content - covers AI disclosure, supervision, scope, crisis, data
const CONSENT_SECTIONS = [
  {
    title: 'What This Is',
    content: `This is an AI-powered coaching companion designed to support you between therapy sessions. It is NOT a replacement for your therapist or therapy itself. The AI helps you practice skills, reflect on session themes, and stay connected to your therapeutic work.`
  },
  {
    title: 'Therapist Supervision',
    content: `Your therapist supervises all AI interactions. They review conversations, customize the AI's approach to fit your needs, and can see when you might need extra support. The AI reinforces what you work on in sessions - your therapist remains your primary source of clinical guidance.`
  },
  {
    title: 'What the AI Can and Cannot Do',
    content: `The AI CAN: Help you practice coping skills, reflect on insights from therapy, offer supportive coaching between sessions, and remind you of themes from your work together.

The AI CANNOT: Provide therapy, make diagnoses, prescribe treatment, handle emergencies, or replace the judgment of your therapist. For any clinical concerns, please speak directly with your therapist.`
  },
  {
    title: 'Crisis Support',
    content: `If you're experiencing a mental health crisis, the AI will provide crisis resources and alert your therapist. However, the AI is not designed for crisis intervention.

For immediate help:
- 988 Suicide & Crisis Lifeline: Call or text 988
- Crisis Text Line: Text HOME to 741741
- Emergency: Call 911 or go to your nearest ER

Your safety is the priority. If you're in crisis, please use these resources rather than the AI.`
  },
  {
    title: 'Your Data',
    content: `Your conversations are stored securely and shared only with your therapist. This data helps your therapist understand how you're doing between sessions and improve your care. We do not sell your data or share it with third parties for marketing purposes.`
  }
]

export default function ClientConsent({ client, therapist, onConsentAccepted }) {
  const [agreed, setAgreed] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState(null)

  async function handleAccept() {
    if (!agreed) return

    setAccepting(true)
    setError(null)

    try {
      const updatedClient = await acceptClientConsent(client.id)
      onConsentAccepted(updatedClient)
    } catch (err) {
      console.error('Error accepting consent:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>Welcome to CoTherapy</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          Before You Begin
        </h1>
        <p style={{ color: 'var(--warm-gray)', fontSize: 15 }}>
          {therapist?.full_name || 'Your therapist'} has invited you to use AI-powered intersession support.
          Please review the following information carefully.
        </p>
      </div>

      {/* Consent Sections */}
      <div className="flex flex-col gap-16" style={{ marginBottom: 32 }}>
        {CONSENT_SECTIONS.map((section, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--sage-dark)' }}>
              {section.title}
            </h3>
            <p style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: '#555',
              whiteSpace: 'pre-line'
            }}>
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {/* Agreement Checkbox */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 24,
          background: agreed ? '#E8F5E9' : 'var(--sand)',
          border: agreed ? '2px solid #2E7D32' : '2px solid transparent',
          transition: 'all 0.2s'
        }}
      >
        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{
              width: 20,
              height: 20,
              marginTop: 2,
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: 15, lineHeight: 1.5 }}>
            <strong>I understand and agree.</strong> I have read and understand that this is an AI coaching companion,
            not therapy. I understand my therapist supervises the AI, that it cannot handle emergencies,
            and that I should use crisis resources if I'm in immediate distress.
          </span>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: 12,
          background: '#FFEBEE',
          color: '#C62828',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* Accept Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          className="btn primary"
          onClick={handleAccept}
          disabled={!agreed || accepting}
          style={{
            padding: '14px 48px',
            fontSize: 16,
            opacity: agreed ? 1 : 0.5
          }}
        >
          {accepting ? 'Setting up...' : 'Accept & Continue'}
        </button>

        <p style={{
          marginTop: 16,
          fontSize: 12,
          color: 'var(--warm-gray)'
        }}>
          By clicking Accept, you acknowledge you have read and understood the above information.
        </p>
      </div>

      {/* Crisis Footer - always visible */}
      <div style={{
        marginTop: 48,
        padding: 16,
        background: '#FFF8E1',
        borderRadius: 8,
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#F57C00' }}>
          Need immediate support right now?
        </div>
        <div style={{ fontSize: 13, color: '#666' }}>
          <strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988 |
          <strong> Crisis Text Line:</strong> Text HOME to 741741
        </div>
      </div>
    </div>
  )
}
