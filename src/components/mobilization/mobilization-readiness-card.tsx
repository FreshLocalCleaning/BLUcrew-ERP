'use client'

import type { ReadinessChecklist } from '@/types/commercial'
import { CheckCircle2, XCircle } from 'lucide-react'

interface MobilizationReadinessCardProps {
  checklist: ReadinessChecklist
  compressedPlanning?: boolean
  exceptionFlag?: boolean
}

const READINESS_LABELS: Record<keyof ReadinessChecklist, string> = {
  crew_confirmed: 'Crew Confirmed',
  equipment_loaded: 'Equipment Loaded',
  travel_booked: 'Travel Booked',
  lodging_booked: 'Lodging Booked',
  per_diem_approved: 'Per Diem Approved',
  jobber_synced: 'Jobber Synced',
  teams_posted: 'Teams Posted',
}

const GATE_FIELDS: (keyof ReadinessChecklist)[] = [
  'crew_confirmed',
  'equipment_loaded',
  'travel_booked',
  'lodging_booked',
  'per_diem_approved',
]

export function MobilizationReadinessCard({
  checklist,
  compressedPlanning,
  exceptionFlag,
}: MobilizationReadinessCardProps) {
  const gateItems = GATE_FIELDS.map((f) => checklist[f])
  const doneCount = gateItems.filter(Boolean).length
  const totalCount = gateItems.length
  const pct = Math.round((doneCount / totalCount) * 100)
  const gateOpen = doneCount === totalCount || (compressedPlanning && exceptionFlag)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">Readiness Gate</h4>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            gateOpen
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {gateOpen ? 'READY' : `${pct}%`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-muted mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-1.5">
        {(Object.keys(READINESS_LABELS) as (keyof ReadinessChecklist)[]).map((key) => {
          const isGateField = GATE_FIELDS.includes(key)
          return (
            <div key={key} className="flex items-center gap-2">
              {checklist[key] ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className={`h-4 w-4 ${isGateField ? 'text-red-500' : 'text-muted-foreground'}`} />
              )}
              <span className={`text-xs ${isGateField ? 'font-medium' : ''} text-foreground`}>
                {READINESS_LABELS[key]}
              </span>
              {isGateField && (
                <span className="text-[10px] text-muted-foreground">(gate)</span>
              )}
            </div>
          )
        })}
      </div>

      {compressedPlanning && exceptionFlag && (
        <div className="mt-3 rounded border border-yellow-300 bg-yellow-50 p-2 text-xs text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
          Compressed planning override active — gate bypassed with Leadership approval
        </div>
      )}
    </div>
  )
}
