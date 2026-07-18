# Documentation and Repository Debt

This register records verified documentation and repository-hygiene issues. It is not a
deployment checklist; release-specific actions remain in `PENDING-DEPLOY.md`.

## High priority

### Tracked environment files require security cleanup

Both `.env` and `.env.local` are currently tracked by Git. Their contents were deliberately
not inspected during this audit. Treat any credentials that may ever have appeared in those
files or repository history as potentially exposed.

Required remediation:

1. Inventory affected credentials out of band without copying secrets into issues or logs.
2. Rotate database, admin, JWT, email/OAuth, GitHub, push, cron, and other credentials as
   applicable; rotation is required even if history is later rewritten.
3. Remove the files from the Git index while retaining the intended local copies, and verify
   ignore rules prevent them being staged again.
4. Decide whether repository exposure warrants a coordinated history rewrite with
   `git filter-repo` or BFG. A history rewrite requires owner approval, collaborator
   coordination, force-push planning, and fresh clones.
5. Keep only sanitised placeholders in `.env.example` and enable repository secret scanning.

Do not perform the cleanup casually during an unrelated feature commit.

### Database upgrades have no automatic migration mechanism

Runtime database access is raw `mysql2`. `prisma/init.sql` defines a fresh install, but the
application does not execute migrations or track an applied schema version automatically.
Production upgrades therefore depend on manually maintained and manually applied SQL.

Debt-reduction work:

- Keep the fresh-install schema and every release's upgrade SQL in sync.
- Require SQL review and a tested backup/restore procedure before release.
- Test both a clean install and an upgrade from the last production version.
- Record which SQL has actually been applied to each environment.
- Consider a small raw-SQL migration ledger/runner compatible with shared hosting; do not
  reintroduce an ORM or binary engine merely to obtain migrations.

## Medium priority

### Automated regression coverage is missing

The project has no automated test script or committed unit/integration suite. Release checks currently cover TypeScript, ESLint, the production build, schema/package inspection, and manual acceptance steps. That is not enough to prove financial and concurrent-write behaviour on every change.

Priority coverage should include:

- booking conflict and fleet-wide blockout transactions;
- Admin Quick Add and financial idempotency replay/concurrency;
- bill-run stale-review rejection and unique booking claims;
- invoice issue/void/payment state transitions and cents/GST calculations;
- upgrade SQL rehearsals from the last production schema and a fresh-install schema check.

### Existing image-optimisation warnings

ESLint passes but reports seven existing `@next/next/no-img-element` warnings in admin, vendor, driver, and vehicle UI files. Review each image against cPanel/remote-upload constraints and migrate suitable cases to `next/image`; document deliberate exceptions rather than disabling the rule globally.

### Referenced `.ai-codex` indexes are missing

Repository instructions refer to:

- `.ai-codex/lib.md`
- `.ai-codex/schema.md`
- `.ai-codex/components.md`

The `.ai-codex` directory and these files are absent from the current checkout. Either
regenerate and maintain the indexes or remove/update the instruction that requires agents
to read them first. Stale generated indexes are worse than an explicit absence, so any
regeneration process needs an owner and refresh procedure.

### `AGENTS.md` ownership is unresolved

`AGENTS.md` currently exists as an untracked, user-owned workspace file. It contains useful
project context, but it must not be staged implicitly. Decide explicitly whether it should:

- become reviewed repository documentation,
- remain a local-only instruction file covered by an ignore rule, or
- be replaced by a generated/maintained project-context source.

Until that decision is made, preserve it and exclude it from commits.

### Legacy documentation and indexes have drifted

The project has several overlapping sources of architecture and deployment truth. Verified
examples of drift include:

- `DEV-WORKFLOW.md` still uses adding a Prisma generate script as a commit-message example.
- `service-features-spec.md` refers ambiguously to a `prisma/migrations/` pattern despite the
  current manual raw-SQL approach.
- `TODO.md`, historical plans, `CLAUDE.md`, and local agent instructions can describe schema
  or feature state that has since changed.
- No automated check confirms that versions, environment references, schema inventories,
  deployment instructions, and generated indexes agree.

Debt-reduction work:

1. Name one canonical source for architecture, deployment, schema, and release state.
2. Mark historical plans explicitly as archived rather than current instructions.
3. Audit README, workflow, TODO, specifications, and assistant-context files after each
   material architecture/schema change.
4. Add lightweight CI checks for broken internal links, forbidden runtime references such
   as `DATABASE_URL`/Prisma generation, and version mismatches where practical.

## Review cadence

Review this file when preparing a release that changes database schema, deployment
packaging, environment variables, repository visibility, or agent/developer instructions.
Close entries only after the underlying repository or operational process is corrected.
