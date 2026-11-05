'use client'

import type { ReactNode } from 'react'
import type { AsyncViewState } from '@/domain/async-view'
import { useTestHold } from '@/presentation/testing/useTestHold'
import { AsyncView } from './AsyncView'

/** Client half of PlaceholderView: derives loading from the test hold, else empty. */
export function HoldGate({ empty }: { empty: ReactNode }) {
  const held = useTestHold()
  const state: AsyncViewState<never> = held ? { status: 'loading' } : { status: 'empty' }
  return (
    <AsyncView state={state} empty={empty}>
      {() => null}
    </AsyncView>
  )
}
