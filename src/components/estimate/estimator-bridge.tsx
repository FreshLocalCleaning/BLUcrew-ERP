'use client'

/**
 * BLU Crew Estimator Bridge
 *
 * Embeds the BLU Crew Estimator React component inside the ERP Estimate workspace.
 * Auto-populates estimator fields from ERP Estimate record data, or resumes from
 * a saved estimator_snapshot if one exists.
 */

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import type { Estimate } from '@/types/commercial'

// Dynamic import with SSR disabled — the estimator uses window/localStorage
const FLCEstimatorApp = dynamic(
  () => import('./FLC_Estimator'),
  { ssr: false, loading: () => <EstimatorLoading /> },
)

function EstimatorLoading() {
  return (
    <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-border bg-card">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading BLU Crew Estimator...</p>
      </div>
    </div>
  )
}

interface EstimatorBridgeProps {
  estimate: Estimate
  onStateSaved?: (updated: Estimate) => void
  readOnly?: boolean
}

/**
 * Build initialData from ERP estimate record for the estimator.
 * If estimator_snapshot exists (saved session), use that.
 * Otherwise, pre-populate from estimate fields.
 */
function buildInitialData(estimate: Estimate): Record<string, unknown> | null {
  // Resume from snapshot if available
  if (estimate.estimator_snapshot && Object.keys(estimate.estimator_snapshot).length > 0) {
    return estimate.estimator_snapshot
  }

  // Build initial data from ERP estimate fields
  const hasAnyData = estimate.project_name || estimate.build_type || estimate.square_footage
  if (!hasAnyData) return null

  const proj: Record<string, unknown> = {
    name: estimate.project_name || '',
    client: estimate.linked_client_name || '',
    bt: estimate.build_type || '',
    sf: estimate.square_footage ? String(estimate.square_footage) : '',
    baseMob: 900,
    city: '',
    miles: 0,
    msa: false,
    extSF: '',
    extTire: false,
    winEnabled: false,
    winPanes: '',
    winHeight: 'standard',
    winSeparate: true,
    crewSize: '',
    perDiemRate: '',
    perDiemOverride: false,
    perDiemReason: '',
    tierReason: '',
    daysOverride: '',
    notes: '',
  }

  const sel = estimate.stage_selections?.length > 0
    ? estimate.stage_selections
    : ['preEquip', 'prePunch', 'final', 'go']

  return {
    proj,
    sel,
    tier: estimate.tier_index ?? 3,
    areas: [],
    surch: {},
    scope: '',
    step: 0,
  }
}

export function EstimatorBridge({ estimate, readOnly = false }: EstimatorBridgeProps) {
  const initialData = useMemo(() => buildInitialData(estimate), [estimate])

  if (readOnly) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Read-Only Mode</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          This estimate is no longer editable. View the pricing summary in the Summary tab.
        </p>
        {estimate.estimator_snapshot && (
          <p className="mt-1 text-xs text-muted-foreground">
            Estimator snapshot saved with {Object.keys(estimate.estimator_snapshot).length} fields.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Embedded BLU Crew Estimator */}
      <div className="rounded-lg border border-border bg-white">
        <FLCEstimatorApp initialData={initialData} />
      </div>
    </div>
  )
}
