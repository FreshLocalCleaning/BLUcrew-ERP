import { ExpansionTaskCreateForm } from '@/components/expansion-task/expansion-task-create-form'
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
} from '@/lib/db/seed'

interface NewExpansionTaskPageProps {
  searchParams: Promise<{ project?: string }>
}

export default async function NewExpansionTaskPage({ searchParams }: NewExpansionTaskPageProps) {
  const { project: preselectedProjectId } = await searchParams

  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  const projects = listProjects()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Expansion Task</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a post-project growth task for a project
        </p>
      </div>

      <ExpansionTaskCreateForm
        projects={projects}
        preselectedProjectId={preselectedProjectId}
      />
    </div>
  )
}
