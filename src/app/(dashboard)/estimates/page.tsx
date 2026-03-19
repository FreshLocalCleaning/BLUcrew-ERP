import Link from 'next/link'
import { Plus } from 'lucide-react'
import { EstimateTable } from '@/components/estimate/estimate-table'
import { listEstimates } from '@/lib/db/estimates'
import { seedClients, seedContacts, seedProjectSignals, seedPursuits, seedEstimates } from '@/lib/db/seed'

export default function EstimatesPage() {
  // Ensure seed data exists on first load
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  const estimates = listEstimates()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estimates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and manage pricing estimates for qualified pursuits
          </p>
        </div>
        <Link
          href="/estimates/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Estimate
        </Link>
      </div>

      {/* Table */}
      <EstimateTable estimates={estimates} />
    </div>
  )
}
