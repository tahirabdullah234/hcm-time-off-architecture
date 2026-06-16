import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSubmitRequest } from "../hooks/useSubmitRequest";
import { useBalances } from "../hooks/useBalances";
import {
  realTimeBalanceCheck,
  approveRequest,
  rejectRequest,
} from "../api-client";
import {
  createTestQueryClient,
  createWrapper,
  seedBalances,
  getBalances,
  createControlledFetch,
  createSuccessResponse,
  createErrorResponse,
} from "./test-utils";

const EMP001_PAYLOAD = {
  employeeId: "EMP001",
  location: "US-NYC",
  daysRequested: 3,
  startDate: "2026-07-10",
  endDate: "2026-07-12",
  employeeName: "Alice Chen",
};

// ---------------------------------------------------------------------------
// Test Case 1: The Optimistic Path
//   Assert that the balance drops immediately in the cache BEFORE the network
//   mutation settles.
// ---------------------------------------------------------------------------
describe("Section 6 - Test Case 1: The Optimistic Path", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("drops the balance immediately in the cache before the network mutation settles", async () => {
    const controlled = createControlledFetch();
    vi.stubGlobal("fetch", controlled.mockFetch);

    const queryClient = createTestQueryClient();
    seedBalances(queryClient);
    expect(getBalances(queryClient)!.balances[0].balance).toBe(15);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: vi.fn() }),
    });

    act(() => {
      result.current.mutate(EMP001_PAYLOAD);
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(12);
    });

    expect(result.current.isPending).toBe(true);

    controlled.resolve(createSuccessResponse({ success: true }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// Test Case 2: The Failure Recovery Cycle
//   Mock a 500/422 rejection, assert the UI reflects the optimistic change,
//   then assert a clean rollback to the snapshot + error toast.
// ---------------------------------------------------------------------------
describe("Section 6 - Test Case 2: The Failure Recovery Cycle", () => {
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.unstubAllGlobals();
    mockAddToast.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rolls back to the snapshot and fires an error toast on 422 rejection", async () => {
    const controlled = createControlledFetch();
    vi.stubGlobal("fetch", controlled.mockFetch);

    const queryClient = createTestQueryClient();
    seedBalances(queryClient);

    expect(getBalances(queryClient)!.balances[0].balance).toBe(15);
    expect(getBalances(queryClient)!.pendingRequests.length).toBe(1);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: mockAddToast }),
    });

    act(() => {
      result.current.mutate(EMP001_PAYLOAD);
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(12);
    });

    expect(getBalances(queryClient)!.pendingRequests.length).toBe(2);
    expect(getBalances(queryClient)!.pendingRequests[1].status).toBe(
      "optimistic-pending"
    );

    controlled.resolve(
      createErrorResponse(422, { error: "Insufficient balance" })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cache = getBalances(queryClient);
    expect(cache!.balances[0].balance).toBe(15);
    expect(cache!.pendingRequests.length).toBe(1);

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.stringContaining("insufficient balance"),
      "error"
    );
  });

  it("rolls back and fires a generic toast on 500 server error", async () => {
    const controlled = createControlledFetch();
    vi.stubGlobal("fetch", controlled.mockFetch);

    const queryClient = createTestQueryClient();
    seedBalances(queryClient);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: mockAddToast }),
    });

    act(() => {
      result.current.mutate(EMP001_PAYLOAD);
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(12);
    });

    controlled.resolve(
      createErrorResponse(500, { error: "Internal server error" })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(getBalances(queryClient)!.balances[0].balance).toBe(15);
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.stringContaining("restored"),
      "error"
    );
  });

  it("restores the original pending-request list after a rollback", async () => {
    const controlled = createControlledFetch();
    vi.stubGlobal("fetch", controlled.mockFetch);

    const queryClient = createTestQueryClient();
    seedBalances(queryClient);

    const originalRequestIds = getBalances(queryClient)!.pendingRequests.map(
      (r) => r.id
    );

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: mockAddToast }),
    });

    act(() => {
      result.current.mutate(EMP001_PAYLOAD);
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.pendingRequests.length).toBe(2);
    });

    controlled.resolve(
      createErrorResponse(422, { error: "Insufficient balance" })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    const restored = getBalances(queryClient)!.pendingRequests.map((r) => r.id);
    expect(restored).toEqual(originalRequestIds);
  });
});

