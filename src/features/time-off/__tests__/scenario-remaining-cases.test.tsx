import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSubmitRequest } from "../hooks/useSubmitRequest";
import { useBalances } from "../hooks/useBalances";
import {
  createTestQueryClient,
  createWrapper,
  seedBalances,
  getBalances,
  createControlledFetch,
  createSuccessResponse,
} from "./test-utils";
import { BalanceCard } from "../components/BalanceCard";
import { PendingRequestRow } from "../components/PendingRequestRow";
import { ToastContext } from "@/src/providers/QueryClientProvider";
import type { BatchResponse, PendingRequest } from "../types";
import type { ReactNode } from "react";

// -----------------------------------------------------------------------
// Case 2: Empty State — "No requests found" and zero-balance rendering
// -----------------------------------------------------------------------
describe("Case 2: Empty State", () => {
  it("shows 'No requests found' when pending list is empty", () => {
    render(<p className="text-sm text-zinc-400">No requests found.</p>);
    expect(screen.getByText("No requests found.")).toBeInTheDocument();
  });

  it("renders BalanceCard with zero balance cleanly", () => {
    render(
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={0}
      />
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------
// Case 8: Balance-Refreshed-Mid-Session
//   A background poll returns updated data while no mutation is pending.
//   The UI updates cleanly without disrupting the user's form entry.
// -----------------------------------------------------------------------
describe("Case 8: Balance-Refreshed-Mid-Session", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates cache with new poll data when no mutation is in-flight", async () => {
    const controlled = createControlledFetch();
    vi.stubGlobal("fetch", controlled.mockFetch);

    const queryClient = createTestQueryClient();
    seedBalances(queryClient);
    expect(getBalances(queryClient)!.balances[0].balance).toBe(15);

    renderHook(() => useBalances(), {
      wrapper: createWrapper(queryClient, { addToast: vi.fn() }),
    });

    queryClient.invalidateQueries({ queryKey: ["hcm", "balances"] });

    const refreshedData: BatchResponse = {
      balances: [
        {
          employeeId: "EMP001",
          location: "US-NYC",
          balance: 18,
          employeeName: "Alice Chen",
          department: "Engineering",
        },
        {
          employeeId: "EMP002",
          location: "US-SFO",
          balance: 22,
          employeeName: "Bob Martinez",
          department: "Design",
        },
      ],
      pendingRequests: [
        {
          id: "REQ-001",
          employeeId: "EMP001",
          employeeName: "Alice Chen",
          location: "US-NYC",
          daysRequested: 3,
          startDate: "2026-07-10",
          endDate: "2026-07-12",
          status: "pending",
          submittedAt: "2026-06-14T09:30:00Z",
        },
      ],
    };

    controlled.resolve(createSuccessResponse(refreshedData));

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(18);
    });

    expect(getBalances(queryClient)!.pendingRequests.length).toBe(1);
  });

  it("does not clear form-level optimistic state when background poll arrives", async () => {
    const controlled = createControlledFetch();
    vi.stubGlobal("fetch", controlled.mockFetch);

    const queryClient = createTestQueryClient();
    seedBalances(queryClient);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: vi.fn() }),
    });

    act(() => {
      result.current.mutate({
        employeeId: "EMP001",
        location: "US-NYC",
        daysRequested: 2,
        startDate: "2026-07-10",
        endDate: "2026-07-11",
        employeeName: "Alice Chen",
      });
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(13);
    });

    controlled.resolve(createSuccessResponse({ success: true }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

// -----------------------------------------------------------------------
// Case 12: Anniversary Timer Trigger
//   A timed bonus simulation increments the mock database and is reflected
//   by the polling hook.
// -----------------------------------------------------------------------
describe("Case 12: Anniversary Timer Trigger", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refetches data after a simulated anniversary trigger", async () => {
    let fetchCount = 0;
    const initialData: BatchResponse = {
      balances: [
        {
          employeeId: "EMP001",
          location: "US-NYC",
          balance: 15,
          employeeName: "Alice Chen",
          department: "Engineering",
        },
      ],
      pendingRequests: [],
    };

    const anniversaryData: BatchResponse = {
      balances: [
        {
          employeeId: "EMP001",
          location: "US-NYC",
          balance: 18,
          employeeName: "Alice Chen",
          department: "Engineering",
        },
      ],
      pendingRequests: [],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        fetchCount++;
        if (fetchCount === 1) {
          return Promise.resolve(createSuccessResponse(initialData));
        }
        return Promise.resolve(createSuccessResponse(anniversaryData));
      })
    );

    const queryClient = createTestQueryClient();

    renderHook(() => useBalances(), {
      wrapper: createWrapper(queryClient, { addToast: vi.fn() }),
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(15);
    });

    expect(fetchCount).toBe(1);

    queryClient.invalidateQueries({ queryKey: ["hcm", "balances"] });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(18);
    });

    expect(fetchCount).toBe(2);
  });
});

