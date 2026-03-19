'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StateRibbon } from '@/components/shared/state-ribbon'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  PROPOSAL_STATUS_LABELS,
  proposalStateMachine,
  type ProposalStatus,
} from '@/lib/state-machines/proposal'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import { transitionProposalAction } from '@/actions/proposal'
import { PROPOSAL_ACCEPTANCE_METHOD_LABELS } from '@/types/commercial'
import type { Proposal, ProposalAcceptanceMethod } from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import {
  ArrowLeftRight,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProposalDetailProps {
  proposal: Proposal
  auditLog: AuditEntry[]
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProposalDetail({ proposal: initialProposal, auditLog }: ProposalDetailProps) {
  const router = useRouter()
  const [proposal, setProposal] = useState(initialProposal)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [acceptMethod, setAcceptMethod] = useState<ProposalAcceptanceMethod | ''>('')

  const actorRoles: Role[] = ['commercial_bd']

  const availableTransitions = getAvailableTransitions(
    proposalStateMachine,
    proposal.status,
    actorRoles,
  )

  async function handleStatusChange(targetState: string, reason: string) {
    // For acceptance, open the special accept modal
    if (targetState === 'accepted') {
      setStatusModalOpen(false)
      setAcceptModalOpen(true)
      return
    }

    const result = await transitionProposalAction({
      proposal_id: proposal.id,
      target_status: targetState,
      reason: reason || undefined,
      approval_granted: true,
    })

    if (result.success && result.data) {
      setProposal(result.data)
      toast.success(`Status changed to ${PROPOSAL_STATUS_LABELS[result.data.status]}`)
      setStatusModalOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change status')
    }
  }

  async function handleAccept() {
    if (!acceptMethod) {
      toast.error('Acceptance confirmation method is required')
      return
    }

    const result = await transitionProposalAction({
      proposal_id: proposal.id,
      target_status: 'accepted',
      acceptance_confirmation_method: acceptMethod,
    })

    if (result.success && result.data) {
      setProposal(result.data)
      toast.success('Proposal accepted! Award/Handoff will be created.')
      setAcceptModalOpen(false)
      setAcceptMethod('')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to accept proposal')
    }
  }

  const dueDate = proposal.next_action_date
    ? new Date(proposal.next_action_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : undefined

  const isTerminal = proposal.status === 'accepted' || proposal.status === 'rejected'

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* State Ribbon */}
        <StateRibbon
          currentState={proposal.status}
          stateLabel={PROPOSAL_STATUS_LABELS[proposal.status]}
          nextAction={
            proposal.next_action
              ? `${proposal.next_action}${dueDate ? ` (due ${dueDate})` : ''}`
              : undefined
          }
        />

        {/* Proposal Details */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Proposal Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem icon={Building2} label="Project Name" value={proposal.project_name} />
            <DetailItem icon={FileText} label="Reference ID" value={proposal.reference_id} mono />
            <DetailItem icon={Users} label="Client" value={proposal.linked_client_name} />
            <DetailItem icon={DollarSign} label="Proposal Value" value={formatCurrency(proposal.proposal_value)} />
            <DetailItem icon={Calendar} label="Delivery Date" value={formatDate(proposal.delivery_date)} />
            <DetailItem icon={Calendar} label="Decision Target" value={formatDate(proposal.decision_target_date)} />
            <DetailItem icon={Clock} label="Created" value={formatDate(proposal.created_at)} />
            <DetailItem icon={FileText} label="Version" value={`v${proposal.version}`} />
          </div>

          {proposal.external_notes && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">External Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{proposal.external_notes}</p>
            </div>
          )}
        </div>

        {/* Decision Outcome */}
        {(proposal.status === 'accepted' || proposal.status === 'rejected') && (
          <div className={cn(
            'rounded-lg border p-6',
            proposal.status === 'accepted'
              ? 'border-green-800/50 bg-green-900/10'
              : 'border-red-800/50 bg-red-900/10',
          )}>
            <div className="flex items-center gap-2">
              {proposal.status === 'accepted' ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <h2 className={cn(
                'text-lg font-semibold',
                proposal.status === 'accepted' ? 'text-green-400' : 'text-red-400',
              )}>
                {proposal.status === 'accepted' ? 'Proposal Accepted' : 'Proposal Rejected'}
              </h2>
            </div>
            {proposal.acceptance_confirmation_method && (
              <p className="mt-2 text-sm text-foreground">
                Confirmed via: {PROPOSAL_ACCEPTANCE_METHOD_LABELS[proposal.acceptance_confirmation_method]}
              </p>
            )}
            {proposal.accepted_rejected_reason && (
              <p className="mt-2 text-sm text-foreground">
                Reason: {proposal.accepted_rejected_reason}
              </p>
            )}
            {proposal.created_award_id && (
              <p className="mt-2 text-xs text-muted-foreground">
                Award/Handoff: {proposal.created_award_id}
              </p>
            )}
          </div>
        )}

        {/* Activity Timeline */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Activity Timeline</h2>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {auditLog.slice().reverse().map((entry) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {entry.action === 'create' ? 'Proposal created' : entry.action === 'update' ? 'Proposal updated' : entry.action}
                      </span>
                      {entry.action === 'update' && entry.field_changes['status'] && (
                        <StatusBadge
                          state={String(entry.field_changes['status'].to)}
                          label={PROPOSAL_STATUS_LABELS[entry.field_changes['status'].to as ProposalStatus]}
                        />
                      )}
                    </div>
                    {entry.reason && (
                      <p className="mt-0.5 text-xs text-muted-foreground">Reason: {entry.reason}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                      {' · '}{entry.actor_id}
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
        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Actions
          </h3>
          {!isTerminal && (
            <button
              onClick={() => setStatusModalOpen(true)}
              className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
            >
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              Change Status
            </button>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentState={proposal.status}
        currentStateLabel={PROPOSAL_STATUS_LABELS[proposal.status]}
        availableTransitions={availableTransitions}
        stateLabels={PROPOSAL_STATUS_LABELS}
        onConfirm={handleStatusChange}
      />

      {/* Accept Modal */}
      {acceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-foreground">Accept Proposal</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              This will mark the proposal as accepted and create an Award/Handoff record.
              How was the acceptance confirmed?
            </p>
            <select
              value={acceptMethod}
              onChange={(e) => setAcceptMethod(e.target.value as ProposalAcceptanceMethod)}
              className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select confirmation method...</option>
              {Object.entries(PROPOSAL_ACCEPTANCE_METHOD_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setAcceptModalOpen(false); setAcceptMethod('') }}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!acceptMethod}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  acceptMethod
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                Confirm Acceptance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailItem({
  icon: Icon, label, value, mono,
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