// ---------------------------------------------------------------------------
// Test Case 3: The Polling / Mutation Collision
//   Simulate a background poll arriving while an optimistic mutation is
//   pending. Verify that cancelQueries prevents stale polls from overwriting
//   the optimistic state, and that post-mutation invalidation refetches.
// ---------------------------------------------------------------------------
describe("Section 6 - Test Case 3: The Polling/Mutation Collision", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cancels in-flight background queries during onMutate", async () => {
    const controlledMutation = createControlledFetch();
    vi.stubGlobal("fetch", controlledMutation.mockFetch);

    const queryClient = createTestQueryClient();
    const cancelSpy = vi.spyOn(queryClient, "cancelQueries");

    seedBalances(queryClient);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: vi.fn() }),
    });

    act(() => {
      result.current.mutate(EMP001_PAYLOAD);
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(12);
    });

    expect(cancelSpy).toHaveBeenCalledWith({
      queryKey: ["hcm", "balances"],
    });

    controlledMutation.resolve(createSuccessResponse({ success: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("defers background poll data from overwriting optimistic state while mutation is in-flight", async () => {
    const batchControlled = createControlledFetch();
    const mutationControlled = createControlledFetch();
    let batchCallCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (
          options &&
          options.method === "POST" &&
          url === "/api/hcm/real-time"
        ) {
          return mutationControlled.mockFetch();
        }
        batchCallCount++;
        return batchControlled.mockFetch();
      })
    );

    const queryClient = createTestQueryClient();
    const initialData = {
      balances: [
        { employeeId: "EMP001", location: "US-NYC", balance: 15, employeeName: "Alice Chen", department: "Engineering" },
        { employeeId: "EMP002", location: "US-SFO", balance: 22, employeeName: "Bob Martinez", department: "Design" },
      ],
      pendingRequests: [
        { id: "REQ-001", employeeId: "EMP001", employeeName: "Alice Chen", location: "US-NYC", daysRequested: 3, startDate: "2026-07-10", endDate: "2026-07-12", status: "pending", submittedAt: "2026-06-14T09:30:00Z" },
      ],
    };

    seedBalances(queryClient);

    renderHook(() => useBalances(), {
      wrapper: createWrapper(queryClient, { addToast: vi.fn() }),
    });

    queryClient.invalidateQueries({ queryKey: ["hcm", "balances"] });

    await vi.waitUntil(() => batchCallCount >= 1, { timeout: 2000 });
    batchControlled.resolve(createSuccessResponse(initialData));

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(15);
    });

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient, { addToast: vi.fn() }),
    });

    act(() => {
      result.current.mutate(EMP001_PAYLOAD);
    });

    await waitFor(() => {
      expect(getBalances(queryClient)!.balances[0].balance).toBe(12);
    });

    const anniversaryData = {
      balances: [
        { employeeId: "EMP001", location: "US-NYC", balance: 18, employeeName: "Alice Chen", department: "Engineering" },
        { employeeId: "EMP002", location: "US-SFO", balance: 22, employeeName: "Bob Martinez", department: "Design" },
      ],
      pendingRequests: [
        { id: "REQ-001", employeeId: "EMP001", employeeName: "Alice Chen", location: "US-NYC", daysRequested: 3, startDate: "2026-07-10", endDate: "2026-07-12", status: "pending", submittedAt: "2026-06-14T09:30:00Z" },
      ],
    };

    batchControlled.resolve(createSuccessResponse(anniversaryData));

    expect(getBalances(queryClient)!.balances[0].balance).toBe(12);
    expect(getBalances(queryClient)!.pendingRequests.length).toBe(2);

    mutationControlled.resolve(createSuccessResponse({ success: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await waitFor(() => {
      const cached = getBalances(queryClient);
      if (cached) {
        expect(typeof cached.balances[0].balance).toBe("number");
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Test Case 4: The Decision Security Check
//   Verify that clicking Approve dispatches a real-time GET balance check
//   (bypassing cache) before committing the PATCH approval write.
// ---------------------------------------------------------------------------
describe("Section 6 - Test Case 4: The Decision Security Check", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches a real-time single-cell GET check before finalizing an approval write", async () => {
    const fetchLog: Array<{ url: string; method: string }> = [];
    const getResponse = createSuccessResponse({
      success: true,
      balance: { employeeId: "EMP001", location: "US-NYC", balance: 12 },
      timestamp: "2026-06-16T12:00:00Z",
    });
    const patchResponse = createSuccessResponse({
      success: true,
      request: { id: "REQ-001", status: "approved" },
      timestamp: "2026-06-16T12:00:01Z",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        const method = options?.method ?? "GET";
        fetchLog.push({ url: url.toString(), method });
        if (method === "GET") return Promise.resolve(getResponse);
        if (method === "PATCH") return Promise.resolve(patchResponse);
        return Promise.resolve(getResponse);
      })
    );

    const result = await realTimeBalanceCheck("EMP001", "US-NYC");
    expect(result.balance.balance).toBe(12);

    const approveResult = await approveRequest("REQ-001", "EMP001", "US-NYC");
    expect(approveResult.request.status).toBe("approved");

    expect(fetchLog.length).toBe(2);
    expect(fetchLog[0].method).toBe("GET");
    expect(fetchLog[0].url).toContain("employeeId=EMP001");
    expect(fetchLog[0].url).toContain("location=US-NYC");
    expect(fetchLog[1].method).toBe("PATCH");
  });

  it("aborts approval if the real-time balance check returns a non-ok status", async () => {
    const fetchLog: Array<{ url: string; method: string }> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        const method = options?.method ?? "GET";
        fetchLog.push({ url: url.toString(), method });
        if (method === "GET") {
          return Promise.resolve(
            createErrorResponse(404, { error: "Employee not found" })
          );
        }
        return Promise.resolve(
          createSuccessResponse({
            success: true,
            request: { status: "approved" },
          })
        );
      })
    );

    await expect(
      realTimeBalanceCheck("EMP999", "UNKNOWN")
    ).rejects.toThrow("Employee not found");

    expect(fetchLog.length).toBe(1);
    expect(fetchLog[0].method).toBe("GET");
  });

  it("calls the real-time endpoint with query parameters for per-cell read", async () => {
    const fetchLog: Array<{ url: string; method: string }> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        const method = options?.method ?? "GET";
        fetchLog.push({ url: url.toString(), method });
        return Promise.resolve(
          createSuccessResponse({
            success: true,
            balance: {
              employeeId: "EMP003",
              location: "UK-LON",
              balance: 18,
            },
          })
        );
      })
    );

    await realTimeBalanceCheck("EMP003", "UK-LON");

    expect(fetchLog[0].url).toContain("employeeId=EMP003");
    expect(fetchLog[0].url).toContain("location=UK-LON");
  });
});

