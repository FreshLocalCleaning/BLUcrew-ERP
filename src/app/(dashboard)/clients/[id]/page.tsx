import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getClient } from '@/lib/db/clients'
import { getAuditLog, query } from '@/lib/db/json-db'
import { ClientDetail } from '@/components/client/client-detail'
import {
  seedClients, seedContacts, seedProjectSignals, seedPursuits,
  seedEstimates, seedProposals, seedAwardHandoffs, seedProjects,
} from '@/lib/db/seed'
import type { Contact, Pursuit, Estimate, Proposal } from '@/types/commercial'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params

  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()

  const client = getClient(id)
  if (!client) {
    notFound()
  }

  const auditLog = getAuditLog('clients', id)
  const contacts = query<Contact>('contacts', { client_id: id })
  const pursuits = query<Pursuit>('pursuits', { client_id: id })
  const estimates = query<Estimate>('estimates', { linked_client_id: id })
  const proposals = query<Proposal>('proposals', { linked_client_id: id })

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
      <ClientDetail
        client={client}
        auditLog={auditLog}
        contacts={contacts}
        pursuits={pursuits}
        estimates={estimates}
        proposals={proposals}
      />
    </div>
  )
}
