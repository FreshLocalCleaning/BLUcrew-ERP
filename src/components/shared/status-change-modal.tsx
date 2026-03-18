'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { ArrowRight, X } from 'lucide-react'
import type { TransitionDef } from '@/lib/state-machines/engine'

interface StatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  currentState: string
  currentStateLabel: string
  availableTransitions: TransitionDef<string>[]
  stateLabels: Record<string, string>
  onConfirm: (targetState: string, reason: string) => void
}

export function StatusChangeModal({
  isOpen,
  onClose,
  currentState,
  currentStateLabel,
  availableTransitions,
  stateLabels,
  onConfirm,
}: StatusChangeModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  const selected = availableTransitions.find((t) => t.toState === selectedTarget)
  const needsReason = selected?.requiresReason ?? false
  const canSubmit =
    selectedTarget !== null && (!needsReason || reason.trim().length > 0)

  function handleConfirm() {
    if (!selectedTarget) return
    onConfirm(selectedTarget, reason)
    setSelectedTarget(null)
    setReason('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Change Status
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current state */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <StatusBadge state={currentState} label={currentStateLabel} />
        </div>

        {/* Transition options */}
        <div className="mb-4 space-y-2">
          <span className="text-sm font-medium text-muted-foreground">
            Move to:
          </span>
          {availableTransitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transitions available from this state with your current
              permissions.
            </p>
          ) : (
            <div className="space-y-2">
              {availableTransitions.map((t) => (
                <button
                  key={t.toState}
                  onClick={() => {
                    setSelectedTarget(t.toState)
                    setReason('')
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                    selectedTarget === t.toState
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground/30',
                  )}
                >
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {t.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      → {stateLabels[t.toState] ?? t.toState}
                      {t.requiresReason && ' (reason required)'}
                      {t.requiresApproval && ' (approval required)'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reason input */}
        {selected && (needsReason || true) && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Reason{needsReason ? ' (required)' : ' (optional)'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for this status change..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium',
              canSubmit
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            Confirm Change
          </button>
        </div>
      </div>
    </div>
  )
}
