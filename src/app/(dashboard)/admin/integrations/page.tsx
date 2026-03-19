import { listIntegrationEvents } from '@/lib/db/json-db'
import { IntegrationEventsTable } from '@/components/admin/integration-events-table'
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
  seedChangeOrders,
  seedExpansionTasks,
} from '@/lib/db/seed'

export default function IntegrationAdminPage() {
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  seedMobilizations()
  seedChangeOrders()
  seedExpansionTasks()

  const events = listIntegrationEvents()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integration Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor external system integrations — SharePoint, Teams, Jobber, QuickBooks, Gusto, Outlook
        </p>
      </div>

      <IntegrationEventsTable events={events} />
    </div>
  )
}
