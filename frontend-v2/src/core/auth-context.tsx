import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AxiosError } from 'axios'

import { authApi } from './api/auth'
import { getStoredToken, setStoredToken, UNAUTHORIZED_EVENT } from './api-client'
import type { Session, TokenResponse } from './types'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  // True when a stored token exists but the initial session check couldn't
  // reach the server (network error, 5xx, timeout) -- as opposed to the
  // server actively rejecting the token (401), which does mean "log out."
  // ProtectedRoute uses this to offer a retry instead of silently bouncing
  // a still-possibly-valid session to the login screen.
  hydrationError: boolean
  login: (result: TokenResponse) => void
  logout: () => void
  retryHydration: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function toSession(result: TokenResponse): Session {
  return {
    token: result.token,
    accountType: result.account_type,
    accountId: result.account_id,
    displayName: result.display_name,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hydrationError, setHydrationError] = useState(false)
  const [hydrationAttempt, setHydrationAttempt] = useState(0)

  const logout = useCallback(() => {
    setStoredToken(null)
    setSession(null)
    setHydrationError(false)
  }, [])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setHydrationError(false)
    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        setSession({
          token,
          accountType: me.account_type,
          accountId: me.account_id,
          displayName: me.display_name,
        })
      })
      .catch((err) => {
        if (cancelled) return
        // A real 401 means the token itself is invalid/expired -- that's a
        // genuine logout. Anything else (network down, timeout, 5xx) is the
        // server being unreachable right now, not proof the session is bad,
        // so the token is kept and the caller can retry instead of being
        // forced to sign in again over a transient blip.
        if (err instanceof AxiosError && err.response?.status === 401) {
          setStoredToken(null)
        } else {
          setHydrationError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hydrationAttempt])

  const login = useCallback((result: TokenResponse) => {
    setStoredToken(result.token)
    setSession(toSession(result))
    setHydrationError(false)
  }, [])

  const retryHydration = useCallback(() => {
    setHydrationAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout)
  }, [logout])

  const value = useMemo(
    () => ({ session, loading, hydrationError, login, logout, retryHydration }),
    [session, loading, hydrationError, login, logout, retryHydration],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
