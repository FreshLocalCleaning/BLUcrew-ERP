'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPursuitSchema, type CreatePursuitInput } from '@/lib/validations/pursuit'
import { createPursuitAction } from '@/actions/pursuit'
import {
  PURSUIT_SIGNAL_TYPES,
  PURSUIT_SIGNAL_LABELS,
  PURSUIT_CLIENT_TYPES,
  PURSUIT_CLIENT_TYPE_LABELS,
  PURSUIT_BUILD_TYPES,
  PURSUIT_BUILD_TYPE_LABELS,
  US_STATES,
  US_STATE_LABELS,
  MILESTONE_STATUSES,
  PROJECT_SIGNAL_TYPE_LABELS,
  createDefaultMilestones,
  type Client,
  type Contact,
  type ProjectSignal,
  type PursuitMilestone,
  type MilestoneStatus,
} from '@/types/commercial'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'
import { Plus, Trash2, CheckCircle2, Clock, Minus } from 'lucide-react'
import type { ProjectSignalType, PursuitSignalType } from '@/types/commercial'

/** Best-effort mapping from ProjectSignalType → PursuitSignalType */
function mapSignalTypeToPursuitType(signalType: ProjectSignalType): PursuitSignalType | undefined {
  const mapping: Partial<Record<ProjectSignalType, PursuitSignalType>> = {
    referral: 'referral',
    direct_contact: 'outreach',
    event_network: 'event',
    repeat_client: 'repeat_client',
    online_inquiry: 'inbound',
  }
  return mapping[signalType]
}

/** Build combined notes from signal fields so nothing is lost */
function buildNotesFromSignal(signal: { source_evidence: string; timing_signal: string | null; fit_risk_note: string | null; notes?: string }): string {
  const parts: string[] = []
  if (signal.source_evidence) parts.push(`[Source Evidence]\n${signal.source_evidence}`)
  if (signal.timing_signal) parts.push(`[Timing Signal]\n${signal.timing_signal}`)
  if (signal.fit_risk_note) parts.push(`[Fit/Risk Note]\n${signal.fit_risk_note}`)
  if (signal.notes) parts.push(`[Signal Notes]\n${signal.notes}`)
  return parts.join('\n\n')
}

interface PursuitCreateFormProps {
  clients: Client[]
  contacts: Contact[]
  passedSignals: ProjectSignal[]
  preselectedClientId?: string
  preselectedSignalId?: string
}