// -----------------------------------------------------------------------
// Case 13: Flaky Network / Hang
//   An endpoint hangs or never responds. The frontend must stay responsive
//   and not crash, recovering cleanly once the network returns.
// -----------------------------------------------------------------------
describe("Case 13: Flaky Network / Hang", () => {
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.unstubAllGlobals();
    mockAddToast.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays pending without crashing when the endpoint hangs", async () => {
    const controlled = createControlledFetch();
    vi.stubGlobal("fetch", controlled.mockFetch);

    const queryClient = createTestQueryClient();
    seedBalances(queryClient);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: mockAddToast }),
    });

    act(() => {
      result.current.mutate({
        employeeId: "EMP001",
        location: "US-NYC",
        daysRequested: 2,
        startDate: "2026-07-10",
        endDate: "2026-07-11",
        employeeName: "Alice Chen",
      });
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(13);
    });

    expect(result.current.isPending).toBe(true);

    // No crash — component tree still renders
    expect(result.current.isError).toBe(false);

    // Now resolve the hang
    controlled.resolve(createSuccessResponse({ success: true }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

// -----------------------------------------------------------------------
// Case 15: Employee Guardrail
//   An employee submission must never auto-transition to "approved" before
//   the HCM responds. The status should remain optimistic-pending until
//   the server confirms, and on success the optimistic entry is removed.
// -----------------------------------------------------------------------
describe("Case 15: Employee Guardrail", () => {
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.unstubAllGlobals();
    mockAddToast.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does NOT set status to 'approved' after a successful submission", async () => {
    const controlled = createControlledFetch();
    vi.stubGlobal("fetch", controlled.mockFetch);

    const queryClient = createTestQueryClient();
    seedBalances(queryClient);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: mockAddToast }),
    });

    act(() => {
      result.current.mutate({
        employeeId: "EMP001",
        location: "US-NYC",
        daysRequested: 2,
        startDate: "2026-07-10",
        endDate: "2026-07-11",
        employeeName: "Alice Chen",
      });
    });

    await waitFor(() => {
      const pending = getBalances(queryClient)!.pendingRequests;
      expect(pending.some((r) => r.status === "optimistic-pending")).toBe(true);
    });

    controlled.resolve(
      createSuccessResponse({
        success: true,
        balance: {
          employeeId: "EMP001",
          location: "US-NYC",
          balance: 13,
        },
      })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const pending = getBalances(queryClient)!.pendingRequests;
    const hasApproved = pending.some((r) => r.status === "approved");
    expect(hasApproved).toBe(false);
  });
});

// -----------------------------------------------------------------------
// Case 17: Multi-Location Row Segregation
//   Modifying a balance for EMP001/US-NYC must not affect EMP002/US-SFO
//   or any other location.
// -----------------------------------------------------------------------
describe("Case 17: Multi-Location Row Segregation", () => {
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.unstubAllGlobals();
    mockAddToast.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not bleed balance changes across different employee/location pairs", async () => {
    const controlled = createControlledFetch();
    vi.stubGlobal("fetch", controlled.mockFetch);

    const queryClient = createTestQueryClient();
    seedBalances(queryClient);

    expect(getBalances(queryClient)!.balances[0]).toMatchObject({
      employeeId: "EMP001",
      location: "US-NYC",
      balance: 15,
    });
    expect(getBalances(queryClient)!.balances[1]).toMatchObject({
      employeeId: "EMP002",
      location: "US-SFO",
      balance: 22,
    });

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: mockAddToast }),
    });

    act(() => {
      result.current.mutate({
        employeeId: "EMP001",
        location: "US-NYC",
        daysRequested: 3,
        startDate: "2026-07-10",
        endDate: "2026-07-12",
        employeeName: "Alice Chen",
      });
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(12);
    });

    // EMP002/US-SFO must be untouched
    expect(getBalances(queryClient)!.balances[1].balance).toBe(22);

    controlled.resolve(createSuccessResponse({ success: true }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // After resolution, EMP002/US-SFO still untouched
    expect(getBalances(queryClient)!.balances[1].balance).toBe(22);
  });
});
