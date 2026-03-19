'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMobilizationAction } from '@/actions/mobilization'
import type { Project } from '@/types/commercial'
import { toast } from 'sonner'

interface MobilizationCreateFormProps {
  projects: Project[]
  preselectedProjectId?: string
}

export function MobilizationCreateForm({ projects, preselectedProjectId }: MobilizationCreateFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const validProjects = projects.filter(
    (p) => p.status === 'forecasting_active' || p.status === 'execution_active',
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {
      linked_project_id: formData.get('linked_project_id') as string,
      linked_client_id: '',
      stage_name: formData.get('stage_name') as string,
      travel_posture: formData.get('travel_posture') as string,
      site_address: (formData.get('site_address') as string) || null,
      requested_start_date: (formData.get('requested_start_date') as string) || null,
      requested_end_date: (formData.get('requested_end_date') as string) || null,
    }

    // Look up the client ID from the selected project
    const selectedProject = validProjects.find((p) => p.id === data.linked_project_id)
    if (selectedProject) {
      data.linked_client_id = selectedProject.linked_client_id
    }

    const result = await createMobilizationAction(data)

    if (result.success && result.data) {
      toast.success(`Mobilization ${result.data.reference_id} created`)
      router.push(`/mobilizations/${result.data.id}`)
    } else {
      toast.error(result.error ?? 'Failed to create mobilization')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">New Mobilization</h2>

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
              defaultValue={preselectedProjectId ?? ''}
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

          {/* Stage Name */}
          <div className="sm:col-span-2">
            <label htmlFor="stage_name" className="block text-sm font-medium text-foreground">
              Stage Name *
            </label>
            <input
              id="stage_name"
              name="stage_name"
              type="text"
              required
              placeholder="e.g. Trip 1 — Rough Clean"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Travel Posture */}
          <div>
            <label htmlFor="travel_posture" className="block text-sm font-medium text-foreground">
              Travel Posture
            </label>
            <select
              id="travel_posture"
              name="travel_posture"
              defaultValue="local"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="local">Local</option>
              <option value="overnight">Overnight</option>
            </select>
          </div>

          {/* Site Address */}
          <div>
            <label htmlFor="site_address" className="block text-sm font-medium text-foreground">
              Site Address
            </label>
            <input
              id="site_address"
              name="site_address"
              type="text"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Requested Start Date */}
          <div>
            <label htmlFor="requested_start_date" className="block text-sm font-medium text-foreground">
              Requested Start Date
            </label>
            <input
              id="requested_start_date"
              name="requested_start_date"
              type="date"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Requested End Date */}
          <div>
            <label htmlFor="requested_end_date" className="block text-sm font-medium text-foreground">
              Requested End Date
            </label>
            <input
              id="requested_end_date"
              name="requested_end_date"
              type="date"
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
          {submitting ? 'Creating...' : 'Create Mobilization'}
        </button>
      </div>
    </form>
  )
}
