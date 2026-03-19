import { ProjectTable } from '@/components/project/project-table'
import { listProjects } from '@/lib/db/projects'
import { listClients } from '@/lib/db/clients'
import {
  seedClients,
  seedContacts,
  seedProjectSignals,
  seedPursuits,
  seedEstimates,
  seedProposals,
  seedAwardHandoffs,
  seedProjects,
} from '@/lib/db/seed'

export default function ProjectsPage() {
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  const projects = listProjects()
  const clients = listClients()
  const clientNameMap = Object.fromEntries(clients.map(c => [c.id, c.name]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage PM lifecycle from startup through financial close
        </p>
      </div>

      <ProjectTable projects={projects} clientNameMap={clientNameMap} />
    </div>
  )
}
