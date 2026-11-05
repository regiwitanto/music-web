/**
 * Shell mount counters (ui-shell.md §7.1; research R10). Test-only: present only in a
 * build made with NEXT_PUBLIC_TEST_HOOKS=1. The flag is checked with a literal
 * comparison inside the function body, so Next inlines it and a normal production
 * build removes the whole body, including the global name (ui-shell.md §7.2).
 */

export type ShellComponent = 'shell' | 'sidebar' | 'bottomNav' | 'dock'

declare global {
  interface Window {
    __SHELL_MOUNTS__?: Record<ShellComponent, number>
  }
}

/** Call from a mount-only effect. Each counter must read 1 per document. */
export function recordShellMount(component: ShellComponent): void {
  if (process.env.NEXT_PUBLIC_TEST_HOOKS === '1') {
    const mounts = (window.__SHELL_MOUNTS__ ??= { shell: 0, sidebar: 0, bottomNav: 0, dock: 0 })
    mounts[component] += 1
  }
}
