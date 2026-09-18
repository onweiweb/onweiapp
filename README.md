# Sports Brand Commerce Platform — starter kit

This is the planning and tooling scaffold for the storefront and admin CMS —
not a runnable app yet. It's the foundation for Phase 1 (the actual app
code), which starts once the open decisions below are answered.

Everything under `docs/` and `CLAUDE.md` is a base version, not a frozen
spec — it's expected to keep evolving as real decisions land (see
`docs/OPEN_DECISIONS.md`) and as the schema and architecture get exercised in
Phase 1. Treat conflicts between an in-chat instruction and these docs as a
sign the docs need updating, not as something to silently override.

## Start here

1. Read `CLAUDE.md` — the ground rules for anyone, human or Claude, working
   in this repo.
2. Skim `docs/ARCHITECTURE.md` for the module layout and why it's split this way.
3. Skim `docs/DATABASE_SCHEMA.md` and `packages/database/prisma/schema.prisma`
   for the data model.
4. Read `docs/OPEN_DECISIONS.md` and confirm or override the defaults before
   Phase 1 starts.

## Using this with Claude Code

1. `git init && npm install` in this folder (or move its contents into a
   fresh repo first).
2. Run `npx husky init` once so the hooks in `.husky/` are wired up (it's
   safe to run even though the hook files already exist here).
3. Open Claude Code in the repo root — it picks up `CLAUDE.md` automatically.

Claude Code's built-in **Plan Mode** matches the "propose a plan, wait for
approval" workflow this project follows. `.claude/settings.json` sets it as
this project's default starting mode, and `CLAUDE.md` tells Claude to use it
for anything beyond a trivial fix. Press `Shift+Tab` at any time to cycle
permission modes if you need to leave it temporarily.

## What's in this scaffold

| Path | What it's for |
|---|---|
| `CLAUDE.md` | Project ground rules, tech stack, repo layout |
| `docs/ARCHITECTURE.md` | Module boundaries and request flow |
| `docs/DATABASE_SCHEMA.md` | The data model and why it's shaped this way |
| `docs/TEST_PLAN.md` | Required test cases by feature area |
| `docs/SECURITY_AND_DPDP.md` | Encryption, consent, data-subject rights |
| `docs/OPEN_DECISIONS.md` | What still needs a decision before Phase 1 |
| `packages/database/prisma/schema.prisma` | Draft DB schema |
| `.husky/` + root `package.json` scripts | Tests run before every commit, push, and build |
| `.github/workflows/ci.yml` | The CI gate that can't be bypassed locally |
| `.claude/settings.json` | Plan Mode as the project default, an auto-lint hook |
| `.claude/skills/` | Project-specific Claude Code skills (CMS copy rules, discount-engine conventions) |
