import Link from 'next/link'
import { Plus } from 'lucide-react'
import { SignalTable } from '@/components/project-signal/signal-table'
import { listProjectSignals } from '@/lib/db/project-signals'
import { seedClients, seedContacts, seedPursuits, seedProjectSignals } from '@/lib/db/seed'

export default function ProjectSignalsPage() {
  // Ensure seed data exists on first load
  seedClients()
  seedContacts()
  seedPursuits()
  seedProjectSignals()
  const signals = listProjectSignals()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Signals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pre-pursuit proof that a real project opportunity exists
          </p>
        </div>
        <Link
          href="/project-signals/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Signal
        </Link>
      </div>

      {/* Table */}
      <SignalTable signals={signals} />
    </div>
  )
}
