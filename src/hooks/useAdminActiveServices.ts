import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ACTIVE_STATES = [
  'buscando',
  'ofrecido',
  'asignado',
  'en_camino',
  'llegado',
  'en_progreso',
  'esperando_aprobacion',
]

export function useAdminActiveServices() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: queryError } = await (supabase as any)
      .from('servicios')
      .select(
        'id,numero,estado,tarifa,created_at,updated_at,descripcion,direccion_cliente,' +
        'categoria:categorias!servicios_categoria_id_fkey(nombre,emoji),' +
        'cliente:usuarios!servicios_cliente_id_fkey(nombre,apellido),' +
        'proveedor:usuarios!servicios_proveedor_id_fkey(nombre,apellido,karma)'
      )
      .in('estado', ACTIVE_STATES)
      .order('created_at', { ascending: false })
      .limit(100)

    if (queryError) {
      console.error('[AdminServices] load failed:', queryError.message)
      setServices([])
      setError(queryError.message)
    } else {
      setServices(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
    const channel = supabase
      .channel('ugo-admin-live-services')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicios' }, () => {
        void refetch()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refetch])

  return { services, loading, error, refetch }
}
