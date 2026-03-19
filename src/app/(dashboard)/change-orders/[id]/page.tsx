import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getChangeOrder } from '@/lib/db/change-orders'
import { getProject } from '@/lib/db/projects'
import { getAuditLog } from '@/lib/db/json-db'
import { ChangeOrderDetail } from '@/components/change-order/change-order-detail'
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

interface ChangeOrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ChangeOrderDetailPage({ params }: ChangeOrderDetailPageProps) {
  const { id } = await params

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

  const changeOrder = getChangeOrder(id)
  if (!changeOrder) {
    notFound()
  }

  const project = getProject(changeOrder.linked_project_id)
  const auditLog = getAuditLog('change_orders', id)

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {project && (
          <>
            <Link href="/projects" className="hover:text-foreground">Projects</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/projects/${project.id}`} className="hover:text-foreground">{project.project_name}</Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <Link href="/change-orders" className="hover:text-foreground">Change Orders</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{changeOrder.reference_id}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Change Order {changeOrder.reference_id}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {changeOrder.scope_delta.length > 100 ? changeOrder.scope_delta.slice(0, 100) + '…' : changeOrder.scope_delta}
        </p>
      </div>

      <ChangeOrderDetail changeOrder={changeOrder} auditLog={auditLog} />
    </div>
  )
}
