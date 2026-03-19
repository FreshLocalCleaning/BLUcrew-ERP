import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getExpansionTask } from '@/lib/db/expansion-tasks'
import { getProject } from '@/lib/db/projects'
import { getAuditLog } from '@/lib/db/json-db'
import { ExpansionTaskDetail } from '@/components/expansion-task/expansion-task-detail'
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

interface ExpansionTaskDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ExpansionTaskDetailPage({ params }: ExpansionTaskDetailPageProps) {
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
  seedExpansionTasks()

  const expansionTask = getExpansionTask(id)
  if (!expansionTask) {
    notFound()
  }

  const project = getProject(expansionTask.linked_project_id)
  const auditLog = getAuditLog('expansion_tasks', id)

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {project && (
          <>
            <Link href="/projects" className="hover:text-foreground">Projects</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/projects/${project.id}`} className="hover:text-foreground">{project.project_name}</Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <Link href="/growth" className="hover:text-foreground">Growth</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{expansionTask.reference_id}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Expansion Task {expansionTask.reference_id}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {expansionTask.growth_objective.length > 100
            ? expansionTask.growth_objective.slice(0, 100) + '…'
            : expansionTask.growth_objective}
        </p>
      </div>

      <ExpansionTaskDetail expansionTask={expansionTask} auditLog={auditLog} />
    </div>
  )
}
