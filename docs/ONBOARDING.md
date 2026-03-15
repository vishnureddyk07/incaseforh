# INcase Onboarding Guide

Welcome to the INcase startup project.

This document is a complete onboarding guide for new team members joining the project.

## Project Overview

INcase is an emergency QR platform designed to help users store and access critical emergency information quickly. The platform supports emergency profile creation, QR generation, and secure retrieval workflows.

Startup context:
- Incubated under HIVE
- LLP registered
- Built for real-world emergency-readiness and response use cases

## Clone and Local Setup

1. Clone the repository:

```bash
git clone https://github.com/vishnureddyk07/incaseforh.git
cd incaseforh
```

2. Install dependencies in root:

```bash
npm install
```

3. Install dependencies in client:

```bash
cd client
npm install
cd ..
```

4. Run frontend development server:

```bash
npm run dev
```

5. Run backend server (new terminal):

```bash
npm run server
```

## Branch Structure

- `main` = production
- `develop` = integration
- `staging` = demos
- `feature/*` = your work branches

## Daily Workflow

1. Always branch from `develop`.
2. Create your branch with naming format `feature/your-task`.
3. Implement your changes in that feature branch.
4. Push the branch to remote.
5. Raise a PR targeting `develop`.
6. Vishnu reviews and approves before merge.

## Rules

- Never push to `main` or `develop` directly.
- Always run tests before pushing.
- Never hardcode API keys or secrets in code.

## Folder Ownership

- `client/` = frontend team
- `server/` = backend team
- `shared/` = both teams

## How to Run Tests

Use the command below from project root:

```bash
cd client && npx vitest --run
```

Acceptance requirement:
- All 19 tests must pass before pushing code.

## Who To Contact

- Vishnu = backend + project lead
- Sravani = frontend lead
