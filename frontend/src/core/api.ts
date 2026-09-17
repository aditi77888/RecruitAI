import axios, { AxiosError } from 'axios'

import type {
  Application,
  Candidate,
  CompanyOut,
  CompanySettings,
  InterviewLinkResult,
  JD,
  JDFromFileResult,
  ReportGroup,
  ShortlistResult,
} from './types'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8040'

export const http = axios.create({ baseURL })

const TOKEN_KEY = 'recruitai.token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

http.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (err.message) return err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}

// ---------------------------------------------------------------- Auth

export interface TokenResponse {
  token: string
  account_type: 'company' | 'candidate'
  account_id: string
  display_name: string
}

export const authApi = {
  companySignupStart: (body: { company_name: string; company_email: string; password: string }) =>
    http.post<{ pending_token: string; email: string }>('/auth/company/signup/start', body).then((r) => r.data),

  companySignupResend: (pendingToken: string) =>
    http
      .post<{ pending_token: string; email: string }>('/auth/company/signup/resend', null, {
        params: { pending_token: pendingToken },
      })
      .then((r) => r.data),

  companySignupVerify: (body: { pending_token: string; code: string }) =>
    http.post<TokenResponse>('/auth/company/signup/verify', body).then((r) => r.data),

  companyLogin: (body: { company_name: string; password: string }) =>
    http.post<TokenResponse>('/auth/company/login', body).then((r) => r.data),

  candidateSignup: (body: { full_name: string; email: string; password: string }) =>
    http.post<TokenResponse>('/auth/candidate/signup', body).then((r) => r.data),

  candidateLogin: (body: { email: string; password: string }) =>
    http.post<TokenResponse>('/auth/candidate/login', body).then((r) => r.data),

  me: () => http.get<{ account_type: 'company' | 'candidate'; account_id: string; display_name: string }>('/auth/me').then((r) => r.data),
}

// ---------------------------------------------------------------- JDs

export const jdApi = {
  list: () => http.get<JD[]>('/jds').then((r) => r.data),

  create: (body: { title: string; jd_text: string; must_have_skills: string; min_experience: number }) =>
    http.post<JD>('/jds', body).then((r) => r.data),

  createFromFile: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<JDFromFileResult>('/jds/from-file', form).then((r) => r.data)
  },

  remove: (jdId: string) => http.delete(`/jds/${jdId}`).then((r) => r.data),

  uploadResumes: (jdId: string, files: File[]) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    return http.post<ShortlistResult>(`/jds/${jdId}/upload-resumes`, form).then((r) => r.data)
  },

  sendInterviewLinks: (jdId: string) =>
    http.post<InterviewLinkResult>(`/jds/${jdId}/send-interview-links`).then((r) => r.data),
}

// ---------------------------------------------------------------- Candidates / reports

export const candidateApi = {
  list: (params?: { jd_title?: string; search?: string }) =>
    http.get<Candidate[]>('/candidates', { params }).then((r) => r.data),
}

export const reportsApi = {
  list: () => http.get<ReportGroup[]>('/reports').then((r) => r.data),
}

// ---------------------------------------------------------------- Settings

export const settingsApi = {
  get: () => http.get<CompanySettings>('/settings').then((r) => r.data),
  update: (body: { email?: string; shortlist_threshold?: number }) =>
    http.patch<CompanySettings>('/settings', body).then((r) => r.data),
  changePassword: (body: { old_password: string; new_password: string }) =>
    http.post('/settings/change-password', body).then((r) => r.data),
  exportCsv: async (filename: string) => {
    const response = await http.get('/settings/export.csv', { responseType: 'blob' })
    const url = window.URL.createObjectURL(response.data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}

// ---------------------------------------------------------------- Candidate portal

export const candidatePortalApi = {
  companies: () => http.get<CompanyOut[]>('/candidate/companies').then((r) => r.data),
  companyJds: (companyId: string) => http.get<JD[]>(`/candidate/companies/${companyId}/jds`).then((r) => r.data),
  apply: (jdId: string, resume: File) => {
    const form = new FormData()
    form.append('resume', resume)
    return http.post<ShortlistResult>(`/candidate/jds/${jdId}/apply`, form).then((r) => r.data)
  },
  myApplications: () => http.get<Application[]>('/candidate/applications').then((r) => r.data),
}
