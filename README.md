# HCM Time-Off Management Module (ExampleHR)

A high-reliability frontend integration layer for managing employee time-off requests, built for a third-party HCM system. Implements optimistic updates with rollback, polling reconciliation, and comprehensive state coverage.

## Prerequisites

- Node.js >= 18
- npm >= 9

## Setup & Run

```bash
# Install dependencies
npm install

# Start the development server
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
# Run all 30 tests
npm run test

# Watch mode
npx vitest
```

### Test Breakdown

| File | Tests | What It Covers |
|---|---|---|
| `BalanceCard.test.tsx` | 5 | Loading, stale, optimistic, low balance rendering |
| `PendingRequestRow.test.tsx` | 9 | All status badges, action buttons, callbacks |
| `RequestForm.test.tsx` | 4 | Field rendering, max balance hint, submitting state, onSubmit |
| `useSubmitRequest.test.tsx` | 3 | Optimistic mutation, rollback, error handling |
| `section6-integration.test.tsx` | 9 | Optimistic path, failure recovery, polling collision, decision security |

## Storybook

```bash
npm run storybook
```

Opens on http://localhost:6006. Covers 9 UI states:

- Loading skeleton
- Empty / zero-balance
- Stale data indicator
- Optimistic-pending
- Optimistic rolled-back (with rollback banner)
- HCM-rejected (with error banner)
- HCM-silently-wrong (200 OK but no deduction)
- Balance refreshed mid-session (anniversary bonus)
- Interaction tests (form fill, approve click)

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
      section6-integration.test.tsx  # 4 mandatory integration scenarios
      BalanceCard.test.tsx
      PendingRequestRow.test.tsx
      RequestForm.test.tsx
      useSubmitRequest.test.tsx
    time-off.stories.tsx      # All Storybook stories
  providers/
    QueryClientProvider.tsx   # TanStack Query + Toast context
  components/ui/
    Button.tsx, Card.tsx      # Base UI primitives
```

## Key Design Decisions

- **Optimistic updates** with `onMutate`/`onError`/`onSettled` for instant UX; snapshot rollback on HCM rejection
- **30s polling** on batch endpoint for background reconciliation
- **`cancelQueries`** in `onMutate` defers background poll data during in-flight mutations
- **Manager pre-check**: approve fires a real-time GET before PATCH to validate balance at decision time
- **Toast context** bundled with QueryClientProvider for error notifications
- **Silent failure defense**: `?silentFail=true` simulates HCM returning 200 but not deducting balance; UI offers manual reconciliation