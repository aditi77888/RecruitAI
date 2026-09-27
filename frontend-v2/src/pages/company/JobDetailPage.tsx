import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Mail, Trash2, Users } from 'lucide-react'

import { Avatar } from '../../components/kit/Avatar'
import { Badge } from '../../components/kit/Badge'
import { Button } from '../../components/kit/Button'
import { Dialog } from '../../components/kit/Dialog'
import { EmptyState, ErrorState } from '../../components/kit/EmptyState'
import { Panel, PanelBody, PanelHeader } from '../../components/kit/Panel'
import { ProgressBar } from '../../components/kit/ProgressBar'
import { ScoreValue } from '../../components/kit/ScoreIndicator'
import { PageSpinner } from '../../components/kit/Spinner'
import { CallStatusBadge, StatusBadge } from '../../components/kit/StatusBadge'
import { Table, TBody, Td, THead, Th, Tr } from '../../components/kit/Table'
import { ResumeUploadPanel } from '../../components/company/ResumeUploadPanel'
import { useCandidates } from '../../hooks/useCandidates'
import { useDeleteJd, useJds, useSendInterviewLinks } from '../../hooks/useJds'
import { extractErrorMessage } from '../../core/api-client'
import { parseJdBlocks, splitSkills } from '../../core/jd-parser'
import { useToast } from '../../core/toast-context'

export default function JobDetailPage() {
  const { jdId } = useParams<{ jdId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: jds, isLoading: jdLoading, isError: jdsError, refetch: refetchJds } = useJds()
  const jd = jds?.find((j) => j.jd_id === jdId)

  const {
    data: candidates,
    isLoading: candidatesLoading,
    isError: candidatesError,
    refetch: refetchCandidates,
  } = useCandidates(jd ? { jd_title: jd.title } : undefined)
  const sendLinks = useSendInterviewLinks()
  const deleteJd = useDeleteJd()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (jdLoading) return <PageSpinner />
  if (jdsError) {
    return (
      <ErrorState
        title="Couldn't load this job"
        description="Something went wrong reaching the server. Check your connection and try again."
        onRetry={() => refetchJds()}
      />
    )
  }
  if (!jd) {
    return (
      <EmptyState
        icon={<Users className="h-4.5 w-4.5" />}
        title="Job not found"
        description="It may have been deleted."
        action={
          <Link to="/app/jobs">
            <Button variant="secondary">Back to jobs</Button>
          </Link>
        }
      />
    )
  }

  const mustHave = splitSkills(jd.must_have_skills)
  const niceToHave = splitSkills(jd.nice_to_have_skills)
  const blocks = parseJdBlocks(jd.jd_text)

  const readyToCall = candidates?.filter((c) => c.status === 'ready_to_call').length ?? 0
  const called = candidates?.filter((c) => c.status === 'called').length ?? 0
  const evaluated = candidates?.filter((c) => c.status === 'evaluated').length ?? 0

  async function handleSendLinks() {
    try {
      const res = await sendLinks.mutateAsync(jd!.jd_id)
      toast.show(`Interview links sent: ${res.sent} · skipped: ${res.skipped_no_email} · failed: ${res.failed}`, 'info')
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  async function handleDelete() {
    try {
      await deleteJd.mutateAsync(jd!.jd_id)
      toast.show(`'${jd!.title}' deleted.`, 'success')
      navigate('/app/jobs', { replace: true })
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  return (
    <div className="animate-fade-in">
      <Link
        to="/app/jobs"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All jobs
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[20px] font-semibold text-text">{jd.title}</h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            {jd.total_candidates} candidate(s) · {jd.min_experience ? `${jd.min_experience}+ yrs experience` : 'No minimum experience set'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" loading={sendLinks.isPending} onClick={handleSendLinks}>
            <Mail className="h-3.5 w-3.5" />
            Send interview links
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete job"
            onClick={() => setConfirmDelete(true)}
            className="text-text-tertiary hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Panel>
            <PanelHeader title="Job description" />
            <PanelBody>
              {(mustHave.length > 0 || niceToHave.length > 0) && (
                <div className="mb-4 space-y-2 rounded-md bg-surface-sunken p-3">
                  {mustHave.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                        Must have
                      </span>
                      {mustHave.map((s) => (
                        <Badge key={s} tone="accent">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {niceToHave.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                        Nice to have
                      </span>
                      {niceToHave.map((s) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {blocks.map((block, i) =>
                  block.kind === 'heading' ? (
                    <h4 key={i} className="pt-1 text-[13px] font-semibold text-text">
                      {block.text}
                    </h4>
                  ) : block.kind === 'list' ? (
                    <ul key={i} className="space-y-1">
                      {block.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-[13px] text-text-secondary">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="text-[13px] leading-relaxed text-text-secondary">
                      {block.text}
                    </p>
                  ),
                )}
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Candidate pipeline" subtitle={`${candidates?.length ?? 0} candidate(s) for this job`} />
            <PanelBody className="p-0">
              {candidatesError ? (
                <div className="p-4">
                  <ErrorState
                    title="Couldn't load candidates"
                    description="Something went wrong reaching the server."
                    onRetry={() => refetchCandidates()}
                  />
                </div>
              ) : candidatesLoading ? (
                <div className="p-4">
                  <PageSpinner />
                </div>
              ) : !candidates || candidates.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="No candidates yet" description="Upload resumes below to start screening." />
                </div>
              ) : (
                <Table>
                  <THead>
                    <Th>Candidate</Th>
                    <Th>Score</Th>
                    <Th>Status</Th>
                    <Th>Interview</Th>
                  </THead>
                  <TBody>
                    {candidates.map((c) => (
                      <Tr key={c.candidate_id} onClick={() => navigate(`/app/candidates/${c.candidate_id}`)}>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={c.name} size={26} />
                            <span className="font-medium text-text">{c.name || 'Unnamed candidate'}</span>
                          </div>
                        </Td>
                        <Td>
                          <ScoreValue score={c.match_score} />
                        </Td>
                        <Td>
                          <StatusBadge status={c.status} />
                        </Td>
                        <Td>
                          <CallStatusBadge callStatus={c.call_status} />
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Panel>
            <PanelHeader title="Screening state" />
            <PanelBody className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                  <span className="text-text-secondary">Overall progress</span>
                  <span className="font-medium tabular-nums text-text">{jd.shortlisting_progress}%</span>
                </div>
                <ProgressBar value={jd.shortlisting_progress} />
              </div>
              <dl className="grid grid-cols-2 gap-3 pt-1 text-[12.5px]">
                <div>
                  <dt className="text-text-tertiary">Interview scheduled</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text">{readyToCall}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Interviewed</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text">{called + evaluated}</dd>
                </div>
              </dl>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Upload resumes" subtitle="Screen new candidates against this job" />
            <PanelBody>
              <ResumeUploadPanel jdId={jd.jd_id} jdTitle={jd.title} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Interview links" />
            <PanelBody>
              <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-text-secondary">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                Sends a browser-interview link by email to every candidate on this job who is call-ready but hasn't
                been sent one yet.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                loading={sendLinks.isPending}
                onClick={handleSendLinks}
              >
                Send interview links
              </Button>
            </PanelBody>
          </Panel>
        </div>
      </div>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete job opening"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteJd.isPending} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        Delete <span className="font-semibold text-text">{jd.title}</span>? This also deletes every shortlisted
        candidate and evaluation under it. This cannot be undone.
      </Dialog>
    </div>
  )
}
