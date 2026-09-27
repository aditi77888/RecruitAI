import { http } from '../api-client'
import type { CompanySettings } from '../types'

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
