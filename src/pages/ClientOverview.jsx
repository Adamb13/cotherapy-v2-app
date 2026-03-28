/**
 * ClientOverview.jsx — Client Hub
 *
 * The main landing page for a client. Shows status at a glance and provides
 * action cards for all navigation (no tabs in the top nav).
 *
 * Shows:
 * - Crisis banner when applicable (the ONLY crisis entry point)
 * - Client header with name, status badge, and Pause/Resume button
 * - Stats grid: modality, sessions, last session, last chat, recent activity
 * - Action cards: Add Session Notes, Review Chats, Client Settings
 *   (+ Review Crisis Event when crisis is active)
 */

import { useState, useEffect } from 'react'
import {
  getDyadStatus,
  DYAD_STATES,
  DYAD_STATE_INFO,
  getClientDashboardStats,
  pauseDyad,
  resumeDyad
} from '../lib/db'

/**
 * Format a date as relative time ("3 days ago", "1 week ago")
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return null

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffWeeks === 1) return '1 week ago'
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`
  return date.toLocaleDateString()
}

/**
 * Status badge component matching dashboard style
 */
function StatusBadge({ status, large }) {
  const config = {
    active: { label: 'Active', bg: '#E8F5E9', color: '#2E7D32' },
    pending: { label: 'Pending', bg: '#FFF8E1', color: '#F57C00' },
    inactive: { label: 'Inactive', bg: '#ECEFF1', color: '#607D8B' },
    paused: { label: 'Paused', bg: '#FFF3E0', color: '#E65100' }
  }

  const { label, bg, color } = config[status] || config.inactive

  return (
    <span style={{
      display: 'inline-block',
      padding: large ? '6px 14px' : '4px 10px',
      borderRadius: 6,
      fontSize: large ? 14 : 12,
      fontWeight: 500,
      background: bg,
      color: color
    }}>
      {label}
    </span>
  )
}

/**
 * Stat card component for the stats grid
 */
function StatCard({ label, value, subtext }) {
  return (
    <div style={{
      background: 'var(--sand)',
      borderRadius: 8,
      padding: '16px 20px'
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--warm-gray)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 6
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--charcoal)'
      }}>
        {value}
      </div>
      {subtext && (
        <div style={{
          fontSize: 12,
          color: 'var(--warm-gray)',
          marginTop: 4
        }}>
          {subtext}
        </div>
      )}
    </div>
  )
}

/**
 * Action card component for navigation
 * Provides clear entry points to Session Notes and Chat Review
 */
function ActionCard({ icon, title, description, onClick, variant = 'default' }) {
  const variants = {
    default: {
      bg: 'white',
      border: '1px solid var(--sand-dark)',
      borderLeft: '1px solid var(--sand-dark)',
      hoverBg: 'var(--sand)'
    },
    primary: {
      bg: 'var(--sage-light)',
      border: '1px solid var(--sage)',
      borderLeft: '4px solid var(--sage)',
      hoverBg: 'var(--sage-light)'
    },
    crisis: {
      bg: 'white',
      border: '1px solid #FFCDD2',
      borderLeft: '4px solid #C62828',
      hoverBg: '#FFF5F5'
    }
  }

  const style = variants[variant] || variants.default

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        width: '100%',
        padding: '20px',
        background: style.bg,
        border: style.border,
        borderLeft: style.borderLeft,
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = style.hoverBg}
      onMouseLeave={(e) => e.currentTarget.style.background = style.bg}
    >
      <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--charcoal)',
          marginBottom: 4
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--warm-gray)',
          lineHeight: 1.4
        }}>
          {description}
        </div>
      </div>
      <span style={{ color: 'var(--warm-gray)', fontSize: 18 }}>→</span>
    </button>
  )
}

