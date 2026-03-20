'use server'

import { processTranscript, type TranscriptAnalysis } from '@/lib/ai/transcript-processor'
import { getContact } from '@/lib/db/contacts'
import { getClient } from '@/lib/db/clients'

export interface ProcessTranscriptResult {
  success: boolean
  data?: TranscriptAnalysis
  error?: string
}

/**
 * Process a conversation transcript using AI to extract structured CRM data.
 * Does NOT auto-save — returns structured data for user review before saving.
 */
export async function processTranscriptAction(input: {
  transcript: string
  contact_id: string
  client_id: string
}): Promise<ProcessTranscriptResult> {
  const { transcript, contact_id, client_id } = input

  if (!transcript || transcript.trim().length < 20) {
    return { success: false, error: 'Transcript is too short. Paste at least a few sentences.' }
  }

  // Look up contact and client names for context
  const contact = getContact(contact_id)
  const client = getClient(client_id)

  const contactName = contact
    ? `${contact.first_name} ${contact.last_name}`
    : 'Unknown Contact'
  const clientName = client?.name ?? 'Unknown Client'

  try {
    const analysis = await processTranscript(transcript, contactName, clientName)
    return { success: true, data: analysis }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process transcript'
    return { success: false, error: message }
  }
}
