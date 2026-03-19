import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import { createClient, getClient } from '@/lib/db/clients'
import {
  createContactAction,
  updateContactAction,
  getContactAction,
  listContactsAction,
  listContactsByClientAction,
} from '@/actions/contact'

let clientId: string

beforeEach(() => {
  resetDb()
  const client = createClient({ name: 'Test Client' }, 'actor-1')
  clientId = client.id
})

describe('Contact Server Actions — Create', () => {
  it('creates a contact with valid data', async () => {
    const result = await createContactAction({
      first_name: 'Jane',
      last_name: 'Smith',
      client_id: clientId,
      layer: 'pm_super_field',
      influence: 'high',
      relationship_strength: 'active',
    })
    expect(result.success).toBe(true)
    expect(result.data?.first_name).toBe('Jane')
    expect(result.data?.client_name).toBe('Test Client')
    expect(result.data?.reference_id).toBe('CON-0001')
  })

  it('links contact to client contacts array', async () => {
    const result = await createContactAction({
      first_name: 'Jane',
      last_name: 'Smith',
      client_id: clientId,
      layer: 'pm_super_field',
      influence: 'high',
      relationship_strength: 'active',
    })
    const client = getClient(clientId)!
    expect(client.contacts).toContain(result.data!.id)
  })

  it('fails with non-existent client', async () => {
    const result = await createContactAction({
      first_name: 'Jane',
      last_name: 'Smith',
      client_id: 'nonexistent',
      layer: 'pm_super_field',
      influence: 'high',
      relationship_strength: 'active',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Client not found')
  })

  it('fails without required fields', async () => {
    const result = await createContactAction({
      first_name: 'Jane',
    })
    expect(result.success).toBe(false)
  })

  it('creates champion contact', async () => {
    const result = await createContactAction({
      first_name: 'Jane',
      last_name: 'Smith',
      client_id: clientId,
      layer: 'blu_champion',
      influence: 'high',
      is_champion: true,
      champion_reason: 'Always recommends us',
      relationship_strength: 'trusted',
    })
    expect(result.success).toBe(true)
    expect(result.data?.is_champion).toBe(true)
    expect(result.data?.champion_reason).toBe('Always recommends us')
  })
})

describe('Contact Server Actions — Update', () => {
  it('updates an existing contact', async () => {
    const created = await createContactAction({
      first_name: 'Jane',
      last_name: 'Smith',
      client_id: clientId,
      layer: 'pm_super_field',
      influence: 'medium',
      relationship_strength: 'new',
    })
    const result = await updateContactAction({
      id: created.data!.id,
      influence: 'high',
      relationship_strength: 'active',
    })
    expect(result.success).toBe(true)
    expect(result.data?.influence).toBe('high')
    expect(result.data?.relationship_strength).toBe('active')
  })

  it('fails without id', async () => {
    const result = await updateContactAction({ influence: 'high' })
    expect(result.success).toBe(false)
  })
})

describe('Contact Server Actions — Get & List', () => {
  it('gets a contact by ID', async () => {
    const created = await createContactAction({
      first_name: 'Jane',
      last_name: 'Smith',
      client_id: clientId,
      layer: 'pm_super_field',
      influence: 'medium',
      relationship_strength: 'new',
    })
    const result = await getContactAction(created.data!.id)
    expect(result.success).toBe(true)
    expect(result.data?.first_name).toBe('Jane')
  })

  it('returns error for non-existent', async () => {
    const result = await getContactAction('bad-id')
    expect(result.success).toBe(false)
  })

  it('lists all contacts', async () => {
    await createContactAction({
      first_name: 'A', last_name: 'B',
      client_id: clientId, layer: 'pm_super_field',
      influence: 'medium', relationship_strength: 'new',
    })
    await createContactAction({
      first_name: 'C', last_name: 'D',
      client_id: clientId, layer: 'exec_owner_rep',
      influence: 'high', relationship_strength: 'active',
    })
    const result = await listContactsAction()
    expect(result.success).toBe(true)
    expect(result.data?.length).toBe(2)
  })

  it('lists contacts by client', async () => {
    const otherClient = createClient({ name: 'Other' }, 'actor-1')
    await createContactAction({
      first_name: 'A', last_name: 'B',
      client_id: clientId, layer: 'pm_super_field',
      influence: 'medium', relationship_strength: 'new',
    })
    await createContactAction({
      first_name: 'C', last_name: 'D',
      client_id: otherClient.id, layer: 'pm_super_field',
      influence: 'medium', relationship_strength: 'new',
    })
    const result = await listContactsByClientAction(clientId)
    expect(result.success).toBe(true)
    expect(result.data?.length).toBe(1)
    expect(result.data![0]!.first_name).toBe('A')
  })
})
