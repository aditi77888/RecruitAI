import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import PortalPage from './pages/candidate/PortalPage'
import DashboardPage from './pages/company/DashboardPage'
import ReportsPage from './pages/company/ReportsPage'
import SettingsPage from './pages/company/SettingsPage'
import ShortlistedPage from './pages/company/ShortlistedPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute accountType="company" />}>
        <Route
          path="/app"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/app/shortlisted"
          element={
            <AppShell>
              <ShortlistedPage />
            </AppShell>
          }
        />
        <Route
          path="/app/reports"
          element={
            <AppShell>
              <ReportsPage />
            </AppShell>
          }
        />
        <Route
          path="/app/settings"
          element={
            <AppShell>
              <SettingsPage />
            </AppShell>
          }
        />
      </Route>

      <Route element={<ProtectedRoute accountType="candidate" />}>
        <Route path="/portal" element={<PortalPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