const INPUT_CLS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function PursuitCreateForm({ clients, contacts, passedSignals, preselectedClientId, preselectedSignalId }: PursuitCreateFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // Pre-select signal if provided via URL param
  const preSignal = preselectedSignalId ? passedSignals.find(s => s.id === preselectedSignalId) : undefined
  // Pre-select client from signal or URL param
  const effectiveClientId = preSignal?.linked_client_id ?? preselectedClientId ?? ''
  const preClient = effectiveClientId ? clients.find(c => c.id === effectiveClientId) : undefined
  const [selectedClientId, setSelectedClientId] = useState(effectiveClientId)
  const [selectedSignalId, setSelectedSignalId] = useState(preselectedSignalId ?? '')
  const [selectedContactId, setSelectedContactId] = useState(preSignal?.linked_contact_id ?? '')

  // Milestone state
  const [milestones, setMilestones] = useState<PursuitMilestone[]>(createDefaultMilestones())
  const [newMilestoneName, setNewMilestoneName] = useState('')

  // Pre-fill signal type mapping and combined notes from signal
  const preSignalType = preSignal ? mapSignalTypeToPursuitType(preSignal.signal_type) : undefined
  const preNotes = preSignal ? buildNotesFromSignal(preSignal) : ''

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreatePursuitInput>({
    resolver: zodResolver(createPursuitSchema) as any,
    defaultValues: {
      linked_signal_id: preselectedSignalId ?? '',
      project_name: preSignal?.project_identity ?? '',
      client_id: effectiveClientId,
      client_name: preClient?.name ?? '',
      primary_contact_id: preSignal?.linked_contact_id ?? '',
      primary_contact_name: preSignal?.linked_contact_name ?? '',
      signal_type: preSignalType,
      next_action: preSignal?.next_action ?? '',
      next_action_date: preSignal?.next_action_date ?? '',
      notes: preNotes,
    },
  })

  // Filter signals to selected client (only passed, unused signals)
  const availableSignals = useMemo(
    () => passedSignals.filter((s) =>
      (!selectedClientId || s.linked_client_id === selectedClientId) &&
      !s.created_pursuit_id,
    ),
    [passedSignals, selectedClientId],
  )

  const filteredContacts = useMemo(
    () => contacts.filter((c) => c.client_id === selectedClientId),
    [contacts, selectedClientId],
  )

  function handleSignalChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const signalId = e.target.value
    setSelectedSignalId(signalId)
    setValue('linked_signal_id', signalId)

    const signal = passedSignals.find((s) => s.id === signalId)
    if (signal) {
      // Auto-fill from signal data
      setValue('project_name', signal.project_identity)
      setValue('client_id', signal.linked_client_id)
      setValue('client_name', signal.linked_client_name)
      setSelectedClientId(signal.linked_client_id)

      if (signal.linked_contact_id) {
        setValue('primary_contact_id', signal.linked_contact_id)
        setValue('primary_contact_name', signal.linked_contact_name ?? '')
        setSelectedContactId(signal.linked_contact_id)
      } else {
        setSelectedContactId('')
      }

      // Map signal type → pursuit signal type
      const mappedType = mapSignalTypeToPursuitType(signal.signal_type)
      if (mappedType) {
        setValue('signal_type', mappedType)
      }

      // Carry over next action
      if (signal.next_action) {
        setValue('next_action', signal.next_action)
      }
      if (signal.next_action_date) {
        setValue('next_action_date', signal.next_action_date)
      }

      // Combine signal fields into notes so nothing is lost
      const combinedNotes = buildNotesFromSignal(signal)
      if (combinedNotes) {
        setValue('notes', combinedNotes)
      }
    }
  }

  function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const clientId = e.target.value
    setSelectedClientId(clientId)
    setValue('client_id', clientId)
    const client = clients.find((c) => c.id === clientId)
    setValue('client_name', client?.name ?? '')
    setValue('primary_contact_id', '')
    setValue('primary_contact_name', '')
    setSelectedContactId('')
    // Reset signal selection when client changes
    setSelectedSignalId('')
    setValue('linked_signal_id', '')
  }

  function handleContactChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const contactId = e.target.value
    setSelectedContactId(contactId)
    setValue('primary_contact_id', contactId)
    const contact = contacts.find((c) => c.id === contactId)
    setValue('primary_contact_name', contact ? `${contact.first_name} ${contact.last_name}` : '')
  }

  function updateMilestone(index: number, field: keyof PursuitMilestone, value: string | null | boolean) {
    setMilestones((prev) => {
      const next = [...prev]
      next[index] = { ...next[index]!, [field]: value }
      return next
    })
  }

  function addCustomMilestone() {
    if (!newMilestoneName.trim()) return
    setMilestones((prev) => [
      ...prev,
      { name: newMilestoneName.trim(), date: null, status: 'upcoming', notes: null, is_default: false },
    ])
    setNewMilestoneName('')
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(data: CreatePursuitInput) {
    setSubmitting(true)
    try {
      // Map milestone dates back to legacy fields for backward compat
      const msMap: Record<string, string | undefined> = {}
      for (const ms of milestones) {
        if (ms.name === 'Projected Substantial Completion' && ms.date) msMap.projected_substantial_completion = ms.date
        if (ms.name === 'Target Owner Walk' && ms.date) msMap.target_owner_walk = ms.date
        if (ms.name === 'Target Opening' && ms.date) msMap.target_opening = ms.date
      }

      const result = await createPursuitAction({
        ...data,
        ...msMap,
        milestones,
      } as Record<string, unknown>)
      if (result.success && result.data) {
        toast.success(`Pursuit "${result.data.project_name}" created (${result.data.reference_id})`)
        router.push(`/pursuits/${result.data.id}`)
      } else {
        toast.error(result.error ?? 'Failed to create pursuit')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Signal Gate */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Project Signal Gate</h2>
        <p className="text-sm text-muted-foreground">
          A Pursuit can only be created from a passed Project Signal. Select the signal below — project details will auto-fill.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Passed Project Signal <span className="text-red-400">*</span>
          </label>
          <select
            onChange={handleSignalChange}
            value={selectedSignalId}
            className={INPUT_CLS}
          >
            <option value="">Select a passed signal...</option>
            {availableSignals.map((s) => (
              <option key={s.id} value={s.id}>
                {s.reference_id} — {s.project_identity} ({s.linked_client_name}, {PROJECT_SIGNAL_TYPE_LABELS[s.signal_type]})
              </option>
            ))}
          </select>
          {errors.linked_signal_id && (
            <p className="mt-1 text-xs text-red-400">{errors.linked_signal_id.message}</p>
          )}
          <input type="hidden" {...register('linked_signal_id')} />
          {availableSignals.length === 0 && (
            <p className="mt-2 text-xs text-amber-400">
              No unused passed signals available. Create and pass a Project Signal first.
            </p>
          )}
        </div>
      </div>

      {/* Project Info */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Project Information</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Project Name */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              {...register('project_name')}
              type="text"
              placeholder="e.g. Crunch Fitness Lewisville"
              className={INPUT_CLS}
            />
            {errors.project_name && (
              <p className="mt-1 text-xs text-red-400">{errors.project_name.message}</p>
            )}
          </div>

          {/* Client */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Client <span className="text-red-400">*</span>
            </label>
            <select
              onChange={handleClientChange}
              value={selectedClientId}
              className={INPUT_CLS}
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p className="mt-1 text-xs text-red-400">{errors.client_id.message}</p>
            )}
            <input type="hidden" {...register('client_id')} />
            <input type="hidden" {...register('client_name')} />
          </div>

          {/* Primary Contact */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Primary Contact
            </label>
            <select
              onChange={handleContactChange}
              value={selectedContactId}
              disabled={!selectedClientId}
              className={`${INPUT_CLS} disabled:opacity-50`}
            >
              <option value="">
                {selectedClientId ? 'Select contact...' : 'Select a client first'}
              </option>
              {filteredContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} — {c.title}
                </option>
              ))}
            </select>
            <input type="hidden" {...register('primary_contact_id')} />
            <input type="hidden" {...register('primary_contact_name')} />
          </div>

          {/* Signal Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Signal Type
            </label>
            <select
              {...register('signal_type')}
              className={INPUT_CLS}
            >
              <option value="">Select signal type...</option>
              {PURSUIT_SIGNAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PURSUIT_SIGNAL_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Client Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Client Type
            </label>
            <select
              {...register('client_type')}
              className={INPUT_CLS}
            >
              <option value="">Select client type...</option>
              {PURSUIT_CLIENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PURSUIT_CLIENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Build Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Build Type
            </label>
            <select
              {...register('build_type')}
              className={INPUT_CLS}
            >
              <option value="">Select build type...</option>
              {PURSUIT_BUILD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PURSUIT_BUILD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Location (city/address) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Location
            </label>
            <input
              {...register('location')}
              type="text"
              placeholder="e.g. Lewisville"
              className={INPUT_CLS}
            />
          </div>

          {/* State */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              State
            </label>
            <select
              {...register('us_state')}
              className={INPUT_CLS}
            >
              <option value="">Select state...</option>
              {US_STATES.map((st) => (
                <option key={st} value={st}>
                  {US_STATE_LABELS[st]} ({st})
                </option>
              ))}
            </select>
          </div>

          {/* Approx Square Footage */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Approx Square Footage
            </label>
            <input
              {...register('approx_sqft', { valueAsNumber: true })}
              type="number"
              placeholder="e.g. 32500"
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* Milestones Timeline */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Project Milestones</h2>
          <span className="text-xs text-muted-foreground">{milestones.length} milestones</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Set dates and track key project milestones. Remove any that don't apply — add custom ones for project-specific events.
        </p>

        <div className="space-y-3">
          {milestones.map((ms, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-md border border-border p-3">
              <div className="mt-1">
                <MilestoneStatusIcon status={ms.status} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{ms.name}</span>
                  <button
                    type="button"
                    onClick={() => removeMilestone(idx)}
                    className="text-red-400 hover:text-red-300"
                    title="Remove milestone"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="date"
                    value={ms.date ?? ''}
                    onChange={(e) => updateMilestone(idx, 'date', e.target.value || null)}
                    className={INPUT_CLS}
                  />
                  <select
                    value={ms.status}
                    onChange={(e) => updateMilestone(idx, 'status', e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="complete">Complete</option>
                    <option value="na">N/A</option>
                  </select>
                  <input
                    type="text"
                    value={ms.notes ?? ''}
                    onChange={(e) => updateMilestone(idx, 'notes', e.target.value || null)}
                    placeholder="Notes…"
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Custom Milestone */}
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-3">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={newMilestoneName}
            onChange={(e) => setNewMilestoneName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomMilestone() } }}
            placeholder="Add custom milestone (e.g. Fire Marshal Inspection)…"
            className={`${INPUT_CLS} flex-1`}
          />
          <button
            type="button"
            onClick={addCustomMilestone}
            disabled={!newMilestoneName.trim()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Next Action & Notes */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Next Steps</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Next Action</label>
            <input {...register('next_action')} type="text" placeholder="e.g. Schedule site walk with GC" className={INPUT_CLS} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Next Action Date</label>
            <input {...register('next_action_date')} type="date" className={INPUT_CLS} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">Notes</label>
            <textarea {...register('notes')} rows={4} placeholder="General notes about this pursuit..." className={INPUT_CLS} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Creating...' : 'Create Pursuit'}
        </button>
      </div>
    </form>
  )
}

function MilestoneStatusIcon({ status }: { status: MilestoneStatus }) {
  if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (status === 'na') return <Minus className="h-4 w-4 text-muted-foreground" />
  return <Clock className="h-4 w-4 text-amber-400" />
}
