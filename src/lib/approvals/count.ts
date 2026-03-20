import { listEstimates } from '@/lib/db/estimates'
import { listChangeOrders } from '@/lib/db/change-orders'
import { listCloseoutPlans } from '@/lib/db/closeout-plans'
import { listProjectSignals } from '@/lib/db/project-signals'

/**
 * Returns the total number of items pending approval across all entity types.
 * Used by the sidebar to show a count badge on the Approvals link.
 */
export function getApprovalCount(): number {
  let count = 0

  // Estimates at qa_review
  const estimates = listEstimates()
  count += estimates.filter(e => e.status === 'qa_review').length

  // Change orders at internal_review or client_pending
  const changeOrders = listChangeOrders()
  count += changeOrders.filter(co => co.status === 'internal_review' || co.status === 'client_pending').length

  // Closeout plans pending approval
  const closeoutPlans = listCloseoutPlans()
  count += closeoutPlans.filter(cp => cp.status === 'pending_approval').length

  // Signals at under_review
  const signals = listProjectSignals()
  count += signals.filter(s => s.status === 'under_review').length

  return count
}
