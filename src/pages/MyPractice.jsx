/**
 * MyPractice.jsx — Review Queue Dashboard (P6)
 *
 * The therapist's home screen: a searchable, sortable client table
 * with summary badges and click-through to client details.
 *
 * Columns: Client | Status | Alerts | Pending Review | Last Session | Next Session | Last Chat | Open
 * Sort order: Alerts (desc) → Pending Review (desc) → Alphabetical
 */

import { useState, useEffect, useMemo } from 'react'
import { getDyadStatus, DYAD_STATES, getAllClientsDashboardStats } from '../lib/db'

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
 * Format next session date with smart display
 * - Today: "Today, 2:00 PM" in blue
 * - Tomorrow: "Tomorrow"
 * - This week: day name ("Thursday")
 * - Beyond: short date ("Mar 31")
 * - Not set: "—"
 */
function formatNextSession(dateStr) {
  if (!dateStr) return { text: '—', isToday: false }

  const date = new Date(dateStr)
  const now = new Date()

  // Reset time for day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  // Calculate days until session
  const daysUntil = Math.floor((sessionDay - today) / (1000 * 60 * 60 * 24))

  if (sessionDay.getTime() === today.getTime()) {
    // Today - show time in blue
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return { text: `Today, ${timeStr}`, isToday: true }
  }

  if (sessionDay.getTime() === tomorrow.getTime()) {
    return { text: 'Tomorrow', isToday: false }
  }

  // This week (2-6 days away) - show day name
  if (daysUntil >= 2 && daysUntil <= 6) {
    return {
      text: date.toLocaleDateString('en-US', { weekday: 'long' }),
      isToday: false
    }
  }

  // Beyond this week - show short date
  return {
    text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isToday: false
  }
}

/**
 * Map dyad status to display status (Active, Pending, Inactive)
 */
function getDisplayStatus(client) {
  const dyadStatus = getDyadStatus(client)

  // Check for post-crisis (still active dyad but chat locked)
  if (client?.dsp_adjustments?.is_post_crisis) {
    return 'active' // Still shows as active, but will have alert
  }

  switch (dyadStatus) {
    case DYAD_STATES.ACTIVE:
      return 'active'
    case DYAD_STATES.INVITED:
    case DYAD_STATES.PENDING_CONFIG:
      return 'pending'
    case DYAD_STATES.PAUSED:
    case DYAD_STATES.TERMINATED:
    default:
      return 'inactive'
  }
}

/**
 * Status badge component
 */
function StatusBadge({ status }) {
  const config = {
    active: { label: 'Active', bg: '#E8F5E9', color: '#2E7D32' },
    pending: { label: 'Pending', bg: '#fff3e0', color: '#e65100' },
    inactive: { label: 'Inactive', bg: '#f0f0f0', color: '#999' }
  }

  const { label, bg, color } = config[status] || config.inactive

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 500,
      background: bg,
      color: color
    }}>
      {label}
    </span>
  )
}

/**
 * Alert count badge component - red pill for alerts
 * Crisis prop makes the badge more prominent (solid red background)
 */
function AlertBadge({ count, isCrisis }) {
  if (!count || count === 0) {
    return <span style={{ color: 'var(--warm-gray)', fontSize: 13 }}>—</span>
  }

  // Crisis alerts get solid red background for maximum visibility
  if (isCrisis) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 24,
        height: 24,
        padding: '0 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 700,
        background: '#C62828',
        color: 'white'
      }}>
        {count}
      </span>
    )
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 22,
      height: 22,
      padding: '0 6px',
      borderRadius: 11,
      fontSize: 12,
      fontWeight: 600,
      background: '#FFEBEE',
      color: '#C62828'
    }}>
      {count}
    </span>
  )
}

/**
 * Pending review badge - shows combined count of unreviewed moments + flagged messages
 * Green checkmark if 0, amber number if >0
 */
function PendingReviewBadge({ count }) {
  // Zero items: green checkmark means "all reviewed"
  if (!count || count === 0) {
    return (
      <span style={{
        color: '#2e7d32',
        fontSize: 14,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        ✓
      </span>
    )
  }

  // >0 items: amber pill — red is reserved for crisis only
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 22,
      height: 22,
      padding: '0 6px',
      borderRadius: 11,
      fontSize: 12,
      fontWeight: 600,
      background: '#fff3e0',
      color: '#e65100'
    }}>
      {count}
    </span>
  )
}

/**
 * Props:
 * - clients: Array of client objects from the database
 * - onSelectClient: Called when therapist clicks "Open" on a client row
 * - onAddClient: Called when therapist clicks "Add Client" button
 * - onEditSettings: Called when therapist clicks to edit their practice settings
 * - onRefresh: Called to refresh client data (future use)
 */
