# Contract: Theme and Accent

Implements FR-018 to FR-023, Story 4 and SC-004/SC-005. Values come from [design-system.md §2](../../../docs/design-system.md#2-color). This contract fixes names and behaviour only, not new values.

## 1. Storage

| Item | Value |
|---|---|
| Medium | `window.localStorage` (sole store in 001; a pre-paint mirror from 002 on, per ADR-009) |
| Key | `mp.appearance` |
| Value | `{"v":1,"theme":"system|light|dark|oled","accent":"violet|blue|teal|green|amber|orange|rose|red"}` |
| Read | Pre-paint bootstrap script, then `LocalStorageAppearanceRepository.load()` on the client |
| Write | `setAppearance` only. It never throws: storage errors are swallowed and the change still applies for the session |
| Invalid | Parsed by `parseAppearance`. Field-wise fallback to `system` / `violet` ([data-model §3](../data-model.md#3-appearancepreference)) |

## 2. `<html>` attributes

| Attribute | Server-rendered default | Set by |
|---|---|---|
| `data-theme` | `system` | Bootstrap script (pre-paint), `setAppearance`, dev re-apply effect |
| `data-accent` | `violet` | same |

`<html>` carries `suppressHydrationWarning`, because the script changes attributes before hydration (the pattern in the bundled `preventing-flash-before-hydration.md`).

## 3. Bootstrap script behaviour

*(This section covers the theme bootstrap. For the Appearance selection script, see §5 and research R15.)*

`buildThemeBootstrapScript(): string` returns a self-contained ES5 IIFE, with no imports. It:
1. runs entirely inside a `try { … } catch (e) {}`;
2. reads `localStorage.getItem('mp.appearance')` and `JSON.parse`s it;
3. sets `data-theme` only if the stored value is in the embedded `THEMES` list, and `data-accent` only if it is in `ACCENTS`;
4. otherwise leaves the attributes untouched;
5. never throws, never writes storage, and never touches anything except those two attributes.

It is placed as the **first child of `<head>`** in `src/app/layout.tsx`, and is also embedded in `src/app/global-error.tsx`.

## 4. CSS tokens

**Neutral tokens** are set per theme selector:
- `:root[data-theme="light"]`
- `:root[data-theme="dark"]`
- `:root[data-theme="oled"]`
- `:root[data-theme="system"]`, which takes the Light values by default and the Dark values inside `@media (prefers-color-scheme: dark)`

The tokens are:
- `--bg`
- `--surface`
- `--raised`
- `--text`
- `--text-muted`
- `--border-strong`
- `--divider`
- `--danger`
- `color-scheme`

**Accent inputs** are set per `:root[data-accent="<name>"]`:
- `--accent-l`
- `--on-accent-l`
- `--accent-d`
- `--on-accent-d`

**Resolved accent:** `--accent` and `--on-accent` take the `-l` values under the light palette and the `-d` values under dark or OLED. That includes `system` under the dark media query.

**Tailwind semantic utilities** (via `@theme inline`):

| Group | Utilities |
|---|---|
| Backgrounds | `bg-bg`, `bg-surface`, `bg-raised`, `bg-accent` |
| Text | `text-text`, `text-muted`, `text-accent`, `text-on-accent`, `text-danger` |
| Borders and rings | `border-strong`, `border-divider`, `ring-accent`, `outline-accent` |

**Rule:** components use only these semantic utilities. No raw hex values and no Tailwind palette colours (`zinc-*`, etc.) may appear in `src/presentation` or `src/app` [FR-023]. A unit test greps those folders for `#[0-9a-f]{3,8}` and the default palette class names, allowing only `globals.css`.

## 5. Appearance controls (Settings → Appearance)

| Control | Role and markup | Accessible names |
|---|---|---|
| Theme | `fieldset` + `legend` "Theme"; 4 native `input[type=radio]` (`appearance: none`, custom-drawn) with the same `name`, each wrapped in a label carrying `data-option-theme="<value>"`. Each option has a decorative, `aria-hidden` preview swatch; System's swatch is half Light, half Dark | `System`, `Light`, `Dark`, `OLED Black` |
| Accent | `fieldset` + `legend` "Accent"; 8 native radios drawn as colour swatches with visible text labels, each carrying `data-option-accent="<value>"` | `Violet`, `Blue`, `Teal`, `Green`, `Amber`, `Orange`, `Rose`, `Red` |

**Behaviour**
- **Keyboard.** Arrow keys move the selection within a group (native radio behaviour), and each move applies immediately [FR-019].
- **No Save button.**
- **The persisted selection is shown from first paint (research R15).** A group never renders without a selection.
  - **Visible indicator.** CSS draws it from the `<html>` attributes: `:root[data-theme="x"] [data-option-theme="x"]` and `:root[data-accent="y"] [data-option-accent="y"]`. It does not use `:checked`.
  - **Checked state.** An inline script placed immediately after the fieldsets (`buildAppearanceSelectionScript()`, emitted with the `InlineScript` helper) sets `.checked` on the inputs that match those attributes. It runs during parsing, before hydration or any interaction.
  - **Hydration.** The inputs are controlled. On the client the store's initial value is read from `<html>`, so React's hydration props equal the DOM. Only the inputs carry `suppressHydrationWarning`, because the server renders no `checked` attribute.
  - **System.** System stays selected when the OS colour scheme changes. Only the palette changes.

## 6. Observable guarantees (test oracles)

| # | Guarantee |
|---|---|
| T1 | After a radio `change` event, before the next animation frame, `getComputedStyle(document.body).backgroundColor` equals the new theme's `--bg`. The nav active item's colour equals the new `--accent`. Measured by clicking the radio and reading the styles inside a single `page.evaluate`, with no `await` between them [FR-019] |
| T2 | After a reload, `data-theme` and `data-accent` equal the last selection [FR-020] |
| T3 | With JS chunks held until explicitly released (no timeout), and after verifying hydration has not happened (chunk requests held, none fulfilled), on 10 cold loads per theme the first observable body background equals the persisted theme's `--bg` [FR-021, SC-004] |
| T4 | With `theme=system`, `emulateMedia({colorScheme})` switches the background live [FR-022] |
| T5 | With `theme=oled`, the body background is `rgb(0, 0, 0)` [Story 4 scenario 5] |
| T6 | If `localStorage` throws, switching still works, and a reload shows System + Violet with no console error from app code [edge case] |
| T7 | A corrupt stored value gives System + Violet. A partially valid value keeps its valid field [edge case] |
| T8 | The token-contrast unit test passes for every theme × accent combination [FR-023, SC-005] |
| T9 | Cold load of `/settings` with JS chunks held until explicitly released, after verifying hydration has not happened: exactly one theme radio and one accent radio have `checked === true`, they match storage, and their selected indicator is drawn. Both stay checked after hydration, with no hydration error or warning from app code [R15] |
| T10 | Client navigation to `/settings`: the correct radios are checked on first render [R15] |
| T11 | `theme=system` with the OS scheme toggled: the System radio stays checked while the palette changes [R15, FR-022] |
| T12 | `buildAppearanceSelectionScript()` in a `vm` sandbox: for all 32 combinations exactly one radio per group ends up checked; missing attributes give System + Violet; it never throws [R15] |
