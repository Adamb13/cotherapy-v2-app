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
  return data || []
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
  return (data || []).reverse()
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
