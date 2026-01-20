import { Routes, Route } from 'react-router-dom'

// Public pages
import LandingPage from './pages/LandingPage'
import OnboardingWizard from './pages/OnboardingWizard'
import SuccessPage from './pages/SuccessPage'
import LoginPage from './pages/LoginPage'
import NotFound from './pages/NotFound'

// Protected pages
import DashboardPage from './pages/DashboardPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import ProfilePage from './pages/ProfilePage'
import ProfileEditPage from './pages/ProfileEditPage'
import SearchPage from './pages/SearchPage'
import SubsidyDetailPage from './pages/SubsidyDetailPage'
import SavedSubsidiesPage from './pages/SavedSubsidiesPage'
import SettingsPage from './pages/SettingsPage'

// Layout & Auth
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<OnboardingWizard />} />
      <Route path="/inscription" element={<OnboardingWizard />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/success" element={<SuccessPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Profile setup (full screen, no sidebar) */}
        <Route path="/app/profile/setup" element={<ProfileSetupPage />} />

        {/* App routes with layout */}
        <Route element={<AppLayout />}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="/app/profile/edit" element={<ProfileEditPage />} />
          <Route path="/app/search" element={<SearchPage />} />
          <Route path="/app/subsidy/:id" element={<SubsidyDetailPage />} />
          <Route path="/app/saved" element={<SavedSubsidiesPage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
