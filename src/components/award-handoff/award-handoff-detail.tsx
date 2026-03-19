'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StateRibbon } from '@/components/shared/state-ribbon'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  AWARD_HANDOFF_STATE_LABELS,
  awardHandoffStateMachine,
  type AwardHandoffState,
} from '@/lib/state-machines/award-handoff'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import {
  transitionAwardHandoffAction,
  addComplianceDocAction,
  addStartupBlockerAction,
  resolveBlockerAction,
} from '@/actions/award-handoff'
import type { AwardHandoff, ComplianceDocItem } from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import {
  ArrowLeftRight,
  FileText,
  DollarSign,
  Building2,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserPlus,
  Send,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AwardHandoffDetailProps {
  awardHandoff: AwardHandoff
  auditLog: AuditEntry[]
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
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

type Tab = 'overview' | 'compliance' | 'blockers' | 'handoff' | 'activity'

export function AwardHandoffDetail({ awardHandoff: initial, auditLog }: AwardHandoffDetailProps) {
  const router = useRouter()
  const [awardHandoff, setAwardHandoff] = useState(initial)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [newDocName, setNewDocName] = useState('')
  const [newDocRequired, setNewDocRequired] = useState(true)
  const [newBlocker, setNewBlocker] = useState('')
  const [newBlockerOwner, setNewBlockerOwner] = useState('')

  const actorRoles: Role[] = ['leadership_system_admin', 'commercial_bd', 'pm_ops']

  const availableTransitions = getAvailableTransitions(
    awardHandoffStateMachine,
    awardHandoff.status,
    actorRoles,
  )

  const isTerminal = awardHandoff.status === 'closed_to_ops'

  async function handleStatusChange(targetState: string, reason: string) {
    const input: Record<string, unknown> = {
      award_handoff_id: awardHandoff.id,
      target_status: targetState,
      reason: reason || undefined,
      approval_granted: true,
    }

    // For PM claim, set the claim user
    if (targetState === 'pm_claimed') {
      input.pm_claim_user_id = 'cullen' // TODO: use actual session user
    }

    const result = await transitionAwardHandoffAction(input)

    if (result.success && result.data) {
      setAwardHandoff(result.data)
      toast.success(`Status changed to ${AWARD_HANDOFF_STATE_LABELS[result.data.status]}`)
      setStatusModalOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change status')
    }
  }

  async function handleAddDoc() {
    if (!newDocName.trim()) return
    const result = await addComplianceDocAction({
      award_handoff_id: awardHandoff.id,
      doc: {
        doc_name: newDocName.trim(),
        required: newDocRequired,
        status: 'pending',
        received_date: null,
        notes: null,
      },
    })
    if (result.success && result.data) {
      setAwardHandoff(result.data)
      setNewDocName('')
      toast.success('Compliance document added')
    } else {
      toast.error(result.error ?? 'Failed to add document')
    }
  }

  async function handleUpdateDoc(doc: ComplianceDocItem, newStatus: 'received' | 'waived' | 'pending') {
    const result = await addComplianceDocAction({
      award_handoff_id: awardHandoff.id,
      doc: {
        ...doc,
        status: newStatus,
        received_date: newStatus === 'received' ? new Date().toISOString() : doc.received_date,
      },
    })
    if (result.success && result.data) {
      setAwardHandoff(result.data)
      toast.success(`"${doc.doc_name}" marked as ${newStatus}`)
    } else {
      toast.error(result.error ?? 'Failed to update document')
    }
  }

  async function handleAddBlocker() {
    if (!newBlocker.trim() || !newBlockerOwner.trim()) return
    const result = await addStartupBlockerAction({
      award_handoff_id: awardHandoff.id,
      blocker: newBlocker.trim(),
      owner: newBlockerOwner.trim(),
    })
    if (result.success && result.data) {
      setAwardHandoff(result.data)
      setNewBlocker('')
      setNewBlockerOwner('')
      toast.success('Startup blocker added')
    } else {
      toast.error(result.error ?? 'Failed to add blocker')
    }
  }

  async function handleResolveBlocker(index: number) {
    const result = await resolveBlockerAction({
      award_handoff_id: awardHandoff.id,
      blocker_index: index,
    })
    if (result.success && result.data) {
      setAwardHandoff(result.data)
      toast.success('Blocker resolved')
    } else {
      toast.error(result.error ?? 'Failed to resolve blocker')
    }
  }

  const complianceDone = awardHandoff.compliance_tracker.filter((d) => d.status !== 'pending').length
  const complianceTotal = awardHandoff.compliance_tracker.length
  const compliancePercent = complianceTotal > 0 ? Math.round((complianceDone / complianceTotal) * 100) : 0
  const openBlockers = awardHandoff.startup_blockers.filter((b) => b.status === 'open').length

  const snapshot = awardHandoff.accepted_baseline_snapshot
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'compliance', label: `Compliance (${compliancePercent}%)` },
    { key: 'blockers', label: `Blockers (${openBlockers})` },
    { key: 'handoff', label: 'Handoff' },
    { key: 'activity', label: 'Activity' },
  ]

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* State Ribbon */}
        <StateRibbon
          currentState={awardHandoff.status}
          stateLabel={AWARD_HANDOFF_STATE_LABELS[awardHandoff.status]}
          nextAction={awardHandoff.next_action ?? undefined}
        />

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Award Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem icon={Building2} label="Project Name" value={awardHandoff.project_name} />
                <DetailItem icon={FileText} label="Reference ID" value={awardHandoff.reference_id} mono />
                <DetailItem icon={DollarSign} label="Proposal Value" value={formatCurrency(snapshot?.proposal_value as number)} />
                <DetailItem icon={FileText} label="Build Type" value={String(snapshot?.build_type ?? '—')} />
                <DetailItem icon={FileText} label="Square Footage" value={snapshot?.square_footage ? `${Number(snapshot.square_footage).toLocaleString()} SF` : '—'} />
                <DetailItem icon={Clock} label="Created" value={formatDate(awardHandoff.created_at)} />
              </div>
            </div>

            {/* Baseline Snapshot */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Accepted Baseline</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Frozen pricing snapshot from estimate at time of proposal acceptance.
              </p>
              {snapshot?.scope_text ? (
                <div className="mb-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Scope</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{String(snapshot.scope_text)}</p>
                </div>
              ) : null}
              {snapshot?.assumptions ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Assumptions</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{String(snapshot.assumptions)}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Compliance Progress</span>
                <span className="text-sm text-muted-foreground">{complianceDone}/{complianceTotal}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${compliancePercent}%` }}
                />
              </div>
            </div>

            {/* Compliance checklist */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Compliance Documents</h2>
              <div className="space-y-3">
                {awardHandoff.compliance_tracker.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border border-border p-3">
                    {doc.status === 'received' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                    ) : doc.status === 'waived' ? (
                      <XCircle className="h-5 w-5 text-amber-400 shrink-0" />
                    ) : (
                      <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{doc.doc_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.required ? 'Required' : 'Optional'} · {doc.status}
                        {doc.received_date && ` · ${formatDate(doc.received_date)}`}
                      </p>
                    </div>
                    {doc.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdateDoc(doc, 'received')}
                          className="rounded px-2 py-1 text-xs text-green-400 border border-green-800/50 hover:bg-green-900/20"
                        >
                          Received
                        </button>
                        <button
                          onClick={() => handleUpdateDoc(doc, 'waived')}
                          className="rounded px-2 py-1 text-xs text-amber-400 border border-amber-800/50 hover:bg-amber-900/20"
                        >
                          Waive
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new doc */}
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Document name..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={newDocRequired}
                    onChange={(e) => setNewDocRequired(e.target.checked)}
                    className="rounded"
                  />
                  Required
                </label>
                <button
                  onClick={handleAddDoc}
                  disabled={!newDocName.trim()}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'blockers' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Startup Blockers</h2>
              {awardHandoff.startup_blockers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No startup blockers recorded.</p>
              ) : (
                <div className="space-y-3">
                  {awardHandoff.startup_blockers.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-md border border-border p-3">
                      {b.status === 'resolved' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{b.blocker}</p>
                        <p className="text-xs text-muted-foreground">
                          Owner: {b.owner} · {b.status}
                          {b.resolved_date && ` · Resolved ${formatDate(b.resolved_date)}`}
                        </p>
                      </div>
                      {b.status === 'open' && (
                        <button
                          onClick={() => handleResolveBlocker(i)}
                          className="rounded px-2 py-1 text-xs text-green-400 border border-green-800/50 hover:bg-green-900/20"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new blocker */}
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newBlocker}
                  onChange={(e) => setNewBlocker(e.target.value)}
                  placeholder="Blocker description..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={newBlockerOwner}
                  onChange={(e) => setNewBlockerOwner(e.target.value)}
                  placeholder="Owner..."
                  className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={handleAddBlocker}
                  disabled={!newBlocker.trim() || !newBlockerOwner.trim()}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'handoff' && (
          <div className="space-y-4">
            {/* PM Claim section */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">PM Assignment</h2>
              {awardHandoff.pm_claim_user_id ? (
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Claimed by: {awardHandoff.pm_claim_user_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(awardHandoff.pm_claim_timestamp)}
                    </p>
                  </div>
                </div>
              ) : awardHandoff.status === 'handoff_posted' ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    This handoff is posted and waiting for a PM to claim it.
                  </p>
                  <button
                    onClick={() => handleStatusChange('pm_claimed', '')}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <UserPlus className="h-4 w-4" />
                    Claim This Handoff
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  PM assignment happens after handoff is posted.
                </p>
              )}
            </div>

            {/* Teams handoff */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Teams Handoff Post</h2>
              {awardHandoff.teams_handoff_post_url ? (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  <a href={awardHandoff.teams_handoff_post_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    View Teams Post
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No Teams handoff post yet.</p>
              )}
            </div>

            {/* Completeness summary */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Handoff Completeness</h2>
              <div className="space-y-2">
                <CompletionRow label="Compliance docs complete" done={complianceDone === complianceTotal && complianceTotal > 0} />
                <CompletionRow label="No open blockers" done={openBlockers === 0} />
                <CompletionRow label="PM assigned" done={!!awardHandoff.pm_claim_user_id} />
                <CompletionRow label="Project created" done={!!awardHandoff.created_project_id} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
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
                          {entry.action === 'create' ? 'Record created' : entry.action === 'update' ? 'Record updated' : entry.action}
                        </span>
                        {entry.action === 'update' && entry.field_changes['status'] && (
                          <StatusBadge
                            state={String(entry.field_changes['status'].to)}
                            label={AWARD_HANDOFF_STATE_LABELS[entry.field_changes['status'].to as AwardHandoffState]}
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
        )}
      </div>

      {/* Right Sidebar */}
      <div className="hidden w-72 shrink-0 space-y-6 lg:block">
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
          {awardHandoff.created_project_id && (
            <a
              href={`/projects/${awardHandoff.created_project_id}`}
              className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              View Project
            </a>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentState={awardHandoff.status}
        currentStateLabel={AWARD_HANDOFF_STATE_LABELS[awardHandoff.status]}
        availableTransitions={availableTransitions}
        stateLabels={AWARD_HANDOFF_STATE_LABELS}
        onConfirm={handleStatusChange}
      />
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

function CompletionRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-green-400" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={cn('text-sm', done ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
    </div>
  )
}
