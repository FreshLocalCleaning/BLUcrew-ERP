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
import { transitionPursuitAction, updatePursuitAction } from '@/actions/pursuit'
import { createSiteWalkAction } from '@/actions/site-walk'
import { createCloseoutPlanAction } from '@/actions/closeout-plan'
import {
  PURSUIT_BUILD_TYPE_LABELS,
  PURSUIT_BUILD_TYPES,
  PURSUIT_SIGNAL_LABELS,
  PURSUIT_SIGNAL_TYPES,
  PURSUIT_CLIENT_TYPE_LABELS,
  PURSUIT_CLIENT_TYPES,
  SITE_WALK_STATUS_LABELS,
  CLOSEOUT_PLAN_STATUS_LABELS,
  type Pursuit,
  type Client,
  type Contact,
  type SiteWalkEvent,
  type CloseoutPlan,
  type PursuitBuildType,
  type PursuitSignalType,
  type PursuitClientType,
} from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import Link from 'next/link'
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
  Calculator,
  Plus,
} from 'lucide-react'
import { ESTIMATE_STATUS_LABELS, type EstimateStatus } from '@/lib/state-machines/estimate'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LinkedEstimateInfo {
  id: string
  reference_id: string
  status: EstimateStatus
}

interface PursuitDetailProps {
  pursuit: Pursuit
  auditLog: AuditEntry[]
  linkedEstimate?: LinkedEstimateInfo | null
  clients: Client[]
  contacts: Contact[]
  siteWalks: SiteWalkEvent[]
  closeoutPlans: CloseoutPlan[]
}

