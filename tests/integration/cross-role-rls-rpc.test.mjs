import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const required=[
  'UGO_TEST_SUPABASE_URL','UGO_TEST_SUPABASE_ANON_KEY',
  'UGO_TEST_CLIENT_EMAIL','UGO_TEST_CLIENT_PASSWORD',
  'UGO_TEST_PROVIDER_EMAIL','UGO_TEST_PROVIDER_PASSWORD',
  'UGO_TEST_ADMIN_EMAIL','UGO_TEST_ADMIN_PASSWORD',
]
const missing=required.filter(name=>!process.env[name])
const enabled=missing.length===0
const requireIsolated=process.env.UGO_REQUIRE_ISOLATED_INTEGRATION==='1'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const TEST_REF='tmossnqfwfwjrtzwcbmm'
const PROD_REF='trfsjuseqjxlhrxuvdsm'

function sb(){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}

async function signIn(email,password){
  const supabase=sb()
  const {data,error}=await supabase.auth.signInWithPassword({email,password})
  if(error)throw error
  assert.ok(data.user?.id)
  return {supabase,userId:data.user.id}
}

async function firstCategory(supabase){
  const {data,error}=await supabase.from('categorias').select('id').eq('activa',true).limit(1).single()
  if(error)throw error
  return data
}

test('cross-role RLS/RPC denies reads and writes outside actor authority',{skip:!enabled},async()=>{
  assert.ok(url.includes(TEST_REF),'Cross-RLS runtime must target designated UGO TEST')
  assert.ok(!url.includes(PROD_REF),'Cross-RLS runtime refuses production')

  const [
    {supabase:c,userId:clientId},
    {supabase:p,userId:providerId},
    {supabase:a,userId:adminId},
  ]=await Promise.all([
    signIn(process.env.UGO_TEST_CLIENT_EMAIL,process.env.UGO_TEST_CLIENT_PASSWORD),
    signIn(process.env.UGO_TEST_PROVIDER_EMAIL,process.env.UGO_TEST_PROVIDER_PASSWORD),
    signIn(process.env.UGO_TEST_ADMIN_EMAIL,process.env.UGO_TEST_ADMIN_PASSWORD),
  ])

  const {data:adminProfile,error:adminProfileError}=await a.from('usuarios').select('tipo,activo').eq('id',adminId).single()
  if(adminProfileError)throw adminProfileError
  assert.equal(adminProfile.activo,true)
  assert.ok(['admin','superadmin'].includes(adminProfile.tipo))

  const category=await firstCategory(c)
  const marker='cross-rls-'+crypto.randomUUID()
  let serviceId=null

  try{
    const {data:created,error:createError}=await a.from('servicios').insert({
      cliente_id:clientId,
      categoria_id:category.id,
      estado:'buscando',
      descripcion:'UGO cross-role RLS fixture',
      urgencia:false,
      ambiente:'demo',
      metadata:{integration_test:true,source:'cross-role-rls-runtime',marker},
    }).select('id,descripcion,estado').single()
    if(createError)throw createError
    serviceId=created.id

    const providerRead=await p.from('servicios').select('id,cliente_id,descripcion').eq('id',serviceId).maybeSingle()
    if(providerRead.error)throw providerRead.error
    assert.equal(providerRead.data,null,'Un proveedor no asignado no puede leer la fila privada del servicio')

    const providerWrite=await p.from('servicios').update({descripcion:'FORBIDDEN_PROVIDER_WRITE'}).eq('id',serviceId).select('id')
    if(providerWrite.error && providerWrite.error.code!=='42501')throw providerWrite.error
    assert.equal(providerWrite.data?.length||0,0,'Un proveedor no asignado no puede actualizar el servicio')

    const {data:clientAfterProviderWrite,error:clientAfterProviderWriteError}=await c.from('servicios').select('descripcion').eq('id',serviceId).single()
    if(clientAfterProviderWriteError)throw clientAfterProviderWriteError
    assert.equal(clientAfterProviderWrite.descripcion,'UGO cross-role RLS fixture','El write denegado no puede producir efecto')

    const forgedProviderMessage=await p.from('mensajes').insert({
      servicio_id:serviceId,
      emisor_id:providerId,
      emisor_rol:'proveedor',
      contenido:'FORBIDDEN_CROSS_ROLE_MESSAGE',
    }).select('id')
    assert.ok(forgedProviderMessage.error,'Proveedor ajeno al servicio no puede insertar chat')

    const providerClientLocation=await p.rpc('guardar_ubicacion_servicio_cliente',{
      p_servicio_id:serviceId,p_lat:-27.4167917,p_lng:-48.4242297,
    })
    assert.ok(providerClientLocation.error,'Proveedor no puede ejecutar la RPC exclusiva del Cliente')

    const clientProviderLocation=await c.rpc('publicar_ubicacion_proveedor',{
      p_servicio_id:serviceId,
      p_lat:-27.4167917,p_lng:-48.4242297,
      p_captured_at:new Date().toISOString(),
      p_accuracy_m:10,
    })
    assert.ok(clientProviderLocation.error,'Cliente no puede ejecutar la RPC exclusiva del Proveedor')

    const clientOffers=await c.rpc('obtener_ofertas_proveedor')
    assert.ok(clientOffers.error,'Cliente no puede leer ofertas mediante RPC exclusiva del Proveedor')

    const providerApproval=await p.rpc('aprobar_servicio',{p_servicio_id:serviceId})
    assert.ok(providerApproval.error,'Proveedor no puede ejecutar aprobación exclusiva del Cliente')

    const {data:adminView,error:adminViewError}=await a.from('servicios').select('id,cliente_id,estado,metadata').eq('id',serviceId).single()
    if(adminViewError)throw adminViewError
    assert.equal(adminView.id,serviceId,'Admin autorizado sí puede auditar el serviceId')
    assert.equal(adminView.cliente_id,clientId)
    assert.equal(adminView.metadata?.marker,marker)
  } finally {
    if(serviceId){
      const current=await a.from('servicios').select('metadata').eq('id',serviceId).maybeSingle()
      if(!current.error&&current.data){
        const cleanup=await a.from('servicios').update({
          estado:'cancelado',
          metadata:{...current.data.metadata,cross_rls_verified_at:new Date().toISOString()},
        }).eq('id',serviceId)
        if(cleanup.error)throw cleanup.error
      }
    }
    await Promise.allSettled([c.auth.signOut(),p.auth.signOut(),a.auth.signOut()])
  }
})

test('cross-role isolated gate fails closed when credentials are unavailable',{skip:enabled},()=>{
  assert.ok(missing.length>0)
  if(requireIsolated)assert.fail('Cross-role RLS/RPC runtime requerido pero faltan: '+missing.join(', '))
})
