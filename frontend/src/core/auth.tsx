import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { authApi, getStoredToken, setStoredToken, type TokenResponse } from './api'
import type { Session } from './types'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  login: (result: TokenResponse) => void
  logout: () => void
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

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((me) =>
        setSession({
          token,
          accountType: me.account_type,
          accountId: me.account_id,
          displayName: me.display_name,
        }),
      )
      .catch(() => setStoredToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((result: TokenResponse) => {
    setStoredToken(result.token)
    setSession(toSession(result))
  }, [])

  const logout = useCallback(() => {
    setStoredToken(null)
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, loading, login, logout }), [session, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
