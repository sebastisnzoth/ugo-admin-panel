// Datos de ejemplo para el preview de diseño del Cliente.
// No conectado a Supabase ni a flujos reales: solo para validar la UI.

export type PreviewProvider = {
  id: string
  name: string
  service: string
  rating: number
  reviews: number
  pricePerHour: number
  verified: boolean
  yearsExperience: number
  description: string
  /** Colores de los placeholders de trabajos realizados */
  works: [string, string, string]
}

export const previewProvider: PreviewProvider = {
  id: 'prov-demo-1',
  name: 'Carlos Méndez',
  service: 'Electricista',
  rating: 4.9,
  reviews: 127,
  pricePerHour: 8500,
  verified: true,
  yearsExperience: 5,
  description: 'Instalaciones, reparaciones y mantenimiento eléctrico para hogares y oficinas.',
  works: ['#D7DEE8', '#F1D9B5', '#CFE3D8'],
}

export type PreviewCategory = { id: string; label: string; icon: string }

export const previewCategories: PreviewCategory[] = [
  { id: 'electricista', label: 'Electricista', icon: '⚡' },
  { id: 'plomeria', label: 'Plomería', icon: '💧' },
  { id: 'limpieza', label: 'Limpieza', icon: '🧹' },
  { id: 'montaje', label: 'Montaje', icon: '🔧' },
]

export const previewEnRoute = {
  vehicle: 'Toyota Hilux',
  plate: 'AE 342 QP',
  etaMinutes: 8,
}

export const previewAddress = 'Av. Santa Fe 3200'

export function formatArs(amount: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(amount)
}
