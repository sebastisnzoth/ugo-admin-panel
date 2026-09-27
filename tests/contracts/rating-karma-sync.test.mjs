import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('bilateral reviews synchronize karma of the reviewed party',async()=>{
 const sql=await read('supabase/migrations/20260927161000_rating_karma_sync.sql')
 assert.match(sql,/autor_tipo='cliente'[\s\S]*proveedor_id=p_user_id/)
 assert.match(sql,/autor_tipo='proveedor'[\s\S]*cliente_id=p_user_id/)
 assert.match(sql,/avg\(x\.puntuacion\)/)
 assert.match(sql,/set karma=least\(5\.00,greatest\(1\.00/)
 assert.match(sql,/create trigger trg_sync_rating_karma[\s\S]*after insert or update[\s\S]*or delete/i)
})

test('user sensitive guard permits only nested karma-only recalculation',async()=>{
 const sql=await read('supabase/migrations/20260927161000_rating_karma_sync.sql')
 assert.match(sql,/pg_trigger_depth\(\)>1/)
 assert.match(sql,/to_jsonb\(new\) - array\['karma','updated_at'\]/)
 assert.match(sql,/v_nested_karma_only/)
 assert.match(sql,/if v_nested_karma_only then/)
 assert.match(sql,/USER_SENSITIVE_FIELDS_ADMIN_ONLY/)
})

test('existing reviews are backfilled without changing service ownership',async()=>{
 const sql=await read('supabase/migrations/20260927161000_rating_karma_sync.sql')
 assert.match(sql,/select proveedor_id as target_id from public\.resenas where autor_tipo='cliente'/)
 assert.match(sql,/select cliente_id as target_id from public\.resenas where autor_tipo='proveedor'/)
 assert.doesNotMatch(sql,/update public\.servicios/)
})
