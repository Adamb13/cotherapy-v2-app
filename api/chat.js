import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, system } = req.body

    if (!messages || !system) {
      return res.status(400).json({ error: 'Missing messages or system prompt' })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: system,
      messages: messages
    })

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    return res.status(200).json({ content })
  } catch (error) {
    console.error('Anthropic API error:', error)
    return res.status(500).json({ error: 'AI service error', details: error.message })
  }
}
