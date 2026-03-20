import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { EstimateCreateForm } from '@/components/estimate/estimate-create-form'
import { listPursuits } from '@/lib/db/pursuits'
import { listEstimates } from '@/lib/db/estimates'
import { seedClients, seedContacts, seedProjectSignals, seedPursuits, seedEstimates } from '@/lib/db/seed'

interface NewEstimatePageProps {
  searchParams: Promise<{ clientId?: string; pursuitId?: string }>
}

export default async function NewEstimatePage({ searchParams }: NewEstimatePageProps) {
  const { clientId, pursuitId } = await searchParams

  // Ensure seed data exists
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()

  const pursuits = listPursuits()
  const estimates = listEstimates()

  // Show ALL pursuits at estimate_ready (including those with existing estimates — new versions allowed)
  const eligiblePursuits = pursuits.filter((p) => p.stage === 'estimate_ready')

  // Track which pursuits already have active (non-superseded) estimates
  const pursuitsWithActiveEstimate = [
    ...new Set(
      estimates
        .filter((e) => e.status !== 'superseded')
        .map((e) => e.linked_pursuit_id),
    ),
  ]

  // Determine preselection: explicit pursuitId > single eligible pursuit for clientId
  let preselectedPursuitId = pursuitId
  if (!preselectedPursuitId && clientId) {
    const clientPursuits = eligiblePursuits.filter(p => p.client_id === clientId)
    if (clientPursuits.length === 1) {
      preselectedPursuitId = clientPursuits[0]!.id
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/estimates" className="hover:text-foreground">
          Estimates
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">New Estimate</span>
      </nav>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Estimate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An Estimate requires a Pursuit at &ldquo;Estimate Ready&rdquo; status.
        </p>
      </div>

      {/* Form */}
      <EstimateCreateForm
        eligiblePursuits={eligiblePursuits}
        pursuitsWithExistingEstimate={pursuitsWithActiveEstimate}
        preselectedPursuitId={preselectedPursuitId ?? (eligiblePursuits.length === 1 ? eligiblePursuits[0]!.id : undefined)}
      />
    </div>
  )
}