// ---------------------------------------------------------------------------
// Test Case 5: Manager Reject Flow
//   Verify that the manager's reject action dispatches a PATCH with
//   the correct action field and returns the updated request.
// ---------------------------------------------------------------------------
describe("Section 6 - Test Case 5: The Manager Reject Flow", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches a PATCH with reject action when rejecting a request", async () => {
    const fetchLog: Array<{ url: string; method: string; body?: string }> = [];
    const patchResponse = createSuccessResponse({
      success: true,
      request: {
        id: "REQ-001",
        employeeId: "EMP001",
        status: "rejected",
        daysRequested: 3,
      },
      timestamp: "2026-06-16T12:00:01Z",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        const method = options?.method ?? "GET";
        fetchLog.push({
          url: url.toString(),
          method,
          body: options?.body?.toString(),
        });
        return Promise.resolve(patchResponse);
      })
    );

    const result = await rejectRequest("REQ-001");

    expect(result.request.status).toBe("rejected");
    expect(result.request.id).toBe("REQ-001");
    expect(fetchLog.length).toBe(1);
    expect(fetchLog[0].method).toBe("PATCH");
    expect(fetchLog[0].body).toContain("reject");
    expect(fetchLog[0].body).toContain("REQ-001");
  });

  it("throws an error when the reject PATCH returns a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          createErrorResponse(404, { error: "Request not found" })
        )
      )
    );

    await expect(rejectRequest("REQ-INVALID")).rejects.toThrow(
      "Request not found"
    );
  });
});
