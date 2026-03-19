'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProposalSchema, type CreateProposalInput } from '@/lib/validations/proposal'
import { createProposalAction } from '@/actions/proposal'
import { ESTIMATE_STATUS_LABELS } from '@/lib/state-machines/estimate'
import type { Estimate } from '@/types/commercial'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'

interface ProposalCreateFormProps {
  /** Only estimates at approved_for_proposal */
  eligibleEstimates: Estimate[]
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

export function ProposalCreateForm({ eligibleEstimates }: ProposalCreateFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [selectedEstimateId, setSelectedEstimateId] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateProposalInput>({
    resolver: zodResolver(createProposalSchema) as any,
    defaultValues: {
      linked_estimate_id: '',
      linked_pursuit_id: '',
      linked_client_id: '',
      linked_client_name: '',
      project_name: '',
      proposal_value: 0,
      version: 1,
    },
  })

  const selectedEstimate = useMemo(
    () => eligibleEstimates.find((e) => e.id === selectedEstimateId),
    [eligibleEstimates, selectedEstimateId],
  )

  function handleEstimateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const estimateId = e.target.value
    setSelectedEstimateId(estimateId)
    setValue('linked_estimate_id', estimateId)

    const estimate = eligibleEstimates.find((est) => est.id === estimateId)
    if (estimate) {
      setValue('project_name', estimate.project_name)
      setValue('linked_pursuit_id', estimate.linked_pursuit_id)
      setValue('linked_client_id', estimate.linked_client_id)
      setValue('linked_client_name', estimate.linked_client_name)
      setValue('proposal_value', estimate.pricing_summary?.grand_total ?? 0)
    }
  }

  async function onSubmit(data: CreateProposalInput) {
    setSubmitting(true)
    try {
      const result = await createProposalAction(data as Record<string, unknown>)
      if (result.success && result.data) {
        toast.success(`Proposal "${result.data.project_name}" created (${result.data.reference_id})`)
        router.push(`/proposals/${result.data.id}`)
      } else {
        toast.error(result.error ?? 'Failed to create proposal')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Estimate Gate */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Estimate Gate</h2>
        <p className="text-sm text-muted-foreground">
          A Proposal can only be created from an Estimate at &ldquo;Approved for Proposal&rdquo; status.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Approved Estimate <span className="text-red-400">*</span>
          </label>
          <select
            onChange={handleEstimateChange}
            value={selectedEstimateId}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select an approved estimate...</option>
            {eligibleEstimates.map((e) => (
              <option key={e.id} value={e.id}>
                {e.reference_id} — {e.project_name} ({e.linked_client_name}, {ESTIMATE_STATUS_LABELS[e.status]})
                {e.pricing_summary ? ` — ${formatCurrency(e.pricing_summary.grand_total)}` : ''}
              </option>
            ))}
          </select>
          {errors.linked_estimate_id && (
            <p className="mt-1 text-xs text-red-400">{errors.linked_estimate_id.message}</p>
          )}
          <input type="hidden" {...register('linked_estimate_id')} />
          {eligibleEstimates.length === 0 && (
            <p className="mt-2 text-xs text-amber-400">
              No approved estimates available. An Estimate must pass QA review before creating a Proposal.
            </p>
          )}
        </div>
      </div>

      {/* Proposal Details */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Proposal Details</h2>

        {selectedEstimate && (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs uppercase text-muted-foreground">Client</span>
                <p className="text-foreground">{selectedEstimate.linked_client_name}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-muted-foreground">Build Type</span>
                <p className="text-foreground">{selectedEstimate.build_type ?? '—'}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-muted-foreground">Estimate Total</span>
                <p className="text-foreground">{formatCurrency(selectedEstimate.pricing_summary?.grand_total)}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-muted-foreground">Estimate Version</span>
                <p className="text-foreground">v{selectedEstimate.version}</p>
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.project_name && (
              <p className="mt-1 text-xs text-red-400">{errors.project_name.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Proposal Value ($) <span className="text-red-400">*</span>
            </label>
            <input
              {...register('proposal_value', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.proposal_value && (
              <p className="mt-1 text-xs text-red-400">{errors.proposal_value.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Delivery Date
            </label>
            <input
              {...register('delivery_date')}
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Decision Target Date
            </label>
            <input
              {...register('decision_target_date')}
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">External Notes</label>
            <textarea
              {...register('external_notes')}
              rows={3}
              placeholder="Notes visible on the proposal..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <input type="hidden" {...register('linked_pursuit_id')} />
        <input type="hidden" {...register('linked_client_id')} />
        <input type="hidden" {...register('linked_client_name')} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Creating...' : 'Create & Deliver Proposal'}
        </button>
      </div>
    </form>
  )
}
