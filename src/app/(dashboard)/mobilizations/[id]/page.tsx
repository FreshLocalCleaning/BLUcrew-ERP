import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getMobilization } from '@/lib/db/mobilizations'
import { getProject } from '@/lib/db/projects'
import { getAuditLog } from '@/lib/db/json-db'
import { MobilizationDetail } from '@/components/mobilization/mobilization-detail'
import { listEquipmentTemplates } from '@/lib/db/equipment-templates'
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
  seedEquipmentTemplates,
} from '@/lib/db/seed'

const CREW_NAME_MAP: Record<string, string> = {
  'marcus-johnson': 'Marcus Johnson',
  'tech-001': 'David Rivera',
  'tech-002': 'Sarah Kim',
  'tech-003': 'James Thompson',
  'tech-004': 'Maria Garcia',
  'tech-005': 'Robert Chen',
  'cullen': 'Cullen',
  'antonio': 'Antonio',
}

interface MobilizationDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function MobilizationDetailPage({ params }: MobilizationDetailPageProps) {
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
  seedEquipmentTemplates()

  const mobilization = getMobilization(id)
  if (!mobilization) {
    notFound()
  }

  const project = getProject(mobilization.linked_project_id)
  const auditLog = getAuditLog('mobilizations', id)
  const equipmentTemplates = listEquipmentTemplates()

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
        <Link href="/mobilizations" className="hover:text-foreground">Mobilizations</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{mobilization.stage_name}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{mobilization.stage_name}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {mobilization.reference_id}
          {' '}
          {mobilization.crew_lead_id && (
            <span className="text-xs text-muted-foreground">(Lead: {CREW_NAME_MAP[mobilization.crew_lead_id] ?? mobilization.crew_lead_id})</span>
          )}
        </p>
      </div>

      <MobilizationDetail mobilization={mobilization} auditLog={auditLog} equipmentTemplates={equipmentTemplates} />
    </div>
  )
}
