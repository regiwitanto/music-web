# Contract: Settings Page (014)

Implements Story 2, FR-016 to FR-018 and D-014-1. It replaces 001 `contracts/theme.md` §5 (the Appearance controls).

## 1. Structure of `/settings`

```text
<h1 tabIndex={-1}>Settings</h1>          (unchanged from 001: focus target, title "Settings · <name>")
<TestFault />                            (unchanged test hook)
<ul aria-label="Settings sections">      (SettingsSectionList, server component)
  <li> Playback        · Coming soon </li>
  <li> Storage         · Coming soon </li>
  <li> Library & Data  · Coming soon </li>
  <li> Accessibility   · Coming soon </li>
  <li> About           · Coming soon </li>
</ul>
```

## 2. Rules

| Rule | Detail |
|---|---|
| Order | Exactly as above (D-014-1) |
| Row content | The section name (`text-body-strong`, `text-text`) and "Coming soon" (`text-caption`, `text-muted`), on one line on desktop and wrapping as needed at 320 px |
| Row styling | `bg-surface`, a 1 px `border-divider` border, `rounded-md`, padding of at least 12 px vertical and 16 px horizontal. No hover, pointer cursor, chevron or icon |
| Interactivity | None. No `a`, `button`, `input` or `tabindex` inside the list. Tab moves from the h1 region straight past the list |
| Accessible output | A list of 5 items, each read as "<name>, Coming soon". The rows are neither headings nor buttons |
| Not present | Appearance, Theme, Accent, any `fieldset` or radio, and any sticky section index |

## 3. `/settings/<section>`

Unchanged from 001 (D-001-2): any single segment, including `appearance`, shows "Nothing here yet" with Settings as the current destination. O7 (restricting the segment to implemented sections) stays with 010.

## 4. Test oracles

| ID | Oracle | Level |
|---|---|---|
| S-T1 | The list has 5 items, with labels in D-014-1 order, each containing "Coming soon" | component |
| S-T2 | The list has no focusable descendants (`a, button, input, select, textarea, [tabindex]`) | component |
| S-T3 | The page has no `fieldset`, `input[type=radio]`, and no text matching `/theme|accent|appearance/i` | component + E2E |
| S-T4 | `/settings/appearance` shows "Nothing here yet", with Settings as `aria-current="page"` | E2E |
| S-T5 | Keyboard: from the Settings h1, Tab reaches no row | E2E |
