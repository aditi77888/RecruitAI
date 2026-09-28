import { http } from '../api-client'
import type { Application, CompanyOut, JD, ShortlistResult } from '../types'

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
