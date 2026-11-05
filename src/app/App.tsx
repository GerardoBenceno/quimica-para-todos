import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { useProgressStore } from '../stores/progressStore'
import { routes } from './routes'

function Home() {
  const onboarding = useProgressStore((s) => s.state?.onboarding)
  if (!onboarding?.welcomed) return <Navigate to={routes.welcome()} replace />
  return <WelcomeScreen />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/bienvenida" element={<WelcomeScreen />} />
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  )
}

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
