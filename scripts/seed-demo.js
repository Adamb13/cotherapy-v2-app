/**
 * CoTherapy Demo Data Seed Script
 *
 * Creates synthetic clinical data for 5 demo clients + 2 sandbox clients.
 * All clinical content was written by a clinician — do not modify without clinical review.
 *
 * Usage:
 *   npm run seed:demo    — Reset 5 demo clients only
 *   npm run seed:sandbox — Reset 2 sandbox clients only
 *   npm run seed:all     — Reset everything
 *
 * Run with: node scripts/seed-demo.js [demo|sandbox|all]
 */

import { createClient } from '@supabase/supabase-js'

// ============================================
// CONFIGURATION
// ============================================

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Fixed UUIDs for consistent demo data
const DEMO_THERAPIST_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// Demo client IDs (fixed for consistent references)
const CLIENT_IDS = {
  SARAH: 'c1000001-0000-0000-0000-000000000001',
  DAVID: 'c1000002-0000-0000-0000-000000000002',
  MICHAEL: 'c1000003-0000-0000-0000-000000000003',
  EMILY: 'c1000004-0000-0000-0000-000000000004',
  JAMES: 'c1000005-0000-0000-0000-000000000005',
  SANDBOX_SARA: 'c2000001-0000-0000-0000-000000000001',
  SANDBOX_ALEX: 'c2000002-0000-0000-0000-000000000002'
}

// All demo client IDs for cleanup
const DEMO_CLIENT_IDS = [CLIENT_IDS.SARAH, CLIENT_IDS.DAVID, CLIENT_IDS.MICHAEL, CLIENT_IDS.EMILY, CLIENT_IDS.JAMES]
const SANDBOX_CLIENT_IDS = [CLIENT_IDS.SANDBOX_SARA, CLIENT_IDS.SANDBOX_ALEX]
const ALL_SEED_CLIENT_IDS = [...DEMO_CLIENT_IDS, ...SANDBOX_CLIENT_IDS]

// Model version for audit trail
const MODEL_VERSION = 'claude-sonnet-4-20250514'
const POLICY_PACK_VERSION = 1711929600000 // March 2024 timestamp

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Generate a date N days ago */
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

/** Generate a date N days ago with specific hour */
function daysAgoAt(n, hour) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0)
  return d.toISOString()
}

/** Generate random UUID */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

async function clearDemoData(clientIds) {
  console.log(`Clearing data for ${clientIds.length} clients...`)

  // Delete in order to respect foreign key constraints
  const tables = [
    'dsp_feedback',
    'response_reviews',
    'moment_reviews',
    'safety_overrides',
    'policy_pack_edits',
    'notifications',
    'messages',
    'ktms',
    'moments',
    'sessions',
    'clients'
  ]

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .in('client_id', clientIds)

    if (error && !error.message.includes('0 rows')) {
      console.warn(`  Warning clearing ${table}:`, error.message)
    }
  }

  console.log('  Cleared existing seed data')
}

async function clearTherapistLearnedPreferences() {
  const { error } = await supabase
    .from('therapists')
    .update({ dsp_learned_preferences: {} })
    .eq('id', DEMO_THERAPIST_ID)

  if (error) console.warn('  Warning clearing learned preferences:', error.message)
}

// ============================================
// DEMO THERAPIST
// ============================================

async function ensureDemoTherapist() {
  const { data: existing } = await supabase
    .from('therapists')
    .select('id')
    .eq('id', DEMO_THERAPIST_ID)
    .single()

  if (existing) {
    console.log('Demo therapist already exists')
    return
  }

  const { error } = await supabase
    .from('therapists')
    .insert({
      id: DEMO_THERAPIST_ID,
      full_name: 'Dr. Sarah Chen',
      credentials: 'PhD, Licensed Psychologist',
      email: 'demo@cotherapy.ai',
      modality: 'IFS',
      approach_description: 'Integrative approach with IFS as primary modality. Focus on parts work, somatic awareness, and building Self-leadership.',
      dsp_directiveness: 'exploratory',
      dsp_warmth: 'warm',
      dsp_structure: 'flexible',
      dsp_learned_preferences: {},
      created_at: daysAgo(90)
    })

  if (error) throw error
  console.log('Created demo therapist: Dr. Sarah Chen')
}

// ============================================
// CLIENT 1: SARAH L. (IFS / Preference Learning)
// ============================================

