#!/usr/bin/env node
// UGO Hive ⇄ UGO Arena isolation guard.
//
// Purpose: prove, mechanically and offline, that UGO Arena does not depend on
// UGO Hive being reachable. The check is static (source scan), deterministic and
// has no network access. It does NOT replace a runtime chaos test; see
// docs/ugo-hive/HIVE_ISOLATION.md for the accepted limitations.
//
// Rules (each violation fails the gate):
//   HIVE_IN_BOOT_PATH          Hive referenced by an Arena boot file
//   HIVE_CALL_OUTSIDE_REVIEW   network call to Hive outside the reviewed module
//   HIVE_CALL_UNBOUNDED        Hive network call without a bounded abort/timeout
//   HIVE_POLLING               interval-driven Hive activity (aggressive polling)
//   SECRET_IN_CLIENT           privileged credential name inside the browser bundle
//   HIVE_REFERENCE_UNREVIEWED  Hive reference in a file not listed for review

import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, relative, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

export const RULE = Object.freeze({
  BOOT: 'HIVE_IN_BOOT_PATH',
  OUTSIDE_REVIEW: 'HIVE_CALL_OUTSIDE_REVIEW',
  UNBOUNDED: 'HIVE_CALL_UNBOUNDED',
  POLLING: 'HIVE_POLLING',
  SECRET: 'SECRET_IN_CLIENT',
  UNREVIEWED: 'HIVE_REFERENCE_UNREVIEWED',
})

// Arena files that must never become dependants of Hive: entrypoints and the
// root application shell. If Hive is down, these must still boot and render.
export const BOOT_FILES = Object.freeze(['index.html', 'src/main.tsx', 'src/App.tsx'])

// Exactly one client module is authorised to talk to Hive, and only inside the
// Super Admin gate. Adding a file here is a reviewed, deliberate act.
export const HIVE_CLIENT_ALLOWLIST = Object.freeze([
  'src/mvp/HiveConsole.tsx',
  'src/mvp/hiveCatalog.ts', // data-only canonical catalog; no network calls
  // Cliente del endpoint autenticado de Hive TEST: sólo se usa dentro de la consola Super
  // Admin, manda el token de la sesión y tiene cota propia (AbortSignal.timeout).
  'src/mvp/hiveConsoleApi.ts',
])

const RUNTIME_ROOTS = Object.freeze(['src', 'api'])
// Only this tree is shipped to the browser. `api/` and `src/server/` are
// server-side code that already holds its own privileged credentials, so the
// credential rule stops there.
const CLIENT_ROOTS = Object.freeze(['src/'])
const SERVER_ONLY_PREFIXES = Object.freeze(['src/server/'])
const RUNTIME_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.html'])

