'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProjectSignalSchema, type CreateProjectSignalInput } from '@/lib/validations/project-signal'
import { createProjectSignalAction } from '@/actions/project-signal'
import {
  PROJECT_SIGNAL_TYPES,
  PROJECT_SIGNAL_TYPE_LABELS,
  type Client,
  type Contact,
} from '@/types/commercial'
import { toast } from 'sonner'
import { useState } from 'react'

interface SignalCreateFormProps {
  clients: Client[]
  contacts: Contact[]
}

export function SignalCreateForm({ clients, contacts }: SignalCreateFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateProjectSignalInput>({
    resolver: zodResolver(createProjectSignalSchema),
    defaultValues: {
      source_evidence: '',
      project_identity: '',
      notes: '',
    },
  })

  const watchedClientId = watch('linked_client_id')

  // Filter contacts to selected client
  const filteredContacts = contacts.filter((c) => c.client_id === (watchedClientId || selectedClientId))

  async function onSubmit(data: CreateProjectSignalInput) {
    setSubmitting(true)
    try {
      const result = await createProjectSignalAction(data as Record<string, unknown>)
      if (result.success && result.data) {
        toast.success(`Signal "${result.data.project_identity}" created (${result.data.reference_id})`)
        router.push(`/project-signals/${result.data.id}`)
      } else {
        toast.error(result.error ?? 'Failed to create signal')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Signal Information</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Project Identity */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Project Name / Description <span className="text-red-400">*</span>
            </label>
            <input
              {...register('project_identity')}
              type="text"
              placeholder="e.g. Crunch Fitness Lewisville — new build-out"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.project_identity && (
              <p className="mt-1 text-xs text-red-400">{errors.project_identity.message}</p>
            )}
          </div>

          {/* Signal Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Signal Type <span className="text-red-400">*</span>
            </label>
            <select
              {...register('signal_type')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select type...</option>
              {PROJECT_SIGNAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PROJECT_SIGNAL_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {errors.signal_type && (
              <p className="mt-1 text-xs text-red-400">{errors.signal_type.message}</p>
            )}
          </div>

          {/* Client */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Client <span className="text-red-400">*</span>
            </label>
            <select
              {...register('linked_client_id', {
                onChange: (e) => {
                  setSelectedClientId(e.target.value)
                  setValue('linked_contact_id', '')
                },
              })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.reference_id})
                </option>
              ))}
            </select>
            {errors.linked_client_id && (
              <p className="mt-1 text-xs text-red-400">{errors.linked_client_id.message}</p>
            )}
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Contact
            </label>
            <select
              {...register('linked_contact_id')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select contact...</option>
              {filteredContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} — {c.title ?? c.role_type ?? ''}
                </option>
              ))}
            </select>
          </div>

          {/* Source Evidence */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Source Evidence <span className="text-red-400">*</span>
            </label>
            <textarea
              {...register('source_evidence')}
              rows={3}
              placeholder="How did we learn about this opportunity? Include dates, names, context..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.source_evidence && (
              <p className="mt-1 text-xs text-red-400">{errors.source_evidence.message}</p>
            )}
          </div>

          {/* Timing Signal */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Timing Signal
            </label>
            <input
              {...register('timing_signal')}
              type="text"
              placeholder="e.g. Substantial completion Q3 2026"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Next Action */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Next Action
            </label>
            <input
              {...register('next_action')}
              type="text"
              placeholder="e.g. Verify project scope with contact"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Next Action Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Next Action Date
            </label>
            <input
              {...register('next_action_date')}
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Fit/Risk Note */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Fit / Risk Note
            </label>
            <input
              {...register('fit_risk_note')}
              type="text"
              placeholder="e.g. Good fit for DFW team, cleanroom protocols needed"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Additional context..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Signal'}
        </button>
      </div>
    </form>
  )
}
