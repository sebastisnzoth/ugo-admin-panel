import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const shared=fs.readFileSync('src/mvp/shared.tsx','utf8')
const provider=fs.readFileSync('src/mvp/provider/providerData.tsx','utf8')

test('provider session never falls back to login while a valid session is being recovered',()=>{
  assert.match(shared,/retryProfile=useCallback/)
  assert.match(provider,/if\(!session\)return <AuthScreen/)
  assert.match(provider,/if\(!profile\)return auth\.error\?<main className="provider-screen"><ErrorState title="Tu sesión sigue abierta"/)
  assert.doesNotMatch(provider,/if\(!session\|\|!profile\)return <AuthScreen/)
})

test('provider asks Chrome for geolocation after authenticated profile load',()=>{
  assert.match(provider,/navigator\.geolocation\.getCurrentPosition/)
  assert.match(provider,/Ubicación autorizada en Chrome/)
  assert.match(provider,/tu sesión de UGO seguirá abierta/)
})

test('location permission does not force an offline provider online',()=>{
  assert.match(provider,/if\(providerOnline&&providerAvailable\)/)
  assert.match(provider,/Cuando quieras recibir pedidos, tocá “Ponerme Online”/)
  const effect=provider.slice(provider.indexOf("useEffect(()=>{if(!session||!provider||typeof navigator==='undefined'||!navigator.geolocation)return"),provider.indexOf("if(auth.loading||loading)"))
  assert.doesNotMatch(effect,/setProvider\(current=>current\?\{\.\.\.current,disponible:true,online:true/)
})