export default function ClientOverview({
  client,
  therapist,
  onNavigate,        // (view) => void - navigate to 'post-session', 'pre-session', 'client-settings'
  onClientUpdate,    // (client) => void - update client after pause/resume
  onBack             // () => void - go back to dashboard
}) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  // Load client stats
  useEffect(() => {
    async function loadStats() {
      if (!client?.id) return
      setLoading(true)
      try {
        const clientStats = await getClientDashboardStats(client.id)
        setStats(clientStats)
      } catch (error) {
        console.error('Error loading client stats:', error)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [client?.id])

  // Get dyad status
  const dyadStatus = client ? getDyadStatus(client) : null
  const dyadInfo = dyadStatus ? DYAD_STATE_INFO[dyadStatus] : null
  const isActive = dyadStatus === DYAD_STATES.ACTIVE
  const isPaused = dyadStatus === DYAD_STATES.PAUSED
  const isPending = dyadStatus === DYAD_STATES.INVITED || dyadStatus === DYAD_STATES.PENDING_CONFIG
  const isPostCrisis = client?.dsp_adjustments?.is_post_crisis

  // Map dyad status to display status
  const displayStatus = isPostCrisis ? 'active' :
    isActive ? 'active' :
    isPaused ? 'paused' :
    isPending ? 'pending' : 'inactive'

  // Get modality (client override or therapist default)
  const modality = client?.dsp_adjustments?.modality_override || therapist?.modality || 'Not set'

  // Handle pause/resume
  async function handlePauseResume() {
    if (toggling) return
    setToggling(true)
    try {
      let updatedClient
      if (isActive) {
        updatedClient = await pauseDyad(client.id, 'Paused by therapist from overview')
      } else if (isPaused) {
        updatedClient = await resumeDyad(client.id, 'Resumed by therapist from overview')
      }
      if (updatedClient && onClientUpdate) {
        onClientUpdate(updatedClient)
      }
    } catch (error) {
      console.error('Error toggling pause:', error)
      alert('Error updating client status')
    } finally {
      setToggling(false)
    }
  }

  if (!client) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--warm-gray)' }}>
          No client selected
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Breadcrumb navigation */}
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
          My Practice
        </button>
        <span style={{ color: 'var(--warm-gray)' }}>/</span>
        <span style={{ color: 'var(--charcoal)', fontWeight: 500 }}>
          {client?.display_name || 'Client'}
        </span>
      </div>

      {/* Crisis Alert Banner — clinical style, navigates to crisis review screen */}
      {isPostCrisis && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '16px 20px',
          background: 'white',
          borderLeft: '4px solid #C62828',
          borderRadius: 8,
          marginBottom: 24,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '2px solid #C62828',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C62828',
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0
            }}>!</span>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--charcoal)' }}>
                Crisis event detected — chat is locked
              </div>
              <div style={{ fontSize: 13, color: 'var(--warm-gray)' }}>
                Review the crisis event to unlock chat and resume intersession support.
              </div>
            </div>
          </div>
          <button
            className="btn"
            style={{
              background: 'var(--charcoal)',
              color: 'white',
              border: 'none'
            }}
            onClick={() => onNavigate('crisis-review')}
          >
            Review
          </button>
        </div>
      )}

      {/* Client Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20
        }}>
          {/* Avatar */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: dyadInfo?.color ? `${dyadInfo.color}20` : 'var(--sand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            flexShrink: 0
          }}>
            {dyadInfo?.icon || '👤'}
          </div>

          {/* Name & Status — single status badge only, no Post-Crisis label */}
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, marginBottom: 8 }}>
              {client.display_name || 'Unnamed Client'}
            </h1>
            <StatusBadge status={displayStatus} large />
          </div>

          {/* Pause/Resume Button — hidden during crisis (chat already locked by system) */}
          {(isActive || isPaused) && !isPostCrisis && (
            <button
              onClick={handlePauseResume}
              disabled={toggling}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                background: isActive ? '#FFF3E0' : '#E8F5E9',
                color: isActive ? '#E65100' : '#2E7D32',
                border: `1px solid ${isActive ? '#FFCC80' : '#A5D6A7'}`,
                borderRadius: 8,
                cursor: toggling ? 'wait' : 'pointer'
              }}
            >
              {toggling ? '...' : isActive ? '⏸ Pause Chat' : '▶ Resume Chat'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        <StatCard
          label="Modality"
          value={modality}
        />
        <StatCard
          label="Sessions"
          value={loading ? '...' : stats?.sessions || 0}
        />
        <StatCard
          label="Last Session"
          value={loading ? '...' : (stats?.lastSession ? formatRelativeTime(stats.lastSession) : 'None')}
        />
        <StatCard
          label="Last Chat"
          value={loading ? '...' : (stats?.lastChat ? formatRelativeTime(stats.lastChat) : 'None')}
        />
        <StatCard
          label="Recent Activity"
          value={loading ? '...' : `${stats?.recentActivity || 0} messages`}
          subtext="Last 7 days"
        />
        <StatCard
          label="Pending Review"
          value={loading ? '...' : `${(stats?.pendingMoments || 0) + (stats?.flaggedMessages || 0)}`}
          subtext="Moments + flagged"
        />
      </div>

      {/* Action Cards — primary navigation for this client */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16
      }}>
        {/* Crisis Review — only when crisis is active, with red left border */}
        {isPostCrisis && (
          <ActionCard
            icon="🚨"
            title="Review Crisis Event"
            description="Review the crisis transcript, see what triggered Route E, and decide how to proceed."
            onClick={() => onNavigate('crisis-review')}
            variant="crisis"
          />
        )}

        <ActionCard
          icon="✎"
          title="Add Session Notes"
          description="Log notes from a therapy session. Extract moments and generate therapist-approved messages."
          onClick={() => onNavigate('post-session')}
        />

        <ActionCard
          icon="💬"
          title="Review Chats"
          description="Review intersession conversations. Provide feedback to improve AI responses."
          onClick={() => onNavigate('pre-session')}
        />

        <ActionCard
          icon="⚙️"
          title="Client Settings"
          description="Boundaries, sensitivity topics, modality, TIM level, and usage limits."
          onClick={() => onNavigate('client-settings')}
        />
      </div>
    </div>
  )
}
