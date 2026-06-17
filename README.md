# HCM Time-Off Management Module (ExampleHR)

A high-reliability frontend integration layer for managing employee time-off requests, built for a third-party HCM system. Implements optimistic updates with rollback, polling reconciliation, and comprehensive state coverage.

## Quick Start

```bash
npm install
npm run dev
```

| View | URL |
|---|---|
| Employee Dashboard | http://localhost:3000/employee |
| Manager Dashboard | http://localhost:3000/manager |

### Prerequisites

- Node.js >= 18
- npm >= 9

### Mock HCM API Endpoints

The dev server includes mock endpoints that simulate the real HCM backend:

| Endpoint | Description |
|---|---|
| `GET /api/hcm/batch` | Full corpus (2-3s delay, 10% chaos, `?triggerAnniversary=true` for bonus) |
| `GET /api/hcm/real-time` | Single-cell balance read (`?employeeId=X&location=Y`) |
| `POST /api/hcm/real-time` | Submit time-off request |
| `PATCH /api/hcm/real-time` | Approve/reject request |

## Testing

### 1. Run all automated tests (terminal only)
```bash
npm test
```
Runs 82 tests — offline detection, silent failures, rollbacks, race conditions, location segregation, manager API helpers, and toast context.

### 2. Run play-function tests headless
```bash
npm run test-storybook
```
### 3. Quick one-shot (tests + Storybook)
```bash
npm test && npm run storybook
```

### Test Breakdown (82 tests)

| File | Tests | What It Covers |
|---|---|---|
| `api-client.test.ts` | 15 | Manager HTTP helpers: real-time balance check, approve, reject — success, error, query encoding, request body |
| `BalanceCard.test.tsx` | 8 | Loading, stale, optimistic, reconciling badge, zero balance |
| `PendingRequestRow.test.tsx` | 9 | All status badges, action buttons, callbacks |
| `QueryClientProvider.test.tsx` | 10 | Toast context: add, remove, auto-dismiss, render styles, multiple toasts, context error |
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

Opens on http://localhost:6006. Contains **48 stories**:

**TimeOff/Components (25):**
- BalanceCard: default, loading, stale, optimistic, optimistic-rolled-back, low balance, reconciling, mid-session refresh
- RequestForm: default (with interaction test), submitting, offline, validation: past date, validation: overlap, validation: insufficient balance
- PendingRequestRow: default, with-actions (with interaction test), offline, validating, optimistic, approved, rejected, rolled-back
- Composite: empty requests list, HCM silently wrong, mid-session refresh

**TimeOff/Dashboard (6)** — MSW-powered with play functions:
- Happy Path, Slow Network, HCM Rejected, Mid-Session Refresh, Loading Skeleton, Network Error

**TimeOff/ManagerDashboard (6)** — MSW-powered with play functions:
- Happy Path — 3 team balances + 3 pending requests
- Approval Success — approve Alice's request
- Approval Rejected — HCM 409 conflict on approve
- Loading Skeleton — pulse skeletons
- No Pending Requests — empty state card
- Network Error — 500 from batch

**TimeOff/OfflineBanner (2):**
- Online (hidden), Offline (visible amber banner)

**UI/Button (9):**
- Primary, Secondary, Danger, Ghost, Small, Large, Loading, Disabled, All variants

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
      api-client.test.ts      # Manager HTTP helpers
      BalanceCard.test.tsx
      PATCH-reject.test.ts
      PendingRequestRow.test.tsx
      RequestForm.test.tsx
      scenario-g-offline.test.tsx
      scenario-remaining-cases.test.tsx
      section6-integration.test.tsx  # Core integration scenarios
      useSubmitRequest.test.tsx
    time-off.stories.tsx      # All component stories
  stories/
    ManagerDashboard.stories.tsx  # MSW-powered manager dashboard stories
    TimeOffDashboard.stories.tsx  # MSW-powered employee dashboard stories
  providers/
    QueryClientProvider.tsx   # TanStack Query + Toast context
    __tests__/
      QueryClientProvider.test.tsx  # Toast context tests
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
