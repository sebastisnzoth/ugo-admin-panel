import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export const SERVICE_STATES = [
  'borrador',
  'buscando',
  'ofrecido',
  'asignado',
  'en_camino',
  'llegado',
  'en_progreso',
  'esperando_aprobacion',
  'completado',
  'cancelado',
  'disputado',
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
  online: boolean
  disponible: boolean
  estado_verificacion: string | null
  pendingDebtCount: number
  debtBlocked: boolean
}

type LiveStatus='connecting'|'live'|'degraded'
const POLL_MS=8000

export function useAdminActiveServices() {
  const [services, setServices] = useState<any[]>([])
  const [providers, setProviders] = useState<AdminProviderOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveStatus,setLiveStatus]=useState<LiveStatus>('connecting')
  const [lastSynced,setLastSynced]=useState<Date|null>(null)
  const [channelEpoch,setChannelEpoch]=useState(0)
  const inFlight=useRef(false)
  const debounceRef=useRef<number|undefined>(undefined)

  const refetch = useCallback(async (options?:{silent?:boolean}) => {
    if(inFlight.current)return
    inFlight.current=true
    if(!options?.silent)setLoading(true)
    setError(null)

    try{
      const [{ data, error: queryError }, { data: providerRows, error: providerError }] = await Promise.all([
        (supabase as any)
          .from('servicios')
          .select(
            'id,numero,estado,tarifa,created_at,updated_at,descripcion,direccion_cliente,cliente_id,proveedor_id,programado_para,aceptado_at,iniciado_at,completado_at,cancelado_at,metadata,' +
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
        setError(queryError.message)
      } else {
        setServices(data || [])
      }

      if (providerError) {
        console.error('[AdminServices] provider load failed:', providerError.message)
      } else {
        const baseProviders=(providerRows||[]) as Array<Omit<AdminProviderOption,'online'|'disponible'|'estado_verificacion'|'pendingDebtCount'|'debtBlocked'>>
        const ids=baseProviders.map(provider=>provider.id)
        let profileRows:Array<{usuario_id:string;online:boolean|null;disponible:boolean|null;estado_verificacion:string|null}>=[]
        let debtRows:Array<{proveedor_id:string;estado:string;ambiente:string;saldo_pendiente:number|string|null}>=[]
        if(ids.length){
          const[{data:profiles,error:profilesError},{data:debts,error:debtsError}]=await Promise.all([
            (supabase as any).from('perfiles_proveedor').select('usuario_id,online,disponible,estado_verificacion').in('usuario_id',ids),
            (supabase as any).from('deudas_ugo_proveedor').select('proveedor_id,estado,ambiente,saldo_pendiente').in('proveedor_id',ids),
          ])
          if(profilesError)console.warn('[AdminServices] provider status unavailable:',profilesError.message)
          else profileRows=(profiles||[]) as typeof profileRows
          if(debtsError)console.warn('[AdminServices] provider debt status unavailable:',debtsError.message)
          else debtRows=(debts||[]) as typeof debtRows
        }
        const profileById=new Map(profileRows.map(row=>[row.usuario_id,row]))
        const debtCountById=new Map<string,number>()
        for(const debt of debtRows){
          if(debt.ambiente!=='real'||['pagado','anulado'].includes(debt.estado)||Number(debt.saldo_pendiente||0)<=0)continue
          debtCountById.set(debt.proveedor_id,(debtCountById.get(debt.proveedor_id)||0)+1)
        }
        setProviders(baseProviders.map(provider=>{const status=profileById.get(provider.id),pendingDebtCount=debtCountById.get(provider.id)||0;return{...provider,online:Boolean(status?.online),disponible:Boolean(status?.disponible),estado_verificacion:status?.estado_verificacion||null,pendingDebtCount,debtBlocked:pendingDebtCount>=3}}))
      }
      setLastSynced(new Date())
    } finally {
      inFlight.current=false
      setLoading(false)
    }
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
      .select('id,numero,estado,tarifa,created_at,updated_at,descripcion,direccion_cliente,cliente_id,proveedor_id,programado_para,aceptado_at,iniciado_at,completado_at,cancelado_at,metadata')
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
    setLastSynced(new Date())
    return data
  }, [providers])

  const updateServiceStatus = useCallback(
    async (serviceId: string, estado: ServiceState) => updateService(serviceId, { estado }),
    [updateService]
  )

  useEffect(() => {
    let alive=true
    const schedule=()=>{
      if(!alive)return
      window.clearTimeout(debounceRef.current)
      debounceRef.current=window.setTimeout(()=>{if(alive)void refetch({silent:true})},120)
    }
    const onOnline=()=>{setLiveStatus('connecting');schedule()}
    const onVisibility=()=>{if(document.visibilityState==='visible')schedule()}
    window.addEventListener('online',onOnline)
    document.addEventListener('visibilitychange',onVisibility)
    void refetch()

    const channel = supabase
      .channel(`ugo-admin-live-services-${channelEpoch}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicios' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles_proveedor' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deudas_ugo_proveedor' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicio_estado_eventos' }, schedule)
      .subscribe(status=>{
        if(!alive)return
        if(status==='SUBSCRIBED'){setLiveStatus('live');schedule();return}
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
          setLiveStatus('degraded')
          window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1500)
        }
      })

    const fallback=window.setInterval(()=>{if(alive&&document.visibilityState==='visible')void refetch({silent:true})},POLL_MS)
    return () => {
      alive=false
      window.clearTimeout(debounceRef.current)
      window.clearInterval(fallback)
      window.removeEventListener('online',onOnline)
      document.removeEventListener('visibilitychange',onVisibility)
      void supabase.removeChannel(channel)
    }
  }, [channelEpoch,refetch])

  return { services, providers, loading, error, refetch, updateService, updateServiceStatus, liveStatus, lastSynced }
}
