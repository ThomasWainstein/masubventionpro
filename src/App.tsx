import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import OnboardingWizard from './pages/OnboardingWizard'
import SuccessPage from './pages/SuccessPage'
import LoginPage from './pages/LoginPage'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<OnboardingWizard />} />
      <Route path="/inscription" element={<OnboardingWizard />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
