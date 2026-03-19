import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { EstimateCreateForm } from '@/components/estimate/estimate-create-form'
import { listPursuits } from '@/lib/db/pursuits'
import { listEstimates } from '@/lib/db/estimates'
import { seedClients, seedContacts, seedProjectSignals, seedPursuits } from '@/lib/db/seed'

export default function NewEstimatePage() {
  // Ensure seed data exists
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()

  const pursuits = listPursuits()
  const estimates = listEstimates()

  // Only show pursuits at estimate_ready that don't already have an active estimate
  const pursuitsWithActiveEstimate = new Set(
    estimates
      .filter((e) => e.status !== 'superseded')
      .map((e) => e.linked_pursuit_id),
  )

  const eligiblePursuits = pursuits.filter(
    (p) => p.stage === 'estimate_ready' && !pursuitsWithActiveEstimate.has(p.id),
  )

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
      <EstimateCreateForm eligiblePursuits={eligiblePursuits} />
    </div>
  )
}
