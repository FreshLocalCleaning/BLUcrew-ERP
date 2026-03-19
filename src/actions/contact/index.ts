'use server'

import { createContactSchema, updateContactSchema } from '@/lib/validations/contact'
import * as contactDb from '@/lib/db/contacts'
import { getClient, updateClient } from '@/lib/db/clients'
import type { Contact } from '@/types/commercial'
import type { ActionResult } from '@/actions/client'
import { roleToLayer } from '@/lib/contacts/utils'

export async function createContactAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Contact>> {
  const parsed = createContactSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actorId = 'system'

  // Resolve client name for denormalization
  const client = getClient(parsed.data.client_id)
  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Server-side enforcement: auto-map role_type → layer
  const data = { ...parsed.data }
  if (data.role_type) {
    const inferredLayer = roleToLayer(data.role_type)
    if (inferredLayer) {
      data.layer = inferredLayer
    }
  }

  const contact = contactDb.createContact(
    {
      ...data,
      client_name: client.name,
      last_touch_date: new Date().toISOString(),
    } as Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state' | 'reference_id' | 'touch_count'>,
    actorId,
  )

  // Add contact ID to client's contacts array
  const updatedContacts = [...client.contacts, contact.id]
  updateClient(client.id, { contacts: updatedContacts }, actorId)

  return { success: true, data: contact }
}

export async function updateContactAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Contact>> {
  // Support both 'id' and 'contact_id' as the identifier
  const normalized = { ...formData }
  if (normalized.contact_id && !normalized.id) {
    normalized.id = normalized.contact_id
    delete normalized.contact_id
  }

  const parsed = updateContactSchema.safeParse(normalized)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data

  // Server-side enforcement: auto-map role_type → layer on update
  if (changes.role_type) {
    const inferredLayer = roleToLayer(changes.role_type)
    if (inferredLayer) {
      changes.layer = inferredLayer
    }
  }

  const contact = contactDb.updateContact(id, changes, 'system')
  return { success: true, data: contact }
}

export async function getContactAction(id: string): Promise<ActionResult<Contact>> {
  const contact = contactDb.getContact(id)
  if (!contact) {
    return { success: false, error: 'Contact not found' }
  }
  return { success: true, data: contact }
}

export async function listContactsAction(): Promise<ActionResult<Contact[]>> {
  const contacts = contactDb.listContacts()
  return { success: true, data: contacts }
}

export async function listContactsByClientAction(clientId: string): Promise<ActionResult<Contact[]>> {
  const contacts = contactDb.listContactsByClient(clientId)
  return { success: true, data: contacts }
}

/** Log a touch for a contact — increments touch_count and sets last_touch_date. */
export async function logTouchAction(
  input: {
    contact_id: string
    notes?: string
    next_step?: string
    next_step_due_date?: string
    touch_type?: string
  },
): Promise<ActionResult<Contact>> {
  const contact = contactDb.getContact(input.contact_id)
  if (!contact) {
    return { success: false, error: 'Contact not found' }
  }

  const changes: Record<string, unknown> = {
    touch_count: contact.touch_count + 1,
    last_touch_date: new Date().toISOString(),
  }

  if (input.next_step) {
    changes.next_step = input.next_step
  }
  if (input.next_step_due_date) {
    changes.next_step_due_date = input.next_step_due_date
  }

  const summary = [
    input.touch_type ? `[${input.touch_type}]` : null,
    input.notes,
    input.next_step ? `Next: ${input.next_step}` : null,
  ].filter(Boolean).join(' — ')

  const updated = contactDb.updateContact(
    input.contact_id,
    changes,
    'system',
    `Touch logged${summary ? `: ${summary}` : ''}`,
  )
  return { success: true, data: updated }
}
