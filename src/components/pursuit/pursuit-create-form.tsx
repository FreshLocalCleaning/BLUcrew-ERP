'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPursuitSchema, type CreatePursuitInput } from '@/lib/validations/pursuit'
import { createPursuitAction } from '@/actions/pursuit'
import {
  PURSUIT_SIGNAL_TYPES,
  PURSUIT_SIGNAL_LABELS,
  PURSUIT_CLIENT_TYPES,
  PURSUIT_CLIENT_TYPE_LABELS,
  PURSUIT_BUILD_TYPES,
  PURSUIT_BUILD_TYPE_LABELS,
  type Client,
  type Contact,
} from '@/types/commercial'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'

interface PursuitCreateFormProps {
  clients: Client[]
  contacts: Contact[]
}

export function PursuitCreateForm({ clients, contacts }: PursuitCreateFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreatePursuitInput>({
    resolver: zodResolver(createPursuitSchema),
    defaultValues: {
      project_name: '',
      client_id: '',
      client_name: '',
      notes: '',
    },
  })

  const filteredContacts = useMemo(
    () => contacts.filter((c) => c.client_id === selectedClientId),
    [contacts, selectedClientId],
  )

  function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const clientId = e.target.value
    setSelectedClientId(clientId)
    setValue('client_id', clientId)
    const client = clients.find((c) => c.id === clientId)
    setValue('client_name', client?.name ?? '')
    // Reset contact when client changes
    setValue('primary_contact_id', '')
    setValue('primary_contact_name', '')
  }

  function handleContactChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const contactId = e.target.value
    setValue('primary_contact_id', contactId)
    const contact = contacts.find((c) => c.id === contactId)
    setValue('primary_contact_name', contact ? `${contact.first_name} ${contact.last_name}` : '')
  }

  async function onSubmit(data: CreatePursuitInput) {
    setSubmitting(true)
    try {
      const result = await createPursuitAction(data as Record<string, unknown>)
      if (result.success && result.data) {
        toast.success(`Pursuit "${result.data.project_name}" created (${result.data.reference_id})`)
        router.push(`/pursuits/${result.data.id}`)
      } else {
        toast.error(result.error ?? 'Failed to create pursuit')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Project Info */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Project Information</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Project Name */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              {...register('project_name')}
              type="text"
              placeholder="e.g. Crunch Fitness Lewisville"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.project_name && (
              <p className="mt-1 text-xs text-red-400">{errors.project_name.message}</p>
            )}
          </div>

          {/* Client */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Client <span className="text-red-400">*</span>
            </label>
            <select
              onChange={handleClientChange}
              value={selectedClientId}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p className="mt-1 text-xs text-red-400">{errors.client_id.message}</p>
            )}
            <input type="hidden" {...register('client_id')} />
            <input type="hidden" {...register('client_name')} />
          </div>

          {/* Primary Contact */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Primary Contact
            </label>
            <select
              onChange={handleContactChange}
              disabled={!selectedClientId}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">
                {selectedClientId ? 'Select contact...' : 'Select a client first'}
              </option>
              {filteredContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} — {c.title}
                </option>
              ))}
            </select>
            <input type="hidden" {...register('primary_contact_id')} />
            <input type="hidden" {...register('primary_contact_name')} />
          </div>

          {/* Signal Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Signal Type
            </label>
            <select
              {...register('signal_type')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select signal type...</option>
              {PURSUIT_SIGNAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PURSUIT_SIGNAL_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Client Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Client Type
            </label>
            <select
              {...register('client_type')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select client type...</option>
              {PURSUIT_CLIENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PURSUIT_CLIENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Build Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Build Type
            </label>
            <select
              {...register('build_type')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select build type...</option>
              {PURSUIT_BUILD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PURSUIT_BUILD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Location
            </label>
            <input
              {...register('location')}
              type="text"
              placeholder="e.g. Lewisville, TX"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Approx Square Footage */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Approx Square Footage
            </label>
            <input
              {...register('approx_sqft', { valueAsNumber: true })}
              type="number"
              placeholder="e.g. 32500"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Timeline</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Projected Substantial Completion */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Projected Substantial Completion
            </label>
            <input
              {...register('projected_substantial_completion')}
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Target Owner Walk */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Target Owner Walk
            </label>
            <input
              {...register('target_owner_walk')}
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Target Opening */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Target Opening
            </label>
            <input
              {...register('target_opening')}
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Next Action & Notes */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Next Steps</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Next Action */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Next Action
            </label>
            <input
              {...register('next_action')}
              type="text"
              placeholder="e.g. Schedule site walk with GC"
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

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={4}
              placeholder="General notes about this pursuit..."
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
          {submitting ? 'Creating...' : 'Create Pursuit'}
        </button>
      </div>
    </form>
  )
}