export function PursuitDetail({
  pursuit: initialPursuit,
  auditLog,
  linkedEstimate,
  clients,
  contacts,
  siteWalks: initialSiteWalks,
  closeoutPlans: initialCloseoutPlans,
}: PursuitDetailProps) {
  const router = useRouter()
  const [pursuit, setPursuit] = useState(initialPursuit)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [noBidModalOpen, setNoBidModalOpen] = useState(false)
  const [noBidReason, setNoBidReason] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Site Walk modal state
  const [siteWalkModalOpen, setSiteWalkModalOpen] = useState(false)
  const [siteWalks, setSiteWalks] = useState(initialSiteWalks)
  const [swDate, setSwDate] = useState('')
  const [swTime, setSwTime] = useState('')
  const [swLocation, setSwLocation] = useState('')
  const [swAttendees, setSwAttendees] = useState('')
  const [swNotes, setSwNotes] = useState('')
  const [swSaving, setSwSaving] = useState(false)

  // Closeout Plan modal state
  const [closeoutModalOpen, setCloseoutModalOpen] = useState(false)
  const [closeoutPlans, setCloseoutPlans] = useState(initialCloseoutPlans)
  const [copName, setCopName] = useState('')
  const [copDescription, setCopDescription] = useState('')
  const [copScopeSummary, setCopScopeSummary] = useState('')
  const [copSaving, setCopSaving] = useState(false)

  // Edit form state
  const [editProjectName, setEditProjectName] = useState(pursuit.project_name)
  const [editClientId, setEditClientId] = useState(pursuit.client_id)
  const [editContactId, setEditContactId] = useState(pursuit.primary_contact_id ?? '')
  const [editSignalType, setEditSignalType] = useState(pursuit.signal_type ?? '')
  const [editClientType, setEditClientType] = useState(pursuit.client_type ?? '')
  const [editBuildType, setEditBuildType] = useState(pursuit.build_type ?? '')
  const [editLocation, setEditLocation] = useState(pursuit.location ?? '')
  const [editApproxSqft, setEditApproxSqft] = useState(pursuit.approx_sqft?.toString() ?? '')
  const [editSubstantialCompletion, setEditSubstantialCompletion] = useState(pursuit.projected_substantial_completion ?? '')
  const [editOwnerWalk, setEditOwnerWalk] = useState(pursuit.target_owner_walk ?? '')
  const [editTargetOpening, setEditTargetOpening] = useState(pursuit.target_opening ?? '')
  const [editNotes, setEditNotes] = useState(pursuit.notes ?? '')

  const actorRoles: Role[] = ['leadership_system_admin', 'commercial_bd']

  const availableTransitions = getAvailableTransitions(
    pursuitStateMachine,
    pursuit.stage,
    actorRoles,
  )

  const filteredContacts = contacts.filter((c) => c.client_id === editClientId)

  // ── Handlers ──

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

  function startEditing() {
    setEditProjectName(pursuit.project_name)
    setEditClientId(pursuit.client_id)
    setEditContactId(pursuit.primary_contact_id ?? '')
    setEditSignalType(pursuit.signal_type ?? '')
    setEditClientType(pursuit.client_type ?? '')
    setEditBuildType(pursuit.build_type ?? '')
    setEditLocation(pursuit.location ?? '')
    setEditApproxSqft(pursuit.approx_sqft?.toString() ?? '')
    setEditSubstantialCompletion(pursuit.projected_substantial_completion ?? '')
    setEditOwnerWalk(pursuit.target_owner_walk ?? '')
    setEditTargetOpening(pursuit.target_opening ?? '')
    setEditNotes(pursuit.notes ?? '')
    setEditing(true)
  }

  async function handleSaveEdit() {
    setSaving(true)
    const selectedClient = clients.find((c) => c.id === editClientId)
    const selectedContact = contacts.find((c) => c.id === editContactId)

    const result = await updatePursuitAction({
      id: pursuit.id,
      project_name: editProjectName,
      client_id: editClientId,
      client_name: selectedClient?.name ?? pursuit.client_name,
      primary_contact_id: editContactId || undefined,
      primary_contact_name: selectedContact
        ? `${selectedContact.first_name} ${selectedContact.last_name}`
        : undefined,
      signal_type: editSignalType || undefined,
      client_type: editClientType || undefined,
      build_type: editBuildType || undefined,
      location: editLocation || undefined,
      approx_sqft: editApproxSqft ? parseInt(editApproxSqft, 10) : undefined,
      projected_substantial_completion: editSubstantialCompletion || undefined,
      target_owner_walk: editOwnerWalk || undefined,
      target_opening: editTargetOpening || undefined,
      notes: editNotes || undefined,
    })
    setSaving(false)

    if (result.success && result.data) {
      setPursuit(result.data)
      setEditing(false)
      toast.success('Pursuit updated')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to save changes')
    }
  }

  async function handleCreateSiteWalk() {
    if (!swDate || !swTime || !swLocation.trim() || !swAttendees.trim()) {
      toast.error('Date, time, location, and attendees are required')
      return
    }
    setSwSaving(true)
    const result = await createSiteWalkAction({
      pursuit_id: pursuit.id,
      walk_date: swDate,
      walk_time: swTime,
      location: swLocation,
      attendees: swAttendees,
      notes: swNotes || null,
    })
    setSwSaving(false)

    if (result.success && result.data) {
      setSiteWalks((prev) => [...prev, result.data!])
      toast.success(`Site walk ${result.data.reference_id} scheduled`)
      setSiteWalkModalOpen(false)
      setSwDate('')
      setSwTime('')
      setSwLocation('')
      setSwAttendees('')
      setSwNotes('')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to create site walk')
    }
  }

  async function handleCreateCloseoutPlan() {
    if (!copName.trim() || !copDescription.trim() || !copScopeSummary.trim()) {
      toast.error('Plan name, description, and scope summary are required')
      return
    }
    setCopSaving(true)
    const result = await createCloseoutPlanAction({
      pursuit_id: pursuit.id,
      plan_name: copName,
      description: copDescription,
      scope_summary: copScopeSummary,
    })
    setCopSaving(false)

    if (result.success && result.data) {
      setCloseoutPlans((prev) => [...prev, result.data!])
      toast.success(`Closeout plan ${result.data.reference_id} created`)
      setCloseoutModalOpen(false)
      setCopName('')
      setCopDescription('')
      setCopScopeSummary('')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to create closeout plan')
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Project Details</h2>
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
                  {saving ? 'Saving…' : 'Save All Changes'}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            /* ── Edit Mode ── */
            <div className="space-y-4">
              <EditField label="Project Name">
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className={INPUT_CLS}
                />
              </EditField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EditField label="Client">
                  <select
                    value={editClientId}
                    onChange={(e) => {
                      setEditClientId(e.target.value)
                      setEditContactId('')
                    }}
                    className={INPUT_CLS}
                  >
                    <option value="">Select client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Primary Contact">
                  <select
                    value={editContactId}
                    onChange={(e) => setEditContactId(e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">Select contact…</option>
                    {filteredContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Signal Type">
                  <select
                    value={editSignalType}
                    onChange={(e) => setEditSignalType(e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">—</option>
                    {PURSUIT_SIGNAL_TYPES.map((t) => (
                      <option key={t} value={t}>{PURSUIT_SIGNAL_LABELS[t]}</option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Client Type">
                  <select
                    value={editClientType}
                    onChange={(e) => setEditClientType(e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">—</option>
                    {PURSUIT_CLIENT_TYPES.map((t) => (
                      <option key={t} value={t}>{PURSUIT_CLIENT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Build Type">
                  <select
                    value={editBuildType}
                    onChange={(e) => setEditBuildType(e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">—</option>
                    {PURSUIT_BUILD_TYPES.map((t) => (
                      <option key={t} value={t}>{PURSUIT_BUILD_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Location">
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className={INPUT_CLS}
                  />
                </EditField>
                <EditField label="Approx SF">
                  <input
                    type="number"
                    value={editApproxSqft}
                    onChange={(e) => setEditApproxSqft(e.target.value)}
                    className={INPUT_CLS}
                  />
                </EditField>
                <EditField label="Substantial Completion">
                  <input
                    type="date"
                    value={editSubstantialCompletion}
                    onChange={(e) => setEditSubstantialCompletion(e.target.value)}
                    className={INPUT_CLS}
                  />
                </EditField>
                <EditField label="Owner Walk">
                  <input
                    type="date"
                    value={editOwnerWalk}
                    onChange={(e) => setEditOwnerWalk(e.target.value)}
                    className={INPUT_CLS}
                  />
                </EditField>
                <EditField label="Target Opening">
                  <input
                    type="date"
                    value={editTargetOpening}
                    onChange={(e) => setEditTargetOpening(e.target.value)}
                    className={INPUT_CLS}
                  />
                </EditField>
              </div>
              <EditField label="Notes">
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className={INPUT_CLS}
                />
              </EditField>
            </div>
          ) : (
            /* ── Read Mode ── */
            <>
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
            </>
          )}
        </div>

        {/* Linked Estimate Status */}
        {pursuit.stage === 'estimate_ready' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Estimate Status</h2>
            {linkedEstimate ? (
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/estimates/${linkedEstimate.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {linkedEstimate.reference_id}
                    </Link>
                    <StatusBadge
                      state={linkedEstimate.status}
                      label={`Estimate Created — ${ESTIMATE_STATUS_LABELS[linkedEstimate.status]}`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    No estimate created yet. This pursuit is ready for estimating.
                  </p>
                  <Link
                    href={`/estimates/new?pursuitId=${pursuit.id}&clientId=${pursuit.client_id}`}
                    className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Create Estimate
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Site Walk Events */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Site Walk Events</h2>
            <button
              onClick={() => setSiteWalkModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Schedule Walk
            </button>
          </div>
          {siteWalks.length === 0 ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                No site walks scheduled yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {siteWalks.map((sw) => (
                <div key={sw.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{sw.reference_id}</span>
                      <StatusBadge state={sw.status} label={SITE_WALK_STATUS_LABELS[sw.status]} />
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {formatDate(sw.walk_date)} at {sw.walk_time} — {sw.location}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Attendees: {sw.attendees}
                    </p>
                    {sw.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Notes: {sw.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Closeout Plans */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Closeout Plans</h2>
            <button
              onClick={() => setCloseoutModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5" />
              New Plan
            </button>
          </div>
          {closeoutPlans.length === 0 ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                No closeout plans created yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {closeoutPlans.map((cop) => (
                <div key={cop.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{cop.reference_id}</span>
                    <StatusBadge state={cop.status} label={CLOSEOUT_PLAN_STATUS_LABELS[cop.status]} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">{cop.plan_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{cop.description}</p>
                </div>
              ))}
            </div>
          )}
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
              {!editing ? (
                <button
                  onClick={startEditing}
                  className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  Edit
                </button>
              ) : (
                <button
                  onClick={() => setEditing(false)}
                  className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Edit
                </button>
              )}
              <button
                onClick={() => setSiteWalkModalOpen(true)}
                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Schedule Site Walk
              </button>
              <button
                onClick={() => setCloseoutModalOpen(true)}
                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
              >
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

      {/* ── Modals ── */}

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
              className={cn(INPUT_CLS, 'mb-4')}
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

      {/* Site Walk Modal */}
      {siteWalkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Schedule Site Walk</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <EditField label="Date *">
                  <input
                    type="date"
                    value={swDate}
                    onChange={(e) => setSwDate(e.target.value)}
                    className={INPUT_CLS}
                  />
                </EditField>
                <EditField label="Time *">
                  <input
                    type="time"
                    value={swTime}
                    onChange={(e) => setSwTime(e.target.value)}
                    className={INPUT_CLS}
                  />
                </EditField>
              </div>
              <EditField label="Location *">
                <input
                  type="text"
                  value={swLocation}
                  onChange={(e) => setSwLocation(e.target.value)}
                  placeholder="e.g. 123 Main St, Dallas TX"
                  className={INPUT_CLS}
                />
              </EditField>
              <EditField label="Attendees *">
                <input
                  type="text"
                  value={swAttendees}
                  onChange={(e) => setSwAttendees(e.target.value)}
                  placeholder="e.g. Antonio, GC PM, Site Super"
                  className={INPUT_CLS}
                />
              </EditField>
              <EditField label="Notes">
                <textarea
                  value={swNotes}
                  onChange={(e) => setSwNotes(e.target.value)}
                  rows={3}
                  placeholder="Additional notes…"
                  className={INPUT_CLS}
                />
              </EditField>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSiteWalkModalOpen(false)
                  setSwDate('')
                  setSwTime('')
                  setSwLocation('')
                  setSwAttendees('')
                  setSwNotes('')
                }}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSiteWalk}
                disabled={swSaving || !swDate || !swTime || !swLocation.trim() || !swAttendees.trim()}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  swDate && swTime && swLocation.trim() && swAttendees.trim() && !swSaving
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                {swSaving ? 'Scheduling…' : 'Schedule Walk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closeout Plan Modal */}
      {closeoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Create Closeout Plan</h2>
            <div className="space-y-4">
              <EditField label="Plan Name *">
                <input
                  type="text"
                  value={copName}
                  onChange={(e) => setCopName(e.target.value)}
                  placeholder="e.g. Final Cleaning Closeout"
                  className={INPUT_CLS}
                />
              </EditField>
              <EditField label="Description *">
                <textarea
                  value={copDescription}
                  onChange={(e) => setCopDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the closeout plan…"
                  className={INPUT_CLS}
                />
              </EditField>
              <EditField label="Scope Summary *">
                <textarea
                  value={copScopeSummary}
                  onChange={(e) => setCopScopeSummary(e.target.value)}
                  rows={3}
                  placeholder="Summarize the scope of work…"
                  className={INPUT_CLS}
                />
              </EditField>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setCloseoutModalOpen(false)
                  setCopName('')
                  setCopDescription('')
                  setCopScopeSummary('')
                }}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCloseoutPlan}
                disabled={copSaving || !copName.trim() || !copDescription.trim() || !copScopeSummary.trim()}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  copName.trim() && copDescription.trim() && copScopeSummary.trim() && !copSaving
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                {copSaving ? 'Creating…' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const INPUT_CLS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

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
