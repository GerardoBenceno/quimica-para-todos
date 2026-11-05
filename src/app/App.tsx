import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { DiagnosticScreen } from '../screens/DiagnosticScreen'
import { WorldMapScreen } from '../screens/WorldMapScreen'
import { WorldPathScreen } from '../screens/WorldPathScreen'
import { LessonScreen } from '../screens/LessonScreen'
import { ResultScreen } from '../screens/ResultScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { useProgressStore } from '../stores/progressStore'
import { routes } from './routes'

/** Primera sesión: bienvenida, diagnóstico, primera lección y después el mapa. */
function Home() {
  const onboarding = useProgressStore((s) => s.state?.onboarding)
  if (!onboarding?.welcomed) return <Navigate to={routes.welcome()} replace />
  if (!onboarding.diagnostic_done) return <Navigate to={routes.diagnostic()} replace />
  return <Navigate to={routes.worlds()} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/bienvenida" element={<WelcomeScreen />} />
      <Route path="/diagnostico" element={<DiagnosticScreen />} />
      <Route path="/aprender" element={<WorldMapScreen />} />
      <Route path="/mundo/:worldId" element={<WorldPathScreen />} />
      <Route path="/leccion/:lessonId" element={<LessonScreen />} />
      <Route path="/resultado/:attemptId" element={<ResultScreen />} />
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
