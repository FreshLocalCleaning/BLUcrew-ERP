import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getProject } from '@/lib/db/projects'
import { getAwardHandoff } from '@/lib/db/award-handoffs'
import { getClient } from '@/lib/db/clients'
import { listMobilizationsByProject } from '@/lib/db/mobilizations'
import { listChangeOrdersByProject } from '@/lib/db/change-orders'
import { listExpansionTasksByProject } from '@/lib/db/expansion-tasks'
import { getAuditLog } from '@/lib/db/json-db'
import { ProjectDetail } from '@/components/project/project-detail'
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

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
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
  seedChangeOrders()

  const project = getProject(id)
  if (!project) {
    notFound()
  }

  const awardHandoff = getAwardHandoff(project.linked_award_handoff_id)
  const client = getClient(project.linked_client_id)
  const mobilizations = listMobilizationsByProject(id)
  const changeOrders = listChangeOrdersByProject(id)
  seedExpansionTasks()
  const expansionTasks = listExpansionTasksByProject(id)
  const auditLog = getAuditLog('projects', id)

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {client && (
          <>
            <Link href="/clients" className="hover:text-foreground">Clients</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/clients/${client.id}`} className="hover:text-foreground">{client.name}</Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        {awardHandoff && (
          <>
            <Link href="/handoffs" className="hover:text-foreground">Handoffs</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/handoffs/${awardHandoff.id}`} className="hover:text-foreground">{awardHandoff.reference_id}</Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{project.project_name}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{project.project_name}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {project.reference_id}
          {' '}
          <span className="text-xs text-muted-foreground">(PM: {project.pm_owner_id})</span>
        </p>
      </div>

      <ProjectDetail project={project} auditLog={auditLog} mobilizations={mobilizations} changeOrders={changeOrders} expansionTasks={expansionTasks} />
    </div>
  )
}
