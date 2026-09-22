import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('Admin overview exposes realtime operational attention tower',async()=>{const source=await read('src/mvp/AdminNativeModules.tsx');assert.match(source,/TORRE OPERATIVA/);assert.match(source,/Sin servicios activos estancados por más de 10 minutos/);assert.match(source,/\.lt\('updated_at',cutoff\)/);assert.match(source,/postgres_changes/);assert.match(source,/CHANNEL_ERROR|TIMED_OUT/);assert.match(source,/open_service/)})
