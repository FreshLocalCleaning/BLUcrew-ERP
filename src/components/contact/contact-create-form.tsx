'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createContactSchema, type CreateContactInput } from '@/lib/validations/contact'
import { createContactAction } from '@/actions/contact'
import {
  CONTACT_LAYERS,
  CONTACT_LAYER_LABELS,
  CONTACT_INFLUENCE_LEVELS,
  CONTACT_INFLUENCE_LABELS,
  CONTACT_RELATIONSHIP_STRENGTHS,
  CONTACT_RELATIONSHIP_LABELS,
  CONTACT_SOURCE_CHANNELS,
  CONTACT_SOURCE_LABELS,
  CONTACT_PREFERRED_CHANNELS,
  CONTACT_PREFERRED_CHANNEL_LABELS,
  type Client,
} from '@/types/commercial'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { roleToLayer } from '@/lib/contacts/utils'

interface ContactCreateFormProps {
  clients: Client[]
}

export function ContactCreateForm({ clients }: ContactCreateFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema) as any,
    defaultValues: {
      first_name: '',
      last_name: '',
      is_champion: false,
      influence: 'medium',
      relationship_strength: 'new',
      layer: 'pm_super_field',
    },
  })

  const isChampion = watch('is_champion')
  const roleType = watch('role_type')

  // FIX 4: Auto-set layer when role_type changes
  useEffect(() => {
    if (roleType) {
      const inferredLayer = roleToLayer(roleType)
      if (inferredLayer) {
        setValue('layer', inferredLayer)
      }
    }
  }, [roleType, setValue])

  async function onSubmit(data: CreateContactInput) {
    setSubmitting(true)
    try {
      const result = await createContactAction(data as unknown as Record<string, unknown>)
      if (result.success && result.data) {
        toast.success(
          `Contact "${result.data.first_name} ${result.data.last_name}" created (${result.data.reference_id})`,
        )
        router.push(`/contacts/${result.data.id}`)
      } else {
        toast.error(result.error ?? 'Failed to create contact')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Info */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              First Name <span className="text-red-400">*</span>
            </label>
            <input {...register('first_name')} type="text" placeholder="e.g. Megan" className={inputClass} />
            {errors.first_name && <p className="mt-1 text-xs text-red-400">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input {...register('last_name')} type="text" placeholder="e.g. Torres" className={inputClass} />
            {errors.last_name && <p className="mt-1 text-xs text-red-400">{errors.last_name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Title</label>
            <input {...register('title')} type="text" placeholder="e.g. Project Manager" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Company</label>
            <input {...register('company')} type="text" placeholder="e.g. Summit Peak Builders" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Client <span className="text-red-400">*</span>
            </label>
            <select {...register('client_id')} className={inputClass}>
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.reference_id})
                </option>
              ))}
            </select>
            {errors.client_id && <p className="mt-1 text-xs text-red-400">{errors.client_id.message}</p>}
          </div>
        </div>
      </div>

      {/* Classification */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Classification</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Contact Layer <span className="text-red-400">*</span>
            </label>
            <select {...register('layer')} className={inputClass}>
              {CONTACT_LAYERS.map((l) => (
                <option key={l} value={l}>{CONTACT_LAYER_LABELS[l]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Role Type</label>
            <input {...register('role_type')} type="text" placeholder="e.g. Senior PM, VP Ops" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Influence Level <span className="text-red-400">*</span>
            </label>
            <select {...register('influence')} className={inputClass}>
              {CONTACT_INFLUENCE_LEVELS.map((i) => (
                <option key={i} value={i}>{CONTACT_INFLUENCE_LABELS[i]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Relationship Strength <span className="text-red-400">*</span>
            </label>
            <select {...register('relationship_strength')} className={inputClass}>
              {CONTACT_RELATIONSHIP_STRENGTHS.map((r) => (
                <option key={r} value={r}>{CONTACT_RELATIONSHIP_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Source Channel</label>
            <select {...register('source_channel')} className={inputClass}>
              <option value="">Select source...</option>
              {CONTACT_SOURCE_CHANNELS.map((s) => (
                <option key={s} value={s}>{CONTACT_SOURCE_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Champion toggle */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register('is_champion')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-ring"
                />
                <span className="text-sm font-medium text-foreground">BLU Champion</span>
              </label>
            </div>
            {isChampion && (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Champion Reason
                </label>
                <textarea
                  {...register('champion_reason')}
                  rows={2}
                  placeholder="Why is this person a champion for BLU Crew?"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Contact Details</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
            <input {...register('email')} type="email" placeholder="email@company.com" className={inputClass} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Phone</label>
            <input {...register('phone')} type="tel" placeholder="214-555-0100" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">LinkedIn URL</label>
            <input {...register('linkedin_url')} type="url" placeholder="https://linkedin.com/in/..." className={inputClass} />
            {errors.linkedin_url && <p className="mt-1 text-xs text-red-400">{errors.linkedin_url.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Preferred Channel</label>
            <select {...register('preferred_channel')} className={inputClass}>
              <option value="">Select channel...</option>
              {CONTACT_PREFERRED_CHANNELS.map((c) => (
                <option key={c} value={c}>{CONTACT_PREFERRED_CHANNEL_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Intel */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Intel & Notes</h2>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Project Visibility Notes
            </label>
            <textarea
              {...register('project_visibility_notes')}
              rows={2}
              placeholder="What upcoming projects do they have visibility into?"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Access Path</label>
            <input
              {...register('access_path')}
              type="text"
              placeholder="How do we reach this person? Who introduced us?"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Pain Points</label>
            <textarea
              {...register('pain_points')}
              rows={2}
              placeholder="What are their known pain points with post-construction cleaning?"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="General notes..."
              className={inputClass}
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
          {submitting ? 'Creating...' : 'Create Contact'}
        </button>
      </div>
    </form>
  )
}
