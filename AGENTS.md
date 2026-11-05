<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SDD Agent Workflow

This project uses Spec-Driven Development with GitHub Spec Kit.
- Principles: [.specify/memory/constitution.md](.specify/memory/constitution.md)
- Feature index: [specs/README.md](specs/README.md)
- Gates: [docs/quality-gates.md](docs/quality-gates.md)
- Baseline docs: [docs/](docs/). Each doc's "Owns" line says which topics it is authoritative for.

## Stages

| Stage | Command | Gate after it |
|---|---|---|
| Constitution | `/speckit-constitution` | Owner approves amendments |
| Specify | `/speckit-specify` | — |
| Clarify (when needed) | `/speckit-clarify` | **HUMAN: approve spec** |
| Plan | `/speckit-plan` | **HUMAN: approve plan / architecture** |
| Tasks | `/speckit-tasks` | — |
| Analyze | `/speckit-analyze` (no CRITICAL findings) | **HUMAN: approve start of implementation** |
| Implement | `/speckit-implement` | — |
| Converge | `/speckit-converge` (append unbuilt work as tasks, then implement) | — |
| Review | Owner review + `/code-review` | **HUMAN: accept feature** |

Work on one feature at a time: the one in `.specify/feature.json`, in `specs/README.md` order.

## Rules

1. **Read first.** Before coding, read the constitution, the feature's `spec.md`, `plan.md` and `tasks.md`, and the docs sections they cite.
2. **Inspect only relevant files.** Don't sweep the codebase. Read what the current task touches.
3. **Explain before changing.** State the files you will change and why. Do this before editing.
4. **One focused task at a time.** Finish, verify and report it before starting the next.
5. **Follow the approved architecture.** Follow the layers, folder layout and ADRs in `docs/architecture.md`. If you need a deviation, propose it. Don't just do it.
6. **Verify.** Run the checks relevant to the change: typecheck, lint, unit, integration, E2E, axe.
7. **Report actual results.** Give the command, the outcome and the failures. Anything not executed is reported as **not run**. Never claim a pass without evidence.
8. **Keep specs true.** If a requirement changes, update the spec and the owning doc in the same change.
9. **Never silently expand scope.** Record a missing decision as a question or `[NEEDS CLARIFICATION]`. Never invent one. Extras are proposed in writing, not built.
10. **Stop at human gates.** Don't plan an unapproved spec, generate tasks from an unapproved plan, or implement without approval.

## Never

- Modify `../metrolist-reference`, or copy its Kotlin code, schema, strings, icons or assets.
- Add backend infrastructure: API routes, server actions, databases, auth or proxies.
- Integrate unofficial YouTube or YouTube Music access, or any stream-extraction or bypass mechanism.
- Change the four destinations (Home, Explore, Library, Settings) or make Now Playing a destination.
- Put third-party brand names in public-facing UI. Use the display-name constant.
- Add a dependency without a justification line in `docs/architecture.md` §2.
- Commit or push unless the owner asks.
