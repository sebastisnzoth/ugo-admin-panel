import type { VercelRequest, VercelResponse } from '@vercel/node'

type Coordinates = { latitude: number; longitude: number }
type Candidate = { providerId: string; location: Coordinates }

function validCoord(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Number.isFinite(Number(v.latitude)) && Number(v.latitude) >= -90 && Number(v.latitude) <= 90 && Number.isFinite(Number(v.longitude)) && Number(v.longitude) >= -180 && Number(v.longitude) <= 180
}

function coord(c: Coordinates) {
  return `${Number(c.longitude)},${Number(c.latitude)}`
}

function baseUrl() {
  const raw = String(process.env.OSRM_BASE_URL || '').trim().replace(/\/+$/, '')
  if (!raw) throw new Error('OSRM_BASE_URL no configurado')
  if (!/^https?:\/\//i.test(raw)) throw new Error('OSRM_BASE_URL inválido')
  return raw
}

async function fetchJson(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data || data.code !== 'Ok') throw new Error(data?.message || `OSRM ${response.status}`)
    return data
  } finally {
    clearTimeout(timeout)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const action = String(body.action || '')
    const base = baseUrl()

    if (action === 'route') {
      if (!validCoord(body.origin) || !validCoord(body.destination)) return res.status(400).json({ error: 'Coordenadas inválidas' })
      const url = `${base}/route/v1/driving/${coord(body.origin)};${coord(body.destination)}?overview=full&geometries=geojson&steps=false`
      const data = await fetchJson(url)
      const route = data.routes?.[0]
      if (!route) return res.status(404).json({ error: 'Ruta no encontrada' })
      return res.status(200).json({
        distanceMeters: Number(route.distance || 0),
        durationSeconds: Number(route.duration || 0),
        geometry: route.geometry || null,
      })
    }

    if (action === 'table') {
      if (!validCoord(body.destination) || !Array.isArray(body.candidates)) return res.status(400).json({ error: 'Solicitud inválida' })
      const candidates = (body.candidates as Candidate[]).filter(c => c && typeof c.providerId === 'string' && validCoord(c.location)).slice(0, 50)
      if (!candidates.length) return res.status(200).json([])

      const coordinates = [...candidates.map(c => c.location), body.destination as Coordinates]
      const destinationIndex = coordinates.length - 1
      const sources = candidates.map((_, index) => index).join(';')
      const url = `${base}/table/v1/driving/${coordinates.map(coord).join(';')}?sources=${sources}&destinations=${destinationIndex}&annotations=duration,distance`
      const data = await fetchJson(url)
      const durations: Array<Array<number | null>> = data.durations || []
      const distances: Array<Array<number | null>> = data.distances || []

      const ranked = candidates.map((candidate, index) => ({
        ...candidate,
        etaSeconds: Number(durations[index]?.[0] ?? Number.MAX_SAFE_INTEGER),
        distanceMeters: Number(distances[index]?.[0] ?? Number.MAX_SAFE_INTEGER),
      })).filter(item => Number.isFinite(item.etaSeconds) && item.etaSeconds < Number.MAX_SAFE_INTEGER)
        .sort((a, b) => a.etaSeconds - b.etaSeconds || a.distanceMeters - b.distanceMeters)

      return res.status(200).json(ranked)
    }

    return res.status(400).json({ error: 'Acción de routing inválida' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Routing no disponible'
    const status = message.includes('OSRM_BASE_URL') ? 503 : 502
    return res.status(status).json({ error: message })
  }
}
