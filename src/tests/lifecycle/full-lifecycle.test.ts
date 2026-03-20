/**
 * FULL LIFECYCLE E2E TEST
 *
 * Tests the complete ERP lifecycle from Client creation through
 * Expansion Task → New Signal loop. Uses DB layer functions directly
 * (server actions have 'use server' which can't run in Vitest).
 *
 * DPR Construction → Methodist Hospital Plano Expansion
 */

import { describe, it, expect, beforeAll } from 'vitest'
import * as clientDb from '@/lib/db/clients'
import * as contactDb from '@/lib/db/contacts'
import * as signalDb from '@/lib/db/project-signals'
import * as pursuitDb from '@/lib/db/pursuits'
import * as estimateDb from '@/lib/db/estimates'
import * as proposalDb from '@/lib/db/proposals'
import * as awardDb from '@/lib/db/award-handoffs'
import * as projectDb from '@/lib/db/projects'
import * as mobDb from '@/lib/db/mobilizations'
import * as coDb from '@/lib/db/change-orders'
import * as expansionDb from '@/lib/db/expansion-tasks'
import * as siteWalkDb from '@/lib/db/site-walks'
import { getAuditLog, resetDb } from '@/lib/db/json-db'
import { validateTransition } from '@/lib/state-machines/engine'
import { projectSignalStateMachine } from '@/lib/state-machines/project-signal'
import { pursuitStateMachine } from '@/lib/state-machines/pursuit'
import { estimateStateMachine } from '@/lib/state-machines/estimate'
import { proposalStateMachine } from '@/lib/state-machines/proposal'
import { awardHandoffStateMachine } from '@/lib/state-machines/award-handoff'
import { projectStateMachine } from '@/lib/state-machines/project'
import { mobilizationStateMachine } from '@/lib/state-machines/mobilization'
import { changeOrderStateMachine } from '@/lib/state-machines/change-order'
import { expansionTaskStateMachine } from '@/lib/state-machines/expansion-task'

// Track IDs
const ids: Record<string, string> = {}
const actor = 'system-test'

function tomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]!
}
function daysFromNow(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]!
}

/** Helper to validate and transition a signal */
function transitionSignal(id: string, target: string) {
  const signal = signalDb.getProjectSignal(id)!
  const result = validateTransition(projectSignalStateMachine, {
    currentState: signal.status,
    targetState: target,
    actorRoles: ['leadership_system_admin', 'commercial_bd'],
    entity: signal as unknown as Record<string, unknown>,
    approvalGranted: true,
  })
  if (!result.allowed) throw new Error(`Signal transition blocked: ${result.errors.join('; ')}`)
  return signalDb.updateProjectSignal(id, {
    status: target as any,
    ...(target === 'passed' ? { gate_outcome: 'passed', gate_decision_by: actor, gate_decision_date: new Date().toISOString() } : {}),
    ...(target === 'under_review' ? { gate_outcome: 'pending' } : {}),
  } as any, actor)
}

/** Helper to validate and transition a pursuit */
function transitionPursuit(id: string, target: string, reason?: string) {
  const pursuit = pursuitDb.getPursuit(id)!
  const result = validateTransition(pursuitStateMachine, {
    currentState: pursuit.stage,
    targetState: target,
    actorRoles: ['leadership_system_admin', 'commercial_bd'],
    entity: pursuit as unknown as Record<string, unknown>,
    approvalGranted: true,
    reason,
  })
  if (!result.allowed) throw new Error(`Pursuit transition blocked: ${result.errors.join('; ')}`)
  return pursuitDb.updatePursuit(id, { stage: target as any } as any, actor, reason)
}

