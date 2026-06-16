# Technical Requirement Document (TRD) & Agent Execution Blueprint
## SYSTEM INSTRUCTION: READ THIS ENTIRE DOCUMENT AND SCAFFOLD ALL COMPONENT FILES EXACTLY AS SPECIFIED BELOW. DO NOT ASK FOR CLARIFICATION. ASSUME FULL ADMINISTRATIVE CONTROL.

---

### SECTION 1: System Architecture & The Component Tree Mapping (Step 1 of 4)
To handle a volatile third-party API and distributed state without impacting UI performance, we implement a decoupled, unidirectional data architecture. This layout completely separates data-fetching from the UI presentation layer, keeping components simple and predictable. It also ensures we can pass clean mock states straight into Storybook without messing with live sockets.

#### The Directory & Workspace Structure to Scaffold:
* `app/api/hcm/batch/route.ts` - Expensive batch read endpoint (2-3s forced delay)
* `app/api/hcm/real-time/route.ts` - Fast, single-cell read/write endpoint
* `app/employee/page.tsx` - Employee View Container Router
* `app/manager/page.tsx` - Manager View Container Router
* `app/layout.tsx` - App Root (Wraps Global Providers)
* `src/components/ui/` - Buttons, Cards, Dialogs, Toast Frameworks
* `src/features/time-off/components/` - Pure Presentation Components (Stateless: BalanceCard, RequestForm, PendingRequestRow)
* `src/features/time-off/hooks/useBalances.ts` - Tracks batch polling & reconciliations
* `src/features/time-off/hooks/useSubmitRequest.ts` - Handles mutations & optimistic rollbacks
* `src/features/time-off/time-off.stories.tsx` - Storybook matrix file for all UI states
* `src/providers/QueryClientProvider.tsx` - TanStack Query configuration wrapper

#### Component Hierarchy & Data Flow Map:
* **Providers Layer:** Wraps the entire application root. It initializes and manages the global server cache, handles runtime application-level state transitions, and serves as the mounting node for the global Toast notification framework used to broadcast background synchronization errors.
* **View Containers:** Separate, isolated containers for the `EmployeeDashboard` and `ManagerDashboard` views. These modules are strictly responsible for orchestrating remote connections, pulling raw and cached server arrays from the data layers, and passing clean TypeScript properties down into pure UI components.
* **Presentation Components:** Highly isolated, pure, and entirely stateless components (such as `BalanceCard`, `RequestForm`, and `PendingRequestRow`). Because these items do not depend on active network resources or live API sockets to evaluate context, they can render arbitrary states (`loading`, `stale`, `optimistic-pending`, or `error`) instantly, making them optimal for comprehensive Storybook verification.

---

### SECTION 2: Choosing the State Management Stack & Rationale (Step 2 of 4)
Managing server state requires a dedicated abstraction layer designed around caching lifecycles. We explicitly select **TanStack Query (React Query)** as our state manager and data-fetching engine, backed by the following core architectural validations:

* **Server State Separated from Client State:** Traditional client state management options—such as Redux, MobX, or native React Context—are architected to hold synchronous local application parameters. They require vast amounts of boilerplate code to track loading flags, manage query execution, and synchronize network state. TanStack Query isolates remote databases as distinct asynchronous dependencies with customized caching lifetimes.
* **Built-in Stale-While-Revalidate:** The tool features robust, out-of-the-box support for asynchronous background fetching, customized time-to-live (`staleTime`) caches, structural interval polling, and automatic invalidation events when browser focus or network connectivity changes.
* **Out-of-the-box Mutation Lifecycle:** It provides highly structured asynchronous lifecycle hooks (`onMutate`, `onError`, and `onSettled`). These callbacks give us deterministic control over local cache structures, allowing us to implement safe, high-reliability optimistic UI strategies.

---

### SECTION 3: The Core Challenge: Optimistic Updates vs. Pessimistic Updates (Step 3 of 4)
Architecting a high-fidelity time-off application requires evaluating the trade-offs between two main data-rendering paradigms. We balance the immediate user experience against absolute server consistency.

#### Architectural Trade-Off Analysis:
* **Pessimistic Strategy:** When a user clicks "Submit Time-Off", the interface fires a network query and displays a full-screen blocking loading spinner, freezing interaction until the remote HCM validates and settles the database transaction.
    * *Cons:* The application feels slow, heavy, and unresponsive to the user. If the third-party HCM encounters high latency, takes 8 seconds to process, or fails silently due to edge-case routing issues, the entire user interface hangs, leading to a degraded experience.
* **Optimistic Strategy (Selected Paradigm):** When a user triggers "Submit", the application immediately updates local memory to display the new lower balance figure and transitions the request into a temporary `optimistic-pending` state. A background worker dispatches the asynchronous network transaction to the HCM API concurrently.
    * *Pros:* The workflow feels instantaneous, smooth, and modern, optimizing the experience for the employee.
    * *Cons:* It introduces the risk of state drift. It requires a resilient rollback mechanism to handle instances where the external HCM rejects the submission or returns a network failure code.

