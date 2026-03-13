# Contributing

## Branch Naming Rules

Use short, descriptive branch names with one of these prefixes:

- `feature/<short-description>` for new functionality
- `fix/<short-description>` for bug fixes
- `chore/<short-description>` for maintenance, tooling, and docs-only work
- `refactor/<short-description>` for internal code cleanup without behavior changes
- `test/<short-description>` for test-only updates

Examples:

- `feature/emergency-form-validation`
- `fix/login-error-handling`
- `chore/backup-and-ci-setup`

## Pull Request Process

1. Create your branch from the latest main branch.
2. Make focused changes (one topic per PR whenever possible).
3. Commit with clear messages (Conventional Commits style is preferred, e.g. `feat: ...`, `fix: ...`, `chore: ...`).
4. Push your branch and open a PR against `main`.
5. In the PR description, include:
   - What changed
   - Why it changed
   - How it was tested
   - Any screenshots for UI changes
6. Request review and address feedback before merge.

## Run Checks Before Pushing

Run the following commands before every push:

```bash
npm ci
npm run test -- --run
npm run build
```

If you changed end-to-end flows, also run:

```bash
npx playwright test
```

Do not push if tests or build fail.
