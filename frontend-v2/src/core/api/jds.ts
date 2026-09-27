import { http } from '../api-client'
import type { JD, JDFromFileResult, ShortlistResult, InterviewLinkResult } from '../types'

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

  uploadResumes: (jdId: string, files: File[], onProgress?: (pct: number) => void) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    return http
      .post<ShortlistResult>(`/jds/${jdId}/upload-resumes`, form, {
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100))
        },
      })
      .then((r) => r.data)
  },

  sendInterviewLinks: (jdId: string) =>
    http.post<InterviewLinkResult>(`/jds/${jdId}/send-interview-links`).then((r) => r.data),
}
