'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createChangeOrderAction } from '@/actions/change-order'
import { CHANGE_ORDER_ORIGIN_LABELS } from '@/types/commercial'
import type { Project, Mobilization } from '@/types/commercial'
import { toast } from 'sonner'

interface ChangeOrderCreateFormProps {
  projects: Project[]
  mobilizations: Mobilization[]
  preselectedProjectId?: string
  preselectedMobilizationId?: string
}

export function ChangeOrderCreateForm({
  projects,
  mobilizations,
  preselectedProjectId,
  preselectedMobilizationId,
}: ChangeOrderCreateFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId ?? '')

  const validProjects = projects.filter(
    (p) => ['forecasting_active', 'execution_active', 'operationally_complete'].includes(p.status),
  )

  const projectMobilizations = mobilizations.filter(
    (m) => m.linked_project_id === selectedProjectId,
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const projectId = formData.get('linked_project_id') as string
    const selectedProject = validProjects.find((p) => p.id === projectId)

    const data: Record<string, unknown> = {
      linked_project_id: projectId,
      linked_mobilization_id: (formData.get('linked_mobilization_id') as string) || null,
      linked_client_id: selectedProject?.linked_client_id ?? '',
      origin: formData.get('origin') as string,
      scope_delta: formData.get('scope_delta') as string,
      fact_packet_by: 'system', // TODO: from session
    }

    const result = await createChangeOrderAction(data)

    if (result.success && result.data) {
      toast.success(`Change Order ${result.data.reference_id} created`)
      router.push(`/change-orders/${result.data.id}`)
    } else {
      toast.error(result.error ?? 'Failed to create change order')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">New Change Order</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Project */}
          <div className="sm:col-span-2">
            <label htmlFor="linked_project_id" className="block text-sm font-medium text-foreground">
              Project *
            </label>
            <select
              id="linked_project_id"
              name="linked_project_id"
              required
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a project...</option>
              {validProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference_id} — {p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Mobilization (optional) */}
          <div className="sm:col-span-2">
            <label htmlFor="linked_mobilization_id" className="block text-sm font-medium text-foreground">
              Mobilization (optional)
            </label>
            <select
              id="linked_mobilization_id"
              name="linked_mobilization_id"
              defaultValue={preselectedMobilizationId ?? ''}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Project-level (no specific mobilization)</option>
              {projectMobilizations.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.reference_id} — {m.stage_name}
                </option>
              ))}
            </select>
          </div>

          {/* Origin */}
          <div>
            <label htmlFor="origin" className="block text-sm font-medium text-foreground">
              Origin *
            </label>
            <select
              id="origin"
              name="origin"
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select origin...</option>
              {Object.entries(CHANGE_ORDER_ORIGIN_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Delta */}
          <div className="sm:col-span-2">
            <label htmlFor="scope_delta" className="block text-sm font-medium text-foreground">
              Scope Delta Description *
            </label>
            <textarea
              id="scope_delta"
              name="scope_delta"
              required
              rows={4}
              placeholder="Describe what changed..."
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Change Order'}
        </button>
      </div>
    </form>
  )
}
