# RideGaurd / INcase - Complete Project Handover (Single File)

Last updated: 2026-03-13
Repository: `https://github.com/vishnureddyk07/incaseforh.git`
Primary branch: `main`
Current HEAD at handover time: `4727ad0`

## 1) Project Summary
RideGaurd (INcase) is an emergency QR platform for riders.

Core purpose:
- User creates emergency profile.
- App generates QR code.
- QR scan opens emergency details for responders.
- Admin/manager can manage records and users.
- Nearby hospital discovery and SOS flow are included.

Primary frontend entry points:
- Home and form: `/`
- Public emergency record view: `/emergencyinfo/:email`
- Admin login: `/admin`
- Manager login: `/manager`
- QR records list (admin): `/qrs`

Primary backend base URL (production):
- `https://incaseforh.onrender.com`

## 2) Technology Stack
Frontend:
- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router
- qrcode / qrcode.react
- JSZip + file-saver

Backend:
- Node.js + Express
- MongoDB + Mongoose
- JWT auth
- bcryptjs password hashing
- multer (memory uploads)
- express-rate-limit

Testing:
- Vitest unit tests
- Playwright e2e

## 3) Repository Structure
Top-level notable files/folders:
- `server.js` backend API and middleware
- `models/` Mongoose schemas
- `src/` frontend app
- `e2e/` Playwright tests
- `README.md` minimal
- `PROJECT_DOCUMENTATION.md` long documentation
- `INCASE_*.md`, `QUICK_START.md`, `FILE_MANIFEST.md` historical docs
- `vercel.json` routing/deploy config
- `seedAdmin.js`, `seedHospitals.js` seeding scripts

Frontend structure (`src/`):
- `App.tsx` route mapping and main composition
- `context/AuthContext.tsx` auth state and localStorage persistence
- `components/auth/` admin/manager/employee login and password change
- `components/emergency/` form, QR generation, scan display, assist flow
- `components/QRList.tsx` admin records list with edit/delete/download
- `PagesForWorld/EmergencyInfoDisplay.tsx` public detail display page
- `__tests__/` unit/fuzz/accessibility tests

Backend models:
- `models/User.js`
- `models/EmergencyInfo.js`
- `models/ActionLog.js`
- `models/Hospital.js`

## 4) Environment Variables
Used in backend (`server.js`):
- `PORT` default `5000`
- `JWT_SECRET` default fallback exists but must be set securely in production
- `ADMIN_SETUP_KEY` optional admin bootstrap secret
- `GEONAMES_USERNAME` for external hospital fallback
- Mongo URI accepted keys:
  - `MONGODB_URI`
  - `MONGO_URI`
  - `MONGODB_URL`
  - `MONGO_URL`
  - `DATABASE_URL`

Used in frontend:
- `VITE_API_URL` optional custom API base
- Fallback in app points to `https://incaseforh.onrender.com`

## 5) Run and Build Commands
From `RideGaurd` folder:
- `npm install`
- `npm run dev` starts Vite frontend
- `npm run server` starts backend (`node server.js`)
- `npm run build` production build
- `npm run test` run vitest once
- `npm run test:watch` watch mode
- `npm run e2e` playwright
- `npm run seed:hospitals` seed hospital dataset

## 6) Backend API Summary
Versioned mount:
- Main API mounted at `/api/v1`
- Backward compatibility redirect from `/api/*` to `/api/v1/*`

Health/system:
- `GET /` basic server response
- `GET /health` DB health
- `GET /env-check` environment check (no secrets)

Auth/admin bootstrap:
- `POST /api/v1/auth/register-admin` create first admin
- `GET /api/v1/admin/check` check whether admin exists
- `POST /api/v1/auth/login` admin/manager login
- `POST /api/v1/auth/change-password` authenticated password change

Emergency records:
- `POST /api/v1/emergency` create or update-by-phone record
- `GET /api/v1/emergency/:email` public fetch by email
- `GET /api/v1/emergency/phone/:phoneNumber` public fetch by phone
- `PUT /api/v1/emergency/:email` admin update by email
- `PUT /api/v1/emergency/phone/:phoneNumber` admin update by phone
- `GET /api/v1/emergency` admin/manager list all records
- `DELETE /api/v1/admin/emergency/:id` admin delete single record
- `DELETE /api/v1/admin/emergency/clear-all` admin clear all

User management:
- `POST /api/v1/admin/users/manager` admin creates manager
- `POST /api/v1/manager/users` manager/admin creates employee(user)
- `GET /api/v1/admin/users` admin list users (optional `role` filter)
- `DELETE /api/v1/admin/users/:id` admin delete user (not self/admin)

Ops/audit:
- `GET /api/v1/admin/logs` admin view action logs

Hospitals/SOS:
- `GET /api/v1/hospitals/nearby?lat=..&lng=..&maxDistance=..`
- `POST /api/v1/sos/trigger`
- `GET /api/v1/admin/hospitals` admin list hospitals

## 7) Authentication and Authorization
JWT:
- `POST /auth/login` returns token + user payload
- Frontend stores auth in `localStorage` key `auth`
- Bearer token sent via `Authorization: Bearer <token>`

Roles:
- `admin`: full access
- `manager`: limited admin-like capabilities (create employees, read emergency list)
- `user`: employee role

Middleware in backend:
- `requireAuth`
- `requireAdmin`
- `requireManagerOrAdmin`

