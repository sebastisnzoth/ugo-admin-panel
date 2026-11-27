#!/usr/bin/env node
// Verifies that a pull request can be rolled back completely and provably.
//
// The previous rollback note in this repository said `git revert <last sha>`,
// which is wrong: a multi-commit PR needs every commit reverted, in reverse
// order, or the tree is left half-changed. This script proves the real change
// set and the real restore, inside a throwaway worktree, without touching the
// working tree, the branch, or any remote.
//
// Usage:
//   node scripts/hive/rollback-verify.mjs --base <sha> --head <sha> [--out file.json]
//
// Exit code 1 when the revert does not restore the base tree exactly.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_BASE = 'd2fe61e9ecc85e491d3839cb6885d3802d9c06de'

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function arg(argv, name, fallback) {
  const index = argv.indexOf(name)
  return index === -1 ? fallback : argv[index + 1]
}

/**
 * Reverts `base..head` inside an isolated worktree and reports whether the base
 * tree comes back byte for byte. Nothing is pushed and the caller's branch, index
 * and working tree are never written to.
 */
export function verifyRollback(root, base, head) {
  const commits = git(root, ['rev-list', '--reverse', `${base}..${head}`]).split('\n').filter(Boolean)
  if (commits.length === 0) throw new Error(`no commits between ${base} and ${head}`)

  const merges = git(root, ['rev-list', '--merges', `${base}..${head}`]).split('\n').filter(Boolean)
  const files = git(root, ['diff', '--name-status', base, head]).split('\n').filter(Boolean)
  const baseTree = git(root, ['rev-parse', `${base}^{tree}`])

  const scratch = mkdtempSync(join(tmpdir(), 'ugo-rollback-'))
  const worktree = join(scratch, 'tree')
  let treeRestored = false
  let revertSha = null
  let conflict = null

  try {
    git(root, ['worktree', 'add', '--detach', '--quiet', worktree, head])
    git(worktree, ['-c', 'user.email=rollback@ugo.test', '-c', 'user.name=Rollback Verify', 'revert', '--no-edit', `${base}..${head}`])
    revertSha = git(worktree, ['rev-parse', 'HEAD'])
    const restoredTree = git(worktree, ['rev-parse', 'HEAD^{tree}'])
    treeRestored = restoredTree === baseTree
  } catch (error) {
    conflict = String(error.stderr || error.message).slice(0, 2000)
  } finally {
    try {
      git(root, ['worktree', 'remove', '--force', worktree])
    } catch {
      /* best effort: the scratch directory is removed below regardless */
    }
    rmSync(scratch, { recursive: true, force: true })
  }

  return {
    check: 'HIVE_PR_ROLLBACK_VERIFIED',
    base,
    head,
    base_tree: baseTree,
    commits,
    merge_commits: merges,
    changed_files: files.map(line => {
      const [status, ...paths] = line.split('\t')
      return { status, path: paths.join(' -> ') }
    }),
    revert_commit: revertSha,
    tree_restored: treeRestored,
    conflict,
    // A PR made of plain commits is reverted commit by commit. A merge commit
    // would need `-m 1` instead, so the procedure differs: report it, never guess.
    procedure: merges.length
      ? `git revert -m 1 <merge-sha>  # or: git revert ${commits.slice().reverse().join(' ')}`
      : `git revert ${commits.slice().reverse().join(' ')}`,
    destructive_commands_used: false,
    // A commit cannot contain the hash of itself, so the commit that only adds this
    // evidence file is by construction excluded from `commits`. It carries no code
    // and must still be part of the real revert: re-run this verifier at rollback time.
    note: 'rango verificado en el momento de generar la evidencia; volver a ejecutar antes de revertir',
    verdict: treeRestored && conflictsFree(conflict) ? 'PASS' : 'FAIL',
  }
}

const conflictsFree = conflict => conflict === null

function main(argv) {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
  const base = arg(argv, '--base', DEFAULT_BASE)
  const head = arg(argv, '--head', 'HEAD')
  const evidence = verifyRollback(root, base, head)
  const json = `${JSON.stringify(evidence, null, 2)}\n`
  const out = arg(argv, '--out', null)
  if (out) {
    const target = resolve(root, out)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, json)
  }
  console.log(`commits to revert: ${evidence.commits.length} · files: ${evidence.changed_files.length}`)
  console.log(`procedure: ${evidence.procedure}`)
  console.log(`tree restored to base: ${evidence.tree_restored ? 'YES' : 'NO'} · verdict: ${evidence.verdict}`)
  if (evidence.conflict) console.error(evidence.conflict)
  if (evidence.verdict !== 'PASS') process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main(process.argv.slice(2))
