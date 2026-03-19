'use client'

/**
 * FLC Estimator Bridge
 *
 * Embeds the FLC Estimator React component (3,736-line single-file app)
 * directly inside the ERP Estimate workspace.
 *
 * The FLC Estimator is a self-contained React component that manages its own
 * state via useState and localStorage. It has no props interface — it renders
 * a 5-step wizard (Project → Drawings → Review → Pricing → Output) with
 * 26 build types, 427 rate bands, BLU3 tier pricing, and AI scope generation.
 *
 * Integration approach:
 * - Render FLCEstimatorApp directly (includes error boundary)
 * - The estimator uses localStorage for save/load (keyed by project name)
 * - Read-only mode shows a summary instead of the full estimator
 */

import dynamic from 'next/dynamic'
import { AlertCircle } from 'lucide-react'
import type { Estimate } from '@/types/commercial'

// Dynamic import with SSR disabled — the FLC Estimator uses window/localStorage
const FLCEstimatorApp = dynamic(
  () => import('./FLC_Estimator'),
  { ssr: false, loading: () => <EstimatorLoading /> },
)

function EstimatorLoading() {
  return (
    <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-border bg-card">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading FLC Estimator...</p>
      </div>
    </div>
  )
}

interface EstimatorBridgeProps {
  estimate: Estimate
  onStateSaved?: (updated: Estimate) => void
  readOnly?: boolean
}

export function EstimatorBridge({ estimate, readOnly = false }: EstimatorBridgeProps) {
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
      {/* Embedded FLC Estimator */}
      <div className="rounded-lg border border-border bg-white">
        <FLCEstimatorApp />
      </div>
    </div>
  )
}
