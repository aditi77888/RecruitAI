import { http } from '../api-client'
import type { Candidate, ReportGroup } from '../types'

export const candidateApi = {
  list: (params?: { jd_title?: string; search?: string }) =>
    http.get<Candidate[]>('/candidates', { params }).then((r) => r.data),
}

export const reportsApi = {
  list: () => http.get<ReportGroup[]>('/reports').then((r) => r.data),
}
