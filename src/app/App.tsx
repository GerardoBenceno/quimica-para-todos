import { Suspense, lazy } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { NotFoundScreen } from "../screens/NotFoundScreen";
import { useProgressStore } from "../stores/progressStore";
import { routes } from "./routes";
import { OfflineBanner } from "../ui/AppShell";

// Solo la bienvenida va en el bundle inicial; el resto se carga al navegar
// (y queda en el precache, así que también funciona sin conexión).
const DiagnosticScreen = lazy(() =>
  import("../screens/DiagnosticScreen").then((m) => ({
    default: m.DiagnosticScreen,
  })),
);
const WorldMapScreen = lazy(() =>
  import("../screens/WorldMapScreen").then((m) => ({
    default: m.WorldMapScreen,
  })),
);
const WorldPathScreen = lazy(() =>
  import("../screens/WorldPathScreen").then((m) => ({
    default: m.WorldPathScreen,
  })),
);
const LessonScreen = lazy(() =>
  import("../screens/LessonScreen").then((m) => ({ default: m.LessonScreen })),
);
const ResultScreen = lazy(() =>
  import("../screens/ResultScreen").then((m) => ({ default: m.ResultScreen })),
);
const PracticeScreen = lazy(() =>
  import("../screens/PracticeScreen").then((m) => ({
    default: m.PracticeScreen,
  })),
);
const ProfileScreen = lazy(() =>
  import("../screens/ProfileScreen").then((m) => ({
    default: m.ProfileScreen,
  })),
);
const QuestsScreen = lazy(() =>
  import("../screens/QuestsScreen").then((m) => ({ default: m.QuestsScreen })),
);
const AboutScreen = lazy(() =>
  import("../screens/AboutScreen").then((m) => ({ default: m.AboutScreen })),
);

/** Mientras llega el chunk de una pantalla: el mismo marco vacío que la carga inicial. */
function ScreenFallback() {
  return <main className="state state-loading" aria-busy="true" />;
}

/** Primera sesión: bienvenida, diagnóstico, primera lección y después el mapa. */
function Home() {
  const onboarding = useProgressStore((s) => s.state?.onboarding);
  if (!onboarding?.welcomed) return <Navigate to={routes.welcome()} replace />;
  if (!onboarding.diagnostic_done)
    return <Navigate to={routes.diagnostic()} replace />;
  return <Navigate to={routes.worlds()} replace />;
}

/** Una lección nueva monta una pantalla nueva (no hereda la sesión de otra). */
function LessonRoute() {
  const { lessonId } = useParams();
  return <LessonScreen key={lessonId} />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bienvenida" element={<WelcomeScreen />} />
        <Route path="/diagnostico" element={<DiagnosticScreen />} />
        <Route path="/aprender" element={<WorldMapScreen />} />
        <Route path="/mundo/:worldId" element={<WorldPathScreen />} />
        <Route path="/leccion/:lessonId" element={<LessonRoute />} />
        <Route path="/resultado/:attemptId" element={<ResultScreen />} />
        <Route path="/repasar" element={<PracticeScreen />} />
        <Route path="/perfil" element={<ProfileScreen />} />
        <Route path="/recompensas" element={<QuestsScreen />} />
        <Route path="/acerca" element={<AboutScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <HashRouter>
      <OfflineBanner />
      <AppRoutes />
    </HashRouter>
  );
}
