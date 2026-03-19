import { ChangeOrderTable } from '@/components/change-order/change-order-table'
import { listChangeOrders } from '@/lib/db/change-orders'
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
} from '@/lib/db/seed'

export default function ChangeOrdersPage() {
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
  const changeOrders = listChangeOrders()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Change Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage post-award scope revisions, pricing changes, and client approvals
        </p>
      </div>

      <ChangeOrderTable changeOrders={changeOrders} />
    </div>
  )
}
