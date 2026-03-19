import { MobilizationCreateForm } from '@/components/mobilization/mobilization-create-form'
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

interface NewMobilizationPageProps {
  searchParams: Promise<{ project?: string }>
}

export default async function NewMobilizationPage({ searchParams }: NewMobilizationPageProps) {
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
        <h1 className="text-2xl font-bold text-foreground">New Mobilization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new mobilization trip for a project
        </p>
      </div>

      <MobilizationCreateForm
        projects={projects}
        preselectedProjectId={preselectedProjectId}
      />
    </div>
  )
}
