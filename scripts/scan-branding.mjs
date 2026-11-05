#!/usr/bin/env node
/*
 * Branding and test-hook scan (SC-006, FR-041; ui-shell.md §7.2; research R10, R13).
 *
 * 1. Forbidden third-party names must not appear in the built pages, the client
 *    bundle, public assets or the source.
 * 2. A normal production build (made WITHOUT NEXT_PUBLIC_TEST_HOOKS) must not
 *    contain any test-hook global. Against a test-hooks build this check fails
 *    by design.
 *
 * Exits 1 on any match, or when .next/ is missing.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()

// Built from fragments so this file never matches itself.
const FORBIDDEN_NAMES = [
  ['Metro', 'list'],
  ['You', 'Tube'],
  ['Spot', 'ify'],
  ['Apple', ' ', 'Music'],
].map((parts) => parts.join(''))

const TEST_HOOK_STRINGS = [
  ['__TEST', '_FAULTS__'],
  ['__TEST', '_RELEASE__'],
  ['__SHELL', '_MOUNTS__'],
  ['__sh', 'ell__'],
].map((parts) => parts.join(''))

function* walk(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) yield* walk(path)
    else if (stats.isFile()) yield path
  }
}

function scan(files, needles, { caseInsensitive }) {
  const hits = []
  for (const file of files) {
    let text = readFileSync(file, 'latin1')
    if (caseInsensitive) text = text.toLowerCase()
    for (const needle of needles) {
      const n = caseInsensitive ? needle.toLowerCase() : needle
      if (text.includes(n)) hits.push({ file: relative(root, file), needle })
    }
  }
  return hits
}

const nextDir = join(root, '.next')
if (!existsSync(nextDir)) {
  console.error('scan-branding: .next/ is missing. Run `pnpm build` (without NEXT_PUBLIC_TEST_HOOKS) first.')
  process.exit(1)
}

const builtPages = [...walk(join(nextDir, 'server', 'app'))].filter((f) => /\.(html|rsc|body|meta)$/.test(f))
const staticFiles = [...walk(join(nextDir, 'static'))]
const serverFiles = [...walk(join(nextDir, 'server'))]
const publicFiles = [...walk(join(root, 'public'))]
const sourceFiles = [...walk(join(root, 'src'))]

const brandHits = scan([...builtPages, ...staticFiles, ...publicFiles, ...sourceFiles], FORBIDDEN_NAMES, {
  caseInsensitive: true,
})
const hookHits = scan([...staticFiles, ...serverFiles], TEST_HOOK_STRINGS, { caseInsensitive: false })

for (const hit of brandHits) console.error(`forbidden name "${hit.needle}" in ${hit.file}`)
for (const hit of hookHits) console.error(`test hook "${hit.needle}" in ${hit.file} (is this a test-hooks build?)`)

const scanned = builtPages.length + staticFiles.length + publicFiles.length + sourceFiles.length
if (brandHits.length > 0 || hookHits.length > 0) {
  console.error(`scan-branding: FAILED (${brandHits.length} name match(es), ${hookHits.length} test-hook match(es)).`)
  process.exit(1)
}
console.log(
  `scan-branding: OK. ${scanned} files checked for forbidden names; ${staticFiles.length + serverFiles.length} build files checked for test hooks.`,
)
