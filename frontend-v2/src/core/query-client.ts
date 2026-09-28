import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Centralized so invalidation call sites don't hand-type query keys.
export const queryKeys = {
  jds: ['jds'] as const,
  candidates: (filters?: { jd_title?: string; search?: string }) =>
    ['candidates', filters ?? {}] as const,
  reports: ['reports'] as const,
  settings: ['settings'] as const,
  me: ['me'] as const,
  portalCompanies: ['portal', 'companies'] as const,
  portalCompanyJds: (companyId: string) => ['portal', 'companies', companyId, 'jds'] as const,
  portalApplications: ['portal', 'applications'] as const,
}
