import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../../core/auth'
import { PageSpinner } from '../kit/Spinner'
import type { AccountType } from '../../core/types'

export function ProtectedRoute({ accountType }: { accountType: AccountType }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <PageSpinner />
      </div>
    )
  }

  if (!session || session.accountType !== accountType) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
