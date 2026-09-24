export type AccountType = 'company' | 'candidate'

export interface Session {
  token: string
  accountType: AccountType
  accountId: string
  displayName: string
}

export interface JD {
  jd_id: string
  company_id: string | null
  company_name: string | null
  title: string
  jd_text: string
  must_have_skills: string | null
  nice_to_have_skills: string | null
  min_experience: number | null
  total_candidates: number
  shortlisting_progress: number
}

export interface JDFromFileResult {
  jd_id: string
  title: string
  must_have_skills: string
  nice_to_have_skills: string
  min_experience: number
}

export interface ShortlistResult {
  total_resumes: number
  passed_embedding_filter: number
  evaluated: number
  shortlisted: number
  ready_to_call: number
  db_sync: { inserted: number; updated: number }
  errors: string[]
}

export interface Candidate {
  candidate_id: string
  jd_id: string
  jd_title: string | null
  company_id: string | null
  company_name: string | null
  name: string | null
  phone: string | null
  email: string | null
  resume_link: string | null
  resume_summary: string | null
  match_score: number | null
  verdict: string | null
  status: string
  match_ready: boolean | null
  ready_to_call: boolean | null
  call_status: string | null
  error_log: string | null
}

export interface InterviewLinkResult {
  sent: number
  skipped_no_email: number
  failed: number
}

export interface ReportRow {
  candidate_id: string
  name: string | null
  jd_title: string | null
  evaluation_summary: string | null
  transcript: string | null
  strengths: string | null
  weaknesses: string | null
  score: number | null
  selected: string
}

export interface ReportGroup {
  jd_title: string
  rows: ReportRow[]
}

export interface CompanySettings {
  company_id: string
  company_name: string
  email: string | null
  shortlist_threshold: number | null
}

export interface CompanyOut {
  company_id: string
  company_name: string
  email: string | null
}

export interface Application {
  candidate_id: string
  jd_id: string
  jd_title: string | null
  company_id: string | null
  company_name: string | null
  status: string
  match_score: number | null
  created_at: string | null
}