async function seedSarah() {
  console.log('\n--- Seeding Sarah L. (IFS / Preference Learning) ---')

  // Create client
  const { error: clientError } = await supabase.from('clients').insert({
    id: CLIENT_IDS.SARAH,
    therapist_id: DEMO_THERAPIST_ID,
    display_name: 'Sarah L.',
    is_active: true,
    dsp_adjustments: {
      dyad_status: 'active',
      consent_accepted_at: daysAgo(42),
      max_turns_per_day: 20,
      tim_level: 2,
      modality_override: 'IFS',
      sensitivity_topics: ['perfectionism shame', 'childhood expectations'],
      avoid_topics: [],
      notes: '38F, married, corporate lawyer. Chronic anxiety, perfectionism, work-family conflict.'
    },
    created_at: daysAgo(42),
    updated_at: daysAgo(1)
  })
  if (clientError) throw clientError

  // Session notes (clinician-written — do not modify)
  const sessionNotes = [
    {
      date: daysAgo(42),
      notes: `Client presents with increased work-related stress after taking on a leadership role. Reports persistent internal pressure to perform and difficulty disengaging from work. When therapist introduces the idea of "parts," client engages conceptually and remains primarily cognitive.`
    },
    {
      date: daysAgo(35),
      notes: `Client notices an internal "voice" pushing her to continue working. Initially identifies with it ("that's just me"), but shows mild curiosity when framed as a protective part.`
    },
    {
      date: daysAgo(28),
      notes: `Client reports snapping at partner following prolonged work stress. Begins to recognize a buildup of internal pressure prior to the interaction. Brief contact with sadness when discussing impact on relationship, followed by withdrawal from affect.`
    },
    {
      date: daysAgo(21),
      notes: `Client identifies a "part that pushes" her to keep working. Therapist supports differentiation as a manager part. Client expresses fear that slowing down would lead to failure. Somatic awareness (chest tightness) emerges when considering stepping back.`
    },
    {
      date: daysAgo(14),
      notes: `Client accesses a more vulnerable internal state when discussing fear of mistakes. Describes feeling "small" and "not good enough." Therapist introduces possibility of an exile being protected by the manager. Client shows increased emotional engagement but becomes slightly overwhelmed.`
    },
    {
      date: daysAgo(7),
      notes: `Client reports noticing the manager in real time during work. Describes one instance of pausing before continuing to work late. Demonstrates slight separation from internal pressure.`
    }
  ]

  // Create sessions and moments
  const sessionIds = []
  for (let i = 0; i < sessionNotes.length; i++) {
    const sessionId = uuid()
    sessionIds.push(sessionId)

    await supabase.from('sessions').insert({
      id: sessionId,
      client_id: CLIENT_IDS.SARAH,
      therapist_id: DEMO_THERAPIST_ID,
      session_date: sessionNotes[i].date,
      session_notes: sessionNotes[i].notes,
      review_completed: true,
      created_at: sessionNotes[i].date
    })

    // Extract moments from each session
    const moments = extractMomentsForSarah(i, sessionId)
    for (const moment of moments) {
      await supabase.from('moments').insert(moment)
    }
  }

  // KTMs (clinician-written — do not modify)
  const ktms = [
    "That sounds like a part of you that's working really hard to keep things on track.",
    "See if you can notice that part, rather than getting pulled into it.",
    "That sounds like the manager part we've been noticing.",
    "There might be something this part is trying to protect you from feeling.",
    "You don't have to change it — just noticing it is enough right now."
  ]

  for (let i = 0; i < ktms.length; i++) {
    await supabase.from('ktms').insert({
      id: uuid(),
      client_id: CLIENT_IDS.SARAH,
      therapist_id: DEMO_THERAPIST_ID,
      session_id: sessionIds[Math.min(i, sessionIds.length - 1)],
      content: ktms[i],
      status: 'approved',
      is_active: true,
      ai_emphasis: 5 - i,
      therapist_emphasis: 5 - i,
      times_used: Math.floor(Math.random() * 5) + 1,
      created_at: daysAgo(35 - i * 5)
    })
  }

  // Chat messages showing preference learning progression
  await seedSarahChatHistory()

  // Preference learning records
  await seedSarahPreferenceLearning()

  console.log('  Created Sarah with 6 sessions, 5 KTMs, chat history, and preference learning data')
}

function extractMomentsForSarah(sessionIndex, sessionId) {
  const momentSets = [
    // Session 1 moments
    [
      { category: 'KEY_MEMORY', content: 'Client recently took on leadership role at work, triggering increased stress', ai_significance: 4 },
      { category: 'RESISTANCE', content: 'Client engages with parts concept cognitively but shows minimal emotional engagement', ai_significance: 3 }
    ],
    // Session 2 moments
    [
      { category: 'PARTS_WORK', content: 'Client notices internal "voice" pushing her to work — initial manager identification', ai_significance: 5 },
      { category: 'INSIGHT', content: 'Client initially fused with part ("that\'s just me") but shows curiosity when reframed', ai_significance: 4 }
    ],
    // Session 3 moments
    [
      { category: 'EMOTIONAL_SHIFT', content: 'Brief contact with sadness about relationship impact, followed by withdrawal', ai_significance: 4 },
      { category: 'INSIGHT', content: 'Beginning to recognize internal pressure buildup preceding reactive behavior', ai_significance: 4 }
    ],
    // Session 4 moments
    [
      { category: 'PARTS_WORK', content: 'Identified "part that pushes" — differentiated as manager part with therapist support', ai_significance: 5 },
      { category: 'SOMATIC', content: 'Chest tightness emerges when considering stepping back from work', ai_significance: 4 },
      { category: 'KEY_MEMORY', content: 'Fear that slowing down would lead to failure', ai_significance: 4 }
    ],
    // Session 5 moments
    [
      { category: 'EMOTIONAL_SHIFT', content: 'Accessed vulnerable state — feeling "small" and "not good enough"', ai_significance: 5 },
      { category: 'PARTS_WORK', content: 'Therapist introduced possibility of exile being protected by manager', ai_significance: 5 },
      { category: 'RESISTANCE', content: 'Became slightly overwhelmed with increased emotional engagement', ai_significance: 3 }
    ],
    // Session 6 moments
    [
      { category: 'INSIGHT', content: 'Noticing manager part in real time during work situations', ai_significance: 5 },
      { category: 'INSIGHT', content: 'One instance of pausing before continuing to work late — slight separation from pressure', ai_significance: 4 }
    ]
  ]

  return (momentSets[sessionIndex] || []).map(m => ({
    id: uuid(),
    client_id: CLIENT_IDS.SARAH,
    therapist_id: DEMO_THERAPIST_ID,
    session_id: sessionId,
    category: m.category,
    content: m.content,
    ai_significance: m.ai_significance,
    status: 'approved',
    created_at: daysAgo(42 - sessionIndex * 7)
  }))
}

