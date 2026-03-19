'use client'

/**
 * FLC Estimator Bridge
 *
 * Adapter component that will embed the FLC Estimator React component
 * (currently live at estimator.cleantheuniverse.com).
 *
 * Architecture:
 * - Loads the FLC Estimator component when available
 * - Pre-populates from estimator_snapshot when resuming a draft
 * - Captures output (pricing, scope, assumptions) when user finalizes
 * - Calls saveEstimatorState server action to persist
 *
 * IMPORTANT: The FLC Estimator source (FLC_Estimator.jsx) must be added
 * to the repo before this bridge becomes functional. Until then, this
 * renders a placeholder with an iframe fallback to the live app.
 */

import { useState } from 'react'
import { saveEstimatorStateAction } from '@/actions/estimate'
import type { Estimate } from '@/types/commercial'
import { toast } from 'sonner'
import { ExternalLink, Save, AlertCircle } from 'lucide-react'

interface EstimatorBridgeProps {
  estimate: Estimate
  onStateSaved?: (updated: Estimate) => void
  readOnly?: boolean
}

export function EstimatorBridge({ estimate, onStateSaved, readOnly = false }: EstimatorBridgeProps) {
  const [saving, setSaving] = useState(false)
  const [useIframe, setUseIframe] = useState(false)

  // TODO: When FLC_Estimator.jsx is added to the repo, import and render it here:
  //
  // import { FLCEstimator } from '@/components/estimator/FLC_Estimator'
  //
  // <FLCEstimator
  //   initialState={estimate.estimator_snapshot}
  //   projectName={estimate.project_name}
  //   buildType={estimate.build_type}
  //   squareFootage={estimate.square_footage}
  //   onSave={handleEstimatorSave}
  //   readOnly={readOnly}
  // />

  async function handleSaveSnapshot(snapshot: Record<string, unknown>) {
    setSaving(true)
    try {
      const result = await saveEstimatorStateAction({
        id: estimate.id,
        estimator_snapshot: snapshot,
        build_type: (snapshot.buildType as string) ?? estimate.build_type,
        square_footage: (snapshot.squareFootage as number) ?? estimate.square_footage,
        stage_count: (snapshot.stageCount as number) ?? null,
        stage_selections: (snapshot.stageSelections as string[]) ?? [],
        tier_index: (snapshot.tierIndex as number) ?? null,
        base_rate: (snapshot.baseRate as number) ?? null,
        blu3_rate: (snapshot.blu3Rate as number) ?? null,
        surcharges: (snapshot.surcharges as []) ?? [],
        mobilization_cost: (snapshot.mobilizationCost as null) ?? null,
        exterior_cost: (snapshot.exteriorCost as number) ?? null,
        window_cost: (snapshot.windowCost as number) ?? null,
        per_diem_cost: (snapshot.perDiemCost as number) ?? null,
        labor_target_hours: (snapshot.laborTargetHours as number) ?? null,
        assumptions: (snapshot.assumptions as string) ?? null,
        exclusions: (snapshot.exclusions as string) ?? null,
        scope_text: (snapshot.scopeText as string) ?? null,
        pricing_summary: (snapshot.pricingSummary as null) ?? null,
      })

      if (result.success && result.data) {
        toast.success('Estimator state saved to ERP')
        onStateSaved?.(result.data)
      } else {
        toast.error(result.error ?? 'Failed to save estimator state')
      }
    } catch {
      toast.error('Failed to save estimator state')
    } finally {
      setSaving(false)
    }
  }

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
      {/* Estimator placeholder */}
      <div className="rounded-lg border border-dashed border-border bg-card p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">FLC Estimator</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The FLC Estimator component will be embedded here once the source file is added to the repo.
          </p>

          {!useIframe ? (
            <div className="mt-6 space-y-3">
              <button
                onClick={() => setUseIframe(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" />
                Open Estimator (Embedded)
              </button>
              <p className="text-xs text-muted-foreground">
                Opens the live estimator at estimator.cleantheuniverse.com in an embedded frame.
                Data must be manually transferred until the component is integrated.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="overflow-hidden rounded-lg border border-border">
                <iframe
                  src="https://estimator.cleantheuniverse.com"
                  className="h-[800px] w-full"
                  title="FLC Estimator"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setUseIframe(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Close Embedded View
                </button>
                <button
                  onClick={() => {
                    // Placeholder: when the estimator is integrated natively,
                    // this will capture the full state from the component
                    handleSaveSnapshot({
                      _source: 'manual_iframe_transfer',
                      _timestamp: new Date().toISOString(),
                    })
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted/50 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save State to ERP'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Existing snapshot indicator */}
      {estimate.estimator_snapshot && (
        <div className="rounded-md border border-green-800/50 bg-green-900/10 p-3">
          <p className="text-sm text-green-400">
            Saved estimator state available ({Object.keys(estimate.estimator_snapshot).length} fields).
            The embedded estimator will auto-load this state when the component is integrated.
          </p>
        </div>
      )}
    </div>
  )
}
