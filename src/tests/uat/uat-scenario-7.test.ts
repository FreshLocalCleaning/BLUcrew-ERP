/**
 * UAT Scenario 7 — Stage complete to report to invoice release
 */
import { describe, it, expect } from 'vitest'
import { validateTransition } from '@/lib/state-machines/engine'
import { mobilizationStateMachine } from '@/lib/state-machines/mobilization'
import type { Role } from '@/lib/permissions/roles'

const PM: Role[] = ['leadership_system_admin', 'pm_ops']

function baseEntity(overrides: Record<string, unknown> = {}) {
  return {
    readiness_checklist: { crew_confirmed: true, equipment_loaded: true, travel_booked: true, lodging_booked: true, per_diem_approved: true, jobber_synced: true, teams_posted: true },
    actual_start_date: '2026-05-01', compressed_planning: false, exception_flag: false,
    blocker_reason: null, blocker_owner: null, missing_items_log: null,
    photo_report_link: 'https://sharepoint/photos',
    client_signoff_status: 'obtained',
    qc_stage_completion: { passed: true, reviewer_id: 'cullen', date: '2026-05-05', notes: 'OK' },
    ...overrides,
  }
}

describe('UAT Scenario 7 — Completion Gates', () => {
  it('blocks completion without photo_report_link', () => {
    const result = validateTransition(mobilizationStateMachine, {
      currentState: 'in_field', targetState: 'complete',
      entity: baseEntity({ photo_report_link: null }), actorRoles: PM,
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some(e => e.includes('photo_report_link'))).toBe(true)
  })

  it('blocks completion without client_signoff_status', () => {
    const result = validateTransition(mobilizationStateMachine, {
      currentState: 'in_field', targetState: 'complete',
      entity: baseEntity({ client_signoff_status: null }), actorRoles: PM,
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some(e => e.includes('sign-off'))).toBe(true)
  })

  it('blocks completion without qc_stage_completion', () => {
    const result = validateTransition(mobilizationStateMachine, {
      currentState: 'in_field', targetState: 'complete',
      entity: baseEntity({ qc_stage_completion: null }), actorRoles: PM,
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some(e => e.includes('QC'))).toBe(true)
  })

  it('allows completion with all requirements met', () => {
    const result = validateTransition(mobilizationStateMachine, {
      currentState: 'in_field', targetState: 'complete',
      entity: baseEntity(), actorRoles: PM,
    })
    expect(result.allowed).toBe(true)
    expect(result.sideEffects).toContain('notify_complete')
    expect(result.sideEffects).toContain('trigger_invoice_staging')
  })
})