#### The Rollback Mechanism Workflow:
To implement the optimistic paradigm safely, our mutation lifecycle follows this execution flow:
1.  **Capture Snapshot:** Before executing the asynchronous fetch call, the system takes an immutable, synchronous copy of the exact existing cache memory layer.
2.  **Optimistically Mutate:** The application modifies the client cache state immediately, deducting the requested days from the visible view and appending the request token to the visible pipeline.
3.  **Handle Rejection:** If the server returns an error or timing exception (e.g., a `422` insufficient balance error, `409` concurrent conflict, or a silent `500` gateway timeout), the failure is caught inside the `onError` cycle. The system overwrites the optimistic state with the saved snapshot to restore the user's correct balance and triggers an explicit, highly visible error notification banner (`optimistic-rolled-back`).

---

### SECTION 4: Cache Invalidation & Multi-Tiered Reconciliation Strategy (Step 4 of 4)
Because work-anniversary adjustments, system corrections, or external manager rejections can fire automatically on background servers, local client arrays can drift from reality while a session is active. We enforce a Multi-Tiered Reconciliation Strategy to guarantee system-wide data integrity:

* **Polling (Interval-Based Fetching):** The primary client container establishes a background poll running on a 30-second loop against the expensive batch endpoint. This ensures that the global corpus of balances stays closely aligned with background server alterations without overloading the network layer.
* **Smart Balance Reconciliation Algorithm (Handling In-Flight Conflicts):** When a background interval poll resolves, the reconciliation engine checks for any active, in-flight mutations.
    * *Scenario A (No Action In-Flight):* If the user state is idle, the incoming server data replaces the local cache nodes silently.
    * *Scenario B (Optimistic Action In-Flight):* If an optimistic request is currently pending resolution, the engine locks the active presentation view and defers applying the background data. This prevents numbers from shifting or jumping mid-interaction, allowing the mutation cycle to resolve before aligning local cache variables with the server database.
* **Manager Decision-Time Validation:** Managers must never approve or deny requests based on cached numbers. To prevent duplicate approvals or compliance violations, the manager view uses a multi-tier confirmation process. Clicking "Approve" bypasses standard caches to fire a forced, synchronous real-time single balance check API query (`per-cell read`). The operational approval command executes only if this real-time check confirms the balance remains valid at that exact second.

---

### SECTION 5: Mock HCM Service Specifications
To enable reliable frontend verification, the Next.js API route layout must fulfill the following behavioral constraints:
* **Per-Employee Per-Location Schema:** All entries must be saved under composite tracking fields (e.g., `employeeId: string`, `location: string`, `balance: number`).
* **Forced API Latency:** The batch endpoint (`/api/hcm/batch`) must carry a hardcoded delay of **2000ms - 3000ms** to replicate corporate data pipelines.
* **Chaos Trigger Logic:** Implement a randomized **10% failure engine** returning `500` or `422 Insufficient Balance` to force client rollbacks.
* **Data Drift Simulation:** Expose a control utility (`?triggerAnniversary=true`) that appends automated increments to active backend balances mid-session to test UI resolution algorithms.

---

### SECTION 6: Quality Verification Framework (Required Test Suite)
The automated testing configuration (Vitest + React Testing Library) will assert system stability via four mandatory validation paths:
1.  **Immediate Visual Feedback:** Assert that upon submitting a form, component balances drop instantly before the background mock API cycle finishes execution.
2.  **Error Recovery Validation:** Intercept network lines to return a failure status, execute a form submission, and assert that the component rolls back cleanly to the snapshot memory state while throwing a toast notification.
3.  **Collision Mitigation:** Simulate an incoming background poll carrying data updates while a user mutation is actively pending. Verify that the view layer defers merging the changes until the mutation resolves, eliminating layout jumps.
4.  **Manager Protection Verification:** Assert that clicking approval dispatches an explicit, real-time single-cell server query before committing state changes.

---

### SECTION 7: SPECIFIC INSTRUCTIONS FOR AGENT INITIALIZATION & CODE GENERATION
1. **Initialize Project Infrastructure:** Scaffold a standard, fresh Next.js App Router workspace utilizing TypeScript (`tsconfig.json`), Tailwind CSS setup, and absolute paths (`@/*`).
2. **Setup Caching Engine:** Write the `QueryClientProvider.tsx` file inside `src/providers/` and make sure it is wrapped inside the primary server `app/layout.tsx` file.
3. **Build the Mock Infrastructure First:** Create the mock routes in `app/api/hcm/` to establish the contract before implementing any visual views.
4. **Implement Stateless Components:** Build `BalanceCard.tsx`, `RequestForm.tsx`, and `PendingRequestRow.tsx` as completely pure UI components that rely entirely on incoming parameters.
5. **Code the React Query Hooks:** Implement `useBalances.ts` with interval polling logic and `useSubmitRequest.ts` with the complete snapshot, rollback, and error handling framework detailed in Section 3.
6. **Verify and Deploy Component Tree:** Wire up the hooks inside the container files `app/employee/page.tsx` and `app/manager/page.tsx`. Write complete automated integration unit files confirming all conditions listed in Section 6 function with zero regressions.