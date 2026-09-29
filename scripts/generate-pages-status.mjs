import { readFileSync, writeFileSync } from 'node:fs'

const [sourcePath, outPath, sourceSha, publishedAt] = process.argv.slice(2)
if (!sourcePath || !outPath || !sourceSha || !publishedAt) {
  throw new Error('usage: node generate-pages-status.mjs <source> <out> <sha> <published-at>')
}

const source = readFileSync(sourcePath, 'utf8')
const must = (re, label) => {
  const match = source.match(re)
  if (!match) throw new Error(`UGO Pages evidence missing: ${label}`)
  return match
}

const coverageMatch = must(/Quality Coverage is now\s+(\d+)\/(\d+)/i, 'quality coverage')
const blockersMatch = must(
  /exactly three blockers:\s*`([^\`]+)`,\s*`([^\`]+)`,\s*and\s*`([^\`]+)`/i,
  'final corporate audit blockers',
)
must(/META_AUDIT[^\n]*RED_TEAM[^\n]*DIGITAL_TWIN[^\n]*PASSED|PASSED[^\n]*META_AUDIT[^\n]*RED_TEAM[^\n]*DIGITAL_TWIN/i, 'D14 assurance pass set')
must(/CUSTOMER_1[^\n]*BLOCKED[^\n]*CUSTOMER_ACCEPTANCE_NOT_APPROVED/i, 'Customer #1 blocked evidence')

const status = {
  title: 'UGO Observatory',
  source: sourcePath,
  source_sha: sourceSha,
  published_at_utc: publishedAt,
  environment: 'UGO TEST / GitHub Pages',
  production: 'PROTECTED',
  production_ready: false,
  quality_coverage: {
    covered: Number(coverageMatch[1]),
    total: Number(coverageMatch[2]),
  },
  assurance: [
    { name: 'META_AUDIT', status: 'PASSED' },
    { name: 'RED_TEAM', status: 'PASSED' },
    { name: 'DIGITAL_TWIN', status: 'PASSED' },
  ],
  corporate_final_audit: {
    status: 'BLOCKED',
    blockers: blockersMatch.slice(1, 4),
  },
  customer_1: 'BLOCKED',
  customer_1_reason: 'CUSTOMER_ACCEPTANCE_NOT_APPROVED',
}

writeFileSync(outPath, JSON.stringify(status, null, 2) + '\n')
console.log(`UGO Pages evidence snapshot generated · coverage ${status.quality_coverage.covered}/${status.quality_coverage.total} · blockers ${status.corporate_final_audit.blockers.length}`)
