'use server'

import { createCloseoutPlanSchema, updateCloseoutPlanSchema } from '@/lib/validations/closeout-plan'
import * as closeoutPlanDb from '@/lib/db/closeout-plans'
import type { CloseoutPlan } from '@/types/commercial'
import type { Role } from '@/lib/permissions/roles'

function getCurrentActor() {
  return {
    id: 'system',
    name: 'System User',
    roles: ['leadership_system_admin', 'commercial_bd'] as Role[],
  }
}

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export async function createCloseoutPlanAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<CloseoutPlan>> {
  const parsed = createCloseoutPlanSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()

  const plan = closeoutPlanDb.createCloseoutPlan(
    {
      ...parsed.data,
      status: 'draft',
    },
    actor.id,
  )

  return { success: true, data: plan }
}

export async function updateCloseoutPlanAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<CloseoutPlan>> {
  const parsed = updateCloseoutPlanSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const plan = closeoutPlanDb.updateCloseoutPlan(id, changes as any, actor.id)
  return { success: true, data: plan }
}

export async function listCloseoutPlansByPursuitAction(
  pursuitId: string,
): Promise<ActionResult<CloseoutPlan[]>> {
  const plans = closeoutPlanDb.listCloseoutPlansByPursuit(pursuitId)
  return { success: true, data: plans }
}
