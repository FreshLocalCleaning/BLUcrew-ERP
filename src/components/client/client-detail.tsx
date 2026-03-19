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
  type ClientTier,
} from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import type { Contact, Pursuit, Estimate, Proposal, AwardHandoff, Project } from '@/types/commercial'
import { PURSUIT_STAGE_LABELS } from '@/lib/state-machines/pursuit'
import { ESTIMATE_STATUS_LABELS } from '@/lib/state-machines/estimate'
import { PROPOSAL_STATUS_LABELS } from '@/lib/state-machines/proposal'
import { AWARD_HANDOFF_STATE_LABELS } from '@/lib/state-machines/award-handoff'
import { PROJECT_STATE_LABELS } from '@/lib/state-machines/project'
import { CONTACT_LAYER_LABELS } from '@/types/commercial'
import { getTierForContacts, getPrimaryContact } from '@/lib/contacts/utils'
import {
  ArrowLeftRight,
  UserPlus,
  Target,
  Clock,
  Building2,
  MapPin,
  Users,
  Handshake,
  FileText,
  Calculator,
  Star,
  Phone,
  Mail,
  Trophy,
  Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ClientDetailProps {
  client: Client
  auditLog: AuditEntry[]
  contacts?: Contact[]
  pursuits?: Pursuit[]
  estimates?: Estimate[]
  proposals?: Proposal[]
  awards?: AwardHandoff[]
  projects?: Project[]
}

export function ClientDetail({
  client: initialClient,
  auditLog,
  contacts = [],
  pursuits = [],
  estimates = [],
  proposals = [],
  awards = [],
  projects = [],
}: ClientDetailProps) {
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

  // Computed tier and primary contact
  const computedTier = getTierForContacts(contacts)
  const primaryContact = getPrimaryContact(contacts)

  const tierColors: Record<ClientTier, string> = {
    A: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    B: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    C: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }

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

        {/* Primary Contact Banner */}
        {primaryContact && (
          <div className="flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <Users className="h-5 w-5 shrink-0 text-blue-500" />
            <div className="flex-1">
              <p className="text-xs font-medium uppercase text-blue-600 dark:text-blue-400">Primary Contact</p>
              <Link
                href={`/contacts/${primaryContact.id}`}
                className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
              >
                {primaryContact.first_name} {primaryContact.last_name}
              </Link>
              {primaryContact.title && (
                <span className="ml-2 text-sm text-blue-600/80 dark:text-blue-400/80">
                  — {primaryContact.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              {primaryContact.phone && (
                <a href={`tel:${primaryContact.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400">
                  <Phone className="h-3.5 w-3.5" />
                  {primaryContact.phone}
                </a>
              )}
              {primaryContact.email && (
                <a href={`mailto:${primaryContact.email}`} className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400">
                  <Mail className="h-3.5 w-3.5" />
                  {primaryContact.email}
                </a>
              )}
            </div>
          </div>
        )}

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
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Tier (auto-calculated)</p>
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', tierColors[computedTier])}>
                  {CLIENT_TIER_LABELS[computedTier]}
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Based on {contacts.length} contact{contacts.length !== 1 ? 's' : ''} across layers
                </p>
              </div>
            </div>
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
            <h2 className="text-lg font-semibold text-foreground">Contacts ({contacts.length})</h2>
            <Link
              href={`/contacts/new?client_id=${client.id}`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Contact
            </Link>
          </div>
          {contacts.length === 0 ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                No contacts yet. Add the first contact for this client.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Title</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Layer</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Influence</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Strength</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Phone</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Last Touch</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {c.is_champion && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                          <Link href={`/contacts/${c.id}`} className="font-medium text-primary hover:underline">
                            {c.first_name} {c.last_name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{c.title ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{CONTACT_LAYER_LABELS[c.layer] ?? '—'}</td>
                      <td className="px-3 py-2 capitalize text-muted-foreground">{c.influence}</td>
                      <td className="px-3 py-2 capitalize text-muted-foreground">{c.relationship_strength}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.phone ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.email ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.last_touch_date ? new Date(c.last_touch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pursuits Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Pursuits ({pursuits.length})</h2>
            <Link
              href={`/pursuits/new?clientId=${client.id}`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Target className="h-3.5 w-3.5" />
              New Pursuit
            </Link>
          </div>
          {pursuits.length === 0 ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                No pursuits yet. Create a pursuit to track opportunities.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Stage</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Build Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">SF</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pursuits.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link href={`/pursuits/${p.id}`} className="font-medium text-primary hover:underline">{p.project_name}</Link>
                      </td>
                      <td className="px-3 py-2"><StatusBadge state={p.stage} label={PURSUIT_STAGE_LABELS[p.stage]} /></td>
                      <td className="px-3 py-2 text-muted-foreground">{p.build_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.approx_sqft?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.next_action ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Estimates Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Estimates ({estimates.length})</h2>
            <Link
              href={`/estimates/new?clientId=${client.id}`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Calculator className="h-3.5 w-3.5" />
              New Estimate
            </Link>
          </div>
          {estimates.length === 0 ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No estimates yet.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Ref ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map(e => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link href={`/estimates/${e.id}`} className="font-medium text-primary hover:underline">{e.project_name}</Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{e.reference_id}</td>
                      <td className="px-3 py-2"><StatusBadge state={e.status} label={ESTIMATE_STATUS_LABELS[e.status]} /></td>
                      <td className="px-3 py-2 text-muted-foreground">{e.pricing_summary?.grand_total ? `$${e.pricing_summary.grand_total.toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Proposals Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Proposals ({proposals.length})</h2>
            <Link
              href={`/proposals/new?clientId=${client.id}`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5" />
              New Proposal
            </Link>
          </div>
          {proposals.length === 0 ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No proposals yet.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Ref ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Value</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link href={`/proposals/${p.id}`} className="font-medium text-primary hover:underline">{p.project_name}</Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.reference_id}</td>
                      <td className="px-3 py-2"><StatusBadge state={p.status} label={PROPOSAL_STATUS_LABELS[p.status]} /></td>
                      <td className="px-3 py-2 text-muted-foreground">{p.proposal_value ? `$${p.proposal_value.toLocaleString()}` : '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.delivery_date ? new Date(p.delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Awards Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Awards ({awards.length})</h2>
          </div>
          {awards.length === 0 ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No awards yet.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Ref ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {awards.map(a => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link href={`/handoffs/${a.id}`} className="font-medium text-primary hover:underline">{a.project_name}</Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{a.reference_id}</td>
                      <td className="px-3 py-2"><StatusBadge state={a.status} label={AWARD_HANDOFF_STATE_LABELS[a.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Projects Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Projects ({projects.length})</h2>
          </div>
          {projects.length === 0 ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Ref ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">{p.project_name}</Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.reference_id}</td>
                      <td className="px-3 py-2"><StatusBadge state={p.status} label={PROJECT_STATE_LABELS[p.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        <Link
          href={`/contacts/new?client_id=${client.id}`}
          className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
        >
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          Add Contact
        </Link>
        <Link
          href={`/pursuits/new?clientId=${client.id}`}
          className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
        >
          <Target className="h-4 w-4 text-muted-foreground" />
          Create Pursuit
        </Link>

        {/* Tier Info Card */}
        <div className="mt-4 rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Tier</p>
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-sm font-bold', tierColors[computedTier])}>
            {CLIENT_TIER_LABELS[computedTier]}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </p>
        </div>
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
