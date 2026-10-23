// Local-only FreeLLMAPI adapter. No database, production, or remote access.

const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
export function validateLocalEndpoint(value = 'http://127.0.0.1:3001/v1') {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !ALLOWED_HOSTS.has(url.hostname) || url.username || url.password || url.search || url.hash) throw new Error('HIVE_LOCAL_ENDPOINT_REQUIRED');
  if (url.port !== '3001' || !['/v1', '/v1/'].includes(url.pathname)) throw new Error('HIVE_LOCAL_ENDPOINT_REQUIRED');
  return url.origin + '/v1';
}

export function createLocalModelClient({ endpoint = process.env.HIVE_LOCAL_FREEAPI_URL, apiKey = process.env.HIVE_LOCAL_FREEAPI_KEY, fetchImpl = globalThis.fetch, timeoutMs = 12000 } = {}) {
  const base = validateLocalEndpoint(endpoint || undefined);
  if (!apiKey || typeof apiKey !== 'string') throw new Error('HIVE_LOCAL_API_KEY_REQUIRED');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) throw new Error('HIVE_INVALID_TIMEOUT');
  let inFlight = false;
  return {
    async complete({ model, messages }) {
      if (inFlight) throw new Error('HIVE_BUSY');
      if (typeof model !== 'string' || !model.trim() || model.length > 128) throw new Error('HIVE_MODEL_REQUIRED');
      if (!Array.isArray(messages) || !messages.length || messages.length > 16 ||
          messages.some(m => !['system','user','assistant'].includes(m?.role) || typeof m.content !== 'string' || m.content.length > 8000)) throw new Error('HIVE_INVALID_MESSAGES');
      inFlight = true;
      try {
        let response;
        try { response = await fetchImpl(base + '/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({ model, messages, stream: false, max_tokens: 512 }),
          signal: AbortSignal.timeout(timeoutMs),
          redirect: 'error'
        });
        } catch (error) {
          if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw error;
          throw new Error('HIVE_PROVIDER_NETWORK_ERROR');
        }
        // Fail once, without an automatic upstream replay: a timeout may have completed remotely.
        // Retry-After is advisory metadata only, not permission to duplicate a request.
        if (response.status === 429 || response.status === 503) {
          const header = response.headers?.get?.('retry-after');
          const seconds = typeof header === 'string' && /^\d{1,5}$/.test(header.trim())
            ? Math.min(3600, Number(header.trim())) : null;
          const err = new Error(response.status === 429 ? 'HIVE_FREEAPI_RATE_LIMITED' : 'HIVE_PROVIDER_UNAVAILABLE');
          err.retryAfterSeconds = seconds;
          throw err;
        }
        if (!response.ok) throw new Error('HIVE_PROVIDER_HTTP_' + response.status);
        const raw = await response.text();
        if (raw.length > 131072) throw new Error('HIVE_RESPONSE_TOO_LARGE');
        let data; try { data = JSON.parse(raw); } catch { throw new Error('HIVE_INVALID_PROVIDER_RESPONSE'); }
        const answer = data?.choices?.[0]?.message?.content;
        if (typeof answer !== 'string' || !answer.trim()) throw new Error('HIVE_INVALID_PROVIDER_RESPONSE');
        return { answer, model: data.model || model };
      } finally { inFlight = false; }
    }
  };
}
