'use client'

import { useState, useRef } from 'react'
import { processTranscriptAction } from '@/actions/ai/process-transcript'
import { logTouchAction, updateContactAction } from '@/actions/contact'
import type { Contact } from '@/types/commercial'
import type { TranscriptAnalysis, TranscriptNextStep, PersonalNote, ProjectIntel, KeyDate } from '@/lib/ai/transcript-processor'
import {
  X,
  FileText,
  Zap,
  Loader2,
  Upload,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Calendar,
  Lightbulb,
  Heart,
  Target,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type TabMode = 'quick' | 'transcript'

const TOUCH_TYPE_LABELS: Record<string, string> = {
  call: 'Phone Call',
  email: 'Email',
  text: 'Text Message',
  in_person: 'In Person',
  linkedin: 'LinkedIn',
  event: 'Event',
  trailer_visit: 'Trailer Visit',
  luncheon: 'Luncheon',
  meeting: 'Meeting',
  site_visit: 'Site Visit',
  video_call: 'Video Call',
}

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  positive: { label: 'Positive', color: 'text-green-400 bg-green-900/30', icon: '😊' },
  neutral: { label: 'Neutral', color: 'text-slate-400 bg-slate-800', icon: '😐' },
  cautious: { label: 'Cautious', color: 'text-amber-400 bg-amber-900/30', icon: '🤔' },
  negative: { label: 'Negative', color: 'text-red-400 bg-red-900/30', icon: '😟' },
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-900/30',
  medium: 'text-amber-400 bg-amber-900/30',
  low: 'text-slate-400 bg-slate-800',
}

const INTEL_COLORS: Record<string, string> = {
  timeline: 'text-blue-400 bg-blue-900/30',
  scope: 'text-cyan-400 bg-cyan-900/30',
  budget: 'text-green-400 bg-green-900/30',
  competition: 'text-red-400 bg-red-900/30',
  decision_maker: 'text-purple-400 bg-purple-900/30',
  blocker: 'text-orange-400 bg-orange-900/30',
  opportunity: 'text-emerald-400 bg-emerald-900/30',
}

const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

interface LogTouchModalProps {
  contact: Contact
  onClose: () => void
  onSaved: (updatedContact: Contact) => void
}

