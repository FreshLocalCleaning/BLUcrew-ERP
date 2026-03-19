import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getPursuit } from '@/lib/db/pursuits'
import { getClient } from '@/lib/db/clients'
import { getProjectSignal } from '@/lib/db/project-signals'
import { getAuditLog } from '@/lib/db/json-db'
import { PursuitDetail } from '@/components/pursuit/pursuit-detail'
import { seedClients, seedContacts, seedProjectSignals, seedPursuits } from '@/lib/db/seed'

interface PursuitDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PursuitDetailPage({ params }: PursuitDetailPageProps) {
  const { id } = await params

  // Ensure seed data exists
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()

  const pursuit = getPursuit(id)
  if (!pursuit) {
    notFound()
  }

  const client = getClient(pursuit.client_id)
  const signal = pursuit.linked_signal_id ? getProjectSignal(pursuit.linked_signal_id) : undefined
  const auditLog = getAuditLog('pursuits', id)

  return (
    <div className="space-y-6">
      {/* Breadcrumbs: Clients > Client Name > Signals > Signal Ref > Pursuits > Pursuit Name */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-foreground">
          Clients
        </Link>
        <ChevronRight className="h-4 w-4" />
        {client ? (
          <>
            <Link href={`/clients/${client.id}`} className="hover:text-foreground">
              {client.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        ) : (
          <>
            <span>{pursuit.client_name}</span>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        {signal && (
          <>
            <Link href="/project-signals" className="hover:text-foreground">
              Signals
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/project-signals/${signal.id}`} className="hover:text-foreground">
              {signal.reference_id}
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <Link href="/pursuits" className="hover:text-foreground">
          Pursuits
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{pursuit.project_name}</span>
      </nav>

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{pursuit.project_name}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {pursuit.reference_id}
          {signal && (
            <span className="ml-2 text-xs text-muted-foreground">
              (from {signal.reference_id})
            </span>
          )}
        </p>
      </div>

      {/* Detail component */}
      <PursuitDetail pursuit={pursuit} auditLog={auditLog} />
    </div>
  )
}
