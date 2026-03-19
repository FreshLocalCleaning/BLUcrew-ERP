'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateContactAction, logTouchAction } from '@/actions/contact'
import {
  CONTACT_LAYER_LABELS,
  CONTACT_INFLUENCE_LABELS,
  CONTACT_RELATIONSHIP_LABELS,
  CONTACT_SOURCE_LABELS,
  CONTACT_PREFERRED_CHANNEL_LABELS,
  CONTACT_LAYERS,
  CONTACT_INFLUENCE_LEVELS,
  CONTACT_RELATIONSHIP_STRENGTHS,
  type Contact,
  type ContactInfluence,
  type ContactRelationshipStrength,
} from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import {
  Pencil,
  HandMetal,
  Mail,
  Phone,
  Linkedin,
  Building2,
  User,
  Layers,
  Target,
  Handshake,
  Star,
  Clock,
  FileText,
  MessageSquare,
  Hash,
  Zap,
  ExternalLink,
  CalendarClock,
  X,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContactDetailProps {
  contact: Contact
  auditLog: AuditEntry[]
}

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

const INFLUENCE_COLORS: Record<ContactInfluence, { bg: string; text: string }> = {
  high: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  low: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
}

const STRENGTH_COLORS: Record<ContactRelationshipStrength, { bg: string; text: string }> = {
  new: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  developing: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' },
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  trusted: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  dormant: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Get color class for a due date */
function getDueDateColor(iso?: string | null): string {
  if (!iso) return ''
  const now = new Date()
  const due = new Date(iso)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())

  if (dueDay < today) return 'text-red-600 dark:text-red-400'
  if (dueDay.getTime() === today.getTime()) return 'text-amber-600 dark:text-amber-400'
  return 'text-green-600 dark:text-green-400'
}

function getDueDateLabel(iso?: string | null): string {
  if (!iso) return ''
  const now = new Date()
  const due = new Date(iso)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Due today'
  return `${diffDays}d remaining`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactDetail({ contact: initial, auditLog }: ContactDetailProps) {
  const router = useRouter()
  const [contact, setContact] = useState(initial)
  const [touchModalOpen, setTouchModalOpen] = useState(false)
  const [touchNotes, setTouchNotes] = useState('')
  const [touchNextStep, setTouchNextStep] = useState('')
  const [touchNextStepDueDate, setTouchNextStepDueDate] = useState('')
  const [touchType, setTouchType] = useState('')
  const [submittingTouch, setSubmittingTouch] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: contact.title ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    role_type: contact.role_type ?? '',
    notes: contact.notes ?? '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  async function handleLogTouch() {
    setSubmittingTouch(true)
    const result = await logTouchAction({
      contact_id: contact.id,
      notes: touchNotes || undefined,
      next_step: touchNextStep || undefined,
      next_step_due_date: touchNextStepDueDate || undefined,
      touch_type: touchType || undefined,
    })
    if (result.success && result.data) {
      setContact(result.data)
      toast.success(`Touch #${result.data.touch_count} logged`)
      setTouchModalOpen(false)
      setTouchNotes('')
      setTouchNextStep('')
      setTouchNextStepDueDate('')
      setTouchType('')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to log touch')
    }
    setSubmittingTouch(false)
  }

  async function handleSaveEdit() {
    setSavingEdit(true)
    try {
      const result = await updateContactAction({
        contact_id: contact.id,
        ...editData,
      })
      if (result.success && result.data) {
        setContact(result.data)
        toast.success('Contact updated')
        setEditing(false)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to update')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
    setSavingEdit(false)
  }

  const influenceStyle = INFLUENCE_COLORS[contact.influence]
  const strengthStyle = STRENGTH_COLORS[contact.relationship_strength]
  const dueDateColor = getDueDateColor(contact.next_step_due_date)
  const dueDateLabel = getDueDateLabel(contact.next_step_due_date)

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* BLU Champion Banner */}
        {contact.is_champion && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">BLU Champion</p>
              {contact.champion_reason && (
                <p className="text-sm text-amber-700 dark:text-amber-300">{contact.champion_reason}</p>
              )}
            </div>
          </div>
        )}

        {/* Contact Info Card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>
            {editing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> {savingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          {editing ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Title</label>
                <input
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  className={inputClass}
                  placeholder="Job title"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                  className={inputClass}
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Phone</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Role Type</label>
                <input
                  value={editData.role_type}
                  onChange={(e) => setEditData(prev => ({ ...prev, role_type: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. Senior PM"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Notes</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  className={inputClass}
                  rows={3}
                  placeholder="General notes..."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem icon={User} label="Name" value={`${contact.first_name} ${contact.last_name}`} />
              <DetailItem icon={FileText} label="Reference ID" value={contact.reference_id} mono />
              {contact.title && (
                <DetailItem icon={User} label="Title" value={contact.title} />
              )}
              <DetailItem
                icon={Building2}
                label="Client"
                value={contact.client_name}
                href={`/clients/${contact.client_id}`}
              />
              {contact.email && (
                <DetailItem icon={Mail} label="Email" value={contact.email} href={`mailto:${contact.email}`} />
              )}
              {contact.phone && (
                <DetailItem icon={Phone} label="Phone" value={contact.phone} />
              )}
              {contact.linkedin_url && (
                <DetailItem icon={Linkedin} label="LinkedIn" value="View Profile" href={contact.linkedin_url} external />
              )}
              {contact.preferred_channel && (
                <DetailItem icon={MessageSquare} label="Preferred Channel" value={CONTACT_PREFERRED_CHANNEL_LABELS[contact.preferred_channel]} />
              )}
            </div>
          )}
        </div>

        {/* Classification Card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Classification</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem icon={Layers} label="Layer" value={CONTACT_LAYER_LABELS[contact.layer]} />
            {contact.role_type && (
              <DetailItem icon={User} label="Role Type" value={contact.role_type} />
            )}
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Influence</p>
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', influenceStyle.bg, influenceStyle.text)}>
                  {CONTACT_INFLUENCE_LABELS[contact.influence]}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Handshake className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Relationship Strength</p>
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', strengthStyle.bg, strengthStyle.text)}>
                  {CONTACT_RELATIONSHIP_LABELS[contact.relationship_strength]}
                </span>
              </div>
            </div>
            {contact.source_channel && (
              <DetailItem icon={Zap} label="Source Channel" value={CONTACT_SOURCE_LABELS[contact.source_channel]} />
            )}
          </div>
        </div>

        {/* Touch Log */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Touch Log</h2>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                {contact.touch_count} touch{contact.touch_count !== 1 ? 'es' : ''}
              </span>
              <span className="text-sm text-muted-foreground">
                Last: {formatDate(contact.last_touch_date)}
              </span>
            </div>
          </div>

          {/* Next Step with Due Date */}
          {(contact.next_step || contact.next_step_due_date) && (
            <div className="rounded border border-border bg-muted/30 p-3 mb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Next Step</p>
                  <p className="text-sm text-foreground mt-0.5">{contact.next_step ?? '—'}</p>
                </div>
                {contact.next_step_due_date && (
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Due Date</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <CalendarClock className={cn('h-3.5 w-3.5', dueDateColor)} />
                      <span className={cn('text-sm font-medium', dueDateColor)}>
                        {formatDate(contact.next_step_due_date)}
                      </span>
                    </div>
                    <p className={cn('text-xs font-medium mt-0.5', dueDateColor)}>
                      {dueDateLabel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Intel & Notes */}
        {(contact.project_visibility_notes || contact.access_path || contact.pain_points || contact.notes) && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Intel & Notes</h2>
            <div className="space-y-4">
              {contact.project_visibility_notes && (
                <NoteBlock label="Project Visibility" text={contact.project_visibility_notes} />
              )}
              {contact.access_path && (
                <NoteBlock label="Access Path" text={contact.access_path} />
              )}
              {contact.pain_points && (
                <NoteBlock label="Pain Points" text={contact.pain_points} />
              )}
              {contact.notes && (
                <NoteBlock label="Notes" text={contact.notes} />
              )}
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
                      {entry.action === 'create' ? 'Contact created' : entry.action === 'update' ? 'Contact updated' : entry.action === 'delete' ? 'Contact archived' : entry.action}
                    </span>
                    {entry.reason && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.reason}
                      </p>
                    )}
                    {entry.action === 'update' &&
                      Object.keys(entry.field_changes).length > 0 && (
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
      <div className="hidden w-64 shrink-0 space-y-3 lg:block">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Actions
        </h3>
        <button
          onClick={() => {
            setEditing(true)
            setEditData({
              title: contact.title ?? '',
              email: contact.email ?? '',
              phone: contact.phone ?? '',
              role_type: contact.role_type ?? '',
              notes: contact.notes ?? '',
            })
          }}
          className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
          Edit
        </button>
        <button
          onClick={() => setTouchModalOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
        >
          <HandMetal className="h-4 w-4 text-muted-foreground" />
          Log Touch
        </button>

        {/* Quick Info Cards */}
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Touches</p>
            <p className="text-2xl font-bold text-foreground">{contact.touch_count}</p>
            <p className="text-xs text-muted-foreground">Last: {formatDate(contact.last_touch_date)}</p>
          </div>
          {contact.next_step_due_date && (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Next Step Due</p>
              <p className={cn('text-sm font-bold', dueDateColor)}>
                {formatDate(contact.next_step_due_date)}
              </p>
              <p className={cn('text-xs font-medium', dueDateColor)}>{dueDateLabel}</p>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Created</p>
            <p className="text-sm text-foreground">{formatDate(contact.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Log Touch Modal */}
      {touchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setTouchModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Log Touch</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Record an interaction with {contact.first_name} {contact.last_name}.
              Touch #{contact.touch_count + 1}.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="touch-type" className="block text-sm font-medium text-foreground">
                  Type of Touch
                </label>
                <select
                  id="touch-type"
                  value={touchType}
                  onChange={(e) => setTouchType(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select type...</option>
                  <option value="call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="text">Text Message</option>
                  <option value="in_person">In Person</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="event">Event</option>
                  <option value="trailer_visit">Trailer Visit</option>
                  <option value="luncheon">Luncheon</option>
                </select>
              </div>
              <div>
                <label htmlFor="touch-notes" className="block text-sm font-medium text-foreground">
                  Summary / Notes
                </label>
                <textarea
                  id="touch-notes"
                  value={touchNotes}
                  onChange={(e) => setTouchNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Discussed Lewisville project timeline..."
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="touch-next-step" className="block text-sm font-medium text-foreground">
                  Next Step
                </label>
                <input
                  id="touch-next-step"
                  type="text"
                  value={touchNextStep}
                  onChange={(e) => setTouchNextStep(e.target.value)}
                  placeholder="e.g. Follow up on pricing..."
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="touch-due-date" className="block text-sm font-medium text-foreground">
                  Next Step Due Date
                </label>
                <input
                  id="touch-due-date"
                  type="date"
                  value={touchNextStepDueDate}
                  onChange={(e) => setTouchNextStepDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setTouchModalOpen(false)
                  setTouchNotes('')
                  setTouchNextStep('')
                  setTouchNextStepDueDate('')
                  setTouchType('')
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogTouch}
                disabled={submittingTouch}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingTouch ? 'Logging...' : 'Log Touch'}
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
  href,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  mono?: boolean
  href?: string
  external?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        {href ? (
          <Link
            href={href}
            className={`text-sm text-primary hover:underline ${mono ? 'font-mono' : ''}`}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {value}
            {external && <ExternalLink className="ml-1 inline h-3 w-3" />}
          </Link>
        ) : (
          <p className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
        )}
      </div>
    </div>
  )
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{text}</p>
    </div>
  )
}