export function LogTouchModal({ contact, onClose, onSaved }: LogTouchModalProps) {
  const [tab, setTab] = useState<TabMode>('quick')

  // Quick Log state
  const [touchType, setTouchType] = useState('')
  const [touchNotes, setTouchNotes] = useState('')
  const [touchNextStep, setTouchNextStep] = useState('')
  const [touchNextStepDueDate, setTouchNextStepDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Transcript state
  const [transcript, setTranscript] = useState('')
  const [processing, setProcessing] = useState(false)
  const [analysis, setAnalysis] = useState<TranscriptAnalysis | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editable AI results
  const [editSummary, setEditSummary] = useState('')
  const [editTouchType, setEditTouchType] = useState('')
  const [editNextSteps, setEditNextSteps] = useState<TranscriptNextStep[]>([])
  const [editPersonalNotes, setEditPersonalNotes] = useState<PersonalNote[]>([])
  const [editProjectIntel, setEditProjectIntel] = useState<ProjectIntel[]>([])
  const [editClientNotes, setEditClientNotes] = useState('')
  const [editKeyDates, setEditKeyDates] = useState<KeyDate[]>([])
  const [savingAi, setSavingAi] = useState(false)

  // ---- Quick Log ----
  async function handleQuickLog() {
    setSubmitting(true)
    const result = await logTouchAction({
      contact_id: contact.id,
      notes: touchNotes || undefined,
      next_step: touchNextStep || undefined,
      next_step_due_date: touchNextStepDueDate || undefined,
      touch_type: touchType || undefined,
    })
    if (result.success && result.data) {
      toast.success(`Touch #${result.data.touch_count} logged`)
      onSaved(result.data)
      onClose()
    } else {
      toast.error(result.error ?? 'Failed to log touch')
    }
    setSubmitting(false)
  }

  // ---- Transcript Processing ----
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setTranscript(text)
  }

  async function handleProcessTranscript() {
    if (!transcript.trim()) {
      toast.error('Paste or upload a transcript first')
      return
    }
    setProcessing(true)
    setAiError(null)

    const result = await processTranscriptAction({
      transcript: transcript.trim(),
      contact_id: contact.id,
      client_id: contact.client_id,
    })

    if (result.success && result.data) {
      setAnalysis(result.data)
      // Populate editable state from AI response
      setEditSummary(result.data.summary)
      setEditTouchType(result.data.touch_type)
      setEditNextSteps([...result.data.next_steps])
      setEditPersonalNotes([...result.data.personal_notes])
      setEditProjectIntel([...result.data.project_intel])
      setEditClientNotes(result.data.client_notes)
      setEditKeyDates([...result.data.key_dates])
    } else {
      setAiError(result.error ?? 'Failed to process transcript')
    }
    setProcessing(false)
  }

  // ---- Save AI-processed touch ----
  async function handleSaveAiTouch() {
    setSavingAi(true)

    // Build the notes from all sections
    const notesParts: string[] = [editSummary]
    if (editPersonalNotes.length > 0) {
      notesParts.push('\n[Personal Notes]\n' + editPersonalNotes.map(n => `• ${n.note} (${n.category})`).join('\n'))
    }
    if (editProjectIntel.length > 0) {
      notesParts.push('\n[Project Intel]\n' + editProjectIntel.map(i => `• ${i.detail} (${i.category})`).join('\n'))
    }
    if (editKeyDates.length > 0) {
      notesParts.push('\n[Key Dates]\n' + editKeyDates.map(d => `• ${d.description}: ${d.date}`).join('\n'))
    }

    // 1. Log the touch
    const primaryNextStep = editNextSteps[0]
    const touchResult = await logTouchAction({
      contact_id: contact.id,
      notes: notesParts.join('\n'),
      next_step: primaryNextStep?.action || undefined,
      next_step_due_date: primaryNextStep?.due_date || undefined,
      touch_type: editTouchType || undefined,
    })

    if (!touchResult.success) {
      toast.error(touchResult.error ?? 'Failed to log touch')
      setSavingAi(false)
      return
    }

    // 2. Update contact with personal notes and intel (append to existing)
    const updates: Record<string, unknown> = { contact_id: contact.id }

    // Append personal notes to contact notes
    if (editPersonalNotes.length > 0) {
      const existingNotes = contact.notes ?? ''
      const newPersonal = editPersonalNotes.map(n => `[${n.category}] ${n.note}`).join('\n')
      updates.notes = existingNotes
        ? `${existingNotes}\n\n--- AI Touch Notes (${new Date().toLocaleDateString()}) ---\n${newPersonal}`
        : newPersonal
    }

    // Append project intel to project_visibility_notes
    if (editProjectIntel.length > 0) {
      const existing = contact.project_visibility_notes ?? ''
      const newIntel = editProjectIntel.map(i => `[${i.category}] ${i.detail}`).join('\n')
      updates.project_visibility_notes = existing
        ? `${existing}\n\n--- AI Intel (${new Date().toLocaleDateString()}) ---\n${newIntel}`
        : newIntel
    }

    if (Object.keys(updates).length > 1) {
      await updateContactAction(updates)
    }

    // 3. Update client notes if present
    if (editClientNotes.trim()) {
      // Client notes update would require a client action — for now append to touch notes
      // This could be enhanced later to call updateClientAction
    }

    toast.success(`AI Touch #${(touchResult.data?.touch_count ?? contact.touch_count + 1)} logged with ${editNextSteps.length} next steps, ${editPersonalNotes.length} personal notes, ${editProjectIntel.length} intel items`)
    onSaved(touchResult.data!)
    onClose()
    setSavingAi(false)
  }

  function removeNextStep(index: number) {
    setEditNextSteps(prev => prev.filter((_, i) => i !== index))
  }

  function removePersonalNote(index: number) {
    setEditPersonalNotes(prev => prev.filter((_, i) => i !== index))
  }

  function removeIntel(index: number) {
    setEditProjectIntel(prev => prev.filter((_, i) => i !== index))
  }

  const sentimentConfig = analysis ? SENTIMENT_CONFIG[analysis.sentiment] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Log Touch</h3>
            <p className="text-sm text-muted-foreground">
              {contact.first_name} {contact.last_name} · Touch #{contact.touch_count + 1}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher — only show if AI hasn't analyzed yet */}
        {!analysis && (
          <div className="mt-4 flex gap-1 rounded-lg bg-muted/50 p-1">
            <button
              onClick={() => setTab('quick')}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === 'quick' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <FileText className="mr-1.5 inline h-3.5 w-3.5" />
              Quick Log
            </button>
            <button
              onClick={() => setTab('transcript')}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === 'transcript' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Zap className="mr-1.5 inline h-3.5 w-3.5" />
              AI Transcript
            </button>
          </div>
        )}

        {/* ===== QUICK LOG TAB ===== */}
        {tab === 'quick' && !analysis && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Type of Touch</label>
              <select value={touchType} onChange={(e) => setTouchType(e.target.value)} className={inputClass}>
                <option value="">Select type...</option>
                {Object.entries(TOUCH_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Summary / Notes</label>
              <textarea value={touchNotes} onChange={(e) => setTouchNotes(e.target.value)} rows={3} placeholder="e.g. Discussed Lewisville project timeline..." className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Next Step</label>
              <input type="text" value={touchNextStep} onChange={(e) => setTouchNextStep(e.target.value)} placeholder="e.g. Follow up on pricing..." autoComplete="off" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Next Step Due Date</label>
              <input type="date" value={touchNextStepDueDate} onChange={(e) => setTouchNextStepDueDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50">Cancel</button>
              <button onClick={handleQuickLog} disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {submitting ? 'Logging...' : 'Log Touch'}
              </button>
            </div>
          </div>
        )}

        {/* ===== TRANSCRIPT TAB (before processing) ===== */}
        {tab === 'transcript' && !analysis && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Paste Transcript</label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
                placeholder="Paste your PLAUD transcript or conversation notes here..."
                className={cn(inputClass, 'font-mono text-xs')}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload .txt file
              </button>
              <input ref={fileInputRef} type="file" accept=".txt,.md,.text" className="hidden" onChange={handleFileUpload} />
              {transcript && (
                <span className="text-xs text-muted-foreground">
                  {transcript.length.toLocaleString()} characters
                </span>
              )}
            </div>

            {aiError && (
              <div className="flex items-start gap-2 rounded-md border border-red-800/50 bg-red-900/20 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-300">{aiError}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50">Cancel</button>
              <button
                onClick={handleProcessTranscript}
                disabled={processing || !transcript.trim()}
                className={cn(
                  'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
                  processing || !transcript.trim()
                    ? 'cursor-not-allowed bg-muted text-muted-foreground'
                    : 'bg-blue-600 text-white hover:bg-blue-700',
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing conversation...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Process Transcript
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ===== AI REVIEW SCREEN (after processing) ===== */}
        {analysis && (
          <div className="mt-4 space-y-5">
            {/* Summary + Sentiment */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Summary</h4>
                <div className="flex items-center gap-2">
                  {sentimentConfig && (
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', sentimentConfig.color)}>
                      {sentimentConfig.icon} {sentimentConfig.label}
                    </span>
                  )}
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', 'text-blue-400 bg-blue-900/30')}>
                    {TOUCH_TYPE_LABELS[editTouchType] ?? editTouchType}
                  </span>
                </div>
              </div>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={2}
                className={cn(inputClass, 'mt-2')}
              />
              <div className="mt-2">
                <select value={editTouchType} onChange={(e) => setEditTouchType(e.target.value)} className={cn(inputClass, 'max-w-xs')}>
                  {Object.entries(TOUCH_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Next Steps */}
            {editNextSteps.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Target className="h-4 w-4 text-blue-400" />
                  Next Steps ({editNextSteps.length})
                  {editNextSteps.length > 0 && <span className="text-xs text-muted-foreground">— first becomes contact&apos;s next step</span>}
                </h4>
                <div className="mt-2 space-y-2">
                  {editNextSteps.map((step, i) => (
                    <div key={i} className={cn('rounded-md border p-3', i === 0 ? 'border-blue-700/50 bg-blue-900/10' : 'border-border')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <input
                            value={step.action}
                            onChange={(e) => setEditNextSteps(prev => prev.map((s, j) => j === i ? { ...s, action: e.target.value } : s))}
                            className={cn(inputClass, 'text-sm')}
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="date"
                              value={step.due_date ?? ''}
                              onChange={(e) => setEditNextSteps(prev => prev.map((s, j) => j === i ? { ...s, due_date: e.target.value || null } : s))}
                              className={cn(inputClass, 'max-w-[160px] text-xs')}
                            />
                            <span className="text-xs text-muted-foreground">{step.owner}</span>
                            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', PRIORITY_COLORS[step.priority] ?? PRIORITY_COLORS.medium)}>
                              {step.priority}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => removeNextStep(i)} className="text-muted-foreground hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Notes */}
            {editPersonalNotes.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Heart className="h-4 w-4 text-pink-400" />
                  Personal Notes ({editPersonalNotes.length})
                </h4>
                <div className="mt-2 space-y-1.5">
                  {editPersonalNotes.map((note, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <span className="rounded-full bg-pink-900/30 px-1.5 py-0.5 text-[10px] font-medium text-pink-300">{note.category}</span>
                      <span className="flex-1 text-sm text-foreground">{note.note}</span>
                      <button onClick={() => removePersonalNote(i)} className="text-muted-foreground hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project Intel */}
            {editProjectIntel.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  Project Intel ({editProjectIntel.length})
                </h4>
                <div className="mt-2 space-y-1.5">
                  {editProjectIntel.map((intel, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', INTEL_COLORS[intel.category] ?? 'text-slate-400 bg-slate-800')}>{intel.category}</span>
                      <span className="flex-1 text-sm text-foreground">{intel.detail}</span>
                      <button onClick={() => removeIntel(i)} className="text-muted-foreground hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client Notes */}
            {editClientNotes && (
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  Client Notes
                </h4>
                <textarea
                  value={editClientNotes}
                  onChange={(e) => setEditClientNotes(e.target.value)}
                  rows={2}
                  className={cn(inputClass, 'mt-2 text-sm')}
                />
              </div>
            )}

            {/* Key Dates */}
            {editKeyDates.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Calendar className="h-4 w-4 text-green-400" />
                  Key Dates ({editKeyDates.length})
                </h4>
                <div className="mt-2 space-y-1.5">
                  {editKeyDates.map((kd, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">{kd.description}</span>
                      <span className="text-green-400">{kd.date}</span>
                      <span className="flex-1 truncate text-xs text-muted-foreground italic">&ldquo;{kd.source}&rdquo;</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up date */}
            {analysis.follow_up_date && (
              <div className="flex items-center gap-2 rounded-md border border-blue-700/50 bg-blue-900/10 px-3 py-2 text-sm">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-muted-foreground">Recommended follow-up:</span>
                <span className="font-medium text-blue-300">{analysis.follow_up_date}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-between gap-3 border-t border-border pt-4">
              <button
                onClick={() => { setAnalysis(null); setTab('transcript') }}
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Back to Transcript
              </button>
              <div className="flex gap-3">
                <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50">
                  Cancel
                </button>
                <button
                  onClick={handleSaveAiTouch}
                  disabled={savingAi}
                  className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {savingAi ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save Touch
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
