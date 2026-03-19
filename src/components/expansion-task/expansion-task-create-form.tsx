'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createExpansionTaskAction } from '@/actions/expansion-task'
import { EXPANSION_TASK_TYPE_LABELS } from '@/types/commercial'
import type { Project } from '@/types/commercial'
import { toast } from 'sonner'

interface ExpansionTaskCreateFormProps {
  projects: Project[]
  preselectedProjectId?: string
}

export function ExpansionTaskCreateForm({ projects, preselectedProjectId }: ExpansionTaskCreateFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const projectId = formData.get('linked_project_id') as string
    const selectedProject = projects.find((p) => p.id === projectId)

    const data: Record<string, unknown> = {
      linked_project_id: projectId,
      linked_client_id: selectedProject?.linked_client_id ?? '',
      task_type: formData.get('task_type') as string,
      growth_objective: formData.get('growth_objective') as string,
      due_date: formData.get('due_date') as string,
    }

    const result = await createExpansionTaskAction(data)

    if (result.success && result.data) {
      toast.success(`Expansion Task ${result.data.reference_id} created`)
      router.push(`/growth/${result.data.id}`)
    } else {
      toast.error(result.error ?? 'Failed to create expansion task')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">New Expansion Task</h2>

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
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference_id} — {p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Task Type */}
          <div>
            <label htmlFor="task_type" className="block text-sm font-medium text-foreground">
              Task Type *
            </label>
            <select
              id="task_type"
              name="task_type"
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select type...</option>
              {Object.entries(EXPANSION_TASK_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-foreground">
              Due Date *
            </label>
            <input
              id="due_date"
              name="due_date"
              type="date"
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Growth Objective */}
          <div className="sm:col-span-2">
            <label htmlFor="growth_objective" className="block text-sm font-medium text-foreground">
              Growth Objective *
            </label>
            <textarea
              id="growth_objective"
              name="growth_objective"
              required
              rows={4}
              placeholder="Describe the growth objective..."
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
          {submitting ? 'Creating...' : 'Create Expansion Task'}
        </button>
      </div>
    </form>
  )
}
