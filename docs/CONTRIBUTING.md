# Contributing

## Pre-push checklist

These steps are mandatory before any push to any branch.

1. Run all 19 Vitest tests from `client/`:

```bash
cd client
npx vitest --run
```

2. Run production build from repository root:

```bash
npm run build
```

3. Check working tree from repository root:

```bash
git status --short
```

Nothing gets pushed to any branch if any step fails.
