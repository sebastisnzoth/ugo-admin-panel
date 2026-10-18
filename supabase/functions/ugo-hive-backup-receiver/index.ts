import { createClient } from 'npm:@supabase/supabase-js@2.108.1'
import { createBackupHandler } from './handler.mjs'
const url = Deno.env.get('SUPABASE_URL') || ''
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const bucket = 'hive-freeapi-backups'
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const storage = db.storage.from(bucket)
function check(error: unknown) { if (error) throw new Error('STORE_ERROR') }
const store = {
  async stage(version: string) { const { data, error } = await db.rpc('hive_stage_backup', { p_version: version }); check(error); return data === true },
  async ack(paths: string[]) { const { error } = await db.from('hive_backup_cleanup').delete().in('object_key', paths); check(error) },
  async cleanup() {
    const { data, error } = await db.rpc('hive_claim_backup_cleanup'); check(error)
    for (const path of (data || []) as string[]) {
      const { error: deleteError } = await storage.remove([path]); check(deleteError)
      await store.ack([path])
    }
  },
  async current() {
    const { data, error } = await db.from('hive_backup_versions').select('version,object_key,sha256,bytes,created_at').order('sequence', { ascending: false }).limit(1).maybeSingle()
    check(error); return data
  },
  async get(path: string) { const { data, error } = await storage.download(path); check(error); if (!data) throw new Error('MISSING'); return new Uint8Array(await data.arrayBuffer()) },
  async put(path: string, blob: Uint8Array) { const { error } = await storage.upload(path, blob, { contentType: 'application/octet-stream', upsert: false }); check(error) },
  async commit(expected: string, version: string, hash: string, bytes: number) {
    const { data, error } = await db.rpc('hive_commit_backup', { p_expected: expected, p_version: version, p_sha: hash, p_bytes: bytes }); check(error); return data
  },
  async remove(paths: string[]) { const { error } = await storage.remove(paths); check(error) }
}
Deno.serve(createBackupHandler({ token: Deno.env.get('HIVE_BACKUP_TOKEN') || '', store, projectUrl: url }))
