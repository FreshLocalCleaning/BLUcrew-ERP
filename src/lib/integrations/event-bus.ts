/**
 * Integration Event Bus (ERP-15)
 *
 * Dispatches integration events to the JSON DB for tracking.
 * All external system interactions are logged here.
 * In v1, no live API calls — stubs only.
 *
 * Every sync failure must be recoverable by same-day manual override
 * recorded in ERP. Never create duplicate live records.
 */

import { v4 as uuidv4 } from 'uuid'
import {
  addIntegrationEvent,
  updateIntegrationEvent,
  listIntegrationEvents,
  type IntegrationEvent,
} from '@/lib/db/json-db'

// ---------------------------------------------------------------------------
// Event Types (ERP-15)
// ---------------------------------------------------------------------------

export const INTEGRATION_EVENT_TYPES = [
  'project_signal.passed.v1',
  'estimate.approved_for_proposal.v1',
  'proposal.accepted.v1',
  'award_handoff.pm_claimed.v1',
  'award_handoff.closed_to_ops.v1',
  'project.stage_window_confirmed.v1',
  'mobilization.ready.v1',
  'mobilization.completed.v1',
  'project.operationally_closed.v1',
  'invoice.released.v1',
] as const

export type IntegrationEventType = (typeof INTEGRATION_EVENT_TYPES)[number]

export const TARGET_SYSTEMS = [
  'sharepoint',
  'teams',
  'jobber',
  'quickbooks',
  'gusto',
  'outlook',
  'internal',
] as const

export type TargetSystem = (typeof TARGET_SYSTEMS)[number]

const MAX_RETRIES = 3

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export interface DispatchInput {
  event_type: string
  source_entity: string
  source_id: string
  target_system: TargetSystem
  payload: Record<string, unknown>
}

/**
 * Dispatch an integration event. Logs to integration_events collection.
 * In v1 stub mode, events are logged as "pending" — no live API call.
 */
export function dispatchEvent(input: DispatchInput): IntegrationEvent {
  const event: IntegrationEvent = {
    id: uuidv4(),
    event_type: input.event_type,
    source_entity: input.source_entity,
    source_id: input.source_id,
    payload: input.payload,
    timestamp: new Date().toISOString(),
    status: 'pending',
    target_system: input.target_system,
    retry_count: 0,
    failure_reason: null,
    manual_override_note: null,
  }

  addIntegrationEvent(event)
  return event
}

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

export interface RetryResult {
  success: boolean
  event?: IntegrationEvent
  error?: string
}

/**
 * Retry a failed integration event. Max 3 retries.
 * In v1 stub mode, retry just resets status to "pending".
 */
export function retryEvent(eventId: string): RetryResult {
  const events = listIntegrationEvents()
  const event = events.find((e) => e.id === eventId)

  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.status !== 'failed') {
    return { success: false, error: `Cannot retry event with status "${event.status}". Only failed events can be retried.` }
  }

  if (event.retry_count >= MAX_RETRIES) {
    return {
      success: false,
      error: `Maximum retry count (${MAX_RETRIES}) reached. Use manual override instead.`,
    }
  }

  const updated = updateIntegrationEvent(eventId, {
    status: 'pending',
    retry_count: event.retry_count + 1,
    failure_reason: null,
  })

  return { success: true, event: updated }
}

// ---------------------------------------------------------------------------
// Manual Override
// ---------------------------------------------------------------------------

/**
 * Mark an event as manually overridden.
 * Per ERP-15: every sync failure must be recoverable by same-day manual override.
 */
export function manualOverride(
  eventId: string,
  note: string,
  actorId: string,
): RetryResult {
  const events = listIntegrationEvents()
  const event = events.find((e) => e.id === eventId)

  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.status !== 'failed') {
    return { success: false, error: `Cannot override event with status "${event.status}". Only failed events need override.` }
  }

  const updated = updateIntegrationEvent(eventId, {
    status: 'manual_override',
    manual_override_note: `[${actorId}] ${note}`,
  })

  return { success: true, event: updated }
}

// ---------------------------------------------------------------------------
// Mark Failed (used by connectors when live mode fails)
// ---------------------------------------------------------------------------

export function markEventFailed(eventId: string, reason: string): IntegrationEvent | undefined {
  return updateIntegrationEvent(eventId, {
    status: 'failed',
    failure_reason: reason,
  })
}

// ---------------------------------------------------------------------------
// Mark Sent (used by connectors on success)
// ---------------------------------------------------------------------------

export function markEventSent(eventId: string): IntegrationEvent | undefined {
  return updateIntegrationEvent(eventId, {
    status: 'sent',
  })
}
