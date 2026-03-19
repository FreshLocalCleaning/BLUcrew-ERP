'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StateRibbon } from '@/components/shared/state-ribbon'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import { CLIENT_STATE_LABELS, type ClientState } from '@/lib/state-machines/client'
import { clientStateMachine } from '@/lib/state-machines/client'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import { transitionClientAction } from '@/actions/client'
import {
  CLIENT_TIER_LABELS,
  CLIENT_MARKET_LABELS,
  CLIENT_VERTICAL_LABELS,
  CLIENT_RELATIONSHIP_LABELS,
  type Client,
} from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import {
  ArrowLeftRight,
  Pencil,
  UserPlus,
  Target,
  Clock,
  Building2,
  MapPin,
  Users,
  Handshake,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

interface ClientDetailProps {
  client: Client
  auditLog: AuditEntry[]
}

export function ClientDetail({ client: initialClient, auditLog }: ClientDetailProps) {
  const router = useRouter()
  const [client, setClient] = useState(initialClient)
  const [statusModalOpen, setStatusModalOpen] = useState(false)

  // Placeholder actor roles — will come from Entra session
  const actorRoles: Role[] = ['commercial_bd']

  const availableTransitions = getAvailableTransitions(
    clientStateMachine,
    client.status,
    actorRoles,
  )

  async function handleStatusChange(targetState: string, reason: string) {
    const result = await transitionClientAction({
      client_id: client.id,
      target_state: targetState,
      reason: reason || undefined,
    })

    if (result.success && result.data) {
      setClient(result.data)
      toast.success(`Status changed to ${CLIENT_STATE_LABELS[result.data.status]}`)
      setStatusModalOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change status')
    }
  }

  const dueDate = client.next_action_date
    ? new Date(client.next_action_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* State Ribbon */}
        <StateRibbon
          currentState={client.status}
          stateLabel={CLIENT_STATE_LABELS[client.status]}
          nextAction={
            client.next_action
              ? `${client.next_action}${dueDate ? ` (due ${dueDate})` : ''}`
              : undefined
          }
        />

        {/* Client Details Card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Client Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem icon={Building2} label="Company" value={client.name} />
            <DetailItem
              icon={FileText}
              label="Reference ID"
              value={client.reference_id}
              mono
            />
            <DetailItem
              icon={Target}
              label="Tier"
              value={client.tier ? CLIENT_TIER_LABELS[client.tier] : '—'}
            />
            <DetailItem
              icon={Building2}
              label="Vertical"
              value={client.vertical ? CLIENT_VERTICAL_LABELS[client.vertical] : '—'}
            />
            <DetailItem
              icon={MapPin}
              label="Market"
              value={client.market ? CLIENT_MARKET_LABELS[client.market] : '—'}
            />
            <DetailItem
              icon={Handshake}
              label="Relationship"
              value={
                client.relationship_strength
                  ? CLIENT_RELATIONSHIP_LABELS[client.relationship_strength]
                  : '—'
              }
            />
            <DetailItem
              icon={Users}
              label="BD Owner"
              value={client.bd_owner_name ?? '—'}
            />
            <DetailItem
              icon={Clock}
              label="Created"
              value={new Date(client.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            />
          </div>
          {client.notes && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Contacts Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              <UserPlus className="h-3.5 w-3.5" />
              Add Contact
            </button>
          </div>
          <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              No contacts yet. Add the first contact for this client.
            </p>
          </div>
        </div>

        {/* Pursuits Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Pursuits</h2>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Target className="h-3.5 w-3.5" />
              New Pursuit
            </button>
          </div>
          <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              No pursuits yet. Create a pursuit to track opportunities.
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
                        {entry.action === 'update' && entry.field_changes['status'] && (
                          <StatusBadge
                            state={String(entry.field_changes['status'].to)}
                            label={CLIENT_STATE_LABELS[entry.field_changes['status'].to as ClientState]}
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
                        !entry.field_changes['status'] && (
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
      <div className="hidden w-64 shrink-0 space-y-3 lg:block">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Actions
        </h3>
        <button
          onClick={() => setStatusModalOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
        >
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          Change Status
        </button>
        <button className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50">
          <Pencil className="h-4 w-4 text-muted-foreground" />
          Edit Client
        </button>
        <button className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          Add Contact
        </button>
        <button className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50">
          <Target className="h-4 w-4 text-muted-foreground" />
          Create Pursuit
        </button>
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentState={client.status}
        currentStateLabel={CLIENT_STATE_LABELS[client.status]}
        availableTransitions={availableTransitions}
        stateLabels={CLIENT_STATE_LABELS}
        onConfirm={handleStatusChange}
      />
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

function formatAction(action: string): string {
  switch (action) {
    case 'create':
      return 'Client created'
    case 'update':
      return 'Client updated'
    case 'delete':
      return 'Client archived'
    case 'transition':
      return 'Status changed'
    default:
      return action
  }
}
