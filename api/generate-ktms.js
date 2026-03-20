import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { moments, systemPrompt } = req.body

    if (!moments || !systemPrompt) {
      return res.status(400).json({ error: 'Missing moments or system prompt' })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Generate 2-3 KTMs from these moments:\n\n${moments.map(m => `[${m.category}] ${m.content}`).join('\n')}`
      }]
    })

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return res.status(200).json({ ktms: JSON.parse(jsonMatch[0]) })
    }

    return res.status(200).json({ ktms: [] })
  } catch (error) {
    console.error('Anthropic API error:', error)
    return res.status(500).json({ error: 'AI service error' })
  }
}
