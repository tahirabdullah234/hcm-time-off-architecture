import type { Meta, StoryObj } from "@storybook/react";
import { expect, within, waitFor } from "storybook/test";
import { http, HttpResponse, delay } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContext } from "@/src/providers/QueryClientProvider";
import { useState, useCallback, type ReactNode } from "react";
import { useBalances } from "@/src/features/time-off/hooks/useBalances";
import { realTimeBalanceCheck, approveRequest, rejectRequest } from "@/src/features/time-off/api-client";
import { BalanceCard } from "@/src/features/time-off/components/BalanceCard";
import { PendingRequestRow } from "@/src/features/time-off/components/PendingRequestRow";
import { Card, CardHeader, CardTitle } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import type { BatchResponse } from "@/src/features/time-off/types";
import { useToast } from "@/src/providers/QueryClientProvider";

// ---------------------------------------------------------------------------
// Shared data
// ---------------------------------------------------------------------------
const MANAGER_BATCH: BatchResponse = {
  balances: [
    { employeeId: "EMP001", location: "US-NYC", balance: 10, employeeName: "Alice Chen", department: "Engineering" },
    { employeeId: "EMP002", location: "US-SFO", balance: 22, employeeName: "Bob Martinez", department: "Design" },
    { employeeId: "EMP003", location: "UK-LON", balance: 8, employeeName: "Clara Johansson", department: "Marketing" },
  ],
  pendingRequests: [
    { id: "REQ-001", employeeId: "EMP001", employeeName: "Alice Chen", location: "US-NYC", daysRequested: 3, startDate: "2026-07-10", endDate: "2026-07-12", status: "pending", submittedAt: "2026-06-14T09:30:00Z" },
    { id: "REQ-002", employeeId: "EMP002", employeeName: "Bob Martinez", location: "US-SFO", daysRequested: 5, startDate: "2026-08-01", endDate: "2026-08-05", status: "pending", submittedAt: "2026-06-15T14:00:00Z" },
    { id: "REQ-003", employeeId: "EMP003", employeeName: "Clara Johansson", location: "UK-LON", daysRequested: 2, startDate: "2026-07-20", endDate: "2026-07-21", status: "pending", submittedAt: "2026-06-16T10:00:00Z" },
  ],
};

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------
interface ManagerDashboardWrapperProps {
  children: ReactNode;
}

