import { ChangeOrderCreateForm } from '@/components/change-order/change-order-create-form'
import { listProjects } from '@/lib/db/projects'
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

interface NewChangeOrderPageProps {
  searchParams: Promise<{ project?: string; mobilization?: string }>
}

export default async function NewChangeOrderPage({ searchParams }: NewChangeOrderPageProps) {
  const { project: preselectedProjectId, mobilization: preselectedMobilizationId } = await searchParams

  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  seedMobilizations()
  const projects = listProjects()
  const mobilizations = listMobilizations()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Change Order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a post-award scope revision for a project
        </p>
      </div>

      <ChangeOrderCreateForm
        projects={projects}
        mobilizations={mobilizations}
        preselectedProjectId={preselectedProjectId}
        preselectedMobilizationId={preselectedMobilizationId}
      />
    </div>
  )
}
