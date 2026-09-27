import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'

import { candidatePortalApi } from '../core/api/candidate-portal'
import { queryKeys } from '../core/query-client'
import type { JD } from '../core/types'

export function usePortalCompanies() {
  return useQuery({ queryKey: queryKeys.portalCompanies, queryFn: candidatePortalApi.companies })
}

export function usePortalJdsByCompany(companyIds: string[]) {
  const results = useQueries({
    queries: companyIds.map((id) => ({
      queryKey: queryKeys.portalCompanyJds(id),
      queryFn: () => candidatePortalApi.companyJds(id),
      enabled: companyIds.length > 0,
    })),
  })

  const loading = companyIds.length > 0 && results.some((r) => r.isLoading)
  const byCompany: Record<string, JD[]> = {}
  companyIds.forEach((id, i) => {
    byCompany[id] = results[i]?.data ?? []
  })
  return { byCompany, loading }
}

export function usePortalApplications() {
  return useQuery({ queryKey: queryKeys.portalApplications, queryFn: candidatePortalApi.myApplications })
}

export function useApplyToJd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jdId, resume }: { jdId: string; resume: File }) => candidatePortalApi.apply(jdId, resume),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portalApplications }),
  })
}
