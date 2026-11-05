import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

/*
 * Proves the layer rules in eslint.config.mjs bite (tasks.md T009, research R12,
 * quickstart §5). Snippets are linted in memory under a filePath in each layer.
 */

const eslint = new ESLint({ overrideConfigFile: 'eslint.config.mjs' })

async function ruleIds(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  if (!result) throw new Error(`no lint result for ${filePath}`)
  // A parse error would make the "allowed" cases pass vacuously, so fail loudly.
  const fatal = result.messages.find((m) => m.fatal || m.ruleId === null)
  if (fatal) throw new Error(`fixture did not parse (${filePath}): ${fatal.message}`)
  return result.messages.map((m) => m.ruleId ?? '')
}

const RESTRICTED = '@typescript-eslint/no-restricted-imports'

describe('domain layer', () => {
  it('rejects a React import', async () => {
    expect(await ruleIds('src/domain/fixture.ts', "import { useState } from 'react'\nexport const x = useState\n")).toContain(RESTRICTED)
  })

  it('rejects browser globals', async () => {
    expect(await ruleIds('src/domain/fixture.ts', 'export const w = window.innerWidth\n')).toContain('no-restricted-globals')
  })

  it('rejects a Dexie import', async () => {
    expect(await ruleIds('src/domain/fixture.ts', "import Dexie from 'dexie'\nexport const d = Dexie\n")).toContain(RESTRICTED)
  })
})

describe('presentation and routes', () => {
  it('rejects a runtime value from the domain', async () => {
    expect(
      await ruleIds('src/presentation/fixture.tsx', "import { DESTINATIONS } from '@/domain/navigation'\nexport const d = DESTINATIONS\n"),
    ).toContain(RESTRICTED)
  })

  it('allows a type-only import from the domain', async () => {
    expect(
      await ruleIds('src/presentation/fixture.tsx', "import type { DestinationId } from '@/domain/navigation'\nexport type D = DestinationId\n"),
    ).not.toContain(RESTRICTED)
  })

  it('rejects an infrastructure import', async () => {
    expect(
      await ruleIds(
        'src/presentation/fixture.tsx',
        "import { LocalStorageAppearanceRepository } from '@/infrastructure/platform/appearance-storage'\nexport const r = LocalStorageAppearanceRepository\n",
      ),
    ).toContain(RESTRICTED)
  })

  it('rejects reading the test-hook flag outside src/presentation/testing', async () => {
    expect(
      await ruleIds('src/presentation/fixture.tsx', "export const on = process.env.NEXT_PUBLIC_TEST_HOOKS === '1'\n"),
    ).toContain('no-restricted-syntax')
  })

  it('allows reading the test-hook flag inside src/presentation/testing', async () => {
    expect(
      await ruleIds('src/presentation/testing/fixture.ts', "export const on = process.env.NEXT_PUBLIC_TEST_HOOKS === '1'\n"),
    ).not.toContain('no-restricted-syntax')
  })

  it('rejects importing test fakes into app code', async () => {
    expect(
      await ruleIds(
        'src/app/fixture.tsx',
        "import { InMemoryAppearanceRepository } from '@/test/fakes/InMemoryAppearanceRepository'\nexport const f = InMemoryAppearanceRepository\n",
      ),
    ).toContain(RESTRICTED)
  })

  it('rejects parent-relative imports that could bypass the layer rules', async () => {
    expect(
      await ruleIds('src/presentation/fixture.tsx', "import { x } from '../infrastructure/platform/document-theme'\nexport const y = x\n"),
    ).toContain(RESTRICTED)
  })
})

describe('application and infrastructure', () => {
  it('rejects an application file importing presentation', async () => {
    expect(
      await ruleIds('src/application/fixture.ts', "import { AppShell } from '@/presentation/components/shell/AppShell'\nexport const a = AppShell\n"),
    ).toContain(RESTRICTED)
  })

  it('rejects an application file other than container.ts importing infrastructure', async () => {
    expect(
      await ruleIds('src/application/fixture.ts', "import { x } from '@/infrastructure/platform/document-theme'\nexport const y = x\n"),
    ).toContain(RESTRICTED)
  })

  it('allows container.ts to import infrastructure', async () => {
    expect(
      await ruleIds('src/application/container.ts', "import { x } from '@/infrastructure/platform/document-theme'\nexport const y = x\n"),
    ).not.toContain(RESTRICTED)
  })

  it('allows infrastructure to import types from application ports, and nothing else', async () => {
    expect(
      await ruleIds('src/infrastructure/fixture.ts', "import type { AppearanceRepository } from '@/application/ports'\nexport type R = AppearanceRepository\n"),
    ).not.toContain(RESTRICTED)
    expect(
      await ruleIds('src/infrastructure/fixture.ts', "import { container } from '@/application/container'\nexport const c = container\n"),
    ).toContain(RESTRICTED)
  })
})
