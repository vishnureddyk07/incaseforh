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

## MSG91 OTP configuration

For local development, copy `.env.example` to the repository-root `.env` and
set `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`. For production, set those same
variables in the Render service environment; local `.env` files are ignored
and are not deployed. Keep the Auth Key server-side; never use a `VITE_`
variable for it. The selected MSG91 OTP template must be approved and contain
the `##OTP##` placeholder. `MSG91_DEFAULT_COUNTRY_CODE` is used only when a
stored number has 10 digits; it defaults to India (`91`).

MSG91 generates, sends, and verifies the OTP. The backend stores only a
purpose-bound request/challenge record and calls MSG91's API; it does not
generate or store OTP values. Production API requests originate from the
backend host. If the Auth Key is restricted by source IP, allow the Render
service's outbound IP ranges (shown in its Dashboard under Connect → Outbound),
not the developer computer's public IP. Use a Render dedicated outbound IP if
the MSG91 allowlist cannot support the service's regional IP ranges.

The documented OTP API uses the template's configured sender and DLT settings;
the current API contract does not require separate sender-ID or Entity-ID
request parameters. Run the mocked provider contract tests with:

```bash
node --test server/__tests__/msg91Otp.test.js
```

Real SMS tests require a local MongoDB connection and valid MSG91 credentials.
They are not part of automated tests and should only be run using an authorized
test number.

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
