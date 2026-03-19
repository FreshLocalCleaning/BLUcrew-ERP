'use server'

import * as templateDb from '@/lib/db/equipment-templates'
import type { EquipmentTemplate } from '@/types/commercial'

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

function getCurrentActor() {
  return { id: 'system', name: 'System User' }
}

/** List all equipment templates. */
export async function listEquipmentTemplatesAction(): Promise<ActionResult<EquipmentTemplate[]>> {
  const templates = templateDb.listEquipmentTemplates()
  return { success: true, data: templates }
}

/** Get a single equipment template by ID. */
export async function getEquipmentTemplateAction(id: string): Promise<ActionResult<EquipmentTemplate>> {
  const template = templateDb.getEquipmentTemplate(id)
  if (!template) {
    return { success: false, error: 'Template not found' }
  }
  return { success: true, data: template }
}

/** Create a new equipment template. */
export async function createEquipmentTemplateAction(input: {
  name: string
  description: string
  items: EquipmentTemplate['items']
  build_types: string[]
}): Promise<ActionResult<EquipmentTemplate>> {
  if (!input.name?.trim()) {
    return { success: false, error: 'Template name is required' }
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'At least one equipment item is required' }
  }

  const actor = getCurrentActor()
  const template = templateDb.createEquipmentTemplate(
    {
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      items: input.items,
      build_types: input.build_types ?? [],
    },
    actor.id,
  )
  return { success: true, data: template }
}

/** Update an existing equipment template. */
export async function updateEquipmentTemplateAction(input: {
  id: string
  name?: string
  description?: string
  items?: EquipmentTemplate['items']
  build_types?: string[]
}): Promise<ActionResult<EquipmentTemplate>> {
  if (!input.id) {
    return { success: false, error: 'Template ID is required' }
  }

  const actor = getCurrentActor()
  const changes: Partial<Pick<EquipmentTemplate, 'name' | 'description' | 'items' | 'build_types'>> = {}
  if (input.name !== undefined) changes.name = input.name.trim()
  if (input.description !== undefined) changes.description = input.description.trim()
  if (input.items !== undefined) changes.items = input.items
  if (input.build_types !== undefined) changes.build_types = input.build_types

  const template = templateDb.updateEquipmentTemplate(input.id, changes, actor.id)
  return { success: true, data: template }
}

/** Archive (soft-delete) an equipment template. */
export async function archiveEquipmentTemplateAction(id: string): Promise<ActionResult<void>> {
  if (!id) {
    return { success: false, error: 'Template ID is required' }
  }
  const actor = getCurrentActor()
  templateDb.archiveEquipmentTemplate(id, actor.id, 'Archived by user')
  return { success: true }
}
