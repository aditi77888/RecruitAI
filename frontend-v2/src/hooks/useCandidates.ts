import { useQuery } from '@tanstack/react-query'

import { candidateApi, reportsApi } from '../core/api/candidates'
import { queryKeys } from '../core/query-client'

export function useCandidates(filters?: { jd_title?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.candidates(filters),
    queryFn: () => candidateApi.list(filters),
  })
}

// Unfiltered list, used as the source of truth for candidate-detail lookups
// (there is no GET /candidates/{id} endpoint on the existing API -- detail
// pages read from this cached list instead of inventing a new call).
export function useAllCandidates() {
  return useQuery({
    queryKey: queryKeys.candidates(),
    queryFn: () => candidateApi.list(),
  })
}

export function useReports() {
  return useQuery({ queryKey: queryKeys.reports, queryFn: reportsApi.list })
}
