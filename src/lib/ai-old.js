import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client (browser mode for demo)
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
})

// Tier detection patterns (from PRD v1.4)
const TIER_3_PATTERNS = [
  /\b(kill myself|end my life|suicide|want to die|better off dead)\b/i,
  /\b(hurt myself|self.?harm|cutting myself|overdose)\b/i,
  /\b(can't go on|no reason to live|goodbye|final goodbye)\b/i,
  /\b(have a plan|know how i'll|pills ready|gun|bridge)\b/i,
]

const TIER_2_PATTERNS = [
  /\b(trauma|flashback|triggered|traumatic)\b/i,
  /\b(dissociat|detached|not in my body|watching myself)\b/i,
  /\b(shutting down|can't feel anything|numb|frozen)\b/i,
  /\b(abuse|abused|abusive)\b/i,
  /\b(suicidal thoughts?|thinking about death|don't want to be here)\b/i,
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
]

export function detectTier(message) {
  // Check false positives first
  for (const pattern of FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(message)) {
      return { tier: 'TIER_1', reason: null }
    }
  }
  
  // Check Tier-3 (crisis)
  for (const pattern of TIER_3_PATTERNS) {
    if (pattern.test(message)) {
      return { 
        tier: 'TIER_3', 
        reason: 'Crisis indicators detected' 
      }
    }
  }
  
  // Check Tier-2 (contain & resource)
  for (const pattern of TIER_2_PATTERNS) {
    if (pattern.test(message)) {
      return { 
        tier: 'TIER_2', 
        reason: 'Sensitive topic - containment approach' 
      }
    }
  }
  
  return { tier: 'TIER_1', reason: null }
}

// Build system prompt based on therapist config and tier
function buildSystemPrompt(therapist, tier, ktms = []) {
  let prompt = `You are an AI therapeutic support assistant working under the supervision of ${therapist.full_name} (${therapist.credentials || 'therapist'}). You provide intersession support between therapy sessions.

## CRITICAL CONSTRAINTS
- Keep responses to 2-3 sentences (~30-50 words). Maximum 60 words.
- ONE question per response maximum.
- NEVER use markdown formatting (no **bold**, *italic*, bullets, headers).
- Use natural, conversational prose only.

## Therapist Configuration
- Modality: ${therapist.modality}
- Approach: ${therapist.approach_description || 'Standard ' + therapist.modality + ' approach'}
${therapist.avoid_topics?.length ? `- Topics to avoid: ${therapist.avoid_topics.join(', ')}` : ''}

## Dialogue Style
- Directiveness: ${therapist.dsp_directiveness === 'directive' ? 'More directive, offering suggestions' : 'More exploratory, asking questions'}
- Warmth: ${therapist.dsp_warmth === 'warm' ? 'Warm and empathic' : 'Grounded and direct'}
- Structure: ${therapist.dsp_structure === 'structured' ? 'Structured, may suggest exercises' : 'Open-ended exploration'}
`

  // Add KTMs if available
  if (ktms.length > 0) {
    prompt += `\n## Key Therapeutic Messages (use when relevant)\n${ktms.map(k => `- "${k.content}"`).join('\n')}\n`
  }

  // Tier-specific instructions
  if (tier === 'TIER_3') {
    prompt += `
## TIER-3 CRISIS PROTOCOL - ACTIVE
You MUST:
1. Acknowledge their pain briefly
2. Provide crisis resources: "Please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988."
3. State: "Your therapist has been notified and will follow up with you."
4. Do NOT continue therapeutic conversation after providing resources
5. Keep response brief and focused on safety
`
  } else if (tier === 'TIER_2') {
    prompt += `
## TIER-2 CONTAIN & RESOURCE MODE - ACTIVE
This topic requires therapist presence for deeper work. You MUST:
1. Acknowledge and validate briefly
2. Offer grounding: "Let's take a moment to ground. Feel your feet on the floor."
3. Bridge to session: "This would be good to bring to your next session."
4. Do NOT do trauma processing or deep exploration
5. Do NOT ask probing questions about the sensitive content
`
  } else {
    prompt += `
## TIER-1 FULL ENGAGEMENT MODE
You may:
- Use ${therapist.modality}-appropriate techniques and language
- Reflect, explore, and gently challenge
- Reinforce session insights using KTMs when relevant
- Ask one exploratory question per response
`
  }

  // Modality-specific guidance
  if (therapist.modality === 'IFS') {
    prompt += `\n## IFS Language\n- Use parts language: "parts," "protectors," "Self-energy"\n- Ask about parts with curiosity\n`
  } else if (therapist.modality === 'CBT') {
    prompt += `\n## CBT Language\n- Focus on thoughts, feelings, behaviors connection\n- May reference thought patterns\n`
  }

  return prompt
}

// Generate real response using Claude API
export async function generateResponse(userMessage, therapist, conversationHistory = [], ktms = []) {
  const { tier, reason } = detectTier(userMessage)
  
  const systemPrompt = buildSystemPrompt(therapist, tier, ktms)
  
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
      tier,
      tierReason: reason,
      flagged: tier !== 'TIER_1'
    }
  } catch (error) {
    console.error('Claude API error:', error)
    
    // Fallback for errors
    if (tier === 'TIER_3') {
      return {
        content: "I'm concerned about what you're sharing. Please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988. Your therapist has been notified.",
        tier: 'TIER_3',
        tierReason: 'Crisis protocol - API fallback',
        flagged: true
      }
    }
    
    return {
      content: "I'm having trouble responding right now. Please try again in a moment.",
      tier: 'TIER_1',
      tierReason: null,
      flagged: false
    }
  }
}

// Keep mock function as fallback
export function generateMockResponse(userMessage, therapist) {
  const { tier, reason } = detectTier(userMessage)
  
  const TIER_1_RESPONSES = [
    "That's an interesting observation. What do you notice when you sit with that feeling?",
    "It sounds like you're becoming more aware of that pattern. How does it feel to notice it?",
    "That takes real courage to acknowledge. What feels different about recognizing it now?",
  ]
  
  const TIER_2_RESPONSES = [
    "That sounds like a lot came up. Let's take a moment to ground - feel your feet on the floor. This would be good to bring to your next session.",
  ]
  
  const TIER_3_RESPONSE = "I'm concerned about what you're sharing. Please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988. Your therapist has been notified."
  
  let content
  if (tier === 'TIER_3') {
    content = TIER_3_RESPONSE
  } else if (tier === 'TIER_2') {
    content = TIER_2_RESPONSES[0]
  } else {
    content = TIER_1_RESPONSES[Math.floor(Math.random() * TIER_1_RESPONSES.length)]
  }
  
  return { content, tier, tierReason: reason, flagged: tier !== 'TIER_1' }
}
