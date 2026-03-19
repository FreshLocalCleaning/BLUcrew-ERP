import { describe, it, expect } from 'vitest'
import {
  createMobilizationSchema,
  updateMobilizationSchema,
  mobilizationTransitionSchema,
  addDailyReportSchema,
  updateReadinessChecklistSchema,
  compressedPlanningOverrideSchema,
} from '@/lib/validations/mobilization'

describe('Mobilization Validation — Create Schema', () => {
  it('accepts valid minimal input', () => {
    const result = createMobilizationSchema.safeParse({
      linked_project_id: 'prj-1',
      linked_client_id: 'clt-1',
      stage_name: 'Trip 1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing linked_project_id', () => {
    const result = createMobilizationSchema.safeParse({
      linked_client_id: 'clt-1',
      stage_name: 'Trip 1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing linked_client_id', () => {
    const result = createMobilizationSchema.safeParse({
      linked_project_id: 'prj-1',
      stage_name: 'Trip 1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing stage_name', () => {
    const result = createMobilizationSchema.safeParse({
      linked_project_id: 'prj-1',
      linked_client_id: 'clt-1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty stage_name', () => {
    const result = createMobilizationSchema.safeParse({
      linked_project_id: 'prj-1',
      linked_client_id: 'clt-1',
      stage_name: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts full input with all fields', () => {
    const result = createMobilizationSchema.safeParse({
      linked_project_id: 'prj-1',
      linked_client_id: 'clt-1',
      stage_name: 'Trip 1 — Rough Clean',
      crew_lead_id: 'marcus',
      named_technicians: ['tech-1', 'tech-2'],
      requested_start_date: '2026-04-07',
      requested_end_date: '2026-04-11',
      travel_posture: 'overnight',
      site_address: '1234 Main St',
      lodging_details: {
        hotel: 'Hampton Inn',
        bed_count: 2,
        confirmation: null,
        check_in: '2026-04-06',
        check_out: '2026-04-12',
      },
      per_diem_budget: 500,
      equipment_checklist: [
        { item: 'Floor scrubber', status: 'packed', notes: null },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid travel_posture', () => {
    const result = createMobilizationSchema.safeParse({
      linked_project_id: 'prj-1',
      linked_client_id: 'clt-1',
      stage_name: 'Trip 1',
      travel_posture: 'flying',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid equipment status', () => {
    const result = createMobilizationSchema.safeParse({
      linked_project_id: 'prj-1',
      linked_client_id: 'clt-1',
      stage_name: 'Trip 1',
      equipment_checklist: [{ item: 'Broom', status: 'invalid', notes: null }],
    })
    expect(result.success).toBe(false)
  })

  it('defaults readiness checklist to all false', () => {
    const result = createMobilizationSchema.safeParse({
      linked_project_id: 'prj-1',
      linked_client_id: 'clt-1',
      stage_name: 'Trip 1',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.readiness_checklist.crew_confirmed).toBe(false)
      expect(result.data.readiness_checklist.equipment_loaded).toBe(false)
    }
  })
})

describe('Mobilization Validation — Update Schema', () => {
  it('accepts id with partial fields', () => {
    const result = updateMobilizationSchema.safeParse({
      id: 'mob-1',
      crew_lead_id: 'marcus',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = updateMobilizationSchema.safeParse({
      crew_lead_id: 'marcus',
    })
    expect(result.success).toBe(false)
  })
})

describe('Mobilization Validation — Transition Schema', () => {
  it('accepts valid transition', () => {
    const result = mobilizationTransitionSchema.safeParse({
      mobilization_id: 'mob-1',
      target_status: 'needs_planning',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = mobilizationTransitionSchema.safeParse({
      mobilization_id: 'mob-1',
      target_status: 'invalid_state',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing mobilization_id', () => {
    const result = mobilizationTransitionSchema.safeParse({
      target_status: 'needs_planning',
    })
    expect(result.success).toBe(false)
  })
})

describe('Mobilization Validation — Daily Report Schema', () => {
  it('accepts valid daily report', () => {
    const result = addDailyReportSchema.safeParse({
      mobilization_id: 'mob-1',
      date: '2026-04-07',
      summary: 'Cleaned floors 1-3',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing summary', () => {
    const result = addDailyReportSchema.safeParse({
      mobilization_id: 'mob-1',
      date: '2026-04-07',
    })
    expect(result.success).toBe(false)
  })
})

describe('Mobilization Validation — Readiness Checklist Schema', () => {
  it('accepts valid checklist update', () => {
    const result = updateReadinessChecklistSchema.safeParse({
      mobilization_id: 'mob-1',
      checklist: {
        crew_confirmed: true,
        equipment_loaded: true,
        travel_booked: true,
        lodging_booked: true,
        per_diem_approved: true,
        jobber_synced: false,
        teams_posted: false,
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('Mobilization Validation — Compressed Planning Schema', () => {
  it('accepts valid override', () => {
    const result = compressedPlanningOverrideSchema.safeParse({
      mobilization_id: 'mob-1',
      reason: 'Urgent deployment needed',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty reason', () => {
    const result = compressedPlanningOverrideSchema.safeParse({
      mobilization_id: 'mob-1',
      reason: '',
    })
    expect(result.success).toBe(false)
  })
})
