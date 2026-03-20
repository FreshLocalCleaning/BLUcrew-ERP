import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptNextStep {
  action: string
  due_date: string | null
  owner: string
  priority: 'high' | 'medium' | 'low'
}

export interface PersonalNote {
  note: string
  category: 'birthday' | 'family' | 'hobby' | 'preference' | 'important_date' | 'other'
}

export interface ProjectIntel {
  detail: string
  category: 'timeline' | 'scope' | 'budget' | 'competition' | 'decision_maker' | 'blocker' | 'opportunity'
}

export interface KeyDate {
  description: string
  date: string
  source: string
}

export interface TranscriptAnalysis {
  summary: string
  touch_type: 'call' | 'meeting' | 'site_visit' | 'email' | 'text' | 'video_call'
  next_steps: TranscriptNextStep[]
  personal_notes: PersonalNote[]
  project_intel: ProjectIntel[]
  client_notes: string
  key_dates: KeyDate[]
  follow_up_date: string | null
  sentiment: 'positive' | 'neutral' | 'cautious' | 'negative'
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a CRM assistant for BLU Crew, a post-construction cleaning company. Analyze this conversation transcript and extract structured data.

Return ONLY a valid JSON object with these fields:
{
  "summary": "2-3 sentence concise summary of what was discussed",
  "touch_type": "call" or "meeting" or "site_visit" or "email" or "text" or "video_call",
  "next_steps": [{ "action": "what needs to happen", "due_date": "YYYY-MM-DD or null", "owner": "who should do this", "priority": "high" or "medium" or "low" }],
  "personal_notes": [{ "note": "personal detail about the contact", "category": "birthday" or "family" or "hobby" or "preference" or "important_date" or "other" }],
  "project_intel": [{ "detail": "project-relevant info mentioned", "category": "timeline" or "scope" or "budget" or "competition" or "decision_maker" or "blocker" or "opportunity" }],
  "client_notes": "anything about the client company specifically, or empty string",
  "key_dates": [{ "description": "what the date is for", "date": "YYYY-MM-DD", "source": "quote from transcript" }],
  "follow_up_date": "YYYY-MM-DD of the most important next follow-up, or null",
  "sentiment": "positive" or "neutral" or "cautious" or "negative"
}

Be smart about dates — calculate actual dates from relative references:
- "in 2 days" means today + 2
- "next Wednesday" means the actual next Wednesday date
- "end of the week" means this Friday
- "next month" means first of next month
- "next week" means next Monday

If no clear next steps are mentioned, infer reasonable ones from context.
If the transcript is very short, do your best with what's available.
Return ONLY the JSON — no markdown, no code fences, no explanation.`

export async function processTranscript(
  transcript: string,
  contactName: string,
  clientName: string,
): Promise<TranscriptAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set. Add it to your .env.local file.')
  }

  const client = new Anthropic({ apiKey })
  const today = new Date().toISOString().split('T')[0]

  const userMessage = `Today's date is ${today}.
Contact: ${contactName}
Client: ${clientName}

TRANSCRIPT:
${transcript}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  // Parse the JSON response
  try {
    // Strip any markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned) as TranscriptAnalysis

    // Validate and provide defaults
    return {
      summary: parsed.summary || 'No summary extracted.',
      touch_type: parsed.touch_type || 'call',
      next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
      personal_notes: Array.isArray(parsed.personal_notes) ? parsed.personal_notes : [],
      project_intel: Array.isArray(parsed.project_intel) ? parsed.project_intel : [],
      client_notes: parsed.client_notes || '',
      key_dates: Array.isArray(parsed.key_dates) ? parsed.key_dates : [],
      follow_up_date: parsed.follow_up_date || null,
      sentiment: parsed.sentiment || 'neutral',
    }
  } catch {
    throw new Error(`Failed to parse AI response as JSON. Raw response: ${text.slice(0, 200)}`)
  }
}
