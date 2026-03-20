'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/status-badge'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { PROJECT_SIGNAL_STATE_LABELS, projectSignalStateMachine } from '@/lib/state-machines/project-signal'
import type { ProjectSignalState } from '@/lib/state-machines/project-signal'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import {
  transitionProjectSignalAction,
  updateProjectSignalAction,
} from '@/actions/project-signal'
import {
  PROJECT_SIGNAL_TYPE_LABELS,
  PROJECT_SIGNAL_GATE_LABELS,
  PROJECT_SIGNAL_TYPES,
  type ProjectSignal,
  type ProjectSignalType,
} from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import type { Client, Contact } from '@/types/commercial'
import {
  FileText,
  Building2,
  User,
  Zap,
  Clock,
  Shield,
  ArrowRight,
  CalendarClock,
  ArrowLeftRight,
  Pencil,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SignalDetailProps {
  signal: ProjectSignal
  auditLog: AuditEntry[]
  clientName?: string
  clients: Client[]
  contacts: Contact[]
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SignalDetail({ signal: initialSignal, auditLog, clientName, clients, contacts }: SignalDetailProps) {
  const router = useRouter()
  const [signal, setSignal] = useState(initialSignal)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deferModalOpen, setDeferModalOpen] = useState(false)
  const [deferReason, setDeferReason] = useState('')
  const [failModalOpen, setFailModalOpen] = useState(false)
  const [failReason, setFailReason] = useState('')
  const [revertModalOpen, setRevertModalOpen] = useState(false)
  const [revertReason, setRevertReason] = useState('')

  // Edit form state
  const [editProjectIdentity, setEditProjectIdentity] = useState(signal.project_identity)
  const [editSignalType, setEditSignalType] = useState<ProjectSignalType>(signal.signal_type)
  const [editSourceEvidence, setEditSourceEvidence] = useState(signal.source_evidence)
  const [editTimingSignal, setEditTimingSignal] = useState(signal.timing_signal ?? '')
  const [editFitRiskNote, setEditFitRiskNote] = useState(signal.fit_risk_note ?? '')
  const [editClientId, setEditClientId] = useState(signal.linked_client_id)
  const [editContactId, setEditContactId] = useState(signal.linked_contact_id ?? '')

  const actorRoles: Role[] = ['leadership_system_admin', 'commercial_bd']

  const availableTransitions = getAvailableTransitions(
    projectSignalStateMachine,
    signal.status,
    actorRoles,
  )

  const canPassGate = signal.status === 'under_review' &&
    signal.linked_client_id &&
    signal.linked_contact_id &&
    signal.project_identity &&
    signal.signal_type &&
    signal.source_evidence &&
    signal.timing_signal &&
    signal.fit_risk_note

  // Gate readiness criteria (visible only in received/under_review)
  const showGateReadiness = signal.status === 'received' || signal.status === 'under_review'
  const gateCriteria = [
    { key: 'project_identity', label: 'Real Project', met: !!signal.project_identity },
    { key: 'linked_client_id', label: 'Client Linked', met: !!signal.linked_client_id },
    { key: 'linked_contact_id', label: 'Contact Linked', met: !!signal.linked_contact_id },
    { key: 'signal_type', label: 'Signal Type Set', met: !!signal.signal_type },
    { key: 'source_evidence', label: 'Source Evidence', met: !!signal.source_evidence },
    { key: 'timing_signal', label: 'Timing Signal', met: !!signal.timing_signal },
    { key: 'fit_risk_note', label: 'Fit Assessment', met: !!signal.fit_risk_note },
  ] as const
  const gateMetCount = gateCriteria.filter((c) => c.met).length
  const gateTotalCount = gateCriteria.length

  const canDefer = signal.status === 'under_review'
  const canFail = signal.status === 'under_review'
  const showCreatePursuit = signal.status === 'passed' && signal.gate_outcome === 'passed' && !signal.created_pursuit_id
  const canRevertGate = signal.status === 'passed' && signal.gate_outcome === 'passed'

  const filteredContacts = contacts.filter((c) => c.client_id === editClientId)

  // --- Handlers ---

  async function handleStatusChange(targetState: string, reason: string) {
    const result = await transitionProjectSignalAction({
      signal_id: signal.id,
      target_state: targetState,
      reason: reason || undefined,
      approval_granted: true,
    })
    setStatusModalOpen(false)
    if (result.success && result.data) {
      setSignal(result.data)
      toast.success(`Status changed to ${PROJECT_SIGNAL_STATE_LABELS[targetState as ProjectSignalState] ?? targetState}`)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change status')
    }
  }

  async function handlePassGate() {
    const result = await transitionProjectSignalAction({
      signal_id: signal.id,
      target_state: 'passed',
      approval_granted: true,
    })
    if (result.success && result.data) {
      setSignal(result.data)
      toast.success('Gate passed — Pursuit creation enabled')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to pass gate')
    }
  }

  async function handleDefer() {
    if (!deferReason.trim()) return
    const result = await transitionProjectSignalAction({
      signal_id: signal.id,
      target_state: 'deferred',
      reason: deferReason,
      approval_granted: true,
    })
    setDeferModalOpen(false)
    setDeferReason('')
    if (result.success && result.data) {
      setSignal(result.data)
      toast.success('Signal deferred')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to defer signal')
    }
  }

  async function handleFail() {
    if (!failReason.trim()) return
    const result = await transitionProjectSignalAction({
      signal_id: signal.id,
      target_state: 'failed',
      reason: failReason,
      approval_granted: true,
    })
    setFailModalOpen(false)
    setFailReason('')
    if (result.success && result.data) {
      setSignal(result.data)
      toast.success('Signal failed')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to update signal')
    }
  }

  async function handleRevert() {
    if (!revertReason.trim()) return
    const result = await transitionProjectSignalAction({
      signal_id: signal.id,
      target_state: 'under_review',
      reason: revertReason,
      approval_granted: true,
    })
    setRevertModalOpen(false)
    setRevertReason('')
    if (result.success && result.data) {
      setSignal(result.data)
      toast.success('Gate reverted to Under Review')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to revert gate')
    }
  }

  function startEditing() {
    setEditProjectIdentity(signal.project_identity)
    setEditSignalType(signal.signal_type)
    setEditSourceEvidence(signal.source_evidence)
    setEditTimingSignal(signal.timing_signal ?? '')
    setEditFitRiskNote(signal.fit_risk_note ?? '')
    setEditClientId(signal.linked_client_id)
    setEditContactId(signal.linked_contact_id ?? '')
    setEditing(true)
  }

  async function handleSaveEdit() {
    setSaving(true)
    const selectedClient = clients.find((c) => c.id === editClientId)
    const selectedContact = contacts.find((c) => c.id === editContactId)

    const result = await updateProjectSignalAction({
      id: signal.id,
      project_identity: editProjectIdentity,
      signal_type: editSignalType,
      source_evidence: editSourceEvidence,
      timing_signal: editTimingSignal || null,
      fit_risk_note: editFitRiskNote || null,
      linked_client_id: editClientId,
      linked_contact_id: editContactId || undefined,
    })
    setSaving(false)

    if (result.success && result.data) {
      // Update local state with denormalized names
      const updated = {
        ...result.data,
        linked_client_name: selectedClient?.name ?? result.data.linked_client_name,
        linked_contact_name: selectedContact
          ? `${selectedContact.first_name} ${selectedContact.last_name}`
          : result.data.linked_contact_name,
      }
      setSignal(updated)
      setEditing(false)
      toast.success('Signal updated')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to save changes')
    }
  }

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* Status ribbon */}
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
            <StatusBadge state={signal.status} label={PROJECT_SIGNAL_STATE_LABELS[signal.status]} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Gate Outcome</p>
            <StatusBadge state={signal.gate_outcome} label={PROJECT_SIGNAL_GATE_LABELS[signal.gate_outcome]} />
          </div>
          {signal.next_action && (
            <div className="flex-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">Next Action</p>
              <p className="text-sm text-foreground">{signal.next_action}</p>
            </div>
          )}
        </div>

        {/* Signal Details Card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Signal Details</h2>
            {editing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            /* --- Edit Mode --- */
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                  Project Identity
                </label>
                <input
                  type="text"
                  value={editProjectIdentity}
                  onChange={(e) => setEditProjectIdentity(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                  Signal Type
                </label>
                <select
                  value={editSignalType}
                  onChange={(e) => setEditSignalType(e.target.value as ProjectSignalType)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {PROJECT_SIGNAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PROJECT_SIGNAL_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                  Source Evidence
                </label>
                <textarea
                  value={editSourceEvidence}
                  onChange={(e) => setEditSourceEvidence(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                  Timing Signal
                </label>
                <input
                  type="text"
                  value={editTimingSignal}
                  onChange={(e) => setEditTimingSignal(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                  Fit / Risk Note
                </label>
                <textarea
                  value={editFitRiskNote}
                  onChange={(e) => setEditFitRiskNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                  Client
                </label>
                <select
                  value={editClientId}
                  onChange={(e) => {
                    setEditClientId(e.target.value)
                    setEditContactId('')
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                  Contact
                </label>
                <select
                  value={editContactId}
                  onChange={(e) => setEditContactId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select contact…</option>
                  {filteredContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* --- Read Mode --- */
            <>
              {/* Project Identity — the key field */}
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-medium uppercase text-primary/70">Project</p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">{signal.project_identity}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem icon={FileText} label="Reference ID" value={signal.reference_id} mono />
                <DetailItem icon={Zap} label="Signal Type" value={PROJECT_SIGNAL_TYPE_LABELS[signal.signal_type]} />
                <DetailItem
                  icon={Building2}
                  label="Client"
                  value={signal.linked_client_name}
                  href={`/clients/${signal.linked_client_id}`}
                />
                {signal.linked_contact_name && (
                  <DetailItem
                    icon={User}
                    label="Contact"
                    value={signal.linked_contact_name}
                    href={signal.linked_contact_id ? `/contacts/${signal.linked_contact_id}` : undefined}
                  />
                )}
                {signal.timing_signal && (
                  <DetailItem icon={CalendarClock} label="Timing Signal" value={signal.timing_signal} />
                )}
                {signal.fit_risk_note && (
                  <DetailItem icon={Shield} label="Fit/Risk Note" value={signal.fit_risk_note} />
                )}
                <DetailItem icon={Clock} label="Created" value={formatDate(signal.created_at)} />
                {signal.gate_decision_date && (
                  <DetailItem icon={Clock} label="Gate Decision Date" value={formatDate(signal.gate_decision_date)} />
                )}
              </div>

              {signal.source_evidence && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Source Evidence</p>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{signal.source_evidence}</p>
                </div>
              )}
              {signal.notes && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{signal.notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Linked Pursuit */}
        {signal.created_pursuit_id && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center gap-3">
              <ArrowRight className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                  Pursuit Opened
                </p>
                <Link
                  href={`/pursuits/${signal.created_pursuit_id}`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  View Pursuit →
                </Link>
              </div>
            </div>
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
                    <span className="text-sm font-medium text-foreground">
                      {entry.action === 'create' ? 'Signal created' : entry.action === 'update' ? 'Signal updated' : entry.action}
                    </span>
                    {entry.reason && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{entry.reason}</p>
                    )}
                    {entry.action === 'update' && Object.keys(entry.field_changes).length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Changed: {Object.keys(entry.field_changes).join(', ')}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTimestamp(entry.timestamp)} · {entry.actor_id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden w-72 shrink-0 space-y-4 lg:block">
        {/* Quick Info */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Quick Info
          </h3>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
            <StatusBadge state={signal.status} label={PROJECT_SIGNAL_STATE_LABELS[signal.status]} />
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Gate</p>
            <StatusBadge state={signal.gate_outcome} label={PROJECT_SIGNAL_GATE_LABELS[signal.gate_outcome]} />
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Created</p>
            <p className="text-sm text-foreground">{formatDate(signal.created_at)}</p>
          </div>
        </div>

        {/* Gate Readiness */}
        {showGateReadiness && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gate Readiness
            </h3>
            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {gateMetCount}/{gateTotalCount} Ready
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round((gateMetCount / gateTotalCount) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    gateMetCount === gateTotalCount ? 'bg-green-500' : 'bg-yellow-500',
                  )}
                  style={{ width: `${(gateMetCount / gateTotalCount) * 100}%` }}
                />
              </div>
              <div className="space-y-1.5">
                {gateCriteria.map((c) => (
                  <div key={c.key} className="flex items-center gap-2">
                    {c.met ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={cn('text-sm', c.met ? 'text-foreground' : 'text-muted-foreground')}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Actions
          </h3>

          {/* Pass Gate — prominent green button */}
          {canPassGate && (
            <button
              onClick={handlePassGate}
              className="flex w-full items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Pass Gate
            </button>
          )}

          {/* Create Pursuit — shown after gate passed */}
          {showCreatePursuit && (
            <Link
              href={`/pursuits/new?signalId=${signal.id}`}
              className="flex w-full items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Create Pursuit
            </Link>
          )}

          {/* Revert Gate — leadership only, shown when passed */}
          {canRevertGate && (
            <button
              onClick={() => setRevertModalOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-600"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Revert to Under Review
            </button>
          )}

          {/* Defer — yellow */}
          {canDefer && (
            <button
              onClick={() => setDeferModalOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-600"
            >
              <PauseCircle className="h-4 w-4" />
              Defer
            </button>
          )}

          {/* Fail — red */}
          {canFail && (
            <button
              onClick={() => setFailModalOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            >
              <XCircle className="h-4 w-4" />
              Fail
            </button>
          )}

          {/* Change Status — opens modal with all available transitions */}
          {availableTransitions.length > 0 && (
            <button
              onClick={() => setStatusModalOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Change Status
            </button>
          )}

          {/* Edit — toggles edit mode */}
          {!editing && (
            <button
              onClick={startEditing}
              className="flex w-full items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentState={signal.status}
        currentStateLabel={PROJECT_SIGNAL_STATE_LABELS[signal.status]}
        availableTransitions={availableTransitions}
        stateLabels={PROJECT_SIGNAL_STATE_LABELS}
        onConfirm={handleStatusChange}
      />

      {/* Defer Modal */}
      {deferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Defer Signal</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Provide a reason for deferring this signal.
            </p>
            <textarea
              value={deferReason}
              onChange={(e) => setDeferReason(e.target.value)}
              placeholder="Reason for deferral…"
              rows={3}
              className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeferModalOpen(false); setDeferReason('') }}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDefer}
                disabled={!deferReason.trim()}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  deferReason.trim()
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                Confirm Defer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fail Modal */}
      {failModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Fail Signal</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Provide a reason for failing this signal.
            </p>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Reason for failure…"
              rows={3}
              className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setFailModalOpen(false); setFailReason('') }}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleFail}
                disabled={!failReason.trim()}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  failReason.trim()
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                Confirm Fail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert Gate Modal */}
      {revertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-foreground">Revert to Under Review</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              This will revert the gate outcome back to Pending and return the signal to Under Review.
            </p>
            {signal.created_pursuit_id && (
              <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-900/20 p-3">
                <p className="text-sm font-medium text-amber-300">Warning</p>
                <p className="mt-1 text-xs text-amber-200">
                  A pursuit was already created from this signal. Reverting will NOT delete
                  the pursuit but will unlink it from this signal.
                </p>
                <Link
                  href={`/pursuits/${signal.created_pursuit_id}`}
                  className="mt-1 inline-block text-xs text-amber-300 hover:underline"
                >
                  View linked pursuit →
                </Link>
              </div>
            )}
            <textarea
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              placeholder="Reason for reverting (e.g. Passed in error, Need more info)…"
              rows={3}
              className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRevertModalOpen(false); setRevertReason('') }}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleRevert}
                disabled={!revertReason.trim()}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  revertReason.trim()
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                Confirm Revert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailItem({
  icon: Icon,
  label,
  value,
  mono,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  mono?: boolean
  href?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        {href ? (
          <Link href={href} className={`text-sm text-primary hover:underline ${mono ? 'font-mono' : ''}`}>
            {value}
          </Link>
        ) : (
          <p className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
        )}
      </div>
    </div>
  )
}
