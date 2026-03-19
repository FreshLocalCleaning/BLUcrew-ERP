'use server'

import { createContactSchema, updateContactSchema } from '@/lib/validations/contact'
import * as contactDb from '@/lib/db/contacts'
import { getClient, updateClient } from '@/lib/db/clients'
import type { Contact } from '@/types/commercial'
import type { ActionResult } from '@/actions/client'

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

  const contact = contactDb.createContact(
    {
      ...parsed.data,
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
  const parsed = updateContactSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
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
