import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../../core/auth-context'
import type { AccountType } from '../../core/types'
import { ErrorState } from '../kit/EmptyState'
import { PageSpinner } from '../kit/Spinner'

export function ProtectedRoute({ accountType }: { accountType: AccountType }) {
  const { session, loading, hydrationError, retryHydration } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <PageSpinner />
      </div>
    )
  }

  // The server couldn't be reached to verify an existing session -- this is
  // NOT the same as "not logged in," so don't discard the token by bouncing
  // to /login. Offer a retry instead; a real 401 (session-context.tsx) still
  // logs out and lands here too, but then `session` is null with no error.
  if (hydrationError) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg px-6">
        <div className="w-full max-w-sm">
          <ErrorState
            title="Couldn't reach the server"
            description="We couldn't verify your session. Check your connection and try again."
            onRetry={retryHydration}
          />
        </div>
      </div>
    )
  }

  if (!session || session.accountType !== accountType) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
