import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getEstimate } from '@/lib/db/estimates'
import { getPursuit } from '@/lib/db/pursuits'
import { getClient } from '@/lib/db/clients'
import { getAuditLog } from '@/lib/db/json-db'
import { EstimateDetail } from '@/components/estimate/estimate-detail'
import { seedClients, seedContacts, seedProjectSignals, seedPursuits, seedEstimates } from '@/lib/db/seed'

interface EstimateDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function EstimateDetailPage({ params }: EstimateDetailPageProps) {
  const { id } = await params

  // Ensure seed data exists
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()

  const estimate = getEstimate(id)
  if (!estimate) {
    notFound()
  }

  const pursuit = getPursuit(estimate.linked_pursuit_id)
  const client = getClient(estimate.linked_client_id)
  const auditLog = getAuditLog('estimates', id)

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {client && (
          <>
            <Link href="/clients" className="hover:text-foreground">
              Clients
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/clients/${client.id}`} className="hover:text-foreground">
              {client.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        {pursuit && (
          <>
            <Link href="/pursuits" className="hover:text-foreground">
              Pursuits
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/pursuits/${pursuit.id}`} className="hover:text-foreground">
              {pursuit.project_name}
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <Link href="/estimates" className="hover:text-foreground">
          Estimates
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{estimate.project_name}</span>
      </nav>

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{estimate.project_name}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {estimate.reference_id}
          <span className="ml-2 text-xs">v{estimate.version}</span>
          {pursuit && (
            <span className="ml-2 text-xs text-muted-foreground">
              (from {pursuit.reference_id})
            </span>
          )}
        </p>
      </div>

      {/* Detail component */}
      <EstimateDetail estimate={estimate} auditLog={auditLog} />
    </div>
  )
}
