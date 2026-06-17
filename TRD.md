# Technical Requirement Document (TRD) — HCM Time-Off Module

## 1. Challenges

### 1.1 Unreliable Third-Party HCM API

The HCM backend that owns balance data is volatile:

- **High latency:** The batch (full corpus) endpoint takes 2–3 seconds. The
  real-time (single cell) endpoint takes 200–800ms. Neither is suitable for
  synchronous rendering.
- **Chaos failures:** Approximately 10% of calls return spurious HTTP 500 or
  422 errors. The application must not crash or corrupt state when this
  happens.
- **Silent failures:** HCM can return `{ success: true, status: 200 }` without
  actually applying the mutation. The balance is unchanged, but the response
  looks clean. The client must detect this contradiction and self-correct.
- **Unannounced data drift:** External events — work-anniversary bonuses,
  manager rejections, system corrections — mutate server balances outside the
  user's session. A cached balance can be seconds old and already wrong.

### 1.2 Composite Key Model

Balances are not per-employee. They are per-employee *per-location*. Alice in
US-NYC has a different balance than Alice in US-SFO. Every read, write, cache
entry, and validation rule must operate on the full composite tuple
`(employeeId, location)`. This adds complexity to every layer: the API routes,
the client functions, the hooks, the components, and the Storybook data.

### 1.3 Concurrent Action Races

An employee's optimistic submission can race against:

- A background batch poll returning updated data.
- A manager approving or rejecting the same request in another session.
- An anniversary bonus incrementing the balance mid-flight.

The UI must not visually jump or show contradictory numbers. The reconciliation
algorithm must sequence these events deterministically.

### 1.4 Manager Trust Requirement

Managers approve or deny requests that affect other people's balances. If they
approve based on stale cached data, the result can be a compliance violation or
a double-booked employee. The system must guarantee that every approve/deny
action is preceded by an authoritative, uncached read of the current balance.

---

## 2. Solution Architecture

### 2.1 Component Tree

```
Providers Layer
  ├── QueryClientProvider (TanStack Query — server state cache)
  └── ToastProvider (Context — notification broadcast)
        │
    ┌───┴───┐
    │       │
    ▼       ▼
Employee   Manager
Dashboard  Dashboard          ← View Containers
    │       │                  (orchestration only — wire hooks to props)
    │       │
    └───┬───┘
        │
    ┌───┴───┐
    │       │
    ▼       ▼
useBalances useSubmitRequest   ← Hooks Layer (data + cache logic)
    │       │
    └───┬───┘
        │
    ┌───┴─────────────────────┐
    │        │                │
    ▼        ▼                ▼
BalanceCard RequestForm  PendingRequestRow  ← Presentation Components
                                              (pure, stateless, prop-driven)
```

**Design rule:** Presentation components never call hooks, never import query
clients, and never call fetch. They receive everything via props. This makes
every visual state instantiable in Storybook with zero network or provider
overhead.

### 2.2 Data Sources

| Endpoint | Purpose | Frequency | Cache Behavior |
|---|---|---|---|
| `GET /api/hcm/batch` | Full corpus (all balances + pending requests). 2–3s delay. 10% chaos. | Polled every 30s | Replaces cache on 200. Cancelled during active mutations. |
| `GET /api/hcm/real-time?employeeId=X&location=Y` | Authoritative single-cell read. 200–500ms delay. | On demand (manager approve) | Never cached. Always fetches from server. |
| `PATCH /api/hcm/real-time` | Approve or reject a pending request. 400–800ms delay. | On demand | Invalidates batch cache on settle. |
| `POST /api/hcm/real-time` | Submit a new time-off request. 800–2000ms delay. 10% chaos. `?silentFail=true` for no-op simulation. | On demand | Optimistic update with rollback. Invalidates batch on settle. |

---

## 3. Optimistic vs Pessimistic — Decision Analysis

### 3.1 Pessimistic Strategy

| Aspect | Detail |
|---|---|
| **Flow** | Click Submit → block UI with full-screen spinner → wait for HCM → show result |
| **Perceived latency** | Every submit takes 800–2000ms minimum. Actual HCM could be 5–8s. |
| **Failure UX** | User waited the full duration only to learn "insufficient balance." They must now retry from scratch. |
| **Safety** | No state drift. No rollback logic needed. |

