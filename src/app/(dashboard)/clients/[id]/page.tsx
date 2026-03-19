import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getClient } from '@/lib/db/clients'
import { getAuditLog } from '@/lib/db/json-db'
import { ClientDetail } from '@/components/client/client-detail'
import { seedClients, seedContacts, seedPursuits } from '@/lib/db/seed'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params

  // Ensure seed data exists
  seedClients()
  seedContacts()
  seedPursuits()

  const client = getClient(id)
  if (!client) {
    notFound()
  }

  const auditLog = getAuditLog('clients', id)

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-foreground">
          Clients
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{client.name}</span>
      </nav>

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {client.reference_id}
        </p>
      </div>

      {/* Detail component */}
      <ClientDetail client={client} auditLog={auditLog} />
    </div>
  )
}
