import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getProjectSignal } from '@/lib/db/project-signals'
import { getClient, listClients } from '@/lib/db/clients'
import { listContacts } from '@/lib/db/contacts'
import { getAuditLog } from '@/lib/db/json-db'
import { SignalDetail } from '@/components/project-signal/signal-detail'
import {
  seedClients, seedContacts, seedProjectSignals, seedPursuits,
} from '@/lib/db/seed'

interface SignalDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SignalDetailPage({ params }: SignalDetailPageProps) {
  const { id } = await params

  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()

  const signal = getProjectSignal(id)
  if (!signal) {
    notFound()
  }

  const client = getClient(signal.linked_client_id)
  const auditLog = getAuditLog('project_signals', id)
  const clients = listClients()
  const contacts = listContacts()

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/project-signals" className="hover:text-foreground">
          Project Signals
        </Link>
        <ChevronRight className="h-4 w-4" />
        {client && (
          <>
            <Link href={`/clients/${client.id}`} className="hover:text-foreground">
              {client.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="text-foreground">{signal.project_identity}</span>
      </nav>

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{signal.project_identity}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {signal.reference_id}
        </p>
      </div>

      {/* Detail component */}
      <SignalDetail
        signal={signal}
        auditLog={auditLog}
        clientName={client?.name}
        clients={clients}
        contacts={contacts}
      />
    </div>
  )
}
