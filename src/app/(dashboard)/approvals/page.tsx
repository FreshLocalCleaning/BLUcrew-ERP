import { listEstimates } from '@/lib/db/estimates'
import { listChangeOrders } from '@/lib/db/change-orders'
import { listCloseoutPlans } from '@/lib/db/closeout-plans'
import { listProjectSignals } from '@/lib/db/project-signals'
import { ApprovalsView } from '@/components/approvals/approvals-view'
import {
  seedClients,
  seedContacts,
  seedProjectSignals,
  seedPursuits,
  seedEstimates,
  seedProposals,
  seedAwardHandoffs,
  seedProjects,
  seedMobilizations,
  seedChangeOrders,
  seedExpansionTasks,
} from '@/lib/db/seed'

export interface ApprovalItem {
  id: string
  entity_id: string
  entity_type: 'estimate' | 'change_order' | 'closeout_plan' | 'signal'
  record_name: string
  reference_id: string
  approval_type: string
  type_label: string
  requested_by: string
  requested_date: string
  detail_href: string
  what_needs_to_happen: string
  current_status: string
}

function gatherApprovalItems(): ApprovalItem[] {
  const items: ApprovalItem[] = []

  // 1. Estimate QA Reviews — estimates at qa_review needing sign-off
  const estimates = listEstimates()
  for (const est of estimates) {
    if (est.status === 'qa_review') {
      items.push({
        id: `est-qa-${est.id}`,
        entity_id: est.id,
        entity_type: 'estimate',
        record_name: est.project_name,
        reference_id: est.reference_id,
        approval_type: 'estimate_qa',
        type_label: 'Estimate QA',
        requested_by: est.updated_by ?? est.created_by,
        requested_date: est.updated_at,
        detail_href: `/estimates/${est.id}`,
        what_needs_to_happen: 'Review pricing and scope, then approve or reject the estimate for proposal creation',
        current_status: 'qa_review',
      })
    }
  }

  // 2. Change Order Approvals — COs at internal_review or client_pending
  const changeOrders = listChangeOrders()
  for (const co of changeOrders) {
    if (co.status === 'internal_review') {
      items.push({
        id: `co-ir-${co.id}`,
        entity_id: co.id,
        entity_type: 'change_order',
        record_name: co.scope_delta_description,
        reference_id: co.reference_id,
        approval_type: 'co_internal_review',
        type_label: 'CO Internal Review',
        requested_by: co.fact_packet_by ?? co.created_by,
        requested_date: co.updated_at,
        detail_href: `/change-orders/${co.id}`,
        what_needs_to_happen: 'Review pricing delta and approve for client submission',
        current_status: 'internal_review',
      })
    }
    if (co.status === 'client_pending') {
      items.push({
        id: `co-cp-${co.id}`,
        entity_id: co.id,
        entity_type: 'change_order',
        record_name: co.scope_delta_description,
        reference_id: co.reference_id,
        approval_type: 'co_client_pending',
        type_label: 'CO Client Decision',
        requested_by: co.fact_packet_by ?? co.created_by,
        requested_date: co.updated_at,
        detail_href: `/change-orders/${co.id}`,
        what_needs_to_happen: 'Awaiting client approval or rejection of scope change',
        current_status: 'client_pending',
      })
    }
  }

  // 3. Closeout Plan Approvals — plans pending approval
  const closeoutPlans = listCloseoutPlans()
  for (const cp of closeoutPlans) {
    if (cp.status === 'pending_approval') {
      items.push({
        id: `cp-${cp.id}`,
        entity_id: cp.id,
        entity_type: 'closeout_plan',
        record_name: cp.plan_name ?? 'Closeout Plan',
        reference_id: cp.reference_id ?? cp.id.slice(0, 8),
        approval_type: 'closeout_plan',
        type_label: 'Closeout Plan',
        requested_by: cp.created_by,
        requested_date: cp.updated_at,
        detail_href: `/pursuits/${cp.pursuit_id}`,
        what_needs_to_happen: 'Review closeout plan and approve or return to scope',
        current_status: 'pending_approval',
      })
    }
  }

  // 4. Signal Gate Reviews — signals at under_review needing gate decision
  const signals = listProjectSignals()
  for (const sig of signals) {
    if (sig.status === 'under_review') {
      items.push({
        id: `sig-${sig.id}`,
        entity_id: sig.id,
        entity_type: 'signal',
        record_name: sig.project_identity,
        reference_id: sig.reference_id,
        approval_type: 'signal_gate',
        type_label: 'Signal Gate',
        requested_by: sig.updated_by ?? sig.created_by,
        requested_date: sig.updated_at,
        detail_href: `/project-signals/${sig.id}`,
        what_needs_to_happen: 'Review signal evidence and pass, defer, or fail the gate',
        current_status: 'under_review',
      })
    }
  }

  // Sort by date descending (most recent first)
  items.sort((a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime())

  return items
}

export default function ApprovalsPage() {
  // Seed all data
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  seedMobilizations()
  seedChangeOrders()
  seedExpansionTasks()

  const items = gatherApprovalItems()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Items across the ERP that need review, approval, or decision
        </p>
      </div>

      <ApprovalsView items={items} />
    </div>
  )
}