## 8) Data Models
`models/User.js`:
- `email` unique
- `passwordHash`
- `role` enum `admin|manager|user`

`models/EmergencyInfo.js`:
- personal and medical details
- `phoneNumber` required
- `dateOfBirth` required
- `photo` stored as data URL string
- `qrCode` stored as data URL string
- indexes include:
  - `createdAt`
  - `email + createdAt`
  - `phoneNumber + createdAt`

`models/ActionLog.js`:
- `actorId`, `actorEmail`, `actorRole`, `action`, `details`
- indexes include:
  - `createdAt`
  - `actorId + createdAt`

`models/Hospital.js`:
- GeoJSON `location`
- emergency capability flags
- geospatial index (`2dsphere`)

## 9) Frontend Route Map (`src/App.tsx`)
- `/` main page + emergency form
- `/emergencyinfo/:email` public emergency info page
- `/qrs` QR list page (admin gated in component)
- `/admin` admin login/setup
- `/admin/dashboard` admin dashboard
- `/manager` manager login
- `/manager/dashboard` manager dashboard
- `/employee` employee login
- `/change-password` password update
- `/assist` emergency assist page

## 10) Recent Critical Fixes (Most Important for New Owner)
Recent commits (newest first):
- `4727ad0` Harden emergency submit with timeout + backend fallback retry.
- `f524cf6` Performance + data reliability: indexes, API query optimization, QR scan log fix, QRList memory/concurrency fixes.
- `37e9aa8` QR list optimization: useMemo filtering, skeleton loading, photo fetch improvements.
- `2cafccd` Frontend fallback API switched to Render backend URL.
- `4d1b7eb` Mongo reconnect retries and DB diagnostics.
- `a80bbef` Better admin check behavior when DB unavailable + more env key support.
- `4ca0580` Degraded boot when Mongo env missing.
- `31ddf64` Alternate Mongo env names support.
- `0e51e19` Router initialization fix.
- `169d757` Admin-only login role enforcement.
- `ae42759` Photo optional in form flow.

## 11) Operational Behavior and Safeguards
Rate limits in `server.js`:
- Global baseline
- Auth limiter
- Creation limiter
- Public read limiter
- External API limiter
- SOS limiter

Upload rules:
- In-memory upload via multer
- 5 MB max payload
- Allowed mime list enforced
- Centralized upload error handling for size/type

DB readiness guard:
- `/api/v1` middleware returns `503` with state details when DB not connected

## 12) Deployment Notes
Current production backend endpoint checks (at handover creation):
- `GET https://incaseforh.onrender.com/health` returned healthy + mongodb connected
- `GET https://incaseforh.onrender.com/env-check` returned env configured
- `GET https://incaseforh.onrender.com/api/v1/admin/check` returned `{ "exists": true }`

`vercel.json` exists with:
- API route forwarding
- static build setup
- SPA catch-all to `index.html`

## 13) QA and Testing Status
Current automated status before handover:
- `npm run build` passes
- `npm run test -- --run` passes (`19/19` tests)

Test coverage location:
- `src/__tests__/accessibility.test.tsx`
- `src/__tests__/EmergencyForm.test.tsx`
- `src/__tests__/EmergencyQRCode.test.tsx`
- `src/__tests__/smoke.test.ts`
- `src/__tests__/validation.test.ts`
- `src/__tests__/contacts-fuzz.test.ts`

## 14) Known Design Decisions (Must Know)
- Emergency create endpoint updates existing record by matching `phoneNumber`.
- Public QR fetch is available without auth (intended product behavior).
- Photo is optional.
- Legacy docs exist and may not reflect latest fixes; this file + latest code should be source of truth.

## 15) Handover Runbook for New Team Member
1. Clone repo and install dependencies.
2. Set environment variables (Mongo URI + JWT secret mandatory).
3. Run backend (`npm run server`) and frontend (`npm run dev`).
4. Verify `/health` and `/api/v1/admin/check`.
5. Login as admin or bootstrap first admin if needed.
6. Create emergency record from form and scan/check public route.
7. Verify admin pages (`/qrs`, `/admin/dashboard`) load and data is visible.
8. Run tests and build before any deploy.
9. Deploy to Render/Vercel and recheck health endpoints.

## 16) Files to Read First (Priority)
1. `PROJECT_HANDOVER_COMPLETE.md` (this file)
2. `server.js`
3. `src/App.tsx`
4. `src/components/emergency/EmergencyQRCode.tsx`
5. `src/components/QRList.tsx`
6. `src/context/AuthContext.tsx`
7. `models/*.js`
8. `PROJECT_DOCUMENTATION.md`

## 17) Appendix: Supplementary Docs Already in Repo
These are retained and useful for deeper context:
- `PROJECT_DOCUMENTATION.md`
- `INCASE_ARCHITECTURE.md`
- `INCASE_PHASE1_SETUP.md`
- `INCASE_PHASE1_SUMMARY.md`
- `INCASE_REQUIREMENTS.md`
- `IMPLEMENTATION_COMPLETE.md`
- `FILE_MANIFEST.md`
- `DEBUG_FIX_SUMMARY.md`
- `TEST_REPORT.md`

## 18) Final Transfer Statement
This handover file is intended as the single master summary for ownership transfer, including architecture, APIs, environment, operations, testing, deployment, and recent production-critical changes.
If any conflict appears between older documentation and code, trust:
1) latest `main` branch code,
2) recent commits listed in section 10,
3) this handover file.
