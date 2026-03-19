import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ProposalTable } from '@/components/proposal/proposal-table'
import { listProposals } from '@/lib/db/proposals'
import { seedClients, seedContacts, seedProjectSignals, seedPursuits, seedEstimates, seedProposals } from '@/lib/db/seed'

export default function ProposalsPage() {
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  const proposals = listProposals()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proposals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage client-facing commercial offers and track decisions
          </p>
        </div>
        <Link
          href="/proposals/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Proposal
        </Link>
      </div>

      <ProposalTable proposals={proposals} />
    </div>
  )
}
