'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/status-badge'
import { PROJECT_SIGNAL_STATE_LABELS } from '@/lib/state-machines/project-signal'
import {
  PROJECT_SIGNAL_TYPE_LABELS,
  PROJECT_SIGNAL_GATE_LABELS,
  type ProjectSignal,
} from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import {
  FileText,
  Building2,
  User,
  Zap,
  Clock,
  Shield,
  ArrowRight,
  CalendarClock,
} from 'lucide-react'

interface SignalDetailProps {
  signal: ProjectSignal
  auditLog: AuditEntry[]
  clientName?: string
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

export function SignalDetail({ signal, auditLog, clientName }: SignalDetailProps) {
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
          <h2 className="mb-4 text-lg font-semibold text-foreground">Signal Details</h2>
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
      <div className="hidden w-64 shrink-0 space-y-3 lg:block">
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
