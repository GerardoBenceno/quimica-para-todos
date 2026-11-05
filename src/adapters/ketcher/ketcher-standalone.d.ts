// Tipos propios del wrapper: el subpath sin render de ketcher-standalone no
// expone sus tipos por "exports". Se contiene aquí sin relajar strict.
declare module 'ketcher-standalone/dist/binaryWasmNoRender' {
  export class StandaloneStructServiceProvider {
    constructor()
  }
}
