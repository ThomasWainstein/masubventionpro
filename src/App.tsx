import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
  </div>
)

// Keep landing page as eager import (it's the entry point)
import LandingPage from './pages/LandingPage'

// Lazy load all other pages
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'))
const SuccessPage = lazy(() => import('./pages/SuccessPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const EmailConfirmationPage = lazy(() => import('./pages/EmailConfirmationPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const SubsidyDisplayDemo = lazy(() => import('./pages/SubsidyDisplayDemo'))

// Legal pages (lazy)
const MentionsLegalesPage = lazy(() => import('./pages/MentionsLegalesPage'))
const CGUPage = lazy(() => import('./pages/CGUPage'))
const CGVPage = lazy(() => import('./pages/CGVPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const CookiesPage = lazy(() => import('./pages/CookiesPage'))
const AITransparencyPage = lazy(() => import('./pages/AITransparencyPage'))
const NotreHistoirePage = lazy(() => import('./pages/NotreHistoirePage'))

// Protected pages (lazy)
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProfileSetupPage = lazy(() => import('./pages/ProfileSetupPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const SubsidyDetailPage = lazy(() => import('./pages/SubsidyDetailPage'))
const SavedSubsidiesPage = lazy(() => import('./pages/SavedSubsidiesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'))
const ComplianceMetricsPage = lazy(() => import('./pages/ComplianceMetricsPage'))

// Layout & Auth (keep eager - needed for routing)
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<OnboardingWizard />} />
        <Route path="/inscription" element={<OnboardingWizard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/confirm-email" element={<EmailConfirmationPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/demo/display" element={<SubsidyDisplayDemo />} />

        {/* Legal pages */}
        <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
        <Route path="/cgu" element={<CGUPage />} />
        <Route path="/cgv" element={<CGVPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/ai-transparency" element={<AITransparencyPage />} />
        <Route path="/notre-histoire" element={<NotreHistoirePage />} />

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
    </Suspense>
  )
}

export default App