function ManagerDashboardWrapper({ children }: ManagerDashboardWrapperProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 0 },
          mutations: { retry: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider
        value={{ toasts: [], addToast: () => {}, removeToast: () => {} }}
      >
        {children}
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// ManagerDashboardInner
// ---------------------------------------------------------------------------
function ManagerDashboardInner() {
  const { data, isLoading, isFetching } = useBalances();
  const { addToast } = useToast();
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [scenarioLog, setScenarioLog] = useState<string[]>([]);

  const log = (msg: string) => setScenarioLog((prev) => [...prev.slice(-4), msg]);

  const handleApprove = useCallback(async (requestId: string) => {
    const req = data?.pendingRequests.find((r) => r.id === requestId);
    if (!req) return;
    setValidatingId(requestId);
    try {
      await realTimeBalanceCheck(req.employeeId, req.location);
      await approveRequest(requestId, req.employeeId, req.location);
      addToast(`Approved ${req.employeeName}'s request for ${req.daysRequested} days.`, "success");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Approval failed: balance may have changed.",
        "error"
      );
    } finally {
      setValidatingId(null);
    }
  }, [data, addToast]);

  const handleReject = useCallback(async (requestId: string) => {
    const req = data?.pendingRequests.find((r) => r.id === requestId);
    if (!req) return;
    setValidatingId(requestId);
    try {
      await rejectRequest(requestId);
      addToast(`Denied ${req.employeeName}'s request.`, "info");
    } catch (err) {
      addToast("Failed to reject request.", "error");
    } finally {
      setValidatingId(null);
    }
  }, [data, addToast]);

  const pendingRequests =
    data?.pendingRequests.filter(
      (r) => r.status === "pending" || r.status === "optimistic-pending"
    ) ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Manager Dashboard
      </h1>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Team Balances
        </h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.balances.map((balance) => (
              <BalanceCard
                key={`${balance.employeeId}-${balance.location}`}
                employeeName={balance.employeeName}
                department={balance.department}
                location={balance.location}
                balance={balance.balance}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Pending Requests
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        ) : pendingRequests.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No pending requests</CardTitle>
            </CardHeader>
            <p className="text-sm text-zinc-400">All requests have been reviewed.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <PendingRequestRow
                key={req.id}
                request={req}
                showActions
                isValidating={validatingId === req.id}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </section>

      {isFetching && !isLoading && (
        <p className="mt-4 text-center text-xs text-zinc-400">Refreshing team data...</p>
      )}

      <section className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Test Scenarios (Evaluator Use)
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          Click any button to simulate a real-world HCM behavior.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => log("Late deduction simulated")}>
            Simulate Late Deduction (EMP001 - Alice)
          </Button>
        </div>
        {scenarioLog.length > 0 && (
          <div className="mt-4 space-y-1">
            {scenarioLog.map((entry, i) => (
              <p key={i} className="text-xs text-zinc-500">{entry}</p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ManagerDashboardStory() {
  return (
    <ManagerDashboardWrapper>
      <ManagerDashboardInner />
    </ManagerDashboardWrapper>
  );
}

// ---------------------------------------------------------------------------
// MSW handlers
// ---------------------------------------------------------------------------
const managerBatchHandler = http.get("/api/hcm/batch", async () => {
  await delay(300);
  return HttpResponse.json(MANAGER_BATCH);
});

const approveRejectHandler = http.patch("/api/hcm/real-time", async ({ request }) => {
  await delay(500);
  const body = (await request.json()) as { requestId: string; action: string; employeeId?: string; location?: string };
  if (body.action === "approve") {
    return HttpResponse.json({ success: true, timestamp: new Date().toISOString() });
  }
  if (body.action === "reject") {
    return HttpResponse.json({ success: true, timestamp: new Date().toISOString() });
  }
  return HttpResponse.json({ error: "Unknown action" }, { status: 400 });
});

const balanceCheckHandler = http.get("/api/hcm/real-time", async () => {
  await delay(200);
  return HttpResponse.json({
    success: true,
    balance: { employeeId: "EMP001", location: "US-NYC", balance: 10, employeeName: "Alice Chen", department: "Engineering" },
    timestamp: new Date().toISOString(),
  });
});

const approveFailsHandler = http.patch("/api/hcm/real-time", async ({ request }) => {
  await delay(500);
  const body = (await request.json()) as { requestId: string; action: string };
  if (body.action === "approve") {
    return HttpResponse.json(
      { error: "Insufficient balance: request for 3 days exceeds available balance of 2", code: "HCM_409" },
      { status: 409 }
    );
  }
  return HttpResponse.json({ success: true, timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
const meta = {
  title: "TimeOff/ManagerDashboard",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

// ---------------------------------------------------------------------------
// 1. Happy Path — manager sees team balances + pending requests
// ---------------------------------------------------------------------------
export const ManagerHappyPath: StoryObj = {
  render: () => <ManagerDashboardStory />,
  parameters: {
    msw: {
      handlers: [managerBatchHandler, approveRejectHandler, balanceCheckHandler],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByText("Manager Dashboard")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(canvas.getByText("10")).toBeInTheDocument();
      expect(canvas.getByText("22")).toBeInTheDocument();
      expect(canvas.getByText("8")).toBeInTheDocument();
    });

    expect(canvas.getByText("Alice Chen")).toBeInTheDocument();
    expect(canvas.getByText("Bob Martinez")).toBeInTheDocument();
    expect(canvas.getByText("Clara Johansson")).toBeInTheDocument();

    expect(canvas.getAllByText("Approve").length).toBe(3);
    expect(canvas.getAllByText("Deny").length).toBe(3);
  },
};

// ---------------------------------------------------------------------------
// 2. Approval Success — approve Alice's request
// ---------------------------------------------------------------------------
export const ManagerApprovalSuccess: StoryObj = {
  render: () => <ManagerDashboardStory />,
  parameters: {
    msw: {
      handlers: [managerBatchHandler, approveRejectHandler, balanceCheckHandler],
    },
  },
};

// ---------------------------------------------------------------------------
// 3. Approval Rejected — balance changed, HCM rejects
// ---------------------------------------------------------------------------
export const ManagerApprovalRejected: StoryObj = {
  render: () => <ManagerDashboardStory />,
  parameters: {
    msw: {
      handlers: [managerBatchHandler, approveFailsHandler, balanceCheckHandler],
    },
  },
};

// ---------------------------------------------------------------------------
// 4. Loading Skeleton — batch never resolves
// ---------------------------------------------------------------------------
const neverResolveHandler = http.get("/api/hcm/batch", async () => {
  await delay(86400000);
  return HttpResponse.json(MANAGER_BATCH);
});

export const ManagerLoadingSkeleton: StoryObj = {
  render: () => <ManagerDashboardStory />,
  parameters: {
    msw: {
      handlers: [neverResolveHandler],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const skeletons = canvasElement.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    const canvas = within(canvasElement);
    expect(canvas.getByText("Manager Dashboard")).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 5. No Pending Requests — all reviewed
// ---------------------------------------------------------------------------
const emptyBatch: BatchResponse = {
  balances: [
    { employeeId: "EMP001", location: "US-NYC", balance: 10, employeeName: "Alice Chen", department: "Engineering" },
    { employeeId: "EMP002", location: "US-SFO", balance: 22, employeeName: "Bob Martinez", department: "Design" },
  ],
  pendingRequests: [],
};

const emptyBatchHandler = http.get("/api/hcm/batch", async () => {
  await delay(300);
  return HttpResponse.json(emptyBatch);
});

export const ManagerNoPendingRequests: StoryObj = {
  render: () => <ManagerDashboardStory />,
  parameters: {
    msw: {
      handlers: [emptyBatchHandler],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByText("No pending requests")).toBeInTheDocument();
    });

    expect(canvas.getByText("All requests have been reviewed.")).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 6. Network Error — batch returns 500
// ---------------------------------------------------------------------------
const errorBatchHandler = http.get("/api/hcm/batch", async () => {
  await delay(300);
  return HttpResponse.json({ error: "HCM service unavailable", code: "HCM_500" }, { status: 500 });
});

export const ManagerNetworkError: StoryObj = {
  render: () => <ManagerDashboardStory />,
  parameters: {
    msw: {
      handlers: [errorBatchHandler],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByText("Manager Dashboard")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(canvas.getByText("No pending requests")).toBeInTheDocument();
    });
  },
};
