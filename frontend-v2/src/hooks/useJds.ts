import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { jdApi } from '../core/api/jds'
import { queryKeys } from '../core/query-client'

export function useJds() {
  return useQuery({ queryKey: queryKeys.jds, queryFn: jdApi.list })
}

export function useCreateJd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: jdApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.jds }),
  })
}

export function useCreateJdFromFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: jdApi.createFromFile,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.jds }),
  })
}

export function useDeleteJd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: jdApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.jds }),
  })
}

export function useUploadResumes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jdId,
      files,
      onProgress,
    }: {
      jdId: string
      files: File[]
      onProgress?: (pct: number) => void
    }) => jdApi.uploadResumes(jdId, files, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jds })
      qc.invalidateQueries({ queryKey: ['candidates'] })
    },
  })
}

export function useSendInterviewLinks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: jdApi.sendInterviewLinks,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
    },
  })
}
