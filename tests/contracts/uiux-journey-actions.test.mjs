import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('client review stays editable without restarting the request', async () => {
  const source = await read('src/mvp/client/ClientGuidedRequest.tsx')
  assert.match(source, /function editReview\(target:'need'\|'photo'\|'when'\)/)
  assert.match(source, /aria-label="Editar servicio y necesidad"/)
  assert.match(source, /aria-label="Editar fecha y hora"/)
  assert.match(source, /aria-label="Editar dirección"/)
  assert.match(source, /aria-label="Editar fotos"/)
  assert.match(source, /cambialo acá sin empezar de nuevo/)
})

test('provider home uses explicit operational action copy', async () => {
  const source = await read('src/mvp/ProviderHomeStructural.tsx')
  assert.match(source, /Salir hacia el cliente/)
  assert.match(source, /Marcar que llegué/)
  assert.match(source, />Rechazar<\/button>/)
  assert.match(source, />Aceptar trabajo<\/button>/)
  assert.doesNotMatch(source, />Ignorar<\/button>/)
  assert.doesNotMatch(source, /Navegar al cliente/)
})
