import { MobilizationTable } from '@/components/mobilization/mobilization-table'
import { listMobilizations } from '@/lib/db/mobilizations'
import {
  seedClients,
  seedContacts,
  seedProjectSignals,
  seedPursuits,
  seedEstimates,
  seedProposals,
  seedAwardHandoffs,
  seedProjects,
  seedMobilizations,
} from '@/lib/db/seed'

export default function MobilizationsPage() {
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  seedMobilizations()
  const mobilizations = listMobilizations()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mobilizations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage trip planning, readiness, field operations, and QC
        </p>
      </div>

      <MobilizationTable mobilizations={mobilizations} />
    </div>
  )
}
