import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import * as projectDb from '@/lib/db/projects'
import * as expansionTaskDb from '@/lib/db/expansion-tasks'
import {
  createExpansionTaskAction,
  autoCreateExpansionTaskAction,
  transitionExpansionTaskAction,
  listExpansionTasksAction,
  getExpansionTaskAction,
} from '@/actions/expansion-task'
import type { Project } from '@/types/commercial'

// ---------------------------------------------------------------------------
// Helper: create a project for testing
// ---------------------------------------------------------------------------

function createTestProject(): Project {
  const project = projectDb.createProject(
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
  return project
}

function validETInput(projectId: string): Record<string, unknown> {
  return {
    linked_project_id: projectId,
    linked_client_id: 'cli-test',
    task_type: 'thank_you',
    growth_objective: 'Send thank-you to client',
    due_date: '2026-04-10',
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Expansion Task — Server Actions', () => {
  beforeEach(() => {
    resetDb()
  })

  it('creates an expansion task', async () => {
    const project = createTestProject()
    const result = await createExpansionTaskAction(validETInput(project.id))
    expect(result.success).toBe(true)
    expect(result.data?.reference_id).toBe('EXP-0001')
    expect(result.data?.status).toBe('open')
  })

  it('rejects creation when project does not exist', async () => {
    const result = await createExpansionTaskAction(validETInput('nonexistent'))
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('transitions open → in_progress', async () => {
    const project = createTestProject()
    const createResult = await createExpansionTaskAction(validETInput(project.id))
    const et = createResult.data!

    const transResult = await transitionExpansionTaskAction({
      expansion_task_id: et.id,
      target_status: 'in_progress',
    })
    expect(transResult.success).toBe(true)
    expect(transResult.data?.status).toBe('in_progress')
  })

  it('lists all expansion tasks', async () => {
    const project = createTestProject()
    await createExpansionTaskAction(validETInput(project.id))
    const result = await listExpansionTasksAction()
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('gets a specific expansion task', async () => {
    const project = createTestProject()
    const createResult = await createExpansionTaskAction(validETInput(project.id))
    const getResult = await getExpansionTaskAction(createResult.data!.id)
    expect(getResult.success).toBe(true)
    expect(getResult.data?.reference_id).toBe('EXP-0001')
  })
})

// ---------------------------------------------------------------------------
// Auto-creation test
// ---------------------------------------------------------------------------

describe('Expansion Task — Auto-Creation', () => {
  beforeEach(() => {
    resetDb()
  })

  it('auto-creates an expansion task for a project', async () => {
    const project = createTestProject()
    const result = await autoCreateExpansionTaskAction(project.id)
    expect(result.success).toBe(true)
    expect(result.data?.task_type).toBe('thank_you')
    expect(result.data?.linked_project_id).toBe(project.id)
  })

  it('does not create duplicate expansion tasks', async () => {
    const project = createTestProject()
    await autoCreateExpansionTaskAction(project.id)
    await autoCreateExpansionTaskAction(project.id)

    const allTasks = expansionTaskDb.listExpansionTasksByProject(project.id)
    expect(allTasks).toHaveLength(1)
  })

  it('fails when project does not exist', async () => {
    const result = await autoCreateExpansionTaskAction('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})
