import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { PageSpinner } from './components/kit/Spinner'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const PortalPage = lazy(() => import('./pages/candidate/PortalPage'))
const CandidateDetailPage = lazy(() => import('./pages/company/CandidateDetailPage'))
const CandidatesPage = lazy(() => import('./pages/company/CandidatesPage'))
const DashboardPage = lazy(() => import('./pages/company/DashboardPage'))
const JobDetailPage = lazy(() => import('./pages/company/JobDetailPage'))
const JobsPage = lazy(() => import('./pages/company/JobsPage'))
const ReportsPage = lazy(() => import('./pages/company/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/company/SettingsPage'))

function withShell(children: React.ReactNode) {
  return <AppShell>{children}</AppShell>
}

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute accountType="company" />}>
          <Route path="/app" element={withShell(<DashboardPage />)} />
          <Route path="/app/jobs" element={withShell(<JobsPage />)} />
          <Route path="/app/jobs/:jdId" element={withShell(<JobDetailPage />)} />
          <Route path="/app/candidates" element={withShell(<CandidatesPage />)} />
          <Route path="/app/candidates/:candidateId" element={withShell(<CandidateDetailPage />)} />
          <Route path="/app/reports" element={withShell(<ReportsPage />)} />
          <Route path="/app/settings" element={withShell(<SettingsPage />)} />
        </Route>

        <Route element={<ProtectedRoute accountType="candidate" />}>
          <Route path="/portal" element={<PortalPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
