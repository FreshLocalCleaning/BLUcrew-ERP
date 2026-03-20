import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ProposalCreateForm } from '@/components/proposal/proposal-create-form'
import { listEstimates } from '@/lib/db/estimates'
import { seedClients, seedContacts, seedProjectSignals, seedPursuits, seedEstimates } from '@/lib/db/seed'

interface NewProposalPageProps {
  searchParams: Promise<{ clientId?: string; estimateId?: string }>
}

export default async function NewProposalPage({ searchParams }: NewProposalPageProps) {
  const { clientId, estimateId } = await searchParams

  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()

  const estimates = listEstimates()
  const eligibleEstimates = estimates.filter((e) => e.status === 'approved_for_proposal')

  // Determine preselection: explicit estimateId > single eligible estimate for clientId
  let preselectedEstimateId = estimateId
  if (!preselectedEstimateId && clientId) {
    const clientEstimates = eligibleEstimates.filter(e => e.linked_client_id === clientId)
    if (clientEstimates.length === 1) {
      preselectedEstimateId = clientEstimates[0]!.id
    }
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/proposals" className="hover:text-foreground">
          Proposals
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">New Proposal</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">New Proposal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A Proposal requires an Estimate at &ldquo;Approved for Proposal&rdquo; status.
        </p>
      </div>

      <ProposalCreateForm
        eligibleEstimates={eligibleEstimates}
        preselectedEstimateId={preselectedEstimateId}
      />
    </div>
  )
}