**Rejected because:** The UX penalty for a frequent action is unacceptable.
Users would perceive the app as broken, leading to frustration, page refreshes,
and double-submits that make the problem worse.

### 3.2 Optimistic Strategy (Selected)

| Aspect | Detail |
|---|---|
| **Flow** | Click Submit → instantly deduct balance + show "Syncing..." badge → fire API in background → reconcile on response |
| **Perceived latency** | UI updates in < 1ms. Network runs in parallel. |
| **Failure UX** | On error: snapshot is restored, toast explains why, balance is correct, user can retry. The wait only happens on error, not on every submit. |
| **Risk** | State drift if rollback is buggy. Must handle silent failures. |

**Selected because:** The speed benefit is transformative for a form submitted
frequently. The risks are well-understood and fully mitigated by the rollback
mechanism in §3.3 and the silent-failure detection in §4.3.

### 3.3 Rollback Mechanism

```
onMutate:
  1. Cancel in-flight batch polls (prevent race).
  2. Snapshot current cache (immutable copy).
  3. Deduct daysRequested from local balance.
  4. Append optimistic-pending request to local list.

onError / onSuccess (failure detected):
  1. Overwrite cache with saved snapshot (balance restored).
  2. Show toast (error or info depending on failure type).
  3. Remove optimistic-pending entry.

onSettled:
  1. invalidateQueries → trigger fresh batch fetch.
  2. Clear reconciling flag after 4s timeout.
```

### 3.3 Manager Hybrid Strategy

Managers use a **pessimistic-read, optimistic-write** hybrid:

1. Click "Approve" → button shows "Validating..." (pessimistic spin).
2. `GET /api/hcm/real-time` fires (authoritative read, never cached).
3. If GET returns a valid balance, `PATCH /api/hcm/real-time` fires (write).
4. On success → toast. On failure → error toast, no state change.

The batch poll populates the dashboard for browsing (stale data is acceptable
for a read-only overview), but the approve action always reads live before
writing. This eliminates the risk of stale-data approvals without requiring
real-time subscriptions.

---

## 4. Cache Invalidation & Reconciliation Strategy

### 4.1 Polling with Mutation Locking

The background batch poll runs every 30 seconds via TanStack Query's
`refetchInterval`. It must not overwrite an in-flight optimistic update:

```
Batch poll resolves:
  → Is there an active mutation? (mutation.isPending)
    → YES → Discard poll result. The mutation's onSettled will
             invalidate the query, triggering a fresh fetch after
             the mutation completes.
    → NO  → Replace cache with server data (standard SWR).
```

This prevents the balance from visually reverting to the pre-mutation value
while the API call is still in flight. The user sees their optimistic deduction
stay put until the server confirms or rejects.

### 4.2 Silent Failure Detection

Since HCM can return `200 OK` with the balance unchanged, the `onSuccess`
handler must be defensive:

```
expectedBalance = previousBalance - daysRequested
serverBalance   = response.balance

if serverBalance > expectedBalance:
  → HCM silently declined. The server did NOT deduct.
  → Restore previousData snapshot (rollback optimistic state).
  → Remove optimistic-pending request.
  → Show info toast: "HCM silently declined. Balance restored."
  → Set isReconciling flag on BalanceCard (clears after 4s).
```

This also catches edge cases where balance drifted between the optimistic
update and the server response (e.g., an anniversary bonus fired mid-flight).
The server's actual returned balance is treated as authoritative.

### 4.3 Manager Decision-Time Validation

The manager flow explicitly bypasses all caches:

1. `GET /api/hcm/real-time` with no cache headers, no React Query cache.
2. Only if the GET returns `{ success: true, balance: { ... } }` does the
   PATCH proceed.
3. If the GET fails (404, 500) or the balance is insufficient, the approve is
   aborted and the user sees an error toast.

This guarantees that every manager decision is based on the current server
state, not on data that may be 30 seconds stale.

### 4.4 Multi-Location Isolation

All cache keys, query filters, and mutation logic operate on the full composite
`(employeeId, location)`. A submission against US-NYC reads and writes only the
US-NYC balance row. The US-SFO row (same employee) is unaffected. The batch
poll returns all rows together, but the mutation math only touches the matching
tuple.

---

## 5. Alternatives Considered

### 5.1 State Management Stack

