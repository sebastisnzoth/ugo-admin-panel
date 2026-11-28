import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// El bundle del navegador no puede llevar credenciales de base de datos ni claves de
// servicio. Esta prueba recorre TODO `src/` (no sólo Hive) porque un descuido en cualquier
// componente acaba en el mismo bundle.

// `src/server/` es código de servidor (misma convención que scripts/hive/isolation-audit.mjs):
// no entra en el bundle del navegador y puede usar credenciales privilegiadas. Aun así se
// comprueba abajo que ningún archivo de cliente lo importe.
const ROOT = 'src'
const SERVER_ONLY_PREFIX = 'src/server/'
const ALLOWED_SECRET_FREE_VITE = new Set([
  'VITE_HIVE_CONSOLE_API', // URL pública del endpoint, sin credenciales
])

const allFiles = []
const files = []
const walk = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      allFiles.push(path)
      if (!relative(process.cwd(), path).split('\\').join('/').startsWith(SERVER_ONLY_PREFIX)) files.push(path)
    }
  }
}
walk(ROOT)

test('hay archivos que escanear (la prueba no pasa por vacío)', () => {
  assert.ok(files.length > 100, `sólo ${files.length} archivos`)
})

test('ninguna cadena de conexión ni credencial de base en el frontend', () => {
  const offenders = []
  const patterns = [
    { name: 'dsn', regex: /postgres(?:ql)?:\/\//i },
    { name: 'worker-url', regex: /HIVE_WORKER_DATABASE_URL/ },
    { name: 'reader-url', regex: /HIVE_READER_DATABASE_URL/ },
    { name: 'service-role', regex: /SERVICE_ROLE_KEY|service_role/i },
    { name: 'openrouter-key', regex: /OPENROUTER_API_KEY/ },
    { name: 'migrator', regex: /HIVE_MIGRATOR_DATABASE_URL|HIVE_ADMIN_DATABASE_URL/ },
  ]
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const pattern of patterns) {
      if (pattern.regex.test(source)) offenders.push({ file: relative(process.cwd(), file), pattern: pattern.name })
    }
  }
  assert.deepEqual(offenders, [])
})

test('ningún archivo de cliente importa código de servidor', () => {
  const offenders = files.filter(file => /from\s+['"][^'"]*\/server\//.test(readFileSync(file, 'utf8')))
  assert.deepEqual(offenders.map(file => relative(process.cwd(), file)), [])
})

test('las variables VITE_ usadas por el código son públicas y están revisadas', () => {
  const used = new Set()
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/VITE_[A-Z0-9_]+/g)) used.add(match[0])
  }
  const hiveRelated = [...used].filter(name => /HIVE/i.test(name))
  assert.deepEqual(hiveRelated.sort(), [...ALLOWED_SECRET_FREE_VITE].sort())
  // Claves públicas por diseño (Turnstile site key) son la única excepción admitida.
  const PUBLIC_BY_DESIGN = new Set(['VITE_UGO_SUPPORT_TURNSTILE_SITE_KEY'])
  const dangerous = [...used].filter(name => /SECRET|SERVICE_ROLE|PASSWORD|DATABASE_URL|API_KEY|PRIVATE/i.test(name))
    .filter(name => !PUBLIC_BY_DESIGN.has(name))
  assert.deepEqual(dangerous, [])
})

test('el cliente de la consola no imprime tokens ni los persiste', () => {
  const source = readFileSync('src/mvp/hiveConsoleApi.ts', 'utf8')
  assert.doesNotMatch(source, /console\.(log|info|warn|error)/)
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie/)
  // El token se pasa como argumento y sólo viaja en la cabecera Authorization.
  assert.match(source, /authorization: `Bearer \$\{options\.token\}`/)
})

test('el fichero de secretos del repositorio no existe ni está versionado', () => {
  const exists = ['worker.url', 'reader.url', 'secrets.env', '.env'].some(name => {
    try { return statSync(name).isFile() } catch { return false }
  })
  assert.equal(exists, false)
  const gitignore = readFileSync('.gitignore', 'utf8')
  assert.match(gitignore, /\.env/)
})
