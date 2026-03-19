import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getProject } from '@/lib/db/projects'
import { listMobilizationsByProject } from '@/lib/db/mobilizations'
import { MobilizationTable } from '@/components/mobilization/mobilization-table'
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

interface ProjectMobilizationsPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectMobilizationsPage({ params }: ProjectMobilizationsPageProps) {
  const { id } = await params

  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  seedMobilizations()

  const project = getProject(id)
  if (!project) {
    notFound()
  }

  const mobilizations = listMobilizationsByProject(id)

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/projects/${project.id}`} className="hover:text-foreground">{project.project_name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Mobilizations</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mobilizations — {project.project_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mobilizations.length} mobilization{mobilizations.length !== 1 ? 's' : ''} for this project
          </p>
        </div>
        <Link
          href={`/mobilizations/new?project=${project.id}`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Mobilization
        </Link>
      </div>

      <MobilizationTable mobilizations={mobilizations} showProjectLink />
    </div>
  )
}
