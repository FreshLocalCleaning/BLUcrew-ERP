'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StateRibbon } from '@/components/shared/state-ribbon'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  PURSUIT_STAGE_LABELS,
  PURSUIT_ACTIVE_STAGES,
  pursuitStateMachine,
  type PursuitStage,
} from '@/lib/state-machines/pursuit'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import { transitionPursuitAction } from '@/actions/pursuit'
import {
  PURSUIT_BUILD_TYPE_LABELS,
  PURSUIT_SIGNAL_LABELS,
  PURSUIT_CLIENT_TYPE_LABELS,
  type Pursuit,
} from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import {
  ArrowLeftRight,
  Pencil,
  CalendarDays,
  FileText,
  XCircle,
  Building2,
  MapPin,
  Ruler,
  Clock,
  Target,
  Users,
  Briefcase,
  Signal,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PursuitDetailProps {
  pursuit: Pursuit
  auditLog: AuditEntry[]
}

export function PursuitDetail({ pursuit: initialPursuit, auditLog }: PursuitDetailProps) {
  const router = useRouter()
  const [pursuit, setPursuit] = useState(initialPursuit)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [noBidModalOpen, setNoBidModalOpen] = useState(false)
  const [noBidReason, setNoBidReason] = useState('')

  const actorRoles: Role[] = ['COM_LEAD']

  const availableTransitions = getAvailableTransitions(
    pursuitStateMachine,
    pursuit.stage,
    actorRoles,
  )

  async function handleStageChange(targetState: string, reason: string) {
    const result = await transitionPursuitAction({
      pursuit_id: pursuit.id,
      target_stage: targetState,
      reason: reason || undefined,
      approval_granted: true,
    })

    if (result.success && result.data) {
      setPursuit(result.data)
      toast.success(`Stage changed to ${PURSUIT_STAGE_LABELS[result.data.stage]}`)
      setStatusModalOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change stage')
    }
  }

  async function handleNoBid() {
    if (!noBidReason.trim()) {
      toast.error('A reason is required for No-Bid')
      return
    }

    const result = await transitionPursuitAction({
      pursuit_id: pursuit.id,
      target_stage: 'no_bid',
      reason: noBidReason,
    })

    if (result.success && result.data) {
      setPursuit(result.data)
      toast.success('Pursuit marked as No-Bid')
      setNoBidModalOpen(false)
      setNoBidReason('')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to no-bid pursuit')
    }
  }

  const dueDate = pursuit.next_action_date
    ? new Date(pursuit.next_action_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined

  const currentStageIndex = PURSUIT_ACTIVE_STAGES.indexOf(pursuit.stage)

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* State Ribbon */}
        <StateRibbon
          currentState={pursuit.stage}
          stateLabel={PURSUIT_STAGE_LABELS[pursuit.stage]}
          nextAction={
            pursuit.next_action
              ? `${pursuit.next_action}${dueDate ? ` (due ${dueDate})` : ''}`
              : undefined
          }
        />

        {/* Project Details Card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Project Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem icon={Building2} label="Project Name" value={pursuit.project_name} />
            <DetailItem icon={FileText} label="Reference ID" value={pursuit.reference_id} mono />
            <DetailItem icon={Users} label="Client" value={pursuit.client_name} />
            <DetailItem
              icon={Users}
              label="Primary Contact"
              value={pursuit.primary_contact_name ?? '—'}
            />
            <DetailItem
              icon={Signal}
              label="Signal Type"
              value={pursuit.signal_type ? PURSUIT_SIGNAL_LABELS[pursuit.signal_type] : '—'}
            />
            <DetailItem
              icon={Briefcase}
              label="Client Type"
              value={pursuit.client_type ? PURSUIT_CLIENT_TYPE_LABELS[pursuit.client_type] : '—'}
            />
            <DetailItem
              icon={Target}
              label="Build Type"
              value={pursuit.build_type ? PURSUIT_BUILD_TYPE_LABELS[pursuit.build_type] : '—'}
            />
            <DetailItem icon={MapPin} label="Location" value={pursuit.location ?? '—'} />
            <DetailItem
              icon={Ruler}
              label="Approx SF"
              value={pursuit.approx_sqft ? pursuit.approx_sqft.toLocaleString() : '—'}
            />
            <DetailItem
              icon={Clock}
              label="Created"
              value={new Date(pursuit.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            />
            <DetailItem
              icon={CalendarDays}
              label="Substantial Completion"
              value={formatDate(pursuit.projected_substantial_completion)}
            />
            <DetailItem
              icon={CalendarDays}
              label="Owner Walk"
              value={formatDate(pursuit.target_owner_walk)}
            />
            <DetailItem
              icon={CalendarDays}
              label="Target Opening"
              value={formatDate(pursuit.target_opening)}
            />
          </div>
          {pursuit.notes && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{pursuit.notes}</p>
            </div>
          )}
          {pursuit.no_bid_reason && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase text-red-400">No-Bid Reason</p>
              <p className="mt-1 text-sm text-red-300 whitespace-pre-wrap">{pursuit.no_bid_reason}</p>
            </div>
          )}
        </div>

        {/* Site Walk Events */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Site Walk Events</h2>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Schedule Walk
            </button>
          </div>
          <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              No site walks scheduled yet.
            </p>
          </div>
        </div>

        {/* Closeout Plans */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Closeout Plans</h2>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              <FileText className="h-3.5 w-3.5" />
              New Plan
            </button>
          </div>
          <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              No closeout plans created yet.
            </p>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Activity Timeline</h2>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {auditLog
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {formatAction(entry.action)}
                        </span>
                        {entry.action === 'update' && entry.field_changes['stage'] && (
                          <StatusBadge
                            state={String(entry.field_changes['stage'].to)}
                            label={PURSUIT_STAGE_LABELS[entry.field_changes['stage'].to as PursuitStage]}
                          />
                        )}
                      </div>
                      {entry.reason && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Reason: {entry.reason}
                        </p>
                      )}
                      {entry.action === 'update' &&
                        Object.keys(entry.field_changes).length > 0 &&
                        !entry.field_changes['stage'] && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Changed: {Object.keys(entry.field_changes).join(', ')}
                          </p>
                        )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {entry.actor_id}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden w-72 shrink-0 space-y-6 lg:block">
        {/* Stage Progression Tracker */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Stage Progression
          </h3>
          <div className="space-y-1">
            {PURSUIT_ACTIVE_STAGES.map((stage, idx) => {
              const isCurrent = stage === pursuit.stage
              const isCompleted = currentStageIndex >= 0 && idx < currentStageIndex
              const isNoBid = pursuit.stage === 'no_bid'

              return (
                <div
                  key={stage}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                    isCurrent && !isNoBid && 'bg-primary/10 font-medium text-primary',
                    isCompleted && !isNoBid && 'text-green-400',
                    !isCurrent && !isCompleted && 'text-muted-foreground',
                    isNoBid && 'text-muted-foreground',
                  )}
                >
                  {isCompleted && !isNoBid ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  ) : isCurrent && !isNoBid ? (
                    <Target className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  <span>{PURSUIT_STAGE_LABELS[stage]}</span>
                </div>
              )
            })}
            {pursuit.stage === 'no_bid' && (
              <div className="flex items-center gap-2 rounded-md bg-red-900/20 px-2 py-1.5 text-xs font-medium text-red-400">
                <XCircle className="h-3.5 w-3.5" />
                <span>No Bid</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Actions
          </h3>
          {pursuit.stage !== 'no_bid' && (
            <>
              <button
                onClick={() => setStatusModalOpen(true)}
                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
              >
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                Advance Stage
              </button>
              <button className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                Edit
              </button>
              <button className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Schedule Site Walk
              </button>
              <button className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Create Closeout Plan
              </button>
              <button
                onClick={() => setNoBidModalOpen(true)}
                className="flex w-full items-center gap-2 rounded-md border border-red-800/50 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20"
              >
                <XCircle className="h-4 w-4" />
                No-Bid This Pursuit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentState={pursuit.stage}
        currentStateLabel={PURSUIT_STAGE_LABELS[pursuit.stage]}
        availableTransitions={availableTransitions}
        stateLabels={PURSUIT_STAGE_LABELS}
        onConfirm={handleStageChange}
      />

      {/* No-Bid Modal */}
      {noBidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-foreground">No-Bid This Pursuit</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              This will move the pursuit to No-Bid status. A reason is required.
            </p>
            <textarea
              value={noBidReason}
              onChange={(e) => setNoBidReason(e.target.value)}
              placeholder="Enter reason for no-bidding this pursuit..."
              rows={4}
              className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setNoBidModalOpen(false)
                  setNoBidReason('')
                }}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleNoBid}
                disabled={!noBidReason.trim()}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  noBidReason.trim()
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                Confirm No-Bid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DetailItem({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatAction(action: string): string {
  switch (action) {
    case 'create':
      return 'Pursuit created'
    case 'update':
      return 'Pursuit updated'
    case 'delete':
      return 'Pursuit archived'
    case 'transition':
      return 'Stage changed'
    default:
      return action
  }
}