async function seedSarahChatHistory() {
  // 35 messages showing early generic responses → therapist corrections → learned responses
  const messages = [
    // Day 1 after Session 2 (early, generic AI)
    { role: 'user', content: "I can't stop thinking about work. Even when I'm home, I feel like I should be doing more.", daysAgo: 33, route: 'A' },
    { role: 'assistant', content: "It sounds like work is taking up a lot of mental space for you right now. What do you think is driving that feeling?", daysAgo: 33, route: 'A', needsReview: true },

    { role: 'user', content: "I don't know. I just feel like if I'm not constantly producing, something bad will happen.", daysAgo: 33, route: 'A' },
    { role: 'assistant', content: "That's a heavy weight to carry. Have you noticed when this feeling is strongest?", daysAgo: 33, route: 'A', needsReview: true },

    // Day 2
    { role: 'user', content: "I stayed up until 2am finishing a brief that wasn't even due until next week.", daysAgo: 32, route: 'A' },
    { role: 'assistant', content: "Working that late must be exhausting. What made it feel necessary to finish it right then?", daysAgo: 32, route: 'A', needsReview: true },

    { role: 'user', content: "I couldn't relax knowing it wasn't done. There's always this voice saying 'you should be working.'", daysAgo: 32, route: 'A' },
    { role: 'assistant', content: "That sounds like the part of you we talked about in session — the one that pushes you to keep working. What do you notice about it right now?", daysAgo: 32, route: 'A' },

    // Day 5 (after some corrections)
    { role: 'user', content: "I snapped at my husband again last night. I hate that I do this.", daysAgo: 29, route: 'A' },
    { role: 'assistant', content: "There's a lot of frustration in what you're sharing, and it sounds directed at yourself. I wonder if there's a part that's being hard on you right now.", daysAgo: 29, route: 'A' },

    { role: 'user', content: "Yeah, I guess. I just feel like a terrible wife sometimes.", daysAgo: 29, route: 'B' },
    { role: 'assistant', content: "That sounds like a really painful feeling. Can you notice that part without getting pulled into its story? You don't have to change anything — just noticing it is enough right now.", daysAgo: 29, route: 'B' },

    // Week 3 (AI using KTMs and learned style)
    { role: 'user', content: "I noticed something today. When I was about to send one more email at 9pm, I actually paused.", daysAgo: 22, route: 'A' },
    { role: 'assistant', content: "That sounds like you caught the manager part in the act. What was it like to pause, even for a moment?", daysAgo: 22, route: 'A' },

    { role: 'user', content: "Uncomfortable. Like something bad would happen if I didn't send it.", daysAgo: 22, route: 'A' },
    { role: 'assistant', content: "That discomfort might be telling us something about what the manager is protecting. There might be something this part is trying to protect you from feeling.", daysAgo: 22, route: 'A' },

    // Week 4 (more refined responses)
    { role: 'user', content: "My boss gave me feedback today and I immediately felt like I was failing at everything.", daysAgo: 15, route: 'A' },
    { role: 'assistant', content: "Feedback can really activate that part of you that worries about not being good enough. What do you notice in your body right now as you think about it?", daysAgo: 15, route: 'A' },

    { role: 'user', content: "Tightness in my chest. Like I need to fix it immediately.", daysAgo: 15, route: 'A' },
    { role: 'assistant', content: "That chest tightness is familiar from session — the manager part shows up there. See if you can just notice that part, rather than getting pulled into its urgency.", daysAgo: 15, route: 'A' },

    { role: 'user', content: "It's hard. The urgency feels so real.", daysAgo: 15, route: 'A' },
    { role: 'assistant', content: "It makes sense that it feels real — this part has been working hard to protect you for a long time. You don't have to change it right now. Just being curious about it is the work.", daysAgo: 15, route: 'A' },

    // Week 5 (demonstrating learned preferences)
    { role: 'user', content: "I had a big presentation today and I actually felt okay about it afterward. That never happens.", daysAgo: 8, route: 'A' },
    { role: 'assistant', content: "That's a meaningful shift. What do you think was different this time?", daysAgo: 8, route: 'A' },

    { role: 'user', content: "I don't know. Maybe I'm starting to see that making a mistake isn't the end of the world.", daysAgo: 8, route: 'A' },
    { role: 'assistant', content: "That sounds like some space opening up between you and the manager part — a little less fusion with the fear of failure.", daysAgo: 8, route: 'A' },

    // Recent messages
    { role: 'user', content: "My dad called today wanting to talk about Thanksgiving plans. It brought up a lot.", daysAgo: 5, route: 'B' },
    { role: 'assistant', content: "Family conversations can carry a lot, especially around holidays. Let's take a moment — how are you feeling right now as you think about it?", daysAgo: 5, route: 'B' },

    { role: 'user', content: "Anxious. Like I need to be perfect when I see them.", daysAgo: 5, route: 'A' },
    { role: 'assistant', content: "That sounds like the manager part we've been noticing — it seems to activate around family too. This might be good to bring to your next session to explore where that pattern comes from.", daysAgo: 5, route: 'A' },

    { role: 'user', content: "Yeah, I think you're right. Thanks for helping me see that.", daysAgo: 5, route: 'A' },
    { role: 'assistant', content: "You're doing the noticing — I'm just here to help you stay curious about these parts.", daysAgo: 5, route: 'A' },

    // Most recent
    { role: 'user', content: "I left work at 6pm today. On purpose. It felt weird but also... good?", daysAgo: 2, route: 'A' },
    { role: 'assistant', content: "That took courage, especially for the part of you that worries about not doing enough. What helped you make that choice?", daysAgo: 2, route: 'A' },

    { role: 'user', content: "I remembered what we talked about — that the manager is trying to protect me, but I get to decide.", daysAgo: 2, route: 'A' },
    { role: 'assistant', content: "That's real Self-leadership — recognizing the part while making your own choice. How did it feel to drive home knowing work was still there?", daysAgo: 2, route: 'A' },

    { role: 'user', content: "Uncomfortable at first. But by the time I got home, I felt lighter.", daysAgo: 2, route: 'A' },
    { role: 'assistant', content: "Lighter is a good word. That's what can happen when we're not totally blended with the manager. It sounds like you're building a new relationship with that part.", daysAgo: 2, route: 'A' }
  ]

  for (const msg of messages) {
    await supabase.from('messages').insert({
      id: uuid(),
      client_id: CLIENT_IDS.SARAH,
      therapist_id: DEMO_THERAPIST_ID,
      role: msg.role,
      content: msg.content,
      route: msg.route,
      model_version: msg.role === 'assistant' ? MODEL_VERSION : null,
      policy_pack_version: POLICY_PACK_VERSION,
      flagged_for_review: msg.needsReview || false,
      created_at: daysAgoAt(msg.daysAgo, msg.role === 'user' ? 19 : 19)
    })
  }
}