export default function MyPractice({ clients, onSelectClient, onAddClient, onEditSettings, onRefresh }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  // Load dashboard stats for all clients
  useEffect(() => {
    async function loadStats() {
      if (!clients?.length) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const clientIds = clients.map(c => c.id)
        const statsMap = await getAllClientsDashboardStats(clientIds)
        setStats(statsMap)
      } catch (error) {
        console.error('Error loading dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [clients])

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...(clients || [])]

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter(c =>
        c.display_name?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(c => getDisplayStatus(c) === filter)
    }

    // Sort: alert rows first → active → pending → inactive → alphabetical within each group
    // This puts the most actionable clients at the top of the list
    result.sort((a, b) => {
      const aStatus = getDisplayStatus(a)
      const bStatus = getDisplayStatus(b)
      const aHasAlert = (a.dsp_adjustments?.is_post_crisis || (stats[a.id]?.alerts || 0) > 0) ? 1 : 0
      const bHasAlert = (b.dsp_adjustments?.is_post_crisis || (stats[b.id]?.alerts || 0) > 0) ? 1 : 0

      // Alert rows always first (crisis or any alerts)
      if (aHasAlert !== bHasAlert) return bHasAlert - aHasAlert

      // Within alert group: crisis before non-crisis
      if (aHasAlert && bHasAlert) {
        const aIsCrisis = a.dsp_adjustments?.is_post_crisis ? 1 : 0
        const bIsCrisis = b.dsp_adjustments?.is_post_crisis ? 1 : 0
        if (aIsCrisis !== bIsCrisis) return bIsCrisis - aIsCrisis
      }

      // Then by status group: active → pending → inactive
      const statusOrder = { active: 0, pending: 1, inactive: 2 }
      const aOrder = statusOrder[aStatus] ?? 2
      const bOrder = statusOrder[bStatus] ?? 2
      if (aOrder !== bOrder) return aOrder - bOrder

      // Then alphabetical within each group
      return (a.display_name || '').localeCompare(b.display_name || '')
    })

    return result
  }, [clients, search, filter, stats])

  // Count totals for badges
  const totalAlerts = Object.values(stats).reduce((sum, s) => sum + (s?.alerts || 0), 0)
  const totalClients = clients?.length || 0

  // Filter counts
  const activeCount = clients?.filter(c => getDisplayStatus(c) === 'active').length || 0
  const pendingCount = clients?.filter(c => getDisplayStatus(c) === 'pending').length || 0
  const inactiveCount = clients?.filter(c => getDisplayStatus(c) === 'inactive').length || 0

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{
            margin: 0,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 20,
            fontWeight: 500,
            color: '#1a3a3a'
          }}>
            My Practice
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Edit Settings button */}
            <button
              onClick={onEditSettings}
              className="btn secondary small"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 14 }}>⚙️</span>
              <span className="hide-mobile">Settings</span>
            </button>
            {/* Add Client button — brand teal, matches Settings height */}
            <button
              onClick={onAddClient}
              className="btn small"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#1a3a3a',
                color: '#f0f5f2',
                border: 'none'
              }}
            >
              <span>+</span>
              Add Client
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {totalAlerts > 0 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              background: '#C62828',
              color: 'white'
            }}>
              {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''}
            </span>
          )}
          <span style={{ fontSize: 13, color: '#888' }}>
            {totalClients} client{totalClients !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', maxWidth: 300 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'all', label: 'All', count: totalClients },
            { key: 'active', label: 'Active', count: activeCount },
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'inactive', label: 'Inactive', count: inactiveCount }
          ].map(f => {
            const isActive = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={isActive ? '' : 'filter-chip-inactive'}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: isActive ? 'none' : '1px solid #ddd',
                  background: isActive ? '#1a3a3a' : 'white',
                  color: isActive ? '#f0f5f2' : 'var(--charcoal)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400
                }}
              >
                {f.label} ({f.count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Client Table */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--warm-gray)' }}>
          Loading clients...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--warm-gray)' }}>
          {search.trim()
            ? `No clients matching "${search}"`
            : clients?.length === 0
              ? "No clients yet — add your first client to get started"
              : "No clients match the current filter"
          }
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '18%' }} /> {/* Client */}
              <col style={{ width: '9%' }} />  {/* Status */}
              <col style={{ width: '7%' }} />  {/* Alerts */}
              <col className="hide-mobile" style={{ width: '10%' }} /> {/* Pending Review */}
              <col className="hide-mobile" style={{ width: '12%' }} /> {/* Last Session */}
              <col className="hide-mobile" style={{ width: '12%' }} /> {/* Next Session */}
              <col className="hide-mobile" style={{ width: '12%' }} /> {/* Last Chat */}
              <col style={{ width: '10%' }} /> {/* Action */}
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e6e2', background: '#faf9f6' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Client
                </th>
                <th style={{ textAlign: 'left', padding: '14px 12px', fontSize: 11, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status
                </th>
                <th style={{ textAlign: 'center', padding: '14px 8px', fontSize: 11, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Alerts
                </th>
                <th className="hide-mobile" style={{ textAlign: 'center', padding: '14px 8px', fontSize: 11, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Review
                </th>
                <th className="hide-mobile" style={{ textAlign: 'left', padding: '14px 12px', fontSize: 11, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Last Session
                </th>
                <th className="hide-mobile" style={{ textAlign: 'left', padding: '14px 12px', fontSize: 11, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Next Session
                </th>
                <th className="hide-mobile" style={{ textAlign: 'left', padding: '14px 12px', fontSize: 11, fontWeight: 600, color: 'var(--warm-gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Last Chat
                </th>
                <th style={{ textAlign: 'right', padding: '14px 20px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => {
                const clientStats = stats[client.id] || {}
                const status = getDisplayStatus(client)
                const hasAlert = clientStats.alerts > 0
                const isCrisis = client.dsp_adjustments?.is_post_crisis
                const isSandbox = client.display_name?.startsWith('Sandbox —')
                const pendingReviewCount = (clientStats.pendingMoments || 0) + (clientStats.flaggedMessages || 0)
                const nextSession = formatNextSession(client.next_session_date)

                // Crisis rows get prominent red tint, distinct from hover
                const rowBg = isCrisis ? '#FFEBEE' : hasAlert ? '#FFF8F8' : 'transparent'
                const hoverBg = isCrisis ? '#FFCDD2' : '#faf9f6'

                // Per-cell dimming: pending 0.55, inactive 0.4 — Open button stays full brightness
                const cellDim = status === 'pending' ? 0.55 : status === 'inactive' ? 0.4 : 1

                return (
                  <tr
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    style={{
                      borderBottom: '1px solid var(--sand)',
                      cursor: 'pointer',
                      background: rowBg,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = rowBg }}
                  >
                    <td style={{ padding: '16px 20px', opacity: cellDim }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Red crisis dot next to name */}
                        {isCrisis && (
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#E24B4A',
                            flexShrink: 0
                          }} />
                        )}
                        <span style={{
                          fontWeight: isCrisis ? 600 : 500,
                          fontStyle: isSandbox ? 'italic' : 'normal',
                          color: isCrisis ? '#C62828' : isSandbox ? 'var(--warm-gray)' : 'inherit'
                        }}>
                          {client.display_name || 'Unnamed'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px', opacity: cellDim }}>
                      <StatusBadge status={status} />
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'center', opacity: cellDim }}>
                      <AlertBadge count={clientStats.alerts} isCrisis={isCrisis} />
                    </td>
                    <td className="hide-mobile" style={{ padding: '16px 8px', textAlign: 'center', opacity: cellDim }}>
                      <PendingReviewBadge count={pendingReviewCount} />
                    </td>
                    <td className="hide-mobile" style={{ padding: '16px 12px', fontSize: 13, color: 'var(--warm-gray)', opacity: cellDim }}>
                      {clientStats.lastSession
                        ? formatRelativeTime(clientStats.lastSession)
                        : '—'
                      }
                    </td>
                    <td className="hide-mobile" style={{
                      padding: '16px 12px',
                      fontSize: 13,
                      color: nextSession.isToday ? '#1976D2' : 'var(--warm-gray)',
                      fontWeight: nextSession.isToday ? 500 : 400,
                      opacity: cellDim
                    }}>
                      {nextSession.text}
                    </td>
                    <td className="hide-mobile" style={{ padding: '16px 12px', fontSize: 13, color: 'var(--warm-gray)', opacity: cellDim }}>
                      {clientStats.lastChat
                        ? formatRelativeTime(clientStats.lastChat)
                        : '—'
                      }
                    </td>
                    {/* Open button — always full brightness, outlined style */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        className="open-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectClient(client)
                        }}
                        style={{
                          fontSize: 12,
                          padding: '6px 14px',
                          background: 'transparent',
                          color: '#1a3a3a',
                          border: '0.5px solid #7d9a8c',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontFamily: "'DM Sans', sans-serif"
                        }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Responsive CSS + focus/hover states */}
      <style>{`
        /* Search input: sage focus border instead of browser blue */
        .page .form-input:focus {
          border-color: #7d9a8c !important;
          box-shadow: 0 0 0 2px rgba(125, 154, 140, 0.2);
        }

        /* Filter chip hover: light sage tint on unselected chips */
        .filter-chip-inactive:hover {
          background: #f0f5f2 !important;
          border-color: #7d9a8c !important;
        }

        /* Open button hover: sage light fill */
        .open-btn:hover {
          background: #f0f5f2 !important;
        }

        @media (max-width: 768px) {
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