const HIVE_TOKENS = [
  /ugo-hive/i,
  /ugo_hive/i,
  /onrender\.com/i,
  /\bhive_[a-z0-9_]+/i,
  /\bHIVE_[A-Z0-9_]+/,
]
const SECRET_TOKENS = [
  /SUPABASE_SERVICE_ROLE_KEY/,
  /SERVICE_ROLE_KEY/,
  /OPENROUTER_API_KEY/,
  /FREEAPI_(?:HIVE_TOKEN|DB_BACKUP_KEY|TOKEN)/,
  /\bHIVE_TOKEN\b/,
]
const NETWORK_CALL = /\b(functions\.invoke|fetch)\s*[<(]/
const BOUNDED_NETWORK = [/AbortSignal\.timeout\s*\(/, /new AbortController\s*\(\s*\)[\s\S]*?\.abort\s*\(/, /\btimeout\s*:\s*\d+/]
const POLLING = [/\bsetInterval\s*\(/, /\brequestAnimationFrame\s*\(\s*(?:function|\()/]

const has = (source, patterns) => patterns.some(pattern => pattern.test(source))

/** True when the file mentions Hive at all. */
export function referencesHive(source) {
  return has(source, HIVE_TOKENS)
}

/**
 * Pure rule engine: one file in, findings out. Exported so the gate itself can
 * be unit-tested instead of being trusted on reputation.
 */
export function scanSource(relPath, source) {
  const findings = []
  const push = (rule, message) => findings.push({ rule, file: relPath, message })

  const hive = referencesHive(source)
  const clientSide = CLIENT_ROOTS.some(root => relPath.startsWith(root)) && !SERVER_ONLY_PREFIXES.some(prefix => relPath.startsWith(prefix))
  if (clientSide && has(source, SECRET_TOKENS)) {
    push(RULE.SECRET, 'privileged credential name present in the browser bundle')
  }
  if (!hive) return findings

  if (BOOT_FILES.includes(relPath)) {
    push(RULE.BOOT, 'Arena boot path references Hive; Arena must start without Hive')
  }
  const reviewed = HIVE_CLIENT_ALLOWLIST.includes(relPath)
  if (!reviewed) {
    push(RULE.UNREVIEWED, 'Hive reference outside the reviewed isolation module')
  }
  if (NETWORK_CALL.test(source) && !reviewed) {
    push(RULE.OUTSIDE_REVIEW, 'network call to Hive outside the reviewed isolation module')
  }
  if (reviewed && NETWORK_CALL.test(source) && !has(source, BOUNDED_NETWORK)) {
    push(RULE.UNBOUNDED, 'Hive network call has no bounded abort/timeout')
  }
  if (reviewed && has(source, POLLING)) {
    push(RULE.POLLING, 'interval-driven Hive activity; Hive must be event-driven and on demand')
  }
  return findings
}

function walk(root, dir, out = []) {
  const absolute = resolve(root, dir)
  if (!existsSync(absolute)) return out
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = relative(root, resolve(absolute, entry.name))
    if (entry.isDirectory()) walk(root, child, out)
    else if (entry.isFile() && RUNTIME_EXT.has(extname(entry.name))) out.push(child)
  }
  return out
}

function readGitSha(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return 'UNKNOWN'
  }
}

/** Full repository scan. Returns the evidence object that is written to disk. */
export function auditRepository(root, now = new Date()) {
  const files = [...RUNTIME_ROOTS.flatMap(dir => walk(root, dir)), ...BOOT_FILES.filter(file => existsSync(resolve(root, file)))].filter(file => {
    try {
      return statSync(resolve(root, file)).isFile()
    } catch {
      return false
    }
  })

  const findings = []
  const hiveFiles = []
  for (const file of files) {
    const source = readFileSync(resolve(root, file), 'utf8')
    if (referencesHive(source)) hiveFiles.push(file)
    findings.push(...scanSource(file, source))
  }

  return {
    check: 'HIVE_ARENA_ISOLATION_STATIC',
    scope: 'static source scan of Arena runtime (src, api); no network, no database',
    limitations: [
      'does not execute Arena at runtime; the Hive-down chaos test remains a separate gate',
      'cannot see Hive connectivity failures caused by DNS, TLS or platform quotas',
      'detects the credential names listed in SECRET_TOKENS only',
    ],
    generated_at: now.toISOString(),
    repo_sha: readGitSha(root),
    scanned_files: files.length,
    hive_referencing_files: hiveFiles,
    boot_files_scanned: BOOT_FILES.filter(file => files.includes(file)),
    reviewed_modules: [...HIVE_CLIENT_ALLOWLIST],
    findings,
    verdict: findings.length === 0 ? 'PASS' : 'FAIL',
  }
}

function main(argv) {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
  const outIndex = argv.indexOf('--out')
  const evidence = auditRepository(root)
  const json = `${JSON.stringify(evidence, null, 2)}\n`

  if (outIndex !== -1) {
    const target = resolve(root, argv[outIndex + 1])
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, json)
  }

  if (argv.includes('--json')) {
    process.stdout.write(json)
  } else {
    console.log(`UGO Hive isolation guard · ${evidence.repo_sha.slice(0, 12)} · ${evidence.scanned_files} runtime files`)
    console.log(`Hive-referencing files: ${evidence.hive_referencing_files.join(', ') || 'none'}`)
    for (const finding of evidence.findings) console.error(`  ${finding.rule} · ${finding.file} · ${finding.message}`)
    console.log(`verdict: ${evidence.verdict}`)
  }
  if (evidence.verdict !== 'PASS') process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main(process.argv.slice(2))