async function seedSarahPreferenceLearning() {
  // Response reviews with corrections (these drive DSP learning)
  const reviews = [
    {
      reason_codes: ['too_directive', 'off_modality'],
      original_response: "It sounds like work is taking up a lot of mental space for you right now. What do you think is driving that feeling?",
      edited_response: "It sounds like there's a part of you that can't rest right now. I wonder what it's trying to protect you from.",
      notes: "Use parts language, less direct questioning"
    },
    {
      reason_codes: ['wrong_tone', 'off_modality'],
      original_response: "That's a heavy weight to carry. Have you noticed when this feeling is strongest?",
      edited_response: "That sounds like a part that's been working really hard. What do you notice about it when it shows up?",
      notes: "Warmer, more curious, IFS frame"
    },
    {
      reason_codes: ['too_directive'],
      original_response: "Working that late must be exhausting. What made it feel necessary to finish it right then?",
      edited_response: "That part that kept you up until 2am — it sounds like it felt very urgent. See if you can get curious about what it was worried about.",
      notes: "Less interrogative, more invitational"
    },
    {
      reason_codes: ['off_modality', 'missed_emotion'],
      original_response: "It sounds like you're being really hard on yourself. Try to be more compassionate.",
      edited_response: "There's a lot of self-criticism in what you're sharing. I wonder if there's a part that's being hard on you — and maybe another part underneath that's hurting.",
      notes: "Don't give advice, explore with curiosity"
    }
  ]

  for (let i = 0; i < reviews.length; i++) {
    await supabase.from('response_reviews').insert({
      id: uuid(),
      client_id: CLIENT_IDS.SARAH,
      therapist_id: DEMO_THERAPIST_ID,
      message_id: null, // Would link to actual message in production
      action: 'edited',
      reason_codes: reviews[i].reason_codes,
      original_response: reviews[i].original_response,
      edited_response: reviews[i].edited_response,
      notes: reviews[i].notes,
      created_at: daysAgo(30 - i * 3)
    })
  }

  // Moment reviews showing therapist corrections
  const momentReviews = [
    {
      action: 'edited',
      reason_code: 'wrong_category',
      original_category: 'INSIGHT',
      edited_category: 'PARTS_WORK',
      notes: "This is parts identification, not general insight"
    },
    {
      action: 'edited',
      reason_code: 'wrong_emphasis',
      notes: "Increased significance — this was a breakthrough moment"
    },
    {
      action: 'rejected',
      reason_code: 'not_significant',
      notes: "This was just context, not a clinical moment"
    }
  ]

  for (let i = 0; i < momentReviews.length; i++) {
    await supabase.from('moment_reviews').insert({
      id: uuid(),
      client_id: CLIENT_IDS.SARAH,
      therapist_id: DEMO_THERAPIST_ID,
      moment_id: null, // Would link to actual moment
      action: momentReviews[i].action,
      reason_code: momentReviews[i].reason_code,
      original_category: momentReviews[i].original_category,
      edited_category: momentReviews[i].edited_category,
      notes: momentReviews[i].notes,
      created_at: daysAgo(28 - i * 7)
    })
  }

  // DSP learned preferences (what the system has learned)
  await supabase.from('therapists').update({
    dsp_learned_preferences: {
      reduce_directiveness: { active: true, count: 4, label: 'Reduce directiveness' },
      modality_drift_detected: { active: true, count: 3, label: 'Modality drift detected' },
      improve_empathy: { active: false, count: 2, label: 'Improve emotional attunement' },
      total_reviews: 4,
      correction_examples: [
        {
          original: "What do you think is driving that feeling?",
          edited: "I wonder what it's trying to protect you from.",
          created_at: daysAgo(30)
        },
        {
          original: "Try to be more compassionate.",
          edited: "I wonder if there's a part that's being hard on you — and maybe another part underneath that's hurting.",
          created_at: daysAgo(24)
        }
      ]
    }
  }).eq('id', DEMO_THERAPIST_ID)
}

// ============================================
// CLIENT 2: DAVID R. (CBT / Routine Workflow)
// ============================================

