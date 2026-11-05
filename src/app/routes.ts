// Rutas de la app (HashRouter). Las pantallas navegan solo con estas funciones.
export const routes = {
  home: () => '/',
  welcome: () => '/bienvenida',
  diagnostic: () => '/diagnostico',
  worlds: () => '/aprender',
  world: (worldId: string) => `/mundo/${worldId}`,
  lesson: (lessonId: string) => `/leccion/${lessonId}`,
  result: (attemptId: string) => `/resultado/${attemptId}`,
  practice: () => '/repasar',
  profile: () => '/perfil',
  quests: () => '/recompensas',
}
