import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const SERVICE_STATES = [
  'buscando',
  'ofrecido',
  'asignado',
  'en_camino',
  'llegado',
  'en_progreso',
  'esperando_aprobacion',
  'completado',
  'cancelado',
] as const

export type ServiceState = (typeof SERVICE_STATES)[number]
export type AdminServicePatch = {
  estado?: ServiceState
  proveedor_id?: string | null
  tarifa?: number
  descripcion?: string
  direccion_cliente?: string
}

export type AdminProviderOption = {
  id: string
  nombre: string
  apellido: string | null
  karma: number | null
  activo: boolean
}

export function useAdminActiveServices() {
  const [services, setServices] = useState<any[]>([])
  const [providers, setProviders] = useState<AdminProviderOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ data, error: queryError }, { data: providerRows, error: providerError }] = await Promise.all([
      (supabase as any)
        .from('servicios')
        .select(
          'id,numero,estado,tarifa,created_at,updated_at,descripcion,direccion_cliente,proveedor_id,' +
          'categoria:categorias!servicios_categoria_id_fkey(nombre,emoji),' +
          'cliente:usuarios!servicios_cliente_id_fkey(id,nombre,apellido),' +
          'proveedor:usuarios!servicios_proveedor_id_fkey(id,nombre,apellido,karma)'
        )
        .in('estado', SERVICE_STATES)
        .order('created_at', { ascending: false })
        .limit(100),
      (supabase as any)
        .from('usuarios')
        .select('id,nombre,apellido,karma,activo')
        .eq('tipo', 'proveedor')
        .eq('activo', true)
        .order('nombre', { ascending: true })
        .limit(500),
    ])

    if (queryError) {
      console.error('[AdminServices] load failed:', queryError.message)
      setServices([])
      setError(queryError.message)
    } else {
      setServices(data || [])
    }

    if (providerError) {
      console.error('[AdminServices] provider load failed:', providerError.message)
      setProviders([])
    } else {
      setProviders((providerRows || []) as AdminProviderOption[])
    }

    setLoading(false)
  }, [])

  const updateService = useCallback(async (serviceId: string, patch: AdminServicePatch) => {
    const cleanPatch: AdminServicePatch = { ...patch }
    if (cleanPatch.tarifa !== undefined && !Number.isFinite(cleanPatch.tarifa)) {
      throw new Error('La tarifa debe ser un número válido.')
    }

    const { data, error: updateError } = await (supabase as any)
      .from('servicios')
      .update(cleanPatch)
      .eq('id', serviceId)
      .select('id,numero,estado,tarifa,created_at,updated_at,descripcion,direccion_cliente,proveedor_id')
      .single()

    if (updateError) {
      console.error('[AdminServices] update failed:', updateError.message)
      throw new Error(updateError.message)
    }

    setServices((current) =>
      current.map((service) => {
        if (service.id !== serviceId) return service
        const selectedProvider = cleanPatch.proveedor_id === undefined
          ? service.proveedor
          : providers.find((provider) => provider.id === cleanPatch.proveedor_id) || null
        return { ...service, ...data, proveedor: selectedProvider }
      })
    )

    return data
  }, [providers])

  const updateServiceStatus = useCallback(
    async (serviceId: string, estado: ServiceState) => updateService(serviceId, { estado }),
    [updateService]
  )

  useEffect(() => {
    void refetch()
    const channel = supabase
      .channel('ugo-admin-live-services')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicios' }, () => {
        void refetch()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
        void refetch()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refetch])

  return { services, providers, loading, error, refetch, updateService, updateServiceStatus }
}
