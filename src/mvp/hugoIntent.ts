import type { Category } from './shared'

export type HugoClientIntent = {
  categoryId?: string
  categoryName?: string
  urgency?: boolean
  description?: string
}

const ALIASES: Record<string, string[]> = {
  electricidad: ['electricista','electricidad','electrico','eléctrico','luz','enchufe','tomacorriente','cortocircuito'],
  plomeria: ['plomero','plomería','plomeria','cañeria','cañería','agua','canilla','ducha','perdida','pérdida'],
  pintura: ['pintor','pintura','pintar','pared','paredes'],
  limpieza: ['limpieza','limpiar','limpiador','limpiadora'],
  carpinteria: ['carpintero','carpintería','carpinteria','mueble','madera'],
  cerrajeria: ['cerrajero','cerrajería','cerrajeria','cerradura','llave'],
  aire_acondicionado: ['aire acondicionado','split','climatizacion','climatización','refrigeracion','refrigeración'],
  montaje: ['montaje','armar mueble','instalar','instalacion','instalación'],
}

function norm(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function parseClientIntent(text: string, categories: Category[]): HugoClientIntent {
  const input = norm(text)
  const urgent = /\b(urgente|urgencia|ya|ahora|hoy mismo|emergencia)\b/.test(input)

  let match: Category | undefined
  for (const category of categories) {
    const fields = [category.nombre, category.slug].filter(Boolean).map(v => norm(String(v)))
    if (fields.some(v => v && (input.includes(v) || v.split(' ').some(part => part.length > 4 && input.includes(part))))) {
      match = category
      break
    }
  }

  if (!match) {
    outer: for (const [key, aliases] of Object.entries(ALIASES)) {
      if (!aliases.some(alias => input.includes(norm(alias)))) continue
      const keyNorm = norm(key)
      for (const category of categories) {
        const target = norm(`${category.slug || ''} ${category.nombre || ''}`)
        if (target.includes(keyNorm) || keyNorm.split(' ').some(part => part.length > 4 && target.includes(part))) {
          match = category
          break outer
        }
      }
    }
  }

  return {
    categoryId: match?.id,
    categoryName: match?.nombre,
    urgency: urgent || undefined,
    description: text.trim().length >= 8 ? text.trim() : undefined,
  }
}
