'use server'

import { createSiteWalkSchema, updateSiteWalkSchema } from '@/lib/validations/site-walk'
import * as siteWalkDb from '@/lib/db/site-walks'
import type { SiteWalkEvent } from '@/types/commercial'
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

export async function createSiteWalkAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<SiteWalkEvent>> {
  const parsed = createSiteWalkSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()

  const siteWalk = siteWalkDb.createSiteWalk(
    {
      ...parsed.data,
      status: 'scheduled',
      notes: parsed.data.notes ?? null,
    },
    actor.id,
  )

  return { success: true, data: siteWalk }
}

export async function updateSiteWalkAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<SiteWalkEvent>> {
  const parsed = updateSiteWalkSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const siteWalk = siteWalkDb.updateSiteWalk(id, changes as any, actor.id)
  return { success: true, data: siteWalk }
}

export async function listSiteWalksByPursuitAction(
  pursuitId: string,
): Promise<ActionResult<SiteWalkEvent[]>> {
  const walks = siteWalkDb.listSiteWalksByPursuit(pursuitId)
  return { success: true, data: walks }
}
