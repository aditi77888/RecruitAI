import axios, { AxiosError } from 'axios'

// This app never talks to the API's real origin directly -- every request
// goes to this dev server's own /api path, which vite.config.ts proxies to
// the existing FastAPI service (port 8040 by default). That keeps the
// existing backend's CORS config (locked to the old frontend's origin)
// completely untouched: from the browser's point of view every request is
// same-origin.
export const http = axios.create({ baseURL: '/api' })

const TOKEN_KEY = 'recruitai.v2.token'

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

export const UNAUTHORIZED_EVENT = 'recruitai:unauthorized'

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && getStoredToken()) {
      setStoredToken(null)
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

export function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail
    if (typeof detail === 'string') return detail
    if (err.message) return err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}
