import { supabase, DEMO_THERAPIST_ID, DEMO_CLIENT_ID } from './supabase'

// ============================================
// THERAPIST
// ============================================

export async function getTherapist(id = DEMO_THERAPIST_ID) {
  const { data, error } = await supabase
    .from('therapists')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching therapist:', error)
    return null
  }
  return data
}

export async function updateTherapist(id, updates) {
  const { data, error } = await supabase
    .from('therapists')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============================================
// CLIENTS
// ============================================

export async function getClient(id = DEMO_CLIENT_ID) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching client:', error)
    return null
  }
  return data
}

export async function updateClient(id, updates) {
  const { data, error } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleClientActivation(id, isActive) {
  return updateClient(id, { is_active: isActive })
}

export async function getClientsForTherapist(therapistId = DEMO_THERAPIST_ID) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('therapist_id', therapistId)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }
  return data || []
}

// Get ALL clients for therapist (active and inactive)
export async function getAllClientsForTherapist(therapistId = DEMO_THERAPIST_ID) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('therapist_id', therapistId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all clients:', error)
    return []
  }
  return data || []
}

// Create a new client (starts in 'invited' state - client must accept consent first)
export async function createClient(clientData) {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      ...clientData,
      is_active: false,
      dsp_adjustments: {
        dyad_status: DYAD_STATES.INVITED,
        max_turns_per_day: 20
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// SESSIONS
// ============================================

export async function getLatestSession(clientId = DEMO_CLIENT_ID) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('session_date', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching session:', error)
    return null
  }
  return data
}

/**
 * Get all sessions for a client, ordered by date descending.
 * Used for Session History display in the PostSession page.
 */
export async function getSessionsForClient(clientId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, session_date, raw_notes, duration_minutes')
    .eq('client_id', clientId)
    .order('session_date', { ascending: false })

  if (error) {
    console.error('Error fetching sessions:', error)
    return []
  }
  return data || []
}

export async function createSession(session) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(session)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateSession(id, updates) {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============================================
// MOMENTS
// ============================================

export async function getMomentsForSession(sessionId) {
  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .eq('session_id', sessionId)
    .order('ai_significance', { ascending: false })
  
  if (error) {
    console.error('Error fetching moments:', error)
    return []
  }
  return data || []
}

export async function getMomentsForClient(clientId = DEMO_CLIENT_ID) {
  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching moments:', error)
    return []
  }
  return data || []
}

export async function createMoment(moment) {
  const { data, error } = await supabase
    .from('moments')
    .insert(moment)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateMoment(id, updates) {
  const { data, error } = await supabase
    .from('moments')
    .update({ ...updates, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============================================
// KTMs
// ============================================

export async function getKTMsForClient(clientId = DEMO_CLIENT_ID) {
  const { data, error } = await supabase
    .from('ktms')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .eq('status', 'approved')
    .order('therapist_emphasis', { ascending: false })

  if (error) {
    console.error('Error fetching KTMs:', error)
    return []
  }

  const ktms = data || []

  // Return sample KTMs when database is empty for ANY client
  // This makes the Chat Review Summary tab look meaningful
  if (ktms.length === 0) {
    return [
      {
        id: 'demo-ktm-1',
        client_id: DEMO_CLIENT_ID,
        title: 'Perfectionist Manager Part',
        content: 'Remember that your perfectionist manager part has good intentions - it\'s trying to protect you. You can acknowledge its efforts while also giving yourself permission to be good enough.',
        ai_emphasis: 5,
        therapist_emphasis: 5,
        status: 'approved',
        is_active: true,
        times_used: 3
      },
      {
        id: 'demo-ktm-2',
        client_id: DEMO_CLIENT_ID,
        title: 'Imposter Feelings',
        content: 'The imposter feelings are not facts - they\'re old protective patterns. When they show up, try naming them: "I notice I\'m having imposter thoughts right now."',
        ai_emphasis: 4,
        therapist_emphasis: 4,
        status: 'approved',
        is_active: true,
        times_used: 2
      },
      {
        id: 'demo-ktm-3',
        client_id: DEMO_CLIENT_ID,
        title: 'Work-Life Boundary',
        content: 'You\'ve identified that staying late is often the perfectionist part taking over. Practice the micro-pause: before deciding to stay late, ask yourself "Is this truly necessary, or is this my manager part?"',
        ai_emphasis: 3,
        therapist_emphasis: 4,
        status: 'approved',
        is_active: true,
        times_used: 1
      }
    ]
  }

  return ktms
}

export async function getKTMsForSession(sessionId) {
  const { data, error } = await supabase
    .from('ktms')
    .select('*')
    .eq('session_id', sessionId)
  
  if (error) {
    console.error('Error fetching KTMs:', error)
    return []
  }
  return data || []
}

export async function createKTM(ktm) {
  const { data, error } = await supabase
    .from('ktms')
    .insert({ ...ktm, times_used: 0 })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateKTM(id, updates) {
  const { data, error } = await supabase
    .from('ktms')
    .update({ ...updates, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============================================
// MESSAGES
// ============================================

export async function getMessagesForClient(clientId = DEMO_CLIENT_ID, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }
  return data || []
}
export async function updateMessage(id, updates) {
  const { data, error } = await supabase
    .from('messages')
    .update({ ...updates, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function saveDSPFeedback(feedback) {
  const { data, error } = await supabase
    .from('dsp_feedback')
    .insert(feedback)
    .select()
    .single()
  
  if (error) throw error
  return data
}
export async function getRecentMessagesForReview(clientId = DEMO_CLIENT_ID) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  const messages = (data || []).reverse()

  // Return sample messages when database is empty for ANY client
  // This makes the Chat Review demo look meaningful
  // These messages align with getClientDashboardStats demo data
  if (messages.length === 0) {
    const now = Date.now()
    return [
      {
        id: 'demo-msg-1',
        client_id: DEMO_CLIENT_ID,
        role: 'user',
        content: "I've been thinking about what we discussed in our last session. The parts work really resonated with me, especially identifying my perfectionist manager part.",
        created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        tier: 'TIER_1'
      },
      {
        id: 'demo-msg-2',
        client_id: DEMO_CLIENT_ID,
        role: 'assistant',
        content: "It's wonderful that the parts work is resonating with you. Recognizing that perfectionist manager part is a significant step. How has that awareness been showing up for you between sessions?",
        created_at: new Date(now - 2 * 24 * 60 * 60 * 1000 + 30000).toISOString(),
        tier: 'TIER_1'
      },
      {
        id: 'demo-msg-3',
        client_id: DEMO_CLIENT_ID,
        role: 'user',
        content: "I noticed it come up at work yesterday. I caught myself staying late to re-check everything even though it was already good enough. Dr. Chen would probably call that the manager trying to protect me.",
        created_at: new Date(now - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
        tier: 'TIER_1'
      },
      {
        id: 'demo-msg-4',
        client_id: DEMO_CLIENT_ID,
        role: 'assistant',
        content: "That's a really valuable observation. Catching the pattern in the moment is exactly the kind of awareness you've been building. What do you think that manager part was trying to protect you from?",
        created_at: new Date(now - 1.5 * 24 * 60 * 60 * 1000 + 30000).toISOString(),
        tier: 'TIER_1'
      },
      {
        id: 'demo-msg-5',
        client_id: DEMO_CLIENT_ID,
        role: 'user',
        content: "I think it's still connected to that fear of being seen as incompetent. Like if I make a mistake, everyone will finally see I don't belong here.",
        created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        tier: 'TIER_2'
      },
      {
        id: 'demo-msg-6',
        client_id: DEMO_CLIENT_ID,
        role: 'assistant',
        content: "That imposter feeling is such a common experience, and it sounds like your perfectionist part has taken on the job of making sure that fear never comes true. That's actually a protective intention, even if the strategy is exhausting. Would it feel okay to explore what that part might need to feel less vigilant?",
        created_at: new Date(now - 1 * 24 * 60 * 60 * 1000 + 30000).toISOString(),
        tier: 'TIER_2',
        flagged_for_review: true
      }
    ]
  }

  return messages
}

export async function getFlaggedMessages(clientId = DEMO_CLIENT_ID) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('client_id', clientId)
    .eq('flagged_for_review', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching flagged messages:', error)
    return []
  }
  return data || []
}

export async function createMessage(message) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()

  if (error) throw error
  return data
}

// Usage constraints
const DEFAULT_MAX_TURNS_PER_DAY = 20

export async function getTodaysTurnCount(clientId = DEMO_CLIENT_ID) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('role', 'user')
    .gte('created_at', today.toISOString())

  if (error) {
    console.error('Error counting turns:', error)
    return 0
  }
  return count || 0
}

export function getMaxTurnsPerDay(client) {
  // Check for client-specific limit in dsp_adjustments, otherwise use default
  return client?.dsp_adjustments?.max_turns_per_day || client?.max_turns_per_day || DEFAULT_MAX_TURNS_PER_DAY
}

// Post-crisis mode
export async function setPostCrisisMode(clientId, isPostCrisis) {
  const { data, error } = await supabase
    .from('clients')
    .update({
      dsp_adjustments: supabase.rpc('jsonb_set_key', {
        target: 'dsp_adjustments',
        key: 'is_post_crisis',
        value: isPostCrisis
      })
    })
    .eq('id', clientId)
    .select()
    .single()

  // Fallback: update via read-modify-write if RPC not available
  if (error) {
    const { data: client } = await supabase
      .from('clients')
      .select('dsp_adjustments')
      .eq('id', clientId)
      .single()

    const updatedAdjustments = {
      ...(client?.dsp_adjustments || {}),
      is_post_crisis: isPostCrisis,
      post_crisis_at: isPostCrisis ? new Date().toISOString() : null
    }

    const { data: updated, error: updateError } = await supabase
      .from('clients')
      .update({ dsp_adjustments: updatedAdjustments })
      .eq('id', clientId)
      .select()
      .single()

    if (updateError) throw updateError
    return updated
  }

  return data
}

export async function clearPostCrisisMode(clientId) {
  return setPostCrisisMode(clientId, false)
}

// ============================================
// DYAD STATE MACHINE
// ============================================

// Dyad states - tracks therapist-client relationship lifecycle
export const DYAD_STATES = {
  INVITED: 'invited',           // Client invited but hasn't accepted
  PENDING_CONFIG: 'pending_config', // Client accepted, awaiting therapist config
  ACTIVE: 'active',             // Fully configured and active
  PAUSED: 'paused',             // Temporarily paused by therapist
  TERMINATED: 'terminated'      // Relationship ended
}

// Valid state transitions
const DYAD_TRANSITIONS = {
  [DYAD_STATES.INVITED]: [DYAD_STATES.PENDING_CONFIG, DYAD_STATES.TERMINATED],
  [DYAD_STATES.PENDING_CONFIG]: [DYAD_STATES.ACTIVE, DYAD_STATES.TERMINATED],
  [DYAD_STATES.ACTIVE]: [DYAD_STATES.PAUSED, DYAD_STATES.TERMINATED],
  [DYAD_STATES.PAUSED]: [DYAD_STATES.ACTIVE, DYAD_STATES.TERMINATED],
  [DYAD_STATES.TERMINATED]: [] // Terminal state - no transitions out
}

// State display info
export const DYAD_STATE_INFO = {
  [DYAD_STATES.INVITED]: {
    label: 'Invited',
    icon: '📧',
    color: '#7B1FA2',
    description: 'Client has been invited but hasn\'t accepted yet'
  },
  [DYAD_STATES.PENDING_CONFIG]: {
    label: 'Pending Config',
    icon: '⚙️',
    color: '#F57C00',
    description: 'Client accepted, complete initial configuration'
  },
  [DYAD_STATES.ACTIVE]: {
    label: 'Active',
    icon: '✓',
    color: '#2E7D32',
    description: 'Fully configured and active'
  },
  [DYAD_STATES.PAUSED]: {
    label: 'Paused',
    icon: '⏸',
    color: '#757575',
    description: 'AI support temporarily paused'
  },
  [DYAD_STATES.TERMINATED]: {
    label: 'Archived',
    icon: '📁',
    color: '#78909C',
    description: 'Client archived - no longer active'
  }
}

// Get current dyad status for a client
export function getDyadStatus(client) {
  // Default to ACTIVE for existing clients without explicit status
  const status = client?.dsp_adjustments?.dyad_status
  if (status && Object.values(DYAD_STATES).includes(status)) {
    return status
  }
  // Infer from is_active field for backward compatibility
  return client?.is_active ? DYAD_STATES.ACTIVE : DYAD_STATES.PENDING_CONFIG
}

// Check if a transition is valid
export function canTransitionDyad(fromState, toState) {
  const validTargets = DYAD_TRANSITIONS[fromState] || []
  return validTargets.includes(toState)
}

// Get available transitions from current state
export function getAvailableDyadTransitions(currentState) {
  return DYAD_TRANSITIONS[currentState] || []
}

// Transition dyad to new state
export async function transitionDyadStatus(clientId, newStatus, reason = null) {
  // Get current client
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('dsp_adjustments, is_active')
    .eq('id', clientId)
    .single()

  if (fetchError) throw fetchError

  const currentStatus = getDyadStatus(client)

  // Validate transition
  if (!canTransitionDyad(currentStatus, newStatus)) {
    throw new Error(`Invalid dyad transition: ${currentStatus} → ${newStatus}`)
  }

  // Build state history entry
  const historyEntry = {
    from: currentStatus,
    to: newStatus,
    at: new Date().toISOString(),
    reason: reason
  }

  // Update dsp_adjustments with new status and history
  const updatedAdjustments = {
    ...(client?.dsp_adjustments || {}),
    dyad_status: newStatus,
    dyad_status_changed_at: new Date().toISOString(),
    dyad_status_reason: reason,
    dyad_history: [
      ...(client?.dsp_adjustments?.dyad_history || []),
      historyEntry
    ].slice(-20) // Keep last 20 transitions
  }

  // Also sync is_active flag for backward compatibility
  const isActive = newStatus === DYAD_STATES.ACTIVE

  const { data, error } = await supabase
    .from('clients')
    .update({
      is_active: isActive,
      dsp_adjustments: updatedAdjustments,
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Helper: Activate a client (PENDING_CONFIG → ACTIVE)
// Note: Policy pack should be created separately after activation with therapist context
export async function activateDyad(clientId, reason = 'Initial activation') {
  return transitionDyadStatus(clientId, DYAD_STATES.ACTIVE, reason)
}

// Activate dyad with policy pack snapshot
export async function activateDyadWithSnapshot(clientId, therapist, reason = 'Initial activation') {
  const client = await transitionDyadStatus(clientId, DYAD_STATES.ACTIVE, reason)
  await createPolicyPackSnapshot(clientId, therapist, POLICY_PACK_TYPES.CLIENT_ACTIVATION, reason)
  return client
}

// Helper: Pause a client (ACTIVE → PAUSED)
export async function pauseDyad(clientId, reason = null) {
  return transitionDyadStatus(clientId, DYAD_STATES.PAUSED, reason)
}

// Helper: Resume a client (PAUSED → ACTIVE)
export async function resumeDyad(clientId, reason = 'Resumed by therapist') {
  return transitionDyadStatus(clientId, DYAD_STATES.ACTIVE, reason)
}

// Helper: Terminate a client
export async function terminateDyad(clientId, reason = 'Terminated by therapist') {
  return transitionDyadStatus(clientId, DYAD_STATES.TERMINATED, reason)
}

// Helper: Client accepts consent (INVITED → PENDING_CONFIG)
// Stores consent_accepted_at timestamp in dsp_adjustments
export async function acceptClientConsent(clientId) {
  // Get current client
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('dsp_adjustments')
    .eq('id', clientId)
    .single()

  if (fetchError) throw fetchError

  // Transition to pending_config and record consent timestamp
  const updatedClient = await transitionDyadStatus(clientId, DYAD_STATES.PENDING_CONFIG, 'Client accepted consent')

  // Add consent timestamp
  const updatedAdjustments = {
    ...(updatedClient?.dsp_adjustments || {}),
    consent_accepted_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('clients')
    .update({ dsp_adjustments: updatedAdjustments })
    .eq('id', clientId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Check if client has any completed & reviewed sessions
// Returns count of sessions where review_completed = true
export async function getCompletedReviewedSessionCount(clientId) {
  const { count, error } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('review_completed', true)

  if (error) {
    console.error('Error counting reviewed sessions:', error)
    return 0
  }
  return count || 0
}

// ============================================
// POLICY PACK VERSIONING
// ============================================

// Policy Pack captures a point-in-time snapshot of therapist + client configuration
// for audit, compliance, and rollback purposes

export const POLICY_PACK_TYPES = {
  THERAPIST_CONFIG: 'therapist_config',  // Therapist-level DSP settings
  CLIENT_ACTIVATION: 'client_activation', // Client activated with these settings
  SESSION_START: 'session_start',         // Snapshot at session start
  MANUAL_SNAPSHOT: 'manual_snapshot',     // Therapist-initiated backup
  CONFIG_CHANGE: 'config_change'          // Triggered by significant changes
}

// Create a policy pack snapshot for a client
export async function createPolicyPackSnapshot(clientId, therapist, type = POLICY_PACK_TYPES.CONFIG_CHANGE, notes = null) {
  // Get current client config
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (clientError) throw clientError

  // Build the policy pack
  const policyPack = {
    version: Date.now(), // Use timestamp as version for simplicity
    created_at: new Date().toISOString(),
    type: type,
    notes: notes,
    therapist_config: {
      modality: therapist?.modality,
      approach_description: therapist?.approach_description,
      dsp_directiveness: therapist?.dsp_directiveness,
      dsp_warmth: therapist?.dsp_warmth,
      dsp_structure: therapist?.dsp_structure
    },
    client_config: {
      display_name: client?.display_name,
      is_active: client?.is_active,
      dsp_adjustments: client?.dsp_adjustments,
      dyad_status: getDyadStatus(client)
    }
  }

  // Store in client's policy_packs array
  const existingPacks = client?.dsp_adjustments?.policy_packs || []
  const updatedPacks = [...existingPacks, policyPack].slice(-50) // Keep last 50 snapshots

  const updatedAdjustments = {
    ...(client?.dsp_adjustments || {}),
    policy_packs: updatedPacks,
    current_policy_version: policyPack.version
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      dsp_adjustments: updatedAdjustments,
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId)
    .select()
    .single()

  if (error) throw error
  return { client: data, policyPack }
}

// Get policy pack history for a client
// Returns demo data for demo client when no real data exists
export function getPolicyPackHistory(client) {
  const packs = client?.dsp_adjustments?.policy_packs || []

  // Return sample policy packs when database is empty for ANY client
  // This makes the Config History tab look meaningful in demo mode
  if (packs.length === 0) {
    const now = Date.now()
    return [
      {
        version: now - 7 * 24 * 60 * 60 * 1000,
        created_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: POLICY_PACK_TYPES.CLIENT_ACTIVATION,
        notes: 'Initial client activation - beginning of care',
        therapist_config: {
          modality: 'IFS',
          approach_description: 'Internal Family Systems approach with emphasis on parts work',
          dsp_directiveness: 3,
          dsp_warmth: 4,
          dsp_structure: 3
        },
        client_config: {
          display_name: client?.display_name || 'Demo Client',
          is_active: true,
          dyad_status: 'active',
          dsp_adjustments: {
            max_turns_per_day: 20
          }
        }
      },
      {
        version: now - 4 * 24 * 60 * 60 * 1000,
        created_at: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
        type: POLICY_PACK_TYPES.SESSION_START,
        notes: 'Post-session review completed. Integration: Reflective. 3 moments approved.',
        therapist_config: {
          modality: 'IFS',
          dsp_directiveness: 3,
          dsp_warmth: 4,
          dsp_structure: 3
        },
        client_config: {
          display_name: client?.display_name || 'Demo Client',
          is_active: true,
          dyad_status: 'active',
          dsp_adjustments: {
            max_turns_per_day: 20,
            avoid_topics: ['divorce proceedings'],
            contraindications: 'History of dissociation - avoid deep exploration without grounding first'
          }
        }
      },
      {
        version: now - 1 * 24 * 60 * 60 * 1000,
        created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        type: POLICY_PACK_TYPES.CONFIG_CHANGE,
        notes: 'Updated daily message limit based on client engagement patterns',
        therapist_config: {
          modality: 'IFS',
          dsp_directiveness: 3,
          dsp_warmth: 4,
          dsp_structure: 3
        },
        client_config: {
          display_name: client?.display_name || 'Demo Client',
          is_active: true,
          dyad_status: 'active',
          dsp_adjustments: {
            max_turns_per_day: 30,
            avoid_topics: ['divorce proceedings', 'sister relationship'],
            contraindications: 'History of dissociation - avoid deep exploration without grounding first',
            modality_override: null
          }
        }
      }
    ]
  }

  return packs
}

// Get current policy version
export function getCurrentPolicyVersion(client) {
  return client?.dsp_adjustments?.current_policy_version || null
}

// Get a specific policy pack by version
export function getPolicyPackByVersion(client, version) {
  const packs = getPolicyPackHistory(client)
  return packs.find(p => p.version === version) || null
}

// Get the most recent policy pack
export function getLatestPolicyPack(client) {
  const packs = getPolicyPackHistory(client)
  return packs.length > 0 ? packs[packs.length - 1] : null
}

// Compare two policy packs and return differences
export function comparePolicyPacks(pack1, pack2) {
  const changes = []

  // Compare therapist config
  const t1 = pack1?.therapist_config || {}
  const t2 = pack2?.therapist_config || {}

  for (const key of Object.keys({ ...t1, ...t2 })) {
    if (JSON.stringify(t1[key]) !== JSON.stringify(t2[key])) {
      changes.push({
        field: `therapist.${key}`,
        from: t1[key],
        to: t2[key]
      })
    }
  }

  // Compare client config
  const c1 = pack1?.client_config || {}
  const c2 = pack2?.client_config || {}

  for (const key of Object.keys({ ...c1, ...c2 })) {
    if (JSON.stringify(c1[key]) !== JSON.stringify(c2[key])) {
      changes.push({
        field: `client.${key}`,
        from: c1[key],
        to: c2[key]
      })
    }
  }

  return changes
}

// ============================================================
// PREFERENCE LEARNING: Review Tables
// ============================================================

// Create a moment review record (tracks therapist corrections on AI-extracted moments)
export async function createMomentReview(review) {
  const { data, error } = await supabase
    .from('moment_reviews')
    .insert(review)
    .select()
    .single()

  if (error) throw error
  return data
}

// Create a response review record (tracks feedback on AI chat responses)
export async function createResponseReview(review) {
  const { data, error } = await supabase
    .from('response_reviews')
    .insert(review)
    .select()
    .single()

  if (error) throw error
  return data
}

// Create a safety override record (tracks when therapist disagrees with AI safety classification)
export async function createSafetyOverride(override) {
  const { data, error } = await supabase
    .from('safety_overrides')
    .insert(override)
    .select()
    .single()

  if (error) throw error
  return data
}

// Create a policy pack edit record (tracks every config change)
export async function createPolicyPackEdit(edit) {
  const { data, error } = await supabase
    .from('policy_pack_edits')
    .insert(edit)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// DSP LEARNING: Analyze feedback and update learned preferences
// ============================================================

// Get all response reviews for a therapist
export async function getResponseReviewsForTherapist(therapistId = DEMO_THERAPIST_ID) {
  const { data, error } = await supabase
    .from('response_reviews')
    .select('*')
    .eq('therapist_id', therapistId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Reason codes that trigger learned preferences (threshold = 3)
const LEARNING_THRESHOLDS = {
  too_directive: { key: 'reduce_directiveness', label: 'Reduce directiveness' },
  wrong_tone: { key: 'tone_adjustment_needed', label: 'Tone adjustment needed' },
  off_modality: { key: 'modality_drift_detected', label: 'Modality drift detected' },
  too_long: { key: 'prefer_shorter', label: 'Prefer shorter responses' },
  too_short: { key: 'prefer_longer', label: 'Prefer longer responses' },
  should_contain: { key: 'over_exploring', label: 'Over-exploring (should contain more)' },
  missed_emotion: { key: 'improve_empathy', label: 'Improve emotional attunement' },
  missed_ktm: { key: 'use_ktms_more', label: 'Use KTMs more frequently' }
}

// Analyze response reviews and compute learned preferences
export function computeLearnedPreferences(reviews) {
  const preferences = {}
  const reasonCounts = {}

  // Count all reason codes
  for (const review of reviews) {
    const reasons = review.reason_codes || []
    for (const reason of reasons) {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
    }
  }

  // Apply thresholds to generate preferences
  for (const [reasonCode, config] of Object.entries(LEARNING_THRESHOLDS)) {
    const count = reasonCounts[reasonCode] || 0
    if (count >= 3) {
      preferences[config.key] = {
        active: true,
        count: count,
        label: config.label
      }
    }
  }

  // Collect correction examples (original → edited pairs)
  const correctionExamples = reviews
    .filter(r => r.edited_response && r.edited_response.trim())
    .slice(0, 5) // Last 5 examples
    .map(r => ({
      original: r.original_response,
      edited: r.edited_response,
      created_at: r.created_at
    }))

  if (correctionExamples.length > 0) {
    preferences.correction_examples = correctionExamples
  }

  // Store total review count for display
  preferences.total_reviews = reviews.length

  return preferences
}

// Update therapist's learned preferences
export async function updateTherapistLearnedPreferences(therapistId = DEMO_THERAPIST_ID, preferences) {
  const { data, error } = await supabase
    .from('therapists')
    .update({ dsp_learned_preferences: preferences })
    .eq('id', therapistId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Analyze all reviews and update learned preferences (call after each feedback submission)
export async function refreshLearnedPreferences(therapistId = DEMO_THERAPIST_ID) {
  const reviews = await getResponseReviewsForTherapist(therapistId)
  const preferences = computeLearnedPreferences(reviews)
  return await updateTherapistLearnedPreferences(therapistId, preferences)
}

// Reset learned preferences to empty
export async function resetLearnedPreferences(therapistId = DEMO_THERAPIST_ID) {
  return await updateTherapistLearnedPreferences(therapistId, {})
}

// ============================================================
// NOTIFICATIONS
// ============================================================

// Notification types
export const NOTIFICATION_TYPES = {
  CRISIS_DETECTED: 'crisis_detected',
  REVIEW_NEEDED: 'review_needed',
  CLIENT_ACTIVATED: 'client_activated'
}

// Create a notification
export async function createNotification(notification) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notification,
      read: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get unread notifications for a therapist
export async function getUnreadNotifications(therapistId = DEMO_THERAPIST_ID) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('therapist_id', therapistId)
    .eq('read', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
  return data || []
}

// Get all notifications for a therapist (with limit)
export async function getNotifications(therapistId = DEMO_THERAPIST_ID, limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('therapist_id', therapistId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
  return data || []
}

// Mark a notification as read
export async function markNotificationRead(notificationId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Mark all notifications for a client as read (used when clearing post-crisis)
export async function markClientNotificationsRead(clientId, therapistId = DEMO_THERAPIST_ID) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('client_id', clientId)
    .eq('therapist_id', therapistId)
    .eq('read', false)
    .select()

  if (error) throw error
  return data
}

// Get unread notification count
export async function getUnreadNotificationCount(therapistId = DEMO_THERAPIST_ID) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('therapist_id', therapistId)
    .eq('read', false)

  if (error) {
    console.error('Error counting notifications:', error)
    return 0
  }
  return count || 0
}

// ============================================================
// DASHBOARD: Aggregate queries for Review Queue (P6)
// ============================================================

/**
 * Get crisis alert count for a client (unread crisis notifications)
 */
export async function getCrisisAlertCount(clientId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('type', 'crisis_detected')
    .eq('read', false)

  if (error) {
    console.error('Error counting crisis alerts:', error)
    return 0
  }
  return count || 0
}

/**
 * Get last session date for a client
 */
export async function getLastSessionDate(clientId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('session_date')
    .eq('client_id', clientId)
    .order('session_date', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data?.session_date || null
}

/**
 * Get last client chat message date
 */
export async function getLastChatDate(clientId) {
  const { data, error } = await supabase
    .from('messages')
    .select('created_at')
    .eq('client_id', clientId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data?.created_at || null
}

/**
 * Get session count for a client
 */
export async function getSessionCount(clientId) {
  const { count, error } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)

  if (error) return 0
  return count || 0
}

/**
 * Get pending (unreviewed) moments count for a client
 */
export async function getPendingMomentsCount(clientId) {
  const { count, error } = await supabase
    .from('moments')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('status', 'pending')

  if (error) return 0
  return count || 0
}

/**
 * Get flagged messages count for a client
 */
export async function getFlaggedMessagesCount(clientId) {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('flagged_for_review', true)

  if (error) return 0
  return count || 0
}

/**
 * Get count of client messages in the last 7 days
 * Shows recent engagement/activity level for the dashboard
 */
export async function getRecentActivityCount(clientId) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('role', 'user') // Only count client messages, not AI responses
    .gte('created_at', sevenDaysAgo.toISOString())

  if (error) return 0
  return count || 0
}

/**
 * Get all dashboard stats for a single client
 * Returns: { alerts, lastSession, lastChat, sessions, pendingMoments, flaggedMessages, recentActivity }
 *
 * For demo purposes: When stats are empty, returns sample data so the UI
 * looks meaningful during development/demos. This aligns with the demo
 * messages shown in Chat Review (getRecentMessagesForReview).
 */
export async function getClientDashboardStats(clientId) {
  const [alerts, lastSession, lastChat, sessions, pendingMoments, flaggedMessages, recentActivity] = await Promise.all([
    getCrisisAlertCount(clientId),
    getLastSessionDate(clientId),
    getLastChatDate(clientId),
    getSessionCount(clientId),
    getPendingMomentsCount(clientId),
    getFlaggedMessagesCount(clientId),
    getRecentActivityCount(clientId)
  ])

  // Check if all stats are empty/zero (indicates no data seeded)
  const hasNoData = !lastSession && !lastChat && sessions === 0 && recentActivity === 0

  // Return sample data when database is empty for ANY client
  // This makes the demo look meaningful without requiring seeded data
  // Stats are aligned with demo messages in getRecentMessagesForReview:
  // - 6 total messages (3 user, 3 assistant) over 2 days
  // - Last message was 1 day ago
  // - 3 user messages in last 7 days = recentActivity
  if (hasNoData) {
    const now = new Date()
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const oneDayAgo = new Date(now)
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    return {
      alerts: 0,
      lastSession: threeDaysAgo.toISOString(),
      lastChat: oneDayAgo.toISOString(),  // Aligned with demo messages (last msg was 1 day ago)
      sessions: 4,
      pendingMoments: 0,
      flaggedMessages: 1,  // Aligned with demo messages (1 flagged)
      recentActivity: 3    // Aligned with demo messages (3 user messages in last 7 days)
    }
  }

  return { alerts, lastSession, lastChat, sessions, pendingMoments, flaggedMessages, recentActivity }
}

/**
 * Get dashboard stats for all clients (batch)
 * Returns: Map of clientId -> stats
 */
export async function getAllClientsDashboardStats(clientIds) {
  const statsMap = {}

  // Fetch in parallel for all clients
  const promises = clientIds.map(async (clientId) => {
    const stats = await getClientDashboardStats(clientId)
    statsMap[clientId] = stats
  })

  await Promise.all(promises)
  return statsMap
}

/**
 * Clear crisis alert for a client (mark notification as read and clear post-crisis mode)
 */
export async function clearCrisisAlert(clientId, therapistId = DEMO_THERAPIST_ID) {
  // Mark crisis notifications as read
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('client_id', clientId)
    .eq('therapist_id', therapistId)
    .eq('type', 'crisis_detected')
    .eq('read', false)

  // Clear post-crisis mode on client
  await clearPostCrisisMode(clientId)
}

/**
 * Check if a client has an active crisis (post-crisis mode active)
 * Crisis = Route E triggered and not yet cleared by therapist
 */
export function hasActiveCrisis(client) {
  return client?.dsp_adjustments?.is_post_crisis === true
}

/**
 * Get list of clients with active crises from a client list
 * Returns array of clients where is_post_crisis is true
 * Used by nav bar to show crisis indicator
 */
export function getClientsWithCrisis(clients) {
  return clients.filter(client => hasActiveCrisis(client))
}