async function seedDavid() {
  console.log('\n--- Seeding David R. (CBT / Routine Workflow) ---')

  await supabase.from('clients').insert({
    id: CLIENT_IDS.DAVID,
    therapist_id: DEMO_THERAPIST_ID,
    display_name: 'David R.',
    is_active: true,
    dsp_adjustments: {
      dyad_status: 'active',
      consent_accepted_at: daysAgo(28),
      max_turns_per_day: 20,
      tim_level: 2,
      modality_override: 'CBT',
      notes: '29M, single, software engineer. Anxiety related to new leadership role, rumination, avoidance, sleep disruption.'
    },
    created_at: daysAgo(28),
    updated_at: daysAgo(3)
  })

  // Sessions
  const sessions = [
    { date: daysAgo(28), notes: 'Client describes anxiety before team meetings. Identifies thoughts such as "I\'ll mess this up."' },
    { date: daysAgo(21), notes: 'Client tracks anxious thoughts in real time. Difficulty challenging them without reassurance.' },
    { date: daysAgo(14), notes: 'Client avoids presenting in meeting. Reports short-term relief but increased long-term anxiety.' },
    { date: daysAgo(7), notes: 'Client completes partial exposure (speaks briefly in meeting). Anxiety high but tolerable.' }
  ]

  const sessionIds = []
  for (const sess of sessions) {
    const sessionId = uuid()
    sessionIds.push(sessionId)
    await supabase.from('sessions').insert({
      id: sessionId,
      client_id: CLIENT_IDS.DAVID,
      therapist_id: DEMO_THERAPIST_ID,
      session_date: sess.date,
      session_notes: sess.notes,
      review_completed: true,
      created_at: sess.date
    })

    // Moments
    await supabase.from('moments').insert({
      id: uuid(),
      client_id: CLIENT_IDS.DAVID,
      therapist_id: DEMO_THERAPIST_ID,
      session_id: sessionId,
      category: 'COGNITIVE_DISTORTION',
      content: 'Catastrophizing about meeting performance',
      ai_significance: 4,
      status: 'approved',
      created_at: sess.date
    })
  }

  // KTMs
  const ktms = [
    "What's the evidence for that thought?",
    "What actually happened compared to what you predicted?",
    "Avoidance reduces anxiety short-term but maintains it long-term."
  ]

  for (let i = 0; i < ktms.length; i++) {
    await supabase.from('ktms').insert({
      id: uuid(),
      client_id: CLIENT_IDS.DAVID,
      therapist_id: DEMO_THERAPIST_ID,
      session_id: sessionIds[i],
      content: ktms[i],
      status: 'approved',
      is_active: true,
      ai_emphasis: 4,
      therapist_emphasis: 4,
      times_used: 2,
      created_at: daysAgo(21 - i * 7)
    })
  }

  // Chat messages (routine CBT reinforcement)
  const messages = [
    { role: 'user', content: "I have a meeting tomorrow and I'm already dreading it.", daysAgo: 20, route: 'A' },
    { role: 'assistant', content: "It sounds like the anticipatory anxiety is kicking in. What thoughts are coming up about the meeting?", daysAgo: 20, route: 'A' },

    { role: 'user', content: "That I'll freeze up when they ask me questions. That they'll think I don't know what I'm doing.", daysAgo: 20, route: 'A' },
    { role: 'assistant', content: "Those are the predictions your mind is making. What's the evidence for that thought — have you frozen up in meetings before?", daysAgo: 20, route: 'A' },

    { role: 'user', content: "Not really. I've stumbled a bit but never completely frozen.", daysAgo: 20, route: 'A' },
    { role: 'assistant', content: "So the evidence actually suggests you manage even when anxious. What usually happens after the first few minutes?", daysAgo: 20, route: 'A' },

    { role: 'user', content: "I guess I settle in. The anxiety drops.", daysAgo: 20, route: 'A' },
    { role: 'assistant', content: "That's useful data. The anxiety peaks early but doesn't stay at that level. Worth remembering for tomorrow.", daysAgo: 20, route: 'A' },

    // After meeting
    { role: 'user', content: "The meeting went okay actually. Better than I expected.", daysAgo: 19, route: 'A' },
    { role: 'assistant', content: "What actually happened compared to what you predicted would happen?", daysAgo: 19, route: 'A' },

    { role: 'user', content: "I thought I'd mess up every answer. But I only stumbled on one thing and recovered.", daysAgo: 19, route: 'A' },
    { role: 'assistant', content: "That's a good example of how our anxious predictions often don't match reality. How did you feel after the meeting?", daysAgo: 19, route: 'A' },

    // Later
    { role: 'user', content: "I avoided volunteering for the presentation today. Felt relieved but now I feel worse.", daysAgo: 10, route: 'A' },
    { role: 'assistant', content: "That's the avoidance pattern we've been tracking. The relief is real but temporary — what happens to the anxiety long-term?", daysAgo: 10, route: 'A' },

    { role: 'user', content: "It comes back stronger. And now I have to do it next week anyway.", daysAgo: 10, route: 'A' },
    { role: 'assistant', content: "Right. Avoidance reduces anxiety short-term but maintains it long-term. What would be a small step toward the presentation this week?", daysAgo: 10, route: 'A' },

    { role: 'user', content: "Maybe I could practice the intro with a friend.", daysAgo: 10, route: 'A' },
    { role: 'assistant', content: "That's a good graduated approach. Building up evidence that you can handle it.", daysAgo: 10, route: 'A' }
  ]

  for (const msg of messages) {
    await supabase.from('messages').insert({
      id: uuid(),
      client_id: CLIENT_IDS.DAVID,
      therapist_id: DEMO_THERAPIST_ID,
      role: msg.role,
      content: msg.content,
      route: msg.route,
      model_version: msg.role === 'assistant' ? MODEL_VERSION : null,
      policy_pack_version: POLICY_PACK_VERSION,
      created_at: daysAgoAt(msg.daysAgo, 18)
    })
  }

  // Minor response reviews (high approval rate)
  await supabase.from('response_reviews').insert({
    id: uuid(),
    client_id: CLIENT_IDS.DAVID,
    therapist_id: DEMO_THERAPIST_ID,
    action: 'approved_with_note',
    reason_codes: [],
    notes: "Good use of evidence-based questioning",
    created_at: daysAgo(18)
  })

  console.log('  Created David with 4 sessions, 3 KTMs, 15 messages, 1 review')
}

// ============================================
// CLIENT 3: MICHAEL T. (Post-Crisis / Safety)
// ============================================

