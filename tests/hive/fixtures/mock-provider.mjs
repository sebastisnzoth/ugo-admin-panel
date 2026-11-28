// Proveedor de pruebas: HTTP real, cero red externa, coste cero.
// Sirve para ejercitar el camino completo del worker (timeouts, errores, rate limit,
// respuestas inválidas) sin depender de ninguna API ni de ninguna clave.
import { createServer } from 'node:http'

export async function startMockProvider({ mode = 'ok', delayMs = 0, text = null, path = '/complete', extra = {} } = {}) {
  const requests = []
  let extraFields = { ...extra }
  const server = createServer((req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body))
    }
    if (req.method !== 'POST' || req.url !== path) return send(404, { error: 'not_found' })
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      let body = {}
      try { body = JSON.parse(raw) } catch { /* se registra igual */ }
      requests.push({ at: new Date().toISOString(), body })
      const finish = () => {
        if (mode === 'error') return send(500, { error: 'mock_error' })
        if (mode === 'ratelimit') return send(429, { error: 'rate_limited' })
        if (mode === 'invalid') return res.writeHead(200, { 'content-type': 'application/json' }).end('{not json')
        if (mode === 'nocost') return send(200, { text: 'sin datos de coste', model: 'mock/free', usage: { prompt_tokens: 5, completion_tokens: 2 } })
        if (mode === 'paid') return send(200, { text: 'facturado', model: 'mock/free', cost: 0.0004, usage: { prompt_tokens: 5, completion_tokens: 2 } })
        if (mode === 'secretleak') return send(200, { text: 'clave postgresql://user:pass@host/db', model: 'mock/free', cost: 0, usage: { prompt_tokens: 5, completion_tokens: 5 } })
        if (mode === 'empty') return send(200, { text: '   ', model: 'mock/free', cost: 0, usage: { prompt_tokens: 5, completion_tokens: 2 } })
        const prompt = String(body.prompt ?? '')
        return send(200, {
          ...extraFields,
          text: text ?? `eco: ${prompt.slice(0, 120)}`,
          model: 'mock/free',
          // Coste declarado explícitamente por el proveedor: es la única fuente válida.
          cost: 0,
          usage: { prompt_tokens: Math.max(1, prompt.length), completion_tokens: 8 },
        })
      }
      if (delayMs > 0) setTimeout(finish, delayMs)
      else finish()
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    setMode(next) { mode = next },
    setExtra(next) { extraFields = { ...next } },
    async close() { await new Promise(resolve => server.close(resolve)) },
  }
}
