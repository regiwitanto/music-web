# Data Model: Single Permanent Visual Identity (014)

**Feature**: [spec.md](spec.md) · **Research**: [research.md](research.md)

This feature has no user data and no new persisted state. It has one static design entity and one obsolete device value that it deletes.

## 1. Visual identity (static, not user data)

A fixed set of named colour roles. It has no variants, no versions and no user input. The single source of truth is the `:root` block in `src/app/globals.css`. The names and values are fixed in [contracts/identity.md §1](contracts/identity.md#1-tokens).

| Field | Type | Rule |
|---|---|---|
| token name | CSS custom property (`--bg` …) | Unique; part of the contract |
| value | `#RRGGBB` (opaque) or `var(--x)` plus an opacity (overlays, scrim) | The five K1/K2 values are fixed. The others are R2 values |
| pairs | foreground role × background role × minimum ratio | Every pair in research R2 meets its minimum (FR-009 to FR-011) |

**Invariants** (checked by `tests/unit/tokens-contrast.test.ts`):
- I1: exactly one definition block (`:root`), with no `data-theme` or `data-accent` variants and no `prefers-color-scheme` query;
- I2: `color-scheme: dark`;
- I3: `--bg` ≠ `#000000`;
- I4: every R2 pair meets its minimum;
- I5: the five approved values equal K1/K2 exactly.

**Lifecycle**: none. A value changes only through a design-system §2 amendment, which reruns I1–I5.

## 2. Obsolete appearance preference (device-local, delete-only)

The value written by 001 (`contracts/theme.md` §1 in 001).

| Field | Value |
|---|---|
| Medium | `window.localStorage` |
| Key | `mp.appearance` |
| Shape (as written by 001) | `{"v":1,"theme":"…","accent":"…"}`. Any content, valid or not, is treated the same |

**State transitions**: `present (any content)` → `absent`, on the first client mount of the shell after 014 ships. `absent` → `absent` (no-op). If storage is blocked, it stays whatever it is, and no error surfaces.

**Rules**:
- The value is never read, parsed or applied (FR-019).
- Removal never throws (research R6).
- Nothing in 014 writes to `localStorage`.

## 3. Settings section rows (static UI content)

| Order | Label | Delivered by |
|---|---|---|
| 1 | Playback | 010 (SET-03) |
| 2 | Storage | 009 (SET-07, PLAT-06) |
| 3 | Library & Data | 010 (SET-04) |
| 4 | Accessibility | 012 (SET-06) |
| 5 | About | 010 (SET-05) |

Each row is plain text, the label plus "Coming soon", and has no behaviour (D-014-1, FR-017).