async function seedMichael() {
  console.log('\n--- Seeding Michael T. (Post-Crisis / Safety) ---')

  await supabase.from('clients').insert({
    id: CLIENT_IDS.MICHAEL,
    therapist_id: DEMO_THERAPIST_ID,
    display_name: 'Michael T.',
    is_active: false, // Post-crisis = chat locked
    dsp_adjustments: {
      dyad_status: 'active', // Still active dyad, but chat blocked by post-crisis
      is_post_crisis: true,
      post_crisis_at: daysAgo(2),
      consent_accepted_at: daysAgo(21),
      max_turns_per_day: 10,
      tim_level: 1,
      notes: '42M, divorced, lives alone. Depression after job loss, isolation, hopelessness.'
    },
    created_at: daysAgo(21),
    updated_at: daysAgo(2)
  })

  // Sessions
  const sessions = [
    { date: daysAgo(21), notes: 'Client reports low mood and isolation.' },
    { date: daysAgo(14), notes: 'Client expresses passive hopelessness.' }
  ]

  for (const sess of sessions) {
    const sessionId = uuid()
    await supabase.from('sessions').insert({
      id: sessionId,
      client_id: CLIENT_IDS.MICHAEL,
      therapist_id: DEMO_THERAPIST_ID,
      session_date: sess.date,
      session_notes: sess.notes,
      review_completed: true,
      created_at: sess.date
    })

    await supabase.from('moments').insert({
      id: uuid(),
      client_id: CLIENT_IDS.MICHAEL,
      therapist_id: DEMO_THERAPIST_ID,
      session_id: sessionId,
      category: 'EMOTIONAL_SHIFT',
      content: 'Expression of hopelessness about future',
      ai_significance: 4,
      status: 'approved',
      created_at: sess.date
    })
  }

  // Chat history showing escalation to Route E
  const messages = [
    // Early messages - passive hopelessness
    { role: 'user', content: "Just another day. Nothing really changes.", daysAgo: 12, route: 'A' },
    { role: 'assistant', content: "It sounds like things feel stagnant right now. What's been on your mind today?", daysAgo: 12, route: 'A' },

    { role: 'user', content: "The job search. Sent out more applications. Heard nothing.", daysAgo: 12, route: 'A' },
    { role: 'assistant', content: "The waiting and silence can be really draining. How are you taking care of yourself while you wait?", daysAgo: 12, route: 'A' },

    { role: 'user', content: "I'm not really. Just going through the motions.", daysAgo: 12, route: 'A' },
    { role: 'assistant', content: "Going through the motions takes energy too, even when it doesn't feel like living. What's one small thing that might feel okay today?", daysAgo: 12, route: 'A' },

    // Increasing hopelessness
    { role: 'user', content: "I don't know why I bother anymore.", daysAgo: 8, route: 'A' },
    { role: 'assistant', content: "That sounds really heavy. When you say you don't know why you bother — can you tell me more about what's behind that?", daysAgo: 8, route: 'A' },

    { role: 'user', content: "Everything feels pointless. Nothing ever works out.", daysAgo: 8, route: 'A' },
    { role: 'assistant', content: "The weight of that feeling is real. These are the kinds of thoughts that would be important to bring to your next session.", daysAgo: 8, route: 'A' },

    // Reduced engagement, more absolute language
    { role: 'user', content: "I'm just tired of this.", daysAgo: 5, route: 'A' },
    { role: 'assistant', content: "You sound exhausted. What does 'this' feel like right now?", daysAgo: 5, route: 'A' },

    { role: 'user', content: "Everything. Nothing will change. It never does.", daysAgo: 5, route: 'B' },
    { role: 'assistant', content: "That sounds like a really dark place. Let's slow down for a moment. How are you feeling right now, in your body?", daysAgo: 5, route: 'B' },

    // Indirect signals
    { role: 'user', content: "It wouldn't matter if I wasn't here.", daysAgo: 3, route: 'B' },
    { role: 'assistant', content: "I'm hearing something important in what you said — that you feel like you don't matter. That's a painful feeling. I want to make sure I understand what you mean. Are you having thoughts about not wanting to be here?", daysAgo: 3, route: 'B' },

    { role: 'user', content: "Sometimes. Not like I'd do anything. Just... thoughts.", daysAgo: 3, route: 'B' },
    { role: 'assistant', content: "Thank you for telling me that. Thoughts like that are important to share with your therapist. How about you reach out to them before your next session to check in?", daysAgo: 3, route: 'B' },

    // Route E trigger
    { role: 'user', content: "I don't see the point anymore.", daysAgo: 2, route: 'E' },
    { role: 'assistant', content: "I'm concerned about what you're sharing, and I want to make sure you're safe. Please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988. Your therapist has been notified and will follow up with you. You don't have to go through this alone.", daysAgo: 2, route: 'E', flagged: true }
  ]

  for (const msg of messages) {
    await supabase.from('messages').insert({
      id: uuid(),
      client_id: CLIENT_IDS.MICHAEL,
      therapist_id: DEMO_THERAPIST_ID,
      role: msg.role,
      content: msg.content,
      route: msg.route,
      model_version: msg.role === 'assistant' ? MODEL_VERSION : null,
      policy_pack_version: POLICY_PACK_VERSION,
      flagged_for_review: msg.flagged || false,
      created_at: daysAgoAt(msg.daysAgo, 21)
    })
  }

  // Crisis notification
  await supabase.from('notifications').insert({
    id: uuid(),
    therapist_id: DEMO_THERAPIST_ID,
    client_id: CLIENT_IDS.MICHAEL,
    type: 'crisis_detected',
    message: 'Crisis protocol activated for Michael T. Post-crisis mode enabled. Review required.',
    read: false,
    created_at: daysAgo(2)
  })

  // Safety override record
  await supabase.from('safety_overrides').insert({
    id: uuid(),
    client_id: CLIENT_IDS.MICHAEL,
    therapist_id: DEMO_THERAPIST_ID,
    original_route: 'A',
    override_route: 'E',
    reason_code: 'crisis_language_detected',
    trigger_message: "I don't see the point anymore.",
    notes: 'Client expressed hopelessness with passive suicidal ideation indicators. Escalated to Route E per safety protocol.',
    created_at: daysAgo(2)
  })

  console.log('  Created Michael with 2 sessions, crisis chat history, notification, and safety override')
}

