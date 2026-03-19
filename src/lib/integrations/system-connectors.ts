/**
 * System Connector Stubs (ERP-15)
 *
 * Stub connectors for each external system. No real API calls in v1.
 * Each stub logs to integration_events with status "pending" and returns success.
 * Each has a LIVE_MODE flag (default false) — when true, would call real APIs.
 *
 * External Systems:
 * - SharePoint: Document SOT via Microsoft Graph API
 * - Teams: Internal communication
 * - Jobber: Technician-facing execution
 * - QuickBooks: Accounting truth
 * - Gusto: Payroll/HR truth
 * - Outlook: Email transmission
 */

import { dispatchEvent, type TargetSystem } from './event-bus'
import type { IntegrationEvent } from '@/lib/db/json-db'

// ---------------------------------------------------------------------------
// Global stub mode flag
// ---------------------------------------------------------------------------

const LIVE_MODE = false

function stub(
  eventType: string,
  sourceEntity: string,
  sourceId: string,
  targetSystem: TargetSystem,
  payload: Record<string, unknown>,
): IntegrationEvent {
  if (LIVE_MODE) {
    // Future: call real APIs here
  }
  return dispatchEvent({
    event_type: eventType,
    source_entity: sourceEntity,
    source_id: sourceId,
    target_system: targetSystem,
    payload,
  })
}

// ---------------------------------------------------------------------------
// SharePoint Connector
// ---------------------------------------------------------------------------

export function syncDocumentLink(
  entityType: string,
  entityId: string,
  sharePointUrl: string,
): IntegrationEvent {
  return stub('document.sync.v1', entityType, entityId, 'sharepoint', {
    action: 'sync_document_link',
    sharepoint_url: sharePointUrl,
  })
}

// ---------------------------------------------------------------------------
// Teams Connector
// ---------------------------------------------------------------------------

export function postHandoffNotification(
  awardHandoffId: string,
  projectName: string,
): IntegrationEvent {
  return stub('award_handoff.pm_claimed.v1', 'award_handoffs', awardHandoffId, 'teams', {
    action: 'post_handoff_notification',
    project_name: projectName,
  })
}

export function postMobilizationAlert(
  mobilizationId: string,
  stageName: string,
  alertType: string,
): IntegrationEvent {
  return stub('mobilization.ready.v1', 'mobilizations', mobilizationId, 'teams', {
    action: 'post_mobilization_alert',
    stage_name: stageName,
    alert_type: alertType,
  })
}

export function postFieldIssue(
  mobilizationId: string,
  issue: string,
): IntegrationEvent {
  return stub('mobilization.field_issue.v1', 'mobilizations', mobilizationId, 'teams', {
    action: 'post_field_issue',
    issue,
  })
}

// ---------------------------------------------------------------------------
// Jobber Connector
// ---------------------------------------------------------------------------

export function createJob(
  projectId: string,
  mobilizationId: string,
  projectName: string,
): IntegrationEvent {
  return stub('mobilization.ready.v1', 'mobilizations', mobilizationId, 'jobber', {
    action: 'create_job',
    project_id: projectId,
    project_name: projectName,
  })
}

export function syncJobStatus(mobilizationId: string): IntegrationEvent {
  return stub('mobilization.completed.v1', 'mobilizations', mobilizationId, 'jobber', {
    action: 'sync_job_status',
  })
}

// ---------------------------------------------------------------------------
// QuickBooks Connector
// ---------------------------------------------------------------------------

export function stageInvoiceRelease(
  projectId: string,
  mobilizationId: string,
  amount: number,
): IntegrationEvent {
  return stub('invoice.released.v1', 'projects', projectId, 'quickbooks', {
    action: 'stage_invoice_release',
    mobilization_id: mobilizationId,
    amount,
  })
}

export function syncPaymentStatus(invoiceId: string): IntegrationEvent {
  return stub('invoice.payment_sync.v1', 'projects', invoiceId, 'quickbooks', {
    action: 'sync_payment_status',
  })
}

// ---------------------------------------------------------------------------
// Gusto Connector
// ---------------------------------------------------------------------------

export function logReimbursementApproval(
  mobilizationId: string,
  amount: number,
): IntegrationEvent {
  return stub('mobilization.reimbursement.v1', 'mobilizations', mobilizationId, 'gusto', {
    action: 'log_reimbursement_approval',
    amount,
  })
}

// ---------------------------------------------------------------------------
// Outlook Connector
// ---------------------------------------------------------------------------

export function logEmailSent(
  entityType: string,
  entityId: string,
  recipients: string[],
  subject: string,
): IntegrationEvent {
  return stub('email.sent.v1', entityType, entityId, 'outlook', {
    action: 'log_email_sent',
    recipients,
    subject,
  })
}