| Option | Assessment |
|---|---|
| **Redux** | Requires manual action creators, reducers, thunks/sagas for every async flow. No built-in cache lifetimes, polling, or mutation lifecycle. Boilerplate would exceed the application logic. |
| **MobX** | Observables auto-track, but there is no standard pattern for cache invalidation, retry, or optimistic rollback. Would require building all of that from scratch. |
| **TanStack Query (selected)** | Built-in `useQuery` with `refetchInterval` for polling, `staleTime` for freshness, `useMutation` with `onMutate`/`onError`/`onSettled` lifecycle. Zero boilerplate for the patterns we need. |

### 5.2 Real-Time Synchronization

| Option | Assessment |
|---|---|
| **WebSocket** | HCM does not expose WebSocket. Would require a proxy layer. Adds deployment complexity. Overkill for a 30-second polling cadence. |
| **Server-Sent Events** | Same issues as WebSocket. HCM is a request-response API. No push capability. |
| **Polling (selected)** | Matches the HCM batch endpoint. 30s interval balances freshness against network cost. Easy to implement, test, and reason about. Mutation locking prevents visual races. |

### 5.3 Endpoint Strategy

| Option | Assessment |
|---|---|
| **Batch-only** | Every read hits the 2–3s endpoint. Real-time per-cell reads impossible. Silent failures undetectable at the individual balance level. |
| **Real-time-only** | No bulk read for initial hydration. Manager dashboard would need N+1 requests for each employee. |
| **Dual (batch + real-time, selected)** | Batch for bulk reads (efficient per-row), real-time for authoritative single-cell reads. Each endpoint optimized for its use case. The two endpoints have non-overlapping contracts. |

### 5.4 Alternative: No Optimistic Update (Pessimistic Only)

As analyzed in §3.1, a purely pessimistic approach is simpler but delivers a
poor user experience for a frequent action. The combination of optimistic
submits with snapshot rollback gives the same correctness guarantee as
pessimistic while feeling instant.

---

## 6. Testing Strategy

A system with optimistic updates, silent-failure detection, background
reconciliation, and manager decision-time validation must be guarded at
multiple layers. A single test type cannot catch every regression.

### 6.1 Test Layer Defense Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STORYBOOK SMOKE TESTS                             │
│  Guard: Visual regressions in isolated component states             │
│  Tool:  Storybook (manual browse)                                   │
│  Runs:  Developer opens browser                                     │
│  Catch: Wrong badge color, missing text, broken layout,             │
│         wrong icon in a given state                                 │
├─────────────────────────────────────────────────────────────────────┤
│                    STORYBOOK INTERACTION TESTS                       │
│  Guard: Behavioral regressions in user flows                        │
│  Tool:  @storybook/test-runner (Chromium)                           │
│  Runs:  `npm run test-storybook`                                    │
│  Catch: Approve button doesn't fire, toast missing,                 │
│         optimistic state not shown, rollback not visible,           │
│         date input rejects valid input                              │
├─────────────────────────────────────────────────────────────────────┤
│                    VITEST COMPONENT TESTS                            │
│  Guard: Logical regressions in isolated components                  │
│  Tool:  Vitest + React Testing Library                              │
│  Runs:  `npm test`                                                  │
│  Catch: Wrong conditional render, missing accessibility label,      │
│         incorrect badge per status prop, form validation errors     │
├─────────────────────────────────────────────────────────────────────┤
│                    VITEST INTEGRATION TESTS                          │
│  Guard: Data-flow regressions across the hook + API boundary        │
│  Tool:  Vitest (mocked fetch)                                       │
│  Runs:  `npm test`                                                  │
│  Catch: Optimistic deduction not rolled back on 422,                │
│         silent failure not detected, cache snapshot not restored,   │
│         GET not dispatched before PATCH, overlap check broken       │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Why This Layering

**Storybook smoke tests (manual visual verification)** are the cheapest and
fastest feedback loop. A developer opening a story can instantly see if the
"optimistic-rolled-back" state shows the red banner or if the "low balance"
card shows the warning icon. These catch layout and styling regressions that
no automated assertion can practically verify. Because presentation components
are pure (all state via props), every visual state is a one-click preview.

