import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import {
  createClientAction,
  updateClientAction,
  transitionClientAction,
  getClientAction,
  listClientsAction,
  getClientAuditAction,
} from '@/actions/client'

beforeEach(() => {
  resetDb()
})

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

describe('Client Server Actions — Create', () => {
  it('creates a client with valid data', async () => {
    const result = await createClientAction({
      name: 'New Corp',
      tier: 'A',
      vertical: 'general_contractor',
      market: 'dallas_fort_worth',
    })
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('New Corp')
    expect(result.data?.status).toBe('watchlist')
    expect(result.data?.reference_id).toBe('CLT-0001')
  })

  it('fails without name', async () => {
    const result = await createClientAction({ tier: 'A' })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('fails with empty name', async () => {
    const result = await createClientAction({ name: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

describe('Client Server Actions — Update', () => {
  it('updates an existing client', async () => {
    const created = await createClientAction({ name: 'Original' })
    const result = await updateClientAction({
      id: created.data!.id,
      name: 'Updated',
      tier: 'B',
    })
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('Updated')
    expect(result.data?.tier).toBe('B')
  })

  it('fails without ID', async () => {
    const result = await updateClientAction({ name: 'No ID' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Transition
// ---------------------------------------------------------------------------

describe('Client Server Actions — Transition', () => {
  it('transitions watchlist → target_client with tier and vertical', async () => {
    const created = await createClientAction({
      name: 'Transition Test',
      tier: 'A',
      vertical: 'general_contractor',
    })

    const result = await transitionClientAction({
      client_id: created.data!.id,
      target_state: 'target_client',
    })
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('target_client')
  })

  it('fails for invalid transition (watchlist → active_client)', async () => {
    const created = await createClientAction({
      name: 'Bad Transition',
      tier: 'A',
    })

    const result = await transitionClientAction({
      client_id: created.data!.id,
      target_state: 'active_client',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('No transition defined')
  })

  it('fails for non-existent client', async () => {
    const result = await transitionClientAction({
      client_id: 'nonexistent',
      target_state: 'target_client',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Client not found')
  })

  it('requires reason for transitions that need it', async () => {
    const created = await createClientAction({
      name: 'Reason Test',
      tier: 'A',
      vertical: 'general_contractor',
    })

    // watchlist → archived requires reason
    const result = await transitionClientAction({
      client_id: created.data!.id,
      target_state: 'archived',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('reason')
  })

  it('succeeds when reason is provided', async () => {
    const created = await createClientAction({
      name: 'With Reason',
      tier: 'A',
      vertical: 'general_contractor',
    })

    const result = await transitionClientAction({
      client_id: created.data!.id,
      target_state: 'archived',
      reason: 'No longer a fit',
    })
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('archived')
  })
})

// ---------------------------------------------------------------------------
// Get / List
// ---------------------------------------------------------------------------

describe('Client Server Actions — Get & List', () => {
  it('gets a client by ID', async () => {
    const created = await createClientAction({ name: 'Get Me' })
    const result = await getClientAction(created.data!.id)
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('Get Me')
  })

  it('returns error for non-existent ID', async () => {
    const result = await getClientAction('bad-id')
    expect(result.success).toBe(false)
  })

  it('lists all clients', async () => {
    await createClientAction({ name: 'A' })
    await createClientAction({ name: 'B' })
    const result = await listClientsAction()
    expect(result.success).toBe(true)
    expect(result.data?.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

describe('Client Server Actions — Audit', () => {
  it('returns audit log for a client', async () => {
    const created = await createClientAction({ name: 'Audited' })
    const result = await getClientAuditAction(created.data!.id)
    expect(result.success).toBe(true)
    expect(result.data!.length).toBe(1) // create entry
    expect(result.data![0]!.action).toBe('create')
  })

  it('audit log grows with updates', async () => {
    const created = await createClientAction({ name: 'Grow Audit' })
    await updateClientAction({ id: created.data!.id, name: 'Updated' })
    const result = await getClientAuditAction(created.data!.id)
    expect(result.data!.length).toBe(2)
  })
})
