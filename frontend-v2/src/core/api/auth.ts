import { http } from '../api-client'
import type { TokenResponse } from '../types'

export const authApi = {
  companySignupStart: (body: { company_name: string; company_email: string; password: string }) =>
    http.post<{ pending_token: string; email: string }>('/auth/company/signup/start', body).then((r) => r.data),

  companySignupResend: (pendingToken: string) =>
    http
      .post<{ pending_token: string; email: string }>('/auth/company/signup/resend', null, {
        params: { pending_token: pendingToken },
      })
      .then((r) => r.data),

  companySignupVerify: (body: { pending_token: string; code: string }) =>
    http.post<TokenResponse>('/auth/company/signup/verify', body).then((r) => r.data),

  companyLogin: (body: { company_name: string; password: string }) =>
    http.post<TokenResponse>('/auth/company/login', body).then((r) => r.data),

  candidateSignup: (body: { full_name: string; email: string; password: string }) =>
    http.post<TokenResponse>('/auth/candidate/signup', body).then((r) => r.data),

  candidateLogin: (body: { email: string; password: string }) =>
    http.post<TokenResponse>('/auth/candidate/login', body).then((r) => r.data),

  me: () =>
    http
      .get<{ account_type: 'company' | 'candidate'; account_id: string; display_name: string }>('/auth/me')
      .then((r) => r.data),
}
