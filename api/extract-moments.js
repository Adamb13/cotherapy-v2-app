import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { notes, systemPrompt } = req.body

    if (!notes || !systemPrompt) {
      return res.status(400).json({ error: 'Missing notes or system prompt' })
    }

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
      return res.status(200).json({ moments: JSON.parse(jsonMatch[0]) })
    }

    return res.status(200).json({ moments: [] })
  } catch (error) {
    console.error('Anthropic API error:', error)
    return res.status(500).json({ error: 'AI service error' })
  }
}
