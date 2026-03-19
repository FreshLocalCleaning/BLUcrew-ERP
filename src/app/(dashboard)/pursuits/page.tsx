import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PursuitTable } from '@/components/pursuit/pursuit-table'
import { listPursuits } from '@/lib/db/pursuits'
import { seedClients, seedContacts, seedPursuits } from '@/lib/db/seed'

export default function PursuitsPage() {
  // Ensure seed data exists on first load
  seedClients()
  seedContacts()
  seedPursuits()
  const pursuits = listPursuits()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pursuits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track project opportunities from signal to estimate
          </p>
        </div>
        <Link
          href="/pursuits/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Pursuit
        </Link>
      </div>

      {/* Table */}
      <PursuitTable pursuits={pursuits} />
    </div>
  )
}
