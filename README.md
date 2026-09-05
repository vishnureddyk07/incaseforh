# InCaseForH

InCaseForH is an emergency-preparedness web application for collecting and managing critical emergency information (contacts, medical details, and quick-access records) with role-based access for employees, managers, and admins.

The project includes:
- A Vite + React + TypeScript frontend
- A Node.js + Express backend
- MongoDB models for users, hospitals, emergency data, and action logs
- Automated quality checks via tests and build pipelines

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB (Atlas-compatible)
- Testing: Vitest, Testing Library, Playwright
- Linting/Tooling: ESLint, TypeScript
- CI/CD: GitHub Actions, Vercel (configured)

## Run Locally

1. Install dependencies:

```bash
npm ci
```

2. Start the development app:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Run tests:

```bash
npm run test -- --run
```

Optional end-to-end tests:

```bash
npx playwright test
```

## Project Structure

```text
.
|- .github/workflows/      # CI and automation workflows
|- backups/                # Backup files and MongoDB export guide
|- docs/                   # Project documentation and reports
|- e2e/                    # Playwright tests
|- models/                 # Mongoose/MongoDB models
|- src/
|  |- components/          # Reusable UI components
|  |- context/             # React context providers
|  |- PagesForWorld/       # Route/page-level views
|  |- __tests__/           # Unit/integration tests
|  |- utils/               # Shared frontend utilities
|- server.js               # Express server entry point
|- package.json            # Scripts and dependencies
```

## Documentation

Additional implementation and handover documents are in `docs/`.

Backup instructions are in `backups/README.md`.

> Staging deploy note: trigger refresh on 2026-09-05.
