# Dev Session Workflow

A quick reference for wrapping up a dev session, versioning, and pushing to GitHub.

---

## Every Session — Commit & Push

Work on a feature branch and open a pull request against `main`. Review the scoped diff
and necessary checks before merging. Preserve unrelated local changes; stage explicit
paths when the checkout contains user-owned files.

At the end of any session where you've made changes:

```bash
# 1. Check what changed
git status
git diff

# 2. Stage your changes
git add .

# 3. Commit with a clear message
git commit -m "Brief description of what you changed"

# 4. Push to GitHub
git push
```

### Writing good commit messages

| Type | Example |
|------|---------|
| New feature | `Add vendor client export to CSV` |
| Bug fix | `Fix null vehicle crash on booking detail page` |
| UI change | `Update booking form layout on mobile` |
| Config/setup | `Document new SMS environment variables` |

Keep it short. Describe *what* changed, not just "updated files".

---

## When to Update the Version Number

You don't need to update the version every session. Update it when you've
completed a meaningful chunk of work — a new feature, a bug fix release, etc.

### Versioning convention (Semantic Versioning)

```
MAJOR.MINOR.PATCH
  │     │     └── Bug fixes, small tweaks       e.g. 0.1.0 → 0.1.1
  │     └──────── New features, no breaking     e.g. 0.1.0 → 0.2.0
  └────────────── Breaking / major milestone    e.g. 0.1.0 → 1.0.0
```

### Update the version in package.json

Open `package.json` and edit the version field:

```json
"version": "0.2.0"
```

---

## Tagging a Release on GitHub

Tag the merged `main` commit, not an unmerged feature branch. Stable tags trigger
`.github/workflows/release.yml` to build and publish the full cPanel ZIP, OTA bundle and
Docker deployment ZIP from the committed source and `RELEASE-NOTES-vX.X.X.md`.
The container-image workflow publishes the tagged image separately. Confirm the release
workflow succeeded and the OTA asset exists before handing an update to the installer;
do not create a competing manual release while that workflow is running.

A tag marks a specific commit as a named release point, visible in GitHub
under **Releases / Tags**.

```bash
# 1. Update version in package.json first, then commit it
git add package.json
git commit -m "Release v0.2.0"

# 2. Create the tag
git tag v0.2.0

# 3. Push the commit AND the tag
git push
git push --tags
```

After pushing, the tag will appear on GitHub at:
`https://github.com/your-username/your-repo/tags`

---

## Full Release Checklist

- [ ] Make and test all changes locally (`npm run dev`)
- [ ] Run TypeScript and lint checks (`npx tsc --noEmit` and `npm run lint`)
- [ ] Run a build to check for errors (`npm run build`)
- [ ] Update version in `package.json`
- [ ] Read `PENDING-DEPLOY.md` and verify its SQL/configuration steps against the release
- [ ] Commit all changes with a descriptive message
- [ ] Push the feature branch, open/review its pull request, and merge to `main`
- [ ] Tag the release (`git tag vX.X.X`)
- [ ] Push commits and tags (`git push && git push --tags`)
- [ ] Verify successful release publication, version and OTA bundle contents
- [ ] If deploying: follow `docs/DEPLOYMENT.md` and `DEPLOYMENT-CPANEL.md`

---

## Quick Reference

| Task | Command |
|------|---------|
| Check what's changed | `git status` |
| Stage everything | `git add .` |
| Stage specific file | `git add path/to/file` |
| Commit | `git commit -m "your message"` |
| Push | `git push` |
| Create a tag | `git tag v0.2.0` |
| Push tags | `git push --tags` |
| View tag history | `git tag` |
| View commit history | `git log --oneline` |