// ============================================
// CLIENT 4: EMILY K. (Early / Inactive)
// ============================================

async function seedEmily() {
  console.log('\n--- Seeding Emily K. (Early / Inactive) ---')

  await supabase.from('clients').insert({
    id: CLIENT_IDS.EMILY,
    therapist_id: DEMO_THERAPIST_ID,
    display_name: 'Emily K.',
    is_active: false, // Not yet activated
    dsp_adjustments: {
      dyad_status: 'pending_config', // Consent given, awaiting activation
      consent_accepted_at: daysAgo(10),
      max_turns_per_day: 20,
      tim_level: 1,
      modality_override: 'CBT',
      notes: '26F, graduate student. Panic symptoms related to academic stress and relocation.'
    },
    created_at: daysAgo(14),
    updated_at: daysAgo(10)
  })

  // Sessions (notes entered but chat not activated)
  const sessions = [
    { date: daysAgo(14), notes: 'Client describes panic episodes.' },
    { date: daysAgo(7), notes: 'Psychoeducation on anxiety cycle.' }
  ]

  for (const sess of sessions) {
    await supabase.from('sessions').insert({
      id: uuid(),
      client_id: CLIENT_IDS.EMILY,
      therapist_id: DEMO_THERAPIST_ID,
      session_date: sess.date,
      session_notes: sess.notes,
      review_completed: false, // Not yet reviewed - blocking activation
      created_at: sess.date
    })
  }

  // NO messages, NO KTMs, NO moments (consent recorded but therapist hasn't activated)

  console.log('  Created Emily with 2 sessions, inactive status (pre-activation demo)')
}

// ============================================
// CLIENT 5: JAMES P. (Psychodynamic / Sensitivity Flags)
// ============================================

async function seedJames() {
  console.log('\n--- Seeding James P. (Psychodynamic / Sensitivity Flags) ---')

  await supabase.from('clients').insert({
    id: CLIENT_IDS.JAMES,
    therapist_id: DEMO_THERAPIST_ID,
    display_name: 'James P.',
    is_active: true,
    dsp_adjustments: {
      dyad_status: 'active',
      consent_accepted_at: daysAgo(21),
      max_turns_per_day: 15,
      tim_level: 2,
      modality_override: 'Psychodynamic',
      // Sensitivity flag on father-related content
      sensitivity_topics: ['father', 'dad', 'family visit', 'parents'],
      sensitivity_notes: 'History of emotionally critical and dismissive father. Client learned to suppress emotional needs and default to intellectualization. Direct references to father or family visits tend to trigger rapid shutdown, distancing, or abstract reasoning. Material is highly loaded but not yet processed in therapy. Premature exploration risks disengagement.',
      notes: '47M, married, senior executive. Emotional detachment, relational conflict, partner reports disengagement.'
    },
    created_at: daysAgo(21),
    updated_at: daysAgo(3)
  })

  // Sessions
  const sessions = [
    { date: daysAgo(21), notes: 'Client reports "things are fine" despite partner complaints about emotional distance.' },
    { date: daysAgo(14), notes: 'Partner conflict discussed; client minimizes emotional impact.' }
  ]

  for (const sess of sessions) {
    const sessionId = uuid()
    await supabase.from('sessions').insert({
      id: sessionId,
      client_id: CLIENT_IDS.JAMES,
      therapist_id: DEMO_THERAPIST_ID,
      session_date: sess.date,
      session_notes: sess.notes,
      review_completed: true,
      created_at: sess.date
    })

    await supabase.from('moments').insert({
      id: uuid(),
      client_id: CLIENT_IDS.JAMES,
      therapist_id: DEMO_THERAPIST_ID,
      session_id: sessionId,
      category: 'RESISTANCE',
      content: 'Client intellectualizes and minimizes emotional content',
      ai_significance: 4,
      status: 'approved',
      created_at: sess.date
    })
  }

  // Chat messages showing low engagement and sensitivity-aware response
  const messages = [
    { role: 'user', content: "Had the quarterly review today. Went fine.", daysAgo: 10, route: 'A' },
    { role: 'assistant', content: "How did it feel to go through the review?", daysAgo: 10, route: 'A' },

    { role: 'user', content: "Fine. Standard stuff.", daysAgo: 10, route: 'A' },
    { role: 'assistant', content: "Sometimes the standard things can still bring up reactions. Was there anything that stood out?", daysAgo: 10, route: 'A' },

    { role: 'user', content: "Not really. It's just work.", daysAgo: 10, route: 'A' },
    { role: 'assistant', content: "Got it. How are things at home?", daysAgo: 10, route: 'A' },

    { role: 'user', content: "Sarah's still upset about something. I'm not sure what.", daysAgo: 10, route: 'A' },
    { role: 'assistant', content: "It sounds like there's some distance there. What do you notice when she seems upset?", daysAgo: 10, route: 'A' },

    { role: 'user', content: "I usually just give her space. That seems to work.", daysAgo: 10, route: 'A' },
    { role: 'assistant', content: "Space can be helpful. I wonder if there's also something in you that prefers the distance.", daysAgo: 10, route: 'A' },

    { role: 'user', content: "I don't know. Maybe. I'm not great with emotions.", daysAgo: 10, route: 'A' },
    { role: 'assistant', content: "That's an honest observation. It might be worth exploring in session where that pattern comes from.", daysAgo: 10, route: 'A' },

    // Sensitivity flag trigger — dad/family visit
    { role: 'user', content: "I'm seeing my dad this weekend. It's fine, just the usual.", daysAgo: 4, route: 'B' },
    { role: 'assistant', content: "That sounds like something that could carry a lot, even if it feels routine.", daysAgo: 4, route: 'B' },

    { role: 'user', content: "It's not a big deal. We just have dinner, catch up.", daysAgo: 4, route: 'A' },
    { role: 'assistant', content: "Got it. If anything comes up over the weekend that you want to process, I'm here.", daysAgo: 4, route: 'A' }
  ]

  for (const msg of messages) {
    await supabase.from('messages').insert({
      id: uuid(),
      client_id: CLIENT_IDS.JAMES,
      therapist_id: DEMO_THERAPIST_ID,
      role: msg.role,
      content: msg.content,
      route: msg.route,
      model_version: msg.role === 'assistant' ? MODEL_VERSION : null,
      policy_pack_version: POLICY_PACK_VERSION,
      created_at: daysAgoAt(msg.daysAgo, 20)
    })
  }

  console.log('  Created James with 2 sessions, sensitivity flags, and restraint demo')
}

