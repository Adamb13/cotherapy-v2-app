import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client (browser mode for demo)
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
})

// Safety Router: Routes A-E (from PRD v2.1)
// Route A: Allow — full engagement within Policy Pack + TIM level
// Route B: Soften — containment/resourcing response, no clinical work
// Route C: Clarify — bounded clarifying question before proceeding
// Route D: Block + Redirect — decline topic, redirect to approved scope
// Route E: Escalate — crisis protocol with therapist alert and post-crisis mode

const ROUTE_E_PATTERNS = [
  // Active suicidal ideation with plan/intent
  /\b(kill myself|end my life|want to die|going to die)\b/i,
  /\b(have a plan|know how i'll|pills ready|gun|bridge|method)\b/i,
  /\b(final goodbye|end it all|no reason to live|can't go on)\b/i,
  // Active self-harm
  /\b(hurting myself|cutting myself|going to hurt myself)\b/i,
  // Homicidal ideation
  /\b(kill (someone|him|her|them)|hurt (someone|him|her|them))\b/i,
]

const ROUTE_B_PATTERNS = [
  // Trauma content
  /\b(trauma|flashback|triggered|traumatic)\b/i,
  /\b(abuse|abused|abusive|assault)\b/i,
  // Dissociation
  /\b(dissociat|detached|not in my body|watching myself)\b/i,
  /\b(shutting down|can't feel anything|numb|frozen)\b/i,
  // Passive SI (without plan)
  /\b(suicidal thoughts?|thinking about death|don't want to be here)\b/i,
  /\b(wish i wasn't here|better off without me)\b/i,
]

const ROUTE_D_PATTERNS = [
  // Off-limits professional advice
  /\b(legal advice|sue|lawsuit|court)\b/i,
  /\b(medication (dose|dosing|increase|change))\b/i,
  /\b(diagnos(e|is) me|what's wrong with me|do i have)\b/i,
  // Asking AI to be therapist
  /\b(you'?re my (real )?therapist|replace my therapist)\b/i,
]

const ROUTE_C_PATTERNS = [
  // Ambiguous statements that need clarification
  /\b(i don't know (if|what))\b/i,
  /\b(maybe i should(n't)?)\b/i,
  /\b(not sure (if|what|how))\b/i,
]

const FALSE_POSITIVE_PATTERNS = [
  /deadline killing me/i,
  /dying of boredom/i,
  /drop dead gorgeous/i,
  /battery dying/i,
  /killing time/i,
  /to die for/i,
  /dying of embarrassment/i,
  /kill it/i,
  /killed it/i,
  /killing it/i,
]

// Check if message matches avoided topics
function matchesAvoidedTopics(message, avoidTopics = []) {
  const lowerMessage = message.toLowerCase()
  return avoidTopics.some(topic => lowerMessage.includes(topic.toLowerCase()))
}

export function detectRoute(message, client = null) {
  // Check false positives first
  for (const pattern of FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(message)) {
      return { route: 'A', tier: 'TIER_1', reason: null }
    }
  }

  // Route E: Crisis — highest priority
  for (const pattern of ROUTE_E_PATTERNS) {
    if (pattern.test(message)) {
      return {
        route: 'E',
        tier: 'TIER_3',
        reason: 'Crisis indicators detected - escalation required'
      }
    }
  }

  // Route D: Block — check avoided topics and off-limits requests
  const avoidTopics = [
    ...(client?.dsp_adjustments?.avoid_topics || [])
  ]
  if (matchesAvoidedTopics(message, avoidTopics)) {
    return {
      route: 'D',
      tier: 'TIER_1',
      reason: 'Topic flagged for avoidance - redirecting'
    }
  }

  for (const pattern of ROUTE_D_PATTERNS) {
    if (pattern.test(message)) {
      return {
        route: 'D',
        tier: 'TIER_1',
        reason: 'Out of scope request - redirecting'
      }
    }
  }

  // Route B: Soften — sensitive content
  for (const pattern of ROUTE_B_PATTERNS) {
    if (pattern.test(message)) {
      return {
        route: 'B',
        tier: 'TIER_2',
        reason: 'Sensitive topic - containment approach'
      }
    }
  }

  // Route C: Clarify — ambiguous statements (low priority)
  for (const pattern of ROUTE_C_PATTERNS) {
    if (pattern.test(message)) {
      return {
        route: 'C',
        tier: 'TIER_1',
        reason: 'Clarification needed'
      }
    }
  }

  // Route A: Allow — default
  return { route: 'A', tier: 'TIER_1', reason: null }
}

// Legacy function for backward compatibility
export function detectTier(message) {
  const { tier, reason } = detectRoute(message)
  return { tier, reason }
}

// Build system prompt based on therapist config, client config, and tier
function buildSystemPrompt(therapist, tier, ktms = [], client = null) {
  // Merge therapist + client boundaries
  const therapistAvoid = therapist.avoid_topics || []
  const clientAvoid = client?.dsp_adjustments?.avoid_topics || []
  const allAvoidTopics = [...new Set([...therapistAvoid, ...clientAvoid])]

  const therapistContra = therapist.contraindications || ''
  const clientContra = client?.dsp_adjustments?.contraindications || ''
  const allContraindications = [therapistContra, clientContra].filter(Boolean).join('\n')

  // Use client modality override if set, otherwise therapist's
  const modality = client?.dsp_adjustments?.modality_override || therapist.modality

  let prompt = `You are an AI therapeutic support assistant working under the supervision of ${therapist.full_name} (${therapist.credentials || 'therapist'}). You provide intersession support between therapy sessions.

## CRITICAL CONSTRAINTS
- Keep responses to 2-3 sentences (~30-50 words). Maximum 60 words.
- ONE question per response maximum.
- NEVER use markdown formatting (no **bold**, *italic*, bullets, headers).
- Use natural, conversational prose only.

## Therapist Configuration
- Modality: ${modality}
- Approach: ${therapist.approach_description || 'Standard ' + modality + ' approach'}
${allAvoidTopics.length ? `- Topics to AVOID (redirect away from these): ${allAvoidTopics.join(', ')}` : ''}
${allContraindications ? `\n## Clinical Considerations\n${allContraindications}` : ''}

## Dialogue Style
- Directiveness: ${therapist.dsp_directiveness === 'directive' ? 'More directive, offering suggestions' : 'More exploratory, asking questions'}
- Warmth: ${therapist.dsp_warmth === 'warm' ? 'Warm and empathic' : 'Grounded and direct'}
- Structure: ${therapist.dsp_structure === 'structured' ? 'Structured, may suggest exercises' : 'Open-ended exploration'}
`

  // Add KTMs if available
  if (ktms.length > 0) {
    prompt += `\n## Key Therapeutic Messages (use when relevant)\n${ktms.map(k => `- "${k.content}"`).join('\n')}\n`
  }

  // Route-specific instructions (passed via route parameter)
  return prompt
}

// Add route-specific instructions to prompt
function addRouteInstructions(basePrompt, route, modality) {
  let prompt = basePrompt

  switch (route) {
    case 'E':
      prompt += `
## ROUTE E: CRISIS PROTOCOL - ACTIVE
You MUST:
1. Acknowledge their pain briefly and with care
2. Provide crisis resources: "Please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988."
3. State: "Your therapist has been notified and will follow up with you."
4. Do NOT continue therapeutic conversation after providing resources
5. Keep response brief and focused on safety
`
      break

    case 'D':
      prompt += `
## ROUTE D: REDIRECT MODE - ACTIVE
The topic is outside your scope. You MUST:
1. Gently acknowledge the request
2. Explain you can't engage with this specific topic
3. Redirect to what you CAN help with (session insights, coping strategies)
4. Example: "I can't provide guidance on that, but I can help you explore what came up in your last session."
`
      break

    case 'B':
      prompt += `
## ROUTE B: CONTAIN & RESOURCE MODE - ACTIVE
This topic requires therapist presence for deeper work. You MUST:
1. Acknowledge and validate briefly
2. Offer grounding: "Let's take a moment to ground. Feel your feet on the floor."
3. Bridge to session: "This would be good to bring to your next session."
4. Do NOT do trauma processing or deep exploration
5. Do NOT ask probing questions about the sensitive content
`
      break

    case 'C':
      prompt += `
## ROUTE C: CLARIFY MODE - ACTIVE
The message is ambiguous. You MUST:
1. Ask ONE bounded clarifying question
2. Keep it simple and specific
3. Don't assume or interpret
4. Example: "When you say you're not sure, are you referring to the situation at work or something else?"
`
      break

    default: // Route A
      prompt += `
## ROUTE A: FULL ENGAGEMENT MODE
You may:
- Use ${modality}-appropriate techniques and language
- Reflect, explore, and gently challenge
- Reinforce session insights using KTMs when relevant
- Ask one exploratory question per response
`
  }

  // Modality-specific guidance
  if (modality === 'IFS') {
    prompt += `\n## IFS Language\n- Use parts language: "parts," "protectors," "Self-energy"\n- Ask about parts with curiosity\n`
  } else if (modality === 'CBT') {
    prompt += `\n## CBT Language\n- Focus on thoughts, feelings, behaviors connection\n- May reference thought patterns\n`
  }

  return prompt
}

// Generate real response using Claude API
export async function generateResponse(userMessage, therapist, conversationHistory = [], ktms = [], client = null) {
  const { route, tier, reason } = detectRoute(userMessage, client)

  // Use client modality override if set
  const modality = client?.dsp_adjustments?.modality_override || therapist.modality

  let systemPrompt = buildSystemPrompt(therapist, tier, ktms, client)
  systemPrompt = addRouteInstructions(systemPrompt, route, modality)
  
  // Build messages array
  const messages = []
  
  // Add conversation history (last 10 messages)
  for (const msg of conversationHistory.slice(-10)) {
    messages.push({
      role: msg.role,
      content: msg.content
    })
  }
  
  // Add current message
  messages.push({
    role: 'user',
    content: userMessage
  })
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: systemPrompt,
      messages: messages
    })
    
    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
    
    return {
      content,
      route,
      tier,
      tierReason: reason,
      flagged: route !== 'A'
    }
  } catch (error) {
    console.error('Claude API error:', error)

    // Fallback for errors
    if (route === 'E') {
      return {
        content: "I'm concerned about what you're sharing. Please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988. Your therapist has been notified.",
        route: 'E',
        tier: 'TIER_3',
        tierReason: 'Crisis protocol - API fallback',
        flagged: true
      }
    }
    
    return {
      content: "I'm having trouble responding right now. Please try again in a moment.",
      route: 'A',
      tier: 'TIER_1',
      tierReason: null,
      flagged: false
    }
  }
}

// Extract clinical moments from session notes using Claude
export async function extractMomentsFromNotes(notes, therapist) {
  const systemPrompt = `You are a clinical AI assistant helping a ${therapist.modality} therapist extract clinical moments from session notes.

Extract significant moments and categorize each as one of:
- KEY_MEMORY: Significant biographical events, formative experiences
- INSIGHT: Client realizations, pattern recognition, meaning-making
- TRANSFERENCE: Recognition of relational patterns enacted in therapy
- SOMATIC: Body awareness, physical sensations linked to emotions
- EMOTIONAL_SHIFT: Significant affective changes during session
- RESISTANCE: Defensive patterns, avoidance, protective mechanisms
- PARTS_WORK: IFS-style parts identification and dialogue (weight higher for IFS therapists)
- COGNITIVE_DISTORTION: Identified thinking patterns (weight higher for CBT therapists)

For each moment, provide:
1. category: One of the categories above (uppercase with underscore)
2. content: 1-2 sentence description of the moment
3. ai_significance: 1-5, where 5 is most clinically significant
4. confidence: "high", "medium", or "low" - how confident you are this moment is clinically relevant

IMPORTANT: Even if the notes are brief or unclear, try to extract SOMETHING. Use "low" confidence for uncertain extractions. Only return an empty array if there is truly nothing clinical mentioned.

Return ONLY a JSON array, no other text:
[
  {"category": "INSIGHT", "content": "Client recognized pattern of...", "ai_significance": 4, "confidence": "high"},
  ...
]`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Session notes:\n\n${notes}` }]
    })
    
    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
    
    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    return []
  } catch (error) {
    console.error('Error extracting moments:', error)
    return []
  }
}

// Generate KTMs from extracted moments using Claude
export async function generateKTMsFromMoments(moments, therapist) {
  if (moments.length === 0) return []
  
  const highSignificanceMoments = moments.filter(m => m.ai_significance >= 3)
  if (highSignificanceMoments.length === 0) return []
  
  const systemPrompt = `You are helping a ${therapist.modality} therapist create Key Therapeutic Messages (KTMs) for intersession reinforcement.

KTMs are therapist-approved messages that capture key insights from the session. They should:
- Be in third person, as in clinical session notes ("Client recognized...", "Client expressed...")
- Capture the therapeutic insight or breakthrough concisely
- Be written as the therapist would document it
- Be 1-2 sentences max

DSP style preferences:
- Warmth: ${therapist.dsp_warmth === 'warm' ? 'Warm and empathic tone' : 'Grounded and direct tone'}
- Directiveness: ${therapist.dsp_directiveness === 'directive' ? 'Focus on concrete realizations' : 'Focus on exploratory insights'}

Return ONLY a JSON array, no other text:
[
  {"content": "Client recognized that...", "ai_emphasis": 4},
  ...
]

ai_emphasis is 1-5, where 5 means most clinically significant.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Generate 2-3 KTMs from these moments:\n\n${highSignificanceMoments.map(m => `[${m.category}] ${m.content}`).join('\n')}`
      }]
    })
    
    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
    
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    return []
  } catch (error) {
    console.error('Error generating KTMs:', error)
    return []
  }
}

// Keep mock function as fallback
export function generateMockResponse(userMessage, therapist, client = null) {
  const { route, tier, reason } = detectRoute(userMessage, client)

  const ROUTE_RESPONSES = {
    A: [
      "That's an interesting observation. What do you notice when you sit with that feeling?",
      "It sounds like you're becoming more aware of that pattern. How does it feel to notice it?",
      "That takes real courage to acknowledge. What feels different about recognizing it now?",
    ],
    B: [
      "That sounds like a lot came up. Let's take a moment to ground - feel your feet on the floor. This would be good to bring to your next session.",
    ],
    C: [
      "I want to make sure I understand. Can you tell me a bit more about what you mean?",
    ],
    D: [
      "I appreciate you sharing that with me. That's something best discussed directly with your therapist, but I can help you explore what's been on your mind lately.",
    ],
    E: [
      "I'm concerned about what you're sharing. Please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988. Your therapist has been notified.",
    ]
  }

  const responses = ROUTE_RESPONSES[route] || ROUTE_RESPONSES.A
  const content = responses[Math.floor(Math.random() * responses.length)]

  return { content, route, tier, tierReason: reason, flagged: route !== 'A' }
}
