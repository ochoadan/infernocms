# Contributing to InfernoCMS

Thanks for your interest. This guide covers local setup and the development loop.

## Requirements

- Node.js 18+
- pnpm 9+ (the repo is a pnpm workspace)

## Setup

```bash
git clone https://github.com/ochoadan/infernocms.git
cd infernocms
pnpm install
```

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the basic example — API on `:4000`, admin preview on `:4001` |
| `pnpm build` | Builds `packages/core` (tsc) and `packages/admin` (Next.js) |
| `pnpm build:docs` | Builds the VitePress docs site |
| `pnpm test` | Runs `packages/core` tests (vitest) |

## Workspace layout

```
packages/
  core/     # The published npm package (`infernocms`) — schema, DB, REST API, CLI
  admin/    # Preview admin UI (Next.js 15 + shadcn/ui) — not on npm in 0.1.0
  docs/     # VitePress docs site
examples/
  basic/    # Reference content.config.ts exercising every field type
```

## Working on core

```bash
pnpm --filter infernocms test          # run tests
pnpm --filter infernocms test:watch    # watch mode
pnpm --filter infernocms build         # tsc to dist/
```

Tests live next to source as `*.test.ts`. They are excluded from the published `dist/`.

## Working on admin

```bash
pnpm --filter @infernocms/admin dev    # next dev on :4001 (assumes API on :4000)
pnpm --filter @infernocms/admin build  # production build
```

As of `0.1.0`, admin TypeScript validation runs on every build (`tsc --noEmit` clean under `strict: true`). ESLint isn't configured yet — `0.2.0` will add a config. PRs that re-enable suppressions to "make the build pass" will be rejected; fix the underlying issue instead.

## Pull requests

- Branch from `main`
- Keep changes focused — one logical change per PR
- Update [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]` for user-visible changes
- For new features, add a test to `packages/core` if the change is in core
- Run `pnpm build && pnpm test` before pushing

## Reporting bugs

Open an issue with:
- A minimal `content.config.ts` that reproduces the problem
- The command you ran and the output you saw
- Your Node version and OS

## License

By contributing, you agree your contributions will be licensed under [AGPL-3.0-only](LICENSE).
