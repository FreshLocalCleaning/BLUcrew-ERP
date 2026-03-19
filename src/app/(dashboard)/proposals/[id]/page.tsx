import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getProposal } from '@/lib/db/proposals'
import { getEstimate } from '@/lib/db/estimates'
import { getPursuit } from '@/lib/db/pursuits'
import { getClient } from '@/lib/db/clients'
import { getAuditLog } from '@/lib/db/json-db'
import { ProposalDetail } from '@/components/proposal/proposal-detail'
import { seedClients, seedContacts, seedProjectSignals, seedPursuits, seedEstimates, seedProposals } from '@/lib/db/seed'

interface ProposalDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  const { id } = await params

  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()

  const proposal = getProposal(id)
  if (!proposal) {
    notFound()
  }

  const estimate = getEstimate(proposal.linked_estimate_id)
  const pursuit = getPursuit(proposal.linked_pursuit_id)
  const client = getClient(proposal.linked_client_id)
  const auditLog = getAuditLog('proposals', id)

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
        {pursuit && (
          <>
            <Link href="/pursuits" className="hover:text-foreground">Pursuits</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/pursuits/${pursuit.id}`} className="hover:text-foreground">{pursuit.project_name}</Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        {estimate && (
          <>
            <Link href="/estimates" className="hover:text-foreground">Estimates</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/estimates/${estimate.id}`} className="hover:text-foreground">{estimate.reference_id}</Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <Link href="/proposals" className="hover:text-foreground">Proposals</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{proposal.project_name}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{proposal.project_name}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {proposal.reference_id}
          {estimate && (
            <span className="ml-2 text-xs text-muted-foreground">(from {estimate.reference_id})</span>
          )}
        </p>
      </div>

      <ProposalDetail proposal={proposal} auditLog={auditLog} />
    </div>
  )
}
