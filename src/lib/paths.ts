/** Antepone la base de la app a una ruta absoluta del sitio ("/images/x.svg"), para funcionar bajo una subruta. */
export function withBase(path: string): string {
  return path.startsWith('/') ? import.meta.env.BASE_URL + path.slice(1) : path
}
