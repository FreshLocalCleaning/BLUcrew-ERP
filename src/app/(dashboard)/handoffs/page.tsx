import { AwardHandoffTable } from '@/components/award-handoff/award-handoff-table'
import { listAwardHandoffs } from '@/lib/db/award-handoffs'
import {
  seedClients,
  seedContacts,
  seedProjectSignals,
  seedPursuits,
  seedEstimates,
  seedProposals,
  seedAwardHandoffs,
} from '@/lib/db/seed'

export default function HandoffsPage() {
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  const awardHandoffs = listAwardHandoffs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Handoffs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track award compliance, handoff to PM/Ops, and project creation
        </p>
      </div>

      <AwardHandoffTable awardHandoffs={awardHandoffs} />
    </div>
  )
}