**Storybook interaction tests (play functions in Chromium)** fill the gap
between "it renders" and "it behaves correctly." They click real buttons,
type into real inputs, and wait for real DOM changes. These catch regressions
where a component looks correct but doesn't respond to user input — a button
with the right label that doesn't fire its onClick, a toast component that
renders but doesn't appear in the DOM, a form that shows the right fields but
rejects valid date entries. The test-runner runs them against a real browser,
so they also catch browser-specific issues (e.g., `<input type="date">`
handling differences). These tests are slower than Vitest (~3–8s per story)
so we limit them to the most critical user flows: submit, approve, rollback,
loading, error, and empty states.

**Vitest component tests** run in Node (jsdom) and are fast (~50–300ms per
test). They cover the combinatorial explosion of prop variations that would
be impractical to verify by hand in Storybook. For example, `PendingRequestRow`
has 5 `status` values × 2 `showActions` values × 2 `isValidating` values
× 2 `isOffline` values = 40 combinations — all tested in a single file that
takes < 400ms. These tests catch logic errors in conditional rendering: a
wrong ternary, a missing null check, a misconfigured Tailwind class.

**Vitest integration tests** stub the `fetch` global and verify the full
data flow from user action → hook → API call → cache update → UI state
change. These catch the most dangerous regressions: the optimistic update that
no longer rolls back on error, the silent failure that goes undetected, the
background poll that overwrites an in-flight mutation, the manager approval
that skips the real-time GET. These tests are slower (~500–1500ms) but cover
the paths that, if broken, corrupt user data.

### 6.3 Test Inventory

#### 6.3.1 Vitest Component Tests

| File | What It Guards | Why Vitest |
|---|---|---|
| `BalanceCard.test.tsx` | Correct DOM per prop combination (isLoading, isStale, isOptimistic, isReconciling, low balance). 8 tests. | Fast prop-coverage. 40+ visual combinations impractical for Storybook. |
| `PendingRequestRow.test.tsx` | Correct badge text/color per status, action button visibility, disabled state when offline, loading state when validating. 9 tests. | Same rationale — combinatorial prop explosion. |
| `RequestForm.test.tsx` | Validation messages on past date, overlapping dates, insufficient balance; button disabled during submit; submit callback fires with correct payload. 4 tests. | Form logic requires programmatic assertions (value changes, error text). |
| `useSubmitRequest.test.tsx` | Mutation fires with correct URL and payload shape. 3 tests. | Cheap smoke test that the hook wires up correctly. |
| `PATCH-reject.test.ts` | Server-side balance restoration math: rejecting a request restores the correct number of days. 4 tests. | Pure logic, no React needed. Fastest possible feedback. |

#### 6.3.2 Vitest Integration Tests

| File | What It Guards | Why Integration |
|---|---|---|
| `section6-integration.test.tsx` | Optimistic deduction visible before API resolves; rollback restores snapshot on 422; background poll defers during mutation; manager dispatches GET before PATCH; silent failure detected via balance comparison; per-cell query params correct. 13 tests. | These are the core correctness guarantees. They cross the hook/cache/API boundary. Unit tests cannot catch data-flow bugs. |
| `scenario-g-offline.test.tsx` | Form disabled when offline; offline message renders; reconnection messaging. 8 tests. | Offline is a cross-cutting concern (hook + component + API). |
| `scenario-remaining-cases.test.tsx` | Stale refresh doesn't overwrite optimistic; optimistic cleanup on success; zero balance edge case; rollback toast appears. 8 tests. | Edge cases that span multiple layers. |

#### 6.3.3 Storybook Interaction Tests (play functions)

| Story | What It Guards | Why Play Test |
|---|---|---|
| `HappyPathOptimisticSuccess` | Full submit loop: load data → fill dates → click Submit → balance drops optimistically. | Catches regressions in userEvent interactions with real DOM. |
| `SlowNetworkSilentFail` | "Submitting..." state renders; syncing indicator appears. | Guards the loading UX during long API calls. |
| `HcmRejectedAutomaticRollback` | Balance rolls back from optimistic 8 to original 10 on 422. | Guards the most critical correctness path in a real browser. |
| `MidSessionRefreshAnniversaryBonus` | Poll result (balance 15) renders after refresh. | Guards the reconciliation display. |
| `DashboardLoadingSkeleton` | Skeleton elements render in DOM during loading. | Guards the loading state that Vitest doesn't render as a full page. |
| `DashboardNetworkError` | Fallback UI renders on 500. | Guards the error state that crosses provider boundaries. |
| `ManagerHappyPath` | All 3 employee names, balances, and 3 Approve/Deny button pairs render. | Guards the manager view's data wiring. |
| `ManagerLoadingSkeleton` | Skeleton pulse elements render. | Same as dashboard — full page loading state. |
| `ManagerNoPendingRequests` | Empty state text renders. | Guards the empty-state branching in the manager view. |
| `ManagerNetworkError` | Fallback renders on batch 500. | Guards error recovery in the manager view. |
| `PendingRequestWithActions` | Approve button clickable. | Guards that action buttons actually respond to clicks. |

