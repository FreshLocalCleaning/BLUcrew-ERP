import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ProposalCreateForm } from '@/components/proposal/proposal-create-form'
import { listEstimates } from '@/lib/db/estimates'
import { seedClients, seedContacts, seedProjectSignals, seedPursuits, seedEstimates } from '@/lib/db/seed'

export default function NewProposalPage() {
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()

  const estimates = listEstimates()
  const eligibleEstimates = estimates.filter((e) => e.status === 'approved_for_proposal')

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

      <ProposalCreateForm eligibleEstimates={eligibleEstimates} />
    </div>
  )
}
