import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client saved places persist with owner RLS and one default',async()=>{const sql=await read('supabase/migrations/20260920100000_client_saved_places.sql');assert.match(sql,/create table if not exists public\.direcciones_cliente/);assert.match(sql,/direcciones_cliente_unica_predeterminada_uidx/);assert.match(sql,/usuario_id=auth\.uid\(\)/);assert.match(sql,/set_direccion_cliente_predeterminada/)})
test('location step offers saved places and current GPS',async()=>{const s=await read('src/mvp/client/ClientLocationScreen.tsx');assert.match(s,/Tus lugares/);assert.match(s,/choosePlace\(place\)/);assert.match(s,/direcciones_cliente/);assert.match(s,/Usar mi ubicación/);assert.match(s,/ugo:last-client-location/)})
test('profile manages places and starts an order there',async()=>{const p=await read('src/features/client/profile/ClientProfilePanel.tsx');assert.match(p,/\+ Guardar lugar/);assert.match(p,/Pedir acá/);assert.match(p,/Hacer principal/);assert.match(p,/set_direccion_cliente_predeterminada/);assert.match(p,/flow\.navigate\('request'\)/)})
test('home recenters from browser geolocation',async()=>{const h=await read('src/mvp/client/ClientHomeScreen.tsx');assert.match(h,/const locateUser=useCallback/);assert.match(h,/navigator\.geolocation\.getCurrentPosition/);assert.match(h,/ugo:last-client-location/);assert.match(h,/Mi ubicación/)})