#### 6.3.4 Storybook Visual Smoke Tests (no play function)

Every story listed in §6.4 without a "Yes" in the Play Test column serves as a
visual reference. A developer or reviewer opens Storybook and visually confirms
the state matches expectations. These catch layout, color, typography, and
spacing regressions that no test assertion can practically verify.

### 6.4 Complete Story Matrix

## 7. Data Flow Diagrams

### 7.1 Employee Submit — Happy Path

```
User clicks Submit
  │
  ▼
onMutate:
  ├─ Cancel in-flight batch poll
  ├─ Snapshot current cache
  ├─ Deduct daysRequested from balance
  └─ Append optimistic-pending request
  │
  ▼
POST /api/hcm/real-time ──────────→ HCM
  │                                  │
  ▼                                  ▼
onSuccess:                        200 { balance: { ..., balance: 12 } }
  ├─ Compare server balance (12)
  │   vs expected (15 - 3 = 12)
  ├─ Match? → Keep optimistic state
  │
  ▼
onSettled:
  └─ invalidateQueries → refresh
```

### 7.2 Employee Submit — Silent Failure

```
Same onMutate as above.
  │
  ▼
POST /api/hcm/real-time?silentFail=true ──→ HCM
  │                                          │
  ▼                                          ▼
onSuccess:                                200 { balance: { balance: 15 } }
  ├─ Server balance (15) vs expected (12)
  ├─ 15 > 12 → Silent failure
  │
  ▼
  ├─ Restore previousData (balance 15)
  ├─ Remove optimistic-pending request
  ├─ Show info toast
  └─ Set isReconciling flag (4s)
```

### 7.3 Manager Approve

```
Manager clicks Approve
  │
  ▼
Set validatingId → button shows "Validating..."
  │
  ▼
GET /api/hcm/real-time?employeeId=X&location=Y ──→ HCM
  │                                                  │
  ▼                                                  ▼
res.ok?                                           200 { balance: { balance: 10 } }
  │
  ├─ YES →
  │   │
  │   ▼
  │   PATCH /api/hcm/real-time ──→ HCM
  │     │                          │
  │     ▼                          ▼
  │   res.ok?                    200 { success: true }
  │     │
  │     ├─ YES → Show success toast, invalidate batch
  │     └─ NO  → Show error toast
  │
  └─ NO → Show error toast
```

### 7.4 Background Poll During Mutation

```
Every 30s:
  GET /api/hcm/batch ──→ HCM
    │                     │
    ▼                     ▼
  Poll resolves:
    ├─ Mutation active? → Discard result.
    │                     (onSettled will invalidate)
    └─ No mutation → Replace cache with server data.
```

---

## 8. Key Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| State management | TanStack Query | Built-in mutation lifecycle, polling, stale-while-revalidate. Zero boilerplate for the patterns we need. |
| Submit strategy | Optimistic with snapshot rollback | Instant UX; rollback and silent-failure detection guarantee correctness. |
| Manager strategy | Pessimistic GET-before-PATCH | Eliminates stale-data approvals without adding real-time infrastructure. |
| Cache refresh | 30s polling with mutation locking | Balanced freshness vs network cost. Locking prevents visual jumping. |
| HCM endpoint strategy | Dual (batch + real-time) | Batch for bulk hydration, real-time for authoritative single-cell ops. Non-overlapping contracts. |
| Component architecture | View containers → hooks → pure components | Every state testable in isolation via Storybook. No network needed for visual verification. |
| Composite key | `(employeeId, location)` throughout | Correct isolation of balances per location for multi-location employees. |
| Silent failure | Balance comparison in `onSuccess` | Catches 200-OK-no-op responses without extra API calls or timeouts. |