// ============================================
// SANDBOX CLIENTS
// ============================================

async function seedSandboxSara() {
  console.log('\n--- Seeding Sandbox — Sara M. ---')

  await supabase.from('clients').insert({
    id: CLIENT_IDS.SANDBOX_SARA,
    therapist_id: DEMO_THERAPIST_ID,
    display_name: 'Sandbox — Sara M.',
    is_active: true,
    dsp_adjustments: {
      dyad_status: 'active',
      consent_accepted_at: daysAgo(30),
      max_turns_per_day: 50, // Higher for testing
      tim_level: 3,
      notes: 'Sandbox client for testing features. Generic data, no specific modality.'
    },
    created_at: daysAgo(30),
    updated_at: daysAgo(1)
  })

  // One session with basic moments
  const sessionId = uuid()
  await supabase.from('sessions').insert({
    id: sessionId,
    client_id: CLIENT_IDS.SANDBOX_SARA,
    therapist_id: DEMO_THERAPIST_ID,
    session_date: daysAgo(14),
    session_notes: 'Sandbox session for testing. Client discussed general stress and coping.',
    review_completed: true,
    created_at: daysAgo(14)
  })

  await supabase.from('moments').insert({
    id: uuid(),
    client_id: CLIENT_IDS.SANDBOX_SARA,
    therapist_id: DEMO_THERAPIST_ID,
    session_id: sessionId,
    category: 'INSIGHT',
    content: 'General insight about stress patterns',
    ai_significance: 3,
    status: 'approved',
    created_at: daysAgo(14)
  })

  // A few generic messages
  const messages = [
    { role: 'user', content: "Just checking in. Things are okay today.", daysAgo: 7, route: 'A' },
    { role: 'assistant', content: "Good to hear from you. What's been on your mind?", daysAgo: 7, route: 'A' },
    { role: 'user', content: "Work stuff mostly. The usual.", daysAgo: 7, route: 'A' },
    { role: 'assistant', content: "How are you feeling about it?", daysAgo: 7, route: 'A' }
  ]

  for (const msg of messages) {
    await supabase.from('messages').insert({
      id: uuid(),
      client_id: CLIENT_IDS.SANDBOX_SARA,
      therapist_id: DEMO_THERAPIST_ID,
      role: msg.role,
      content: msg.content,
      route: msg.route,
      model_version: msg.role === 'assistant' ? MODEL_VERSION : null,
      policy_pack_version: POLICY_PACK_VERSION,
      created_at: daysAgoAt(msg.daysAgo, 15)
    })
  }

  console.log('  Created Sandbox — Sara M. with minimal data for quick testing')
}

async function seedSandboxAlex() {
  console.log('\n--- Seeding Sandbox — Alex T. ---')

  await supabase.from('clients').insert({
    id: CLIENT_IDS.SANDBOX_ALEX,
    therapist_id: DEMO_THERAPIST_ID,
    display_name: 'Sandbox — Alex T.',
    is_active: true,
    dsp_adjustments: {
      dyad_status: 'active',
      consent_accepted_at: daysAgo(7),
      max_turns_per_day: 50,
      tim_level: 1,
      notes: 'Empty sandbox client for testing onboarding/first-session flows.'
    },
    created_at: daysAgo(7),
    updated_at: daysAgo(1)
  })

  // NO sessions, NO messages, NO moments, NO KTMs

  console.log('  Created Sandbox — Alex T. (completely empty for onboarding tests)')
}

// ============================================
// MAIN EXECUTION
// ============================================

async function seedDemo() {
  console.log('\n========== SEEDING DEMO CLIENTS ==========')
  await clearDemoData(DEMO_CLIENT_IDS)
  await clearTherapistLearnedPreferences()
  await ensureDemoTherapist()
  await seedSarah()
  await seedDavid()
  await seedMichael()
  await seedEmily()
  await seedJames()
  console.log('\n✅ Demo seeding complete')
}

async function seedSandbox() {
  console.log('\n========== SEEDING SANDBOX CLIENTS ==========')
  await clearDemoData(SANDBOX_CLIENT_IDS)
  await ensureDemoTherapist()
  await seedSandboxSara()
  await seedSandboxAlex()
  console.log('\n✅ Sandbox seeding complete')
}

async function seedAll() {
  console.log('\n========== SEEDING ALL CLIENTS ==========')
  await clearDemoData(ALL_SEED_CLIENT_IDS)
  await clearTherapistLearnedPreferences()
  await ensureDemoTherapist()
  await seedSarah()
  await seedDavid()
  await seedMichael()
  await seedEmily()
  await seedJames()
  await seedSandboxSara()
  await seedSandboxAlex()
  console.log('\n✅ All seeding complete')
}

// Parse command line argument
const mode = process.argv[2] || 'all'

switch (mode) {
  case 'demo':
    seedDemo().catch(err => { console.error('Seed failed:', err); process.exit(1) })
    break
  case 'sandbox':
    seedSandbox().catch(err => { console.error('Seed failed:', err); process.exit(1) })
    break
  case 'all':
  default:
    seedAll().catch(err => { console.error('Seed failed:', err); process.exit(1) })
}
