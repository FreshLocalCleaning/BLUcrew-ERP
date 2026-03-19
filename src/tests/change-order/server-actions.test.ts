import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import * as projectDb from '@/lib/db/projects'
import * as changeOrderDb from '@/lib/db/change-orders'
import {
  createChangeOrderAction,
  transitionChangeOrderAction,
  listChangeOrdersAction,
  getChangeOrderAction,
} from '@/actions/change-order'
import type { Project } from '@/types/commercial'
import type { ChangeOrder } from '@/types/commercial'

// ---------------------------------------------------------------------------
// Helper: create a project in a valid state for CO creation
// ---------------------------------------------------------------------------

function createTestProject(status: string = 'execution_active'): Project {
  return projectDb.createProject(
    {
      linked_award_handoff_id: 'awd-test',
      linked_client_id: 'cli-test',
      project_name: 'Test Project',
      pm_owner_id: 'cullen',
      commercial_baseline_snapshot: {},
      client_stage_map: null,
      target_turnover_date: null,
      billing_references: null,
      active_change_order_count: 0,
      owner: 'cullen',
    } as Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state' | 'reference_id' | 'status'>,
    'system-test',
  )
}

function validCOInput(projectId: string): Record<string, unknown> {
  return {
    linked_project_id: projectId,
    linked_mobilization_id: null,
    linked_client_id: 'cli-test',
    origin: 'pm_field_discovery',
    scope_delta: 'Added exterior window cleaning to scope',
    fact_packet_by: 'cullen',
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Change Order — Server Actions', () => {
  beforeEach(() => {
    resetDb()
  })

  it('creates a CO when project is at execution_active', async () => {
    const project = createTestProject('execution_active')
    // Need to update the project status since createProject sets startup_pending
    projectDb.updateProject(project.id, { status: 'execution_active' } as Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>>, 'system-test')

    const result = await createChangeOrderAction(validCOInput(project.id))
    expect(result.success).toBe(true)
    expect(result.data?.reference_id).toBe('CO-0001')
    expect(result.data?.status).toBe('draft')
  })

  it('rejects CO creation when project is at startup_pending', async () => {
    const project = createTestProject()
    // startup_pending is the initial state — should be rejected
    const result = await createChangeOrderAction(validCOInput(project.id))
    expect(result.success).toBe(false)
    expect(result.error).toContain('forecasting_active')
  })

  it('rejects CO creation when project does not exist', async () => {
    const result = await createChangeOrderAction(validCOInput('nonexistent'))
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('transitions draft → internal_review', async () => {
    const project = createTestProject()
    projectDb.updateProject(project.id, { status: 'execution_active' } as Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>>, 'system-test')

    const createResult = await createChangeOrderAction(validCOInput(project.id))
    expect(createResult.success).toBe(true)
    const co = createResult.data!

    const transResult = await transitionChangeOrderAction({
      change_order_id: co.id,
      target_status: 'internal_review',
    })
    expect(transResult.success).toBe(true)
    expect(transResult.data?.status).toBe('internal_review')
  })

  it('lists all change orders', async () => {
    const project = createTestProject()
    projectDb.updateProject(project.id, { status: 'execution_active' } as Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>>, 'system-test')
    await createChangeOrderAction(validCOInput(project.id))

    const result = await listChangeOrdersAction()
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('gets a specific change order', async () => {
    const project = createTestProject()
    projectDb.updateProject(project.id, { status: 'execution_active' } as Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>>, 'system-test')
    const createResult = await createChangeOrderAction(validCOInput(project.id))
    expect(createResult.success).toBe(true)

    const getResult = await getChangeOrderAction(createResult.data!.id)
    expect(getResult.success).toBe(true)
    expect(getResult.data?.reference_id).toBe('CO-0001')
  })
})

// ---------------------------------------------------------------------------
// Baseline preservation
// ---------------------------------------------------------------------------

describe('Change Order — Baseline Preservation', () => {
  beforeEach(() => {
    resetDb()
  })

  it('CO creation does not modify the project commercial baseline', async () => {
    const project = createTestProject()
    projectDb.updateProject(project.id, {
      status: 'execution_active',
      commercial_baseline_snapshot: { proposal_value: 25000, scope: 'original' },
    } as Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>>, 'system-test')

    await createChangeOrderAction(validCOInput(project.id))

    // Verify original baseline is untouched
    const updatedProject = projectDb.getProject(project.id)
    expect(updatedProject?.commercial_baseline_snapshot).toEqual({
      proposal_value: 25000,
      scope: 'original',
    })
  })

  it('CO transition does not modify the project commercial baseline', async () => {
    const project = createTestProject()
    projectDb.updateProject(project.id, {
      status: 'execution_active',
      commercial_baseline_snapshot: { proposal_value: 25000 },
    } as Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>>, 'system-test')

    const createResult = await createChangeOrderAction(validCOInput(project.id))
    const co = createResult.data!

    await transitionChangeOrderAction({
      change_order_id: co.id,
      target_status: 'internal_review',
    })

    const updatedProject = projectDb.getProject(project.id)
    expect(updatedProject?.commercial_baseline_snapshot).toEqual({ proposal_value: 25000 })
  })
})
