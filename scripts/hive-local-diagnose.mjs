// Read-only FreeLLMAPI connection diagnostic. No inference requests, database access or retries.
import { validateLocalEndpoint } from './hive-local-freellmapi-client.mjs';

export async function inspectLocalFreeAPI({
  endpoint = process.env.HIVE_LOCAL_FREEAPI_URL,
  apiKey = process.env.HIVE_LOCAL_FREEAPI_KEY,
  fetchImpl = globalThis.fetch
} = {}) {
  const base = validateLocalEndpoint(endpoint || undefined);
  if (!apiKey) throw new Error('HIVE_LOCAL_API_KEY_REQUIRED');
  let response;
  try {
    response = await fetchImpl(base + '/models', {
      headers: { authorization: 'Bearer ' + apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
      redirect: 'error'
    });
  } catch {
    return { status:'UNREACHABLE', detail:'FreeLLMAPI no respondió desde esta máquina' };
  }
  if (response.status === 429) return { status:'RATE_LIMITED', detail:'El proxy limitó la consulta de catálogo' };
  if (response.status === 401 || response.status === 403) return { status:'AUTH_REJECTED' };
  if (!response.ok) return { status:'HTTP_ERROR', http_status:response.status };
  let raw;
  try {
    raw = await response.text();
    if (raw.length > 262144) return { status:'CATALOG_TOO_LARGE' };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.data)) return {status:'INVALID_CATALOG'};
    const modelIds=parsed.data.filter(m=>typeof m?.id==='string' && m.id.length<=128)
      .map(m=>m.id).slice(0,100);
    return { status:'CATALOG_OK', models:modelIds, count:parsed.data.length,
      note:'El catálogo no demuestra cuota disponible: una inferencia aún puede devolver 429.' };
  } catch { return { status:'INVALID_CATALOG' }; }
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const result=await inspectLocalFreeAPI();
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
