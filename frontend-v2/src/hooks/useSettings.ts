import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { settingsApi } from '../core/api/settings'
import { queryKeys } from '../core/query-client'

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: settingsApi.get })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings }),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: settingsApi.changePassword })
}
