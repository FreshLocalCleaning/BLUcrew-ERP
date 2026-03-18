'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClientSchema, type CreateClientInput } from '@/lib/validations/client'
import { createClientAction } from '@/actions/client'
import {
  CLIENT_TIERS,
  CLIENT_TIER_LABELS,
  CLIENT_VERTICALS,
  CLIENT_VERTICAL_LABELS,
  CLIENT_MARKETS,
  CLIENT_MARKET_LABELS,
  CLIENT_RELATIONSHIP_STRENGTHS,
  CLIENT_RELATIONSHIP_LABELS,
} from '@/types/commercial'
import { toast } from 'sonner'
import { useState } from 'react'

export function ClientCreateForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      notes: '',
    },
  })

  async function onSubmit(data: CreateClientInput) {
    setSubmitting(true)
    try {
      const result = await createClientAction(data as Record<string, unknown>)
      if (result.success && result.data) {
        toast.success(`Client "${result.data.name}" created (${result.data.reference_id})`)
        router.push(`/clients/${result.data.id}`)
      } else {
        toast.error(result.error ?? 'Failed to create client')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Company Name */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Client Information</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Summit Peak Builders"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Tier */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Tier
            </label>
            <select
              {...register('tier')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select tier...</option>
              {CLIENT_TIERS.map((t) => (
                <option key={t} value={t}>
                  {CLIENT_TIER_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Vertical */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Primary Vertical
            </label>
            <select
              {...register('vertical')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select vertical...</option>
              {CLIENT_VERTICALS.map((v) => (
                <option key={v} value={v}>
                  {CLIENT_VERTICAL_LABELS[v]}
                </option>
              ))}
            </select>
          </div>

          {/* Market */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Market
            </label>
            <select
              {...register('market')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select market...</option>
              {CLIENT_MARKETS.map((m) => (
                <option key={m} value={m}>
                  {CLIENT_MARKET_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          {/* Relationship Strength */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Relationship Strength
            </label>
            <select
              {...register('relationship_strength')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select strength...</option>
              {CLIENT_RELATIONSHIP_STRENGTHS.map((r) => (
                <option key={r} value={r}>
                  {CLIENT_RELATIONSHIP_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {/* Next Action */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Next Action
            </label>
            <input
              {...register('next_action')}
              type="text"
              placeholder="e.g. Schedule intro call"
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
              placeholder="General notes about this client..."
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
          {submitting ? 'Creating...' : 'Create Client'}
        </button>
      </div>
    </form>
  )
}
