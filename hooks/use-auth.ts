// Re-exporta useAuth desde el AuthContext/Provider centralizado.
// Todos los componentes importan desde aquí y obtienen la MISMA instancia
// compartida — sin peticiones de red duplicadas por componente.
export { useAuth } from '@/context/auth-context'
