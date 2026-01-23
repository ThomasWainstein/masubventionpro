import { Routes, Route } from 'react-router-dom'

// Public pages
import LandingPage from './pages/LandingPage'
import OnboardingWizard from './pages/OnboardingWizard'
import SuccessPage from './pages/SuccessPage'
import LoginPage from './pages/LoginPage'
import NotFound from './pages/NotFound'
import SubsidyDisplayDemo from './pages/SubsidyDisplayDemo'

// Legal pages
import MentionsLegalesPage from './pages/MentionsLegalesPage'
import CGUPage from './pages/CGUPage'
import CGVPage from './pages/CGVPage'
import PrivacyPage from './pages/PrivacyPage'
import CookiesPage from './pages/CookiesPage'
import AITransparencyPage from './pages/AITransparencyPage'

// Protected pages
import DashboardPage from './pages/DashboardPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import ProfilePage from './pages/ProfilePage'
import ProfileEditPage from './pages/ProfileEditPage'
import SearchPage from './pages/SearchPage'
import SubsidyDetailPage from './pages/SubsidyDetailPage'
import SavedSubsidiesPage from './pages/SavedSubsidiesPage'
import SettingsPage from './pages/SettingsPage'
import AIAssistantPage from './pages/AIAssistantPage'
import ComplianceMetricsPage from './pages/ComplianceMetricsPage'

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
      <Route path="/demo/display" element={<SubsidyDisplayDemo />} />

      {/* Legal pages */}
      <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
      <Route path="/cgu" element={<CGUPage />} />
      <Route path="/cgv" element={<CGVPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/ai-transparency" element={<AITransparencyPage />} />

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
          <Route path="/app/ai" element={<AIAssistantPage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/app/compliance" element={<ComplianceMetricsPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