describe('Full Lifecycle: DPR Construction → Methodist Hospital', () => {
  beforeAll(() => {
    resetDb()
  })

  // STEP 1 — Create Client
  it('Step 1: Create Client — DPR Construction', () => {
    const client = clientDb.createClient({
      name: 'DPR Construction',
      vertical: 'general_contractor',
      market: 'dallas_fort_worth',
      relationship_strength: 'cold',
      next_action: "Research DPR's active projects in DFW",
      next_action_date: tomorrow(),
      notes: 'National GC with strong healthcare and tech presence. Recently won Methodist Hospital expansion in Plano.',
    }, actor)

    expect(client.name).toBe('DPR Construction')
    expect(client.status).toBe('watchlist')
    expect(client.reference_id).toMatch(/^CLT-/)
    ids.client = client.id
  })

  // STEP 2 — Create Contact
  it('Step 2: Create Contact — Sarah Mitchell', () => {
    const contact = contactDb.createContact({
      client_id: ids.client,
      first_name: 'Sarah',
      last_name: 'Mitchell',
      title: 'Senior Project Manager',
      layer: 'pm_super_field',
      role_type: 'PM',
      email: 'sarah.mitchell@dpr.com',
      phone: '469-555-0142',
      influence: 'high',
      relationship_strength: 'developing',
      source_channel: 'event',
      is_champion: false,
      owner_name: 'Antonio',
      next_step: 'Send intro email with capabilities deck',
      next_step_due_date: tomorrow(),
      notes: 'Met at AGC Dallas mixer. Interested in BLU Standard approach.',
    }, actor)

    expect(contact.first_name).toBe('Sarah')
    expect(contact.client_id).toBe(ids.client)
    expect(contact.layer).toBe('pm_super_field')
    expect(contact.reference_id).toMatch(/^CON-/)
    ids.contact = contact.id
  })

  // STEP 3 — Create Project Signal
  it('Step 3: Create Project Signal — Methodist Hospital', () => {
    const signal = signalDb.createProjectSignal({
      linked_client_id: ids.client,
      linked_client_name: 'DPR Construction',
      linked_contact_id: ids.contact,
      linked_contact_name: 'Sarah Mitchell',
      project_identity: 'Methodist Hospital Plano Expansion',
      signal_type: 'event_network',
      source_evidence: 'Met Sarah Mitchell at AGC Dallas mixer March 15. She confirmed DPR won the Methodist Hospital Plano expansion, estimated 185,000 SF.',
      timing_signal: 'Construction start Q3 2026, substantial completion Q1 2027',
      fit_risk_note: 'Hospital/healthcare — high complexity, high value. DPR is tier-1 GC. Good fit for BLU Standard.',
      next_action: 'Follow up with Sarah to schedule intro meeting',
      next_action_date: daysFromNow(2),
    }, actor)

    expect(signal.status).toBe('received')
    expect(signal.reference_id).toMatch(/^SIG-/)
    expect(signal.linked_client_name).toBe('DPR Construction')
    ids.signal = signal.id
  })

  // STEP 4 — Signal Gate
  it('Step 4a: Signal received → under_review', () => {
    const updated = transitionSignal(ids.signal, 'under_review')
    expect(updated.status).toBe('under_review')
  })

  it('Step 4b: Gate blocks without timing_signal', () => {
    // Create a signal missing timing_signal and fit_risk_note
    const badSignal = signalDb.createProjectSignal({
      linked_client_id: ids.client,
      linked_client_name: 'DPR Construction',
      linked_contact_id: ids.contact,
      linked_contact_name: 'Sarah Mitchell',
      project_identity: 'Test Missing Fields',
      signal_type: 'referral',
      source_evidence: 'Some evidence',
      next_action: 'Test',
      next_action_date: tomorrow(),
    }, actor)

    // Move to under_review
    signalDb.updateProjectSignal(badSignal.id, { status: 'under_review' } as any, actor)

    // Try to pass gate — should fail
    const badEntity = signalDb.getProjectSignal(badSignal.id)!
    const result = validateTransition(projectSignalStateMachine, {
      currentState: 'under_review',
      targetState: 'passed',
      actorRoles: ['leadership_system_admin'],
      entity: badEntity as unknown as Record<string, unknown>,
      approvalGranted: true,
    })

    expect(result.allowed).toBe(false)
    expect(result.errors.some(e => e.includes('timing_signal'))).toBe(true)
    expect(result.errors.some(e => e.includes('fit_risk_note'))).toBe(true)
  })

  it('Step 4c: Signal under_review → passed (all criteria met)', () => {
    const updated = transitionSignal(ids.signal, 'passed')
    expect(updated.status).toBe('passed')
    expect(updated.gate_outcome).toBe('passed')
  })

  // STEP 5 — Create Pursuit
  it('Step 5: Create Pursuit from passed signal', () => {
    const pursuit = pursuitDb.createPursuit({
      linked_signal_id: ids.signal,
      project_name: 'Methodist Hospital Plano Expansion',
      client_id: ids.client,
      client_name: 'DPR Construction',
      primary_contact_id: ids.contact,
      primary_contact_name: 'Sarah Mitchell',
      signal_type: 'event',
      build_type: 'medical',
      location: 'Plano',
      us_state: 'TX',
      approx_sqft: 185000,
      next_action: 'Schedule qualification call with Sarah',
      next_action_date: daysFromNow(3),
      notes: 'Hospital/healthcare — high complexity, high value.',
    }, actor)

    expect(pursuit.stage).toBe('project_signal_received')
    expect(pursuit.project_name).toBe('Methodist Hospital Plano Expansion')
    expect(pursuit.approx_sqft).toBe(185000)
    expect(pursuit.reference_id).toMatch(/^PUR-/)

    // Link signal back
    signalDb.updateProjectSignal(ids.signal, { created_pursuit_id: pursuit.id } as any, actor)

    ids.pursuit = pursuit.id
  })

  // STEP 6 — Advance Pursuit to Estimate Ready
  const stages = [
    'qualification_underway', 'qualified_pursuit', 'preconstruction_packet_open',
    'site_walk_scheduled', 'site_walk_complete', 'pursue_no_bid_review',
    'blu_closeout_plan_sent', 'estimate_ready',
  ]
  for (const stage of stages) {
    it(`Step 6: Pursuit → ${stage}`, () => {
      const updated = transitionPursuit(ids.pursuit, stage, `Advanced to ${stage}`)
      expect(updated.stage).toBe(stage)
    })
  }

  it('Step 6 bonus: Create Site Walk', () => {
    const walk = siteWalkDb.createSiteWalk({
      pursuit_id: ids.pursuit,
      walk_date: daysFromNow(7),
      walk_time: '10:00 AM',
      location: '3901 W 15th St, Plano, TX 75075',
      attendees: 'Sarah Mitchell, Antonio, Cullen',
      status: 'completed',
      notes: '185K SF across 3 floors. Ceiling tile work extensive. Multiple MRI rooms require special handling.',
    }, actor)
    expect(walk).toBeDefined()
    ids.siteWalk = walk.id
  })

  // STEP 7 — Create & Advance Estimate
  it('Step 7a: Create Estimate', () => {
    const estimate = estimateDb.createEstimate({
      linked_pursuit_id: ids.pursuit,
      linked_client_id: ids.client,
      linked_client_name: 'DPR Construction',
      linked_pursuit_name: 'Methodist Hospital Plano Expansion',
      project_name: 'Methodist Hospital Plano Expansion',
      build_type: 'medical',
      square_footage: 185000,
      stage_count: 3,
      stage_selections: ['rough_clean', 'final_clean', 'punch_touchup'],
      tier_index: 3,
    }, actor)

    expect(estimate.status).toBe('draft')
    expect(estimate.reference_id).toMatch(/^EST-/)
    ids.estimate = estimate.id
  })

  it('Step 7b-e: Estimate through QA to approved', () => {
    // draft → in_build
    estimateDb.updateEstimate(ids.estimate, { status: 'in_build' } as any, actor, 'Starting build')

    // Set pricing
    estimateDb.updateEstimate(ids.estimate, {
      pricing_summary: {
        base_total: 142000, surcharge_total: 8500, mobilization_total: 6200,
        exterior_total: 0, window_total: 0, per_diem_total: 3200,
        adjustments: 5100, grand_total: 165000,
        stage_breakdowns: [
          { stage: 'Rough Clean', weight_pct: 35, amount: 57750 },
          { stage: 'Final Clean', weight_pct: 45, amount: 74250 },
          { stage: 'Punch / Touch-Up', weight_pct: 20, amount: 33000 },
        ],
      },
      scope_text: 'Post-construction cleaning for 185,000 SF Methodist Hospital expansion.',
      assumptions: 'Hospital build-out with cleanroom areas. Access during off-hours only.',
    } as any, actor, 'Pricing complete')

    // in_build → qa_review
    estimateDb.updateEstimate(ids.estimate, { status: 'qa_review' } as any, actor, 'Submitting for QA')

    // Set QA reviewer
    estimateDb.updateEstimate(ids.estimate, {
      qa_reviewer_id: 'antonio', qa_reviewer_name: 'Antonio',
      qa_notes: 'Pricing verified against hospital rate bands. Labor target realistic for 185K SF.',
    } as any, actor, 'QA review')

    // qa_review → approved_for_proposal
    estimateDb.updateEstimate(ids.estimate, { status: 'approved_for_proposal' } as any, actor, 'QA approved')

    const est = estimateDb.getEstimate(ids.estimate)!
    expect(est.status).toBe('approved_for_proposal')
    expect(est.pricing_summary?.grand_total).toBe(165000)
  })

  // STEP 8 — Create & Advance Proposal
  it('Step 8: Create Proposal, deliver → accept', () => {
    const proposal = proposalDb.createProposal({
      linked_estimate_id: ids.estimate,
      linked_pursuit_id: ids.pursuit,
      linked_client_id: ids.client,
      linked_client_name: 'DPR Construction',
      project_name: 'Methodist Hospital Plano Expansion',
      proposal_value: 165000,
      delivery_date: daysFromNow(7),
      decision_target_date: daysFromNow(14),
    }, actor)

    expect(proposal.status).toBe('delivered')
    expect(proposal.reference_id).toMatch(/^PRO-/)
    ids.proposal = proposal.id

    // delivered → in_review
    proposalDb.updateProposal(ids.proposal, { status: 'in_review' } as any, actor, 'Sent to DPR')

    // in_review → accepted
    proposalDb.updateProposal(ids.proposal, {
      status: 'accepted',
      acceptance_confirmation_method: 'email',
      accepted_rejected_reason: 'Sarah confirmed via email March 20',
    } as any, actor, 'Client accepted')

    const prop = proposalDb.getProposal(ids.proposal)!
    expect(prop.status).toBe('accepted')
  })

  // STEP 9 — Create Award/Handoff (would be auto-created by server action)
  it('Step 9: Create Award/Handoff and advance to closed_to_ops', () => {
    const est = estimateDb.getEstimate(ids.estimate)!
    const award = awardDb.createAwardHandoff({
      linked_proposal_id: ids.proposal,
      linked_estimate_id: ids.estimate,
      linked_client_id: ids.client,
      project_name: 'Methodist Hospital Plano Expansion',
      accepted_baseline_snapshot: {
        estimate_ref: est.reference_id,
        proposal_ref: 'PRO-0001',
        pricing_summary: est.pricing_summary,
        scope_text: est.scope_text,
        assumptions: est.assumptions,
      },
      compliance_tracker: [
        { doc_name: 'W-9', required: true, status: 'received', received_date: new Date().toISOString(), notes: '' },
        { doc_name: 'COI', required: true, status: 'received', received_date: new Date().toISOString(), notes: '' },
        { doc_name: 'MSA', required: true, status: 'received', received_date: new Date().toISOString(), notes: '' },
      ],
      startup_blockers: [],
      next_action: 'Begin compliance document collection',
      next_action_date: daysFromNow(7),
    }, actor)

    expect(award.status).toBe('awarded_intake_open')
    expect(award.reference_id).toMatch(/^AWD-/)
    ids.award = award.id

    // Link back to proposal
    proposalDb.updateProposal(ids.proposal, { created_award_id: award.id } as any, actor)

    // Advance through states
    awardDb.updateAwardHandoff(ids.award, { status: 'compliance_in_progress' } as any, actor, 'Compliance started')
    awardDb.updateAwardHandoff(ids.award, { status: 'handoff_posted' } as any, actor, 'All docs received')
    awardDb.updateAwardHandoff(ids.award, {
      status: 'pm_claimed',
      pm_claim_user_id: 'cullen',
      pm_claim_timestamp: new Date().toISOString(),
    } as any, actor, 'Cullen claiming as PM')
    awardDb.updateAwardHandoff(ids.award, { status: 'closed_to_ops' } as any, actor, 'Closing to ops')

    const a = awardDb.getAwardHandoff(ids.award)!
    expect(a.status).toBe('closed_to_ops')
    expect(a.pm_claim_user_id).toBe('cullen')
  })

  // STEP 10 — Create Project (would be auto-created)
  it('Step 10: Create Project and advance to forecasting_active', () => {
    const award = awardDb.getAwardHandoff(ids.award)!
    const project = projectDb.createProject({
      linked_award_handoff_id: ids.award,
      linked_client_id: ids.client,
      project_name: 'Methodist Hospital Plano Expansion',
      pm_owner_id: 'cullen',
      commercial_baseline_snapshot: award.accepted_baseline_snapshot,
      target_turnover_date: daysFromNow(90),
      next_action: 'Complete project startup and begin forecasting',
      next_action_date: daysFromNow(14),
    }, actor)

    expect(project.status).toBe('startup_pending')
    expect(project.pm_owner_id).toBe('cullen')
    expect(project.reference_id).toMatch(/^PRJ-/)
    ids.project = project.id

    // Link back
    awardDb.updateAwardHandoff(ids.award, { created_project_id: project.id } as any, actor)

    // startup_pending → forecasting_active
    projectDb.updateProject(ids.project, { status: 'forecasting_active' } as any, actor, 'Project startup complete')

    const p = projectDb.getProject(ids.project)!
    expect(p.status).toBe('forecasting_active')
  })

  // STEP 11 — Mobilizations
  it('Step 11a: Create Mob 1 and complete it', () => {
    const mob = mobDb.createMobilization({
      linked_project_id: ids.project,
      linked_client_id: ids.client,
      stage_name: 'Phase 1 — Floors 1-2 Rough Clean',
      travel_posture: 'local',
      site_address: '3901 W 15th St, Plano, TX 75075',
      requested_start_date: daysFromNow(14),
      requested_end_date: daysFromNow(18),
    }, actor)

    expect(mob.status).toBe('handoff_incomplete')
    expect(mob.reference_id).toMatch(/^MOB-/)
    ids.mob1 = mob.id

    // Advance through states
    mobDb.updateMobilization(ids.mob1, { status: 'needs_planning' } as any, actor, 'Handoff data complete')

    // Set readiness
    mobDb.updateMobilization(ids.mob1, {
      readiness_checklist: {
        crew_confirmed: true, equipment_loaded: true,
        travel_booked: true, lodging_booked: true, per_diem_approved: true,
      },
      crew_lead_id: 'marcus-johnson', crew_lead_name: 'Marcus Johnson',
    } as any, actor, 'Readiness complete')

    mobDb.updateMobilization(ids.mob1, { status: 'ready' } as any, actor, 'Ready for deployment')
    mobDb.updateMobilization(ids.mob1, {
      status: 'in_field',
      actual_start_date: new Date().toISOString().split('T')[0],
    } as any, actor, 'Deployed')

    // Add daily report
    const m = mobDb.getMobilization(ids.mob1)!
    const reports = m.daily_reports ?? []
    reports.push({
      date: new Date().toISOString().split('T')[0]!,
      summary: 'Day 1: Floors 1-2 rough clean started. MRI rooms cordoned off per protocol.',
      submitted_by: actor,
    })
    mobDb.updateMobilization(ids.mob1, { daily_reports: reports } as any, actor, 'Daily report')

    // Complete
    mobDb.updateMobilization(ids.mob1, {
      status: 'complete',
      photo_report_link: 'https://sharepoint.com/sites/blucrew/photos/methodist-mob1',
      client_signoff_status: 'obtained',
      qc_stage_completion: 'passed',
      actual_end_date: new Date().toISOString().split('T')[0],
    } as any, actor, 'Phase 1 complete')

    const final = mobDb.getMobilization(ids.mob1)!
    expect(final.status).toBe('complete')
  })

  it('Step 11b: Create and complete Mob 2', () => {
    const mob = mobDb.createMobilization({
      linked_project_id: ids.project,
      linked_client_id: ids.client,
      stage_name: 'Phase 2 — Floor 3 + Final Detail',
      travel_posture: 'local',
      requested_start_date: daysFromNow(21),
      requested_end_date: daysFromNow(25),
    }, actor)
    ids.mob2 = mob.id

    // Advance through all states
    mobDb.updateMobilization(ids.mob2, { status: 'needs_planning' } as any, actor)
    mobDb.updateMobilization(ids.mob2, {
      readiness_checklist: {
        crew_confirmed: true, equipment_loaded: true,
        travel_booked: true, lodging_booked: true, per_diem_approved: true,
      },
    } as any, actor)
    mobDb.updateMobilization(ids.mob2, { status: 'ready' } as any, actor)
    mobDb.updateMobilization(ids.mob2, { status: 'in_field', actual_start_date: new Date().toISOString().split('T')[0] } as any, actor)
    mobDb.updateMobilization(ids.mob2, {
      status: 'complete',
      photo_report_link: 'https://sharepoint.com/sites/blucrew/photos/methodist-mob2',
      client_signoff_status: 'obtained',
      qc_stage_completion: 'passed',
      actual_end_date: new Date().toISOString().split('T')[0],
    } as any, actor)

    expect(mobDb.getMobilization(ids.mob2)!.status).toBe('complete')
  })

  // STEP 12 — Change Order
  it('Step 12: Create and advance Change Order', () => {
    const co = coDb.createChangeOrder({
      linked_project_id: ids.project,
      linked_client_id: ids.client,
      linked_mobilization_id: null,
      origin: 'client_request',
      scope_delta: 'Client requested additional window cleaning for all 3 floors — not in original scope',
      fact_packet_by: 'cullen',
      pricing_delta: null,
      priced_by: null,
      schedule_delta: null,
      mobilization_impact: null,
      approval_notes: null,
      release_notes: null,
      client_response_date: null,
      rejection_reason: null,
    }, actor)

    expect(co.status).toBe('draft')
    expect(co.reference_id).toMatch(/^CO-/)
    ids.co = co.id

    // Set pricing
    coDb.updateChangeOrder(ids.co, {
      pricing_delta: { original_value: 0, revised_value: 4500, delta: 4500 },
      priced_by: 'antonio',
    } as any, actor, 'Pricing set')

    // Advance states
    coDb.updateChangeOrder(ids.co, { status: 'internal_review' } as any, actor, 'Sent to estimating')
    coDb.updateChangeOrder(ids.co, { status: 'client_pending' } as any, actor, 'Sent to DPR')
    coDb.updateChangeOrder(ids.co, { status: 'approved' } as any, actor, 'DPR approved')
    coDb.updateChangeOrder(ids.co, { status: 'released' } as any, actor, 'Released to billing')

    expect(coDb.getChangeOrder(ids.co)!.status).toBe('released')
  })

  // STEP 13 — Complete Project
  it('Step 13: Project → execution_active → operationally_complete', () => {
    projectDb.updateProject(ids.project, { status: 'execution_active' } as any, actor, 'Execution started')
    projectDb.updateProject(ids.project, { status: 'operationally_complete' } as any, actor, 'All mobs complete')

    expect(projectDb.getProject(ids.project)!.status).toBe('operationally_complete')
  })

  // STEP 14 — Expansion Loop
  it('Step 14: Create Expansion Task and new Signal (loop)', () => {
    // Auto-create expansion task
    const task = expansionDb.createExpansionTask({
      linked_project_id: ids.project,
      linked_client_id: ids.client,
      task_type: 'thank_you',
      growth_objective: 'Send thank-you to DPR Construction for Methodist Hospital. Review expansion opportunities.',
      due_date: daysFromNow(14),
      next_action: 'Send thank-you and assess growth opportunities',
      next_action_date: daysFromNow(7),
    }, actor)

    expect(task.status).toBe('open')
    expect(task.reference_id).toMatch(/^EXP-/)
    ids.expansion = task.id

    // Advance to in_progress
    expansionDb.updateExpansionTask(ids.expansion, { status: 'in_progress' } as any, actor, 'Starting growth outreach')

    // Create new signal for future DPR work
    const newSignal = signalDb.createProjectSignal({
      linked_client_id: ids.client,
      linked_client_name: 'DPR Construction',
      linked_contact_id: ids.contact,
      linked_contact_name: 'Sarah Mitchell',
      project_identity: 'DPR Future Healthcare Project — TBD',
      signal_type: 'repeat_client',
      source_evidence: 'Follow-up from Methodist Hospital success. Sarah mentioned potential Phase 2.',
      timing_signal: 'TBD — likely 2027',
      fit_risk_note: 'Repeat client, proven relationship. High priority.',
      next_action: 'Schedule lunch with Sarah to discuss pipeline',
      next_action_date: daysFromNow(14),
    }, actor)

    expect(newSignal.status).toBe('received')
    ids.newSignal = newSignal.id

    // Mark on expansion task
    expansionDb.updateExpansionTask(ids.expansion, {
      next_signal_created: true,
      next_signal_id: newSignal.id,
    } as any, actor, 'New signal created')
  })

  // STEP 15 — Audit Trail
  it('Step 15: Full audit trail verification', () => {
    const checks: { type: string; id: string; label: string }[] = [
      { type: 'clients', id: ids.client, label: 'Client' },
      { type: 'contacts', id: ids.contact, label: 'Contact' },
      { type: 'project_signals', id: ids.signal, label: 'Signal' },
      { type: 'pursuits', id: ids.pursuit, label: 'Pursuit' },
      { type: 'estimates', id: ids.estimate, label: 'Estimate' },
      { type: 'proposals', id: ids.proposal, label: 'Proposal' },
      { type: 'award_handoffs', id: ids.award, label: 'Award' },
      { type: 'projects', id: ids.project, label: 'Project' },
      { type: 'mobilizations', id: ids.mob1, label: 'Mob 1' },
      { type: 'mobilizations', id: ids.mob2, label: 'Mob 2' },
      { type: 'change_orders', id: ids.co, label: 'CO' },
      { type: 'expansion_tasks', id: ids.expansion, label: 'Expansion' },
    ]

    let total = 0
    for (const { type, id, label } of checks) {
      if (!id) continue
      const log = getAuditLog(type as any, id)
      expect(log.length).toBeGreaterThan(0)
      total += log.length
    }

    // Verify we created the expected records
    expect(ids.client).toBeTruthy()
    expect(ids.contact).toBeTruthy()
    expect(ids.signal).toBeTruthy()
    expect(ids.pursuit).toBeTruthy()
    expect(ids.estimate).toBeTruthy()
    expect(ids.proposal).toBeTruthy()
    expect(ids.award).toBeTruthy()
    expect(ids.project).toBeTruthy()
    expect(ids.mob1).toBeTruthy()
    expect(ids.mob2).toBeTruthy()
    expect(ids.co).toBeTruthy()
    expect(ids.expansion).toBeTruthy()
    expect(ids.newSignal).toBeTruthy()
    expect(ids.siteWalk).toBeTruthy()

    // Total: 14 records, many audit entries
    expect(total).toBeGreaterThan(30)
  })
})
