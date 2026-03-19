'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEstimateSchema, type CreateEstimateInput } from '@/lib/validations/estimate'
import { createEstimateAction } from '@/actions/estimate'
import type { Pursuit } from '@/types/commercial'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'
import { PURSUIT_STAGE_LABELS } from '@/lib/state-machines/pursuit'

interface EstimateCreateFormProps {
  /** All pursuits at estimate_ready */
  eligiblePursuits: Pursuit[]
  /** Pursuit IDs that already have a non-superseded estimate */
  pursuitsWithExistingEstimate?: string[]
  preselectedPursuitId?: string
}

export function EstimateCreateForm({ eligiblePursuits, pursuitsWithExistingEstimate, preselectedPursuitId }: EstimateCreateFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // Pre-select pursuit if provided via URL param
  const prePursuit = preselectedPursuitId ? eligiblePursuits.find(p => p.id === preselectedPursuitId) : undefined
  const [selectedPursuitId, setSelectedPursuitId] = useState(preselectedPursuitId ?? '')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateEstimateInput>({
    resolver: zodResolver(createEstimateSchema),
    defaultValues: {
      linked_pursuit_id: prePursuit?.id ?? '',
      linked_client_id: prePursuit?.client_id ?? '',
      linked_client_name: prePursuit?.client_name ?? '',
      linked_pursuit_name: prePursuit?.project_name ?? '',
      project_name: prePursuit?.project_name ?? '',
      build_type: prePursuit?.build_type ?? undefined,
      square_footage: prePursuit?.approx_sqft ?? undefined,
    },
  })

  const selectedPursuit = useMemo(
    () => eligiblePursuits.find((p) => p.id === selectedPursuitId),
    [eligiblePursuits, selectedPursuitId],
  )

  function handlePursuitChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const pursuitId = e.target.value
    setSelectedPursuitId(pursuitId)
    setValue('linked_pursuit_id', pursuitId)

    const pursuit = eligiblePursuits.find((p) => p.id === pursuitId)
    if (pursuit) {
      setValue('project_name', pursuit.project_name)
      setValue('linked_client_id', pursuit.client_id)
      setValue('linked_client_name', pursuit.client_name)
      setValue('linked_pursuit_name', pursuit.project_name)
      setValue('build_type', pursuit.build_type ?? null)
      setValue('square_footage', pursuit.approx_sqft ?? null)
    }
  }

  async function onSubmit(data: CreateEstimateInput) {
    setSubmitting(true)
    try {
      const result = await createEstimateAction(data as Record<string, unknown>)
      if (result.success && result.data) {
        toast.success(`Estimate "${result.data.project_name}" created (${result.data.reference_id})`)
        router.push(`/estimates/${result.data.id}`)
      } else {
        toast.error(result.error ?? 'Failed to create estimate')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Pursuit Gate */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Pursuit Gate</h2>
        <p className="text-sm text-muted-foreground">
          An Estimate can only be created from a Pursuit at &ldquo;Estimate Ready&rdquo; status.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Estimate-Ready Pursuit <span className="text-red-400">*</span>
          </label>
          <select
            onChange={handlePursuitChange}
            value={selectedPursuitId}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select an estimate-ready pursuit...</option>
            {eligiblePursuits.map((p) => {
              const hasExisting = pursuitsWithExistingEstimate?.includes(p.id)
              return (
                <option key={p.id} value={p.id}>
                  {p.project_name} — {p.reference_id} ({p.client_name}){hasExisting ? ' (has existing estimate)' : ''}
                </option>
              )
            })}
          </select>
          {errors.linked_pursuit_id && (
            <p className="mt-1 text-xs text-red-400">{errors.linked_pursuit_id.message}</p>
          )}
          <input type="hidden" {...register('linked_pursuit_id')} />
          {eligiblePursuits.length === 0 && (
            <p className="mt-2 text-xs text-amber-400">
              No estimate-ready pursuits available. Advance a Pursuit to &ldquo;Estimate Ready&rdquo; first.
            </p>
          )}
        </div>
      </div>

      {/* Project Info (pre-filled from pursuit) */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Project Information</h2>
        {selectedPursuit && (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs uppercase text-muted-foreground">Client</span>
                <p className="text-foreground">{selectedPursuit.client_name}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-muted-foreground">Build Type</span>
                <p className="text-foreground">{selectedPursuit.build_type ?? '—'}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-muted-foreground">Location</span>
                <p className="text-foreground">{selectedPursuit.location ?? '—'}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-muted-foreground">Approx SF</span>
                <p className="text-foreground">{selectedPursuit.approx_sqft?.toLocaleString() ?? '—'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
        </div>

        <input type="hidden" {...register('linked_client_id')} />
        <input type="hidden" {...register('linked_client_name')} />
        <input type="hidden" {...register('linked_pursuit_name')} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Creating...' : 'Create Estimate'}
        </button>
      </div>
    </form>
  )
}
