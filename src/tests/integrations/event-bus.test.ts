import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb, listIntegrationEvents } from '@/lib/db/json-db'
import {
  dispatchEvent,
  retryEvent,
  manualOverride,
  markEventFailed,
  markEventSent,
} from '@/lib/integrations/event-bus'
import {
  syncDocumentLink,
  postHandoffNotification,
  createJob,
  stageInvoiceRelease,
  logEmailSent,
  logReimbursementApproval,
} from '@/lib/integrations/system-connectors'

describe('Integration Event Bus', () => {
  beforeEach(() => {
    resetDb()
  })

  it('dispatches an event and logs it to integration_events', () => {
    const event = dispatchEvent({
      event_type: 'mobilization.ready.v1',
      source_entity: 'mobilizations',
      source_id: 'mob-1',
      target_system: 'teams',
      payload: { stage_name: 'Trip 1' },
    })

    expect(event.id).toBeDefined()
    expect(event.status).toBe('pending')
    expect(event.retry_count).toBe(0)
    expect(event.event_type).toBe('mobilization.ready.v1')

    const events = listIntegrationEvents()
    expect(events).toHaveLength(1)
    expect(events[0]!.id).toBe(event.id)
  })

  it('marks event as sent', () => {
    const event = dispatchEvent({
      event_type: 'mobilization.completed.v1',
      source_entity: 'mobilizations',
      source_id: 'mob-1',
      target_system: 'jobber',
      payload: {},
    })

    const updated = markEventSent(event.id)
    expect(updated?.status).toBe('sent')
  })

  it('marks event as failed', () => {
    const event = dispatchEvent({
      event_type: 'invoice.released.v1',
      source_entity: 'projects',
      source_id: 'prj-1',
      target_system: 'quickbooks',
      payload: {},
    })

    const updated = markEventFailed(event.id, 'Connection timeout')
    expect(updated?.status).toBe('failed')
    expect(updated?.failure_reason).toBe('Connection timeout')
  })

  it('retries a failed event (increments retry_count)', () => {
    const event = dispatchEvent({
      event_type: 'mobilization.ready.v1',
      source_entity: 'mobilizations',
      source_id: 'mob-1',
      target_system: 'teams',
      payload: {},
    })

    markEventFailed(event.id, 'Timeout')

    const result = retryEvent(event.id)
    expect(result.success).toBe(true)
    expect(result.event?.status).toBe('pending')
    expect(result.event?.retry_count).toBe(1)
  })

  it('rejects retry when max retries exceeded', () => {
    const event = dispatchEvent({
      event_type: 'mobilization.ready.v1',
      source_entity: 'mobilizations',
      source_id: 'mob-1',
      target_system: 'teams',
      payload: {},
    })

    // Simulate 3 failed retries
    markEventFailed(event.id, 'fail')
    retryEvent(event.id)
    markEventFailed(event.id, 'fail')
    retryEvent(event.id)
    markEventFailed(event.id, 'fail')
    retryEvent(event.id)
    markEventFailed(event.id, 'fail')

    const result = retryEvent(event.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Maximum retry count')
  })

  it('rejects retry on non-failed event', () => {
    const event = dispatchEvent({
      event_type: 'mobilization.ready.v1',
      source_entity: 'mobilizations',
      source_id: 'mob-1',
      target_system: 'teams',
      payload: {},
    })

    const result = retryEvent(event.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('pending')
  })

  it('manual override records note and sets status', () => {
    const event = dispatchEvent({
      event_type: 'invoice.released.v1',
      source_entity: 'projects',
      source_id: 'prj-1',
      target_system: 'quickbooks',
      payload: {},
    })

    markEventFailed(event.id, 'API down')

    const result = manualOverride(event.id, 'Manually released in QuickBooks', 'antonio')
    expect(result.success).toBe(true)
    expect(result.event?.status).toBe('manual_override')
    expect(result.event?.manual_override_note).toContain('antonio')
    expect(result.event?.manual_override_note).toContain('Manually released in QuickBooks')
  })

  it('rejects manual override on non-failed event', () => {
    const event = dispatchEvent({
      event_type: 'mobilization.ready.v1',
      source_entity: 'mobilizations',
      source_id: 'mob-1',
      target_system: 'teams',
      payload: {},
    })

    const result = manualOverride(event.id, 'test', 'antonio')
    expect(result.success).toBe(false)
  })

  it('filters events by status', () => {
    dispatchEvent({ event_type: 'a.v1', source_entity: 'x', source_id: '1', target_system: 'teams', payload: {} })
    const ev2 = dispatchEvent({ event_type: 'b.v1', source_entity: 'x', source_id: '2', target_system: 'jobber', payload: {} })
    markEventFailed(ev2.id, 'fail')

    const failed = listIntegrationEvents({ status: 'failed' })
    expect(failed).toHaveLength(1)
    expect(failed[0]!.id).toBe(ev2.id)
  })

  it('filters events by target_system', () => {
    dispatchEvent({ event_type: 'a.v1', source_entity: 'x', source_id: '1', target_system: 'teams', payload: {} })
    dispatchEvent({ event_type: 'b.v1', source_entity: 'x', source_id: '2', target_system: 'jobber', payload: {} })

    const teamsOnly = listIntegrationEvents({ target_system: 'teams' })
    expect(teamsOnly).toHaveLength(1)
  })
})

describe('System Connectors — Stubs', () => {
  beforeEach(() => {
    resetDb()
  })

  it('sharepoint: syncDocumentLink', () => {
    const event = syncDocumentLink('projects', 'prj-1', 'https://sharepoint/doc')
    expect(event.status).toBe('pending')
    expect(event.target_system).toBe('sharepoint')
  })

  it('teams: postHandoffNotification', () => {
    const event = postHandoffNotification('awd-1', 'Crunch Fitness')
    expect(event.target_system).toBe('teams')
  })

  it('jobber: createJob', () => {
    const event = createJob('prj-1', 'mob-1', 'Crunch Fitness')
    expect(event.target_system).toBe('jobber')
  })

  it('quickbooks: stageInvoiceRelease', () => {
    const event = stageInvoiceRelease('prj-1', 'mob-1', 25000)
    expect(event.target_system).toBe('quickbooks')
    expect(event.payload['amount']).toBe(25000)
  })

  it('gusto: logReimbursementApproval', () => {
    const event = logReimbursementApproval('mob-1', 150)
    expect(event.target_system).toBe('gusto')
  })

  it('outlook: logEmailSent', () => {
    const event = logEmailSent('proposals', 'pro-1', ['client@test.com'], 'Proposal Delivery')
    expect(event.target_system).toBe('outlook')
    expect(event.payload['subject']).toBe('Proposal Delivery')
  })
})
