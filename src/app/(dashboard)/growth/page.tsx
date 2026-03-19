import { ExpansionTaskTable } from '@/components/expansion-task/expansion-task-table'
import { listExpansionTasks } from '@/lib/db/expansion-tasks'
import { listProjects } from '@/lib/db/projects'
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
  seedExpansionTasks,
} from '@/lib/db/seed'

export default function GrowthPage() {
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  seedMobilizations()
  seedExpansionTasks()
  const expansionTasks = listExpansionTasks()
  const projects = listProjects()
  const projectNameMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Growth</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track post-project expansion opportunities, referrals, testimonials, and client relationship growth
        </p>
      </div>

      <ExpansionTaskTable expansionTasks={expansionTasks} projectNameMap={projectNameMap} />
    </div>
  )
}
