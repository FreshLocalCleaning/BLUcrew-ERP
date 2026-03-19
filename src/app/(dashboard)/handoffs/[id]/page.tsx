import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getAwardHandoff } from '@/lib/db/award-handoffs'
import { getProposal } from '@/lib/db/proposals'
import { getClient } from '@/lib/db/clients'
import { getAuditLog } from '@/lib/db/json-db'
import { AwardHandoffDetail } from '@/components/award-handoff/award-handoff-detail'
import {
  seedClients,
  seedContacts,
  seedProjectSignals,
  seedPursuits,
  seedEstimates,
  seedProposals,
  seedAwardHandoffs,
} from '@/lib/db/seed'

interface AwardHandoffDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AwardHandoffDetailPage({ params }: AwardHandoffDetailPageProps) {
  const { id } = await params

  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()

  const awardHandoff = getAwardHandoff(id)
  if (!awardHandoff) {
    notFound()
  }

  const proposal = getProposal(awardHandoff.linked_proposal_id)
  const client = getClient(awardHandoff.linked_client_id)
  const auditLog = getAuditLog('awards', id)

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {client && (
          <>
            <Link href="/clients" className="hover:text-foreground">Clients</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/clients/${client.id}`} className="hover:text-foreground">{client.name}</Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        {proposal && (
          <>
            <Link href="/proposals" className="hover:text-foreground">Proposals</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/proposals/${proposal.id}`} className="hover:text-foreground">{proposal.project_name}</Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <Link href="/handoffs" className="hover:text-foreground">Handoffs</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{awardHandoff.project_name}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{awardHandoff.project_name}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {awardHandoff.reference_id}
        </p>
      </div>

      <AwardHandoffDetail awardHandoff={awardHandoff} auditLog={auditLog} />
    </div>
  )
}
