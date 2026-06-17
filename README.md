# HCM Time-Off Management Module (ExampleHR)

A high-reliability frontend integration layer for managing employee time-off requests, built for a third-party HCM system. Implements optimistic updates with rollback, polling reconciliation, and comprehensive state coverage.

## Prerequisites

- Node.js >= 18
- npm >= 9

## How to Test Everything (No Experience Needed)

### 1. Run all 57 automated tests (terminal only)
```bash
npm test
```
This runs every logic test — offline detection, silent failures, rollbacks, race conditions, location segregation, etc. Just watch the terminal for ✅ or ❌.

### 2. See all 22 visual states in a browser
```bash
npm run storybook
```
Opens http://localhost:6006. Click **"TimeOff"** in the left sidebar to browse every UI state:
- Balance card: loading, stale, optimistic, rolled-back, reconciled
- Submit form: default, submitting, offline mode
- Pending requests: pending, approved, rejected, Syncing...
- Dashboard scenarios (with mock API): Happy path, slow network, HCM rejection, mid-session refresh

### 3. Quick one-shot command
```bash
npm test && npm run storybook
```
Run all tests, then open Storybook.

### 4. Run play-function tests headless
```bash
npm run test-storybook
```

## Setup & Run

```bash
npm install
npm run dev
```

### Dashboards

| View | URL |
|---|---|
| Employee Dashboard | http://localhost:3000/employee |
| Manager Dashboard | http://localhost:3000/manager |

### Mock HCM API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/hcm/batch` | Full corpus (2-3s delay, 10% chaos, `?triggerAnniversary=true` for bonus) |
| `GET /api/hcm/real-time` | Single-cell balance read (`?employeeId=X&location=Y`) |
| `POST /api/hcm/real-time` | Submit time-off request |
| `PATCH /api/hcm/real-time` | Approve/reject request |

## Tests

```bash
npm test
```

### Test Breakdown (57 tests)

| File | Tests | What It Covers |
|---|---|---|
| `BalanceCard.test.tsx` | 8 | Loading, stale, optimistic, reconciling badge, zero balance |
| `PendingRequestRow.test.tsx` | 9 | All status badges, action buttons, callbacks |
| `RequestForm.test.tsx` | 4 | Field rendering, max balance hint, submitting state, onSubmit |
| `useSubmitRequest.test.tsx` | 3 | Optimistic mutation, rollback, error handling |
| `section6-integration.test.tsx` | 13 | Optimistic path, failure recovery, polling collision, decision security, silent failure rollback |
| `scenario-g-offline.test.tsx` | 8 | Offline banner, disabled buttons, online/offline events |
| `scenario-remaining-cases.test.tsx` | 8 | Empty state, mid-session refresh, timer trigger, flaky network, employee guardrail, location segregation |
| `PATCH-reject.test.ts` | 4 | Server-side balance restoration |

### All 17 Scenarios Covered

| # | Scenario | Type | Module |
|---|---|---|---|
| 1 | Loading skeleton | Unit test + Story | BalanceCard |
| 2 | Empty / zero balance | Unit test + Story | BalanceCard |
| 3 | Stale data indicator | Unit test + Story | BalanceCard |
| 4 | Optimistic pending | Unit test + Story | BalanceCard, PendingRequestRow |
| 5 | Optimistic rolled-back | Integration + Story | useSubmitRequest |
| 6 | HCM rejected (422) | Integration + Story | useSubmitRequest |
| 7 | HCM silently wrong (200, no deduction) | Integration + Story | useSubmitRequest |
| 8 | Mid-session refresh (anniversary bonus) | Integration + Story | useBalances |
| 9 | Manager decision security (real-time check) | Integration + Story | api-client |
| 10 | Authoritative per-cell read | Integration | api-client |
| 11 | Batch corpus reconciliation | Integration | useBalances |
| 12 | Anniversary timer trigger | Integration | useBalances |
| 13 | Flaky network / hanging endpoint | Integration | useSubmitRequest |
| 14 | Race conditions (submit + poll) | Integration | section6 |
| 15 | Employee guardrail (no auto-approved) | Integration | useSubmitRequest |
| 16 | Manager confidence check | Integration | api-client |
| 17 | Multi-location segregation | Integration | useSubmitRequest |

## Storybook

```bash
npm run storybook
```

Opens on http://localhost:6006. Contains **22 stories**:

**Component stories (18):** BalanceCard (7 states), RequestForm (2 states + play function), PendingRequestRow (7 states + play function), Empty list, HCM silently wrong, Mid-session refresh

**MSW-powered dashboard stories (4 with play functions):**
- Happy Path — submits optimistically, balance drops
- Slow Network — 5-second delay, shows syncing state
- HCM Rejected — 422 error, balance rolls back automatically
- Mid-Session Refresh — anniversary bonus updates balance

## Architecture

```
app/                          # Next.js App Router
  api/hcm/
    batch/route.ts            # Mock batch HCM endpoint (2-3s, 10% chaos)
    real-time/route.ts        # Mock real-time HCM endpoint (fast read/write)
  employee/page.tsx           # Employee dashboard container
  manager/page.tsx            # Manager dashboard container
src/
  features/time-off/
    api-store.ts              # Shared in-memory store (employees + requests)
    api-client.ts             # Manager decision HTTP helpers
    types.ts                  # TypeScript type definitions
    hooks/
      useBalances.ts          # 30s polling hook with stale-while-revalidate
      useSubmitRequest.ts     # Optimistic mutation with snapshot rollback
    components/
      BalanceCard.tsx         # Per-location balance display
      RequestForm.tsx         # Time-off request form
      PendingRequestRow.tsx   # Request row with approve/deny actions
    __tests__/
      test-utils.tsx          # Shared test infrastructure (controlled fetch, seed data)
      section6-integration.test.tsx  # Core integration scenarios
      BalanceCard.test.tsx
      PendingRequestRow.test.tsx
      RequestForm.test.tsx
      useSubmitRequest.test.tsx
      scenario-g-offline.test.tsx
      scenario-remaining-cases.test.tsx
      PATCH-reject.test.ts
    time-off.stories.tsx      # All component stories
  stories/
    TimeOffDashboard.stories.tsx  # MSW-powered dashboard stories
  providers/
    QueryClientProvider.tsx   # TanStack Query + Toast context
  hooks/
    useOnline.ts              # Offline detection hook
  components/
    OfflineBanner.tsx         # Sticky offline indicator
    ServiceWorkerRegister.tsx # Service worker registration
  components/ui/
    Button.tsx, Card.tsx      # Base UI primitives
public/
  sw.js                       # Service worker for offline caching
  mockServiceWorker.js        # MSW service worker for Storybook mocks
```

## Key Design Decisions

- **Optimistic updates** with `onMutate`/`onError`/`onSettled` for instant UX; snapshot rollback on HCM rejection
- **30s polling** on batch endpoint for background reconciliation
- **`cancelQueries`** in `onMutate` defers background poll data during in-flight mutations
- **Manager pre-check**: approve fires a real-time GET before PATCH to validate balance at decision time
- **Toast context** bundled with QueryClientProvider for error notifications
- **Silent failure defense**: `?silentFail=true` simulates HCM returning 200 but not deducting balance; UI offers manual reconciliation
- **Offline degradation**: service worker caches app shell; `useOnline` hook + offline banner + disabled actions
- **MSW in Storybook**: `msw-storybook-addon` intercepts API endpoints for realistic async scenarios with play functions
