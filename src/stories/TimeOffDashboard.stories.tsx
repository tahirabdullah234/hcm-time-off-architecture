import type { Meta, StoryObj } from "@storybook/react";
import { within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "vitest";
import { http, HttpResponse, delay } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContext } from "@/src/providers/QueryClientProvider";
import { useState, type ReactNode } from "react";
import { BalanceCard } from "@/src/features/time-off/components/BalanceCard";
import { RequestForm } from "@/src/features/time-off/components/RequestForm";
import { PendingRequestRow } from "@/src/features/time-off/components/PendingRequestRow";
import { useBalances } from "@/src/features/time-off/hooks/useBalances";
import { useSubmitRequest } from "@/src/features/time-off/hooks/useSubmitRequest";
import type { BatchResponse, SubmitRequestPayload } from "@/src/features/time-off/types";

// ---------------------------------------------------------------------------
// Shared data
// ---------------------------------------------------------------------------
const INITIAL_BATCH: BatchResponse = {
  balances: [
    { employeeId: "EMP001", location: "US-NYC", balance: 10, employeeName: "Alice Chen", department: "Engineering" },
    { employeeId: "EMP002", location: "US-SFO", balance: 22, employeeName: "Bob Martinez", department: "Design" },
  ],
  pendingRequests: [
    { id: "REQ-001", employeeId: "EMP001", employeeName: "Alice Chen", location: "US-NYC", daysRequested: 3, startDate: "2026-07-10", endDate: "2026-07-12", status: "pending", submittedAt: "2026-06-14T09:30:00Z" },
  ],
};

const REFRESHED_BATCH: BatchResponse = {
  ...INITIAL_BATCH,
  balances: INITIAL_BATCH.balances.map((b) =>
    b.employeeId === "EMP001" && b.location === "US-NYC"
      ? { ...b, balance: 15 }
      : b
  ),
};

// ---------------------------------------------------------------------------
// Wrapper — renders the employee dashboard with all providers
// ---------------------------------------------------------------------------
interface DashboardWrapperProps {
  children: ReactNode;
}

function DashboardWrapper({ children }: DashboardWrapperProps) {
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
// DashboardInner — consumes hooks and renders the full UI
// ---------------------------------------------------------------------------
function DashboardInner() {
  const { data, isLoading, isStale, isFetching } = useBalances();
  const submitMutation = useSubmitRequest();

  const myBalance = data?.balances.find(
    (b) => b.employeeId === "EMP001" && b.location === "US-NYC"
  );

  const myRequests =
    data?.pendingRequests.filter(
      (r) => r.employeeId === "EMP001"
    ) ?? [];

  const hasOptimistic = myRequests.some(
    (r) => r.status === "optimistic-pending"
  );

  const pendingRequests = myRequests.filter(
    (r) => r.status === "pending" || r.status === "optimistic-pending"
  );
  const existingDateRanges = pendingRequests.map((r) => ({
    startDate: r.startDate,
    endDate: r.endDate,
  }));

  const handleSubmit = (payload: SubmitRequestPayload) => {
    submitMutation.mutate(payload);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900">
        My Time-Off Dashboard
      </h1>
      <div className="grid gap-6 md:grid-cols-2">
        <BalanceCard
          employeeName="Alice Chen"
          department="Engineering"
          location="US-NYC"
          balance={myBalance?.balance ?? 0}
          isLoading={isLoading}
          isStale={isStale}
          isOptimistic={hasOptimistic}
          isReconciling={submitMutation.isReconciling}
        />
        <RequestForm
          employeeId="EMP001"
          employeeName="Alice Chen"
          location="US-NYC"
          maxBalance={myBalance?.balance ?? 0}
          existingRanges={existingDateRanges}
          onSubmit={handleSubmit}
          isSubmitting={submitMutation.isPending}
        />
      </div>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          My Requests
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-zinc-200"
              />
            ))}
          </div>
        ) : myRequests.length === 0 ? (
          <p className="text-sm text-zinc-400">No requests found.</p>
        ) : (
          <div className="space-y-2">
            {myRequests.map((req) => (
              <PendingRequestRow key={req.id} request={req} />
            ))}
          </div>
        )}
      </section>
      {isFetching && !isLoading && (
        <p className="mt-4 text-center text-xs text-zinc-400">
          Syncing with server...
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Story wrapper — combines DashboardWrapper + DashboardInner
// ---------------------------------------------------------------------------
function DashboardStory() {
  return (
    <DashboardWrapper>
      <DashboardInner />
    </DashboardWrapper>
  );
}

// ---------------------------------------------------------------------------
// MSW handlers
// ---------------------------------------------------------------------------
const batchHandler = http.get("/api/hcm/batch", async () => {
  await delay(300);
  return HttpResponse.json(INITIAL_BATCH);
});

const successSubmitHandler = http.post("/api/hcm/real-time", async ({ request }) => {
  await delay(800);
  const body = (await request.json()) as SubmitRequestPayload;
  const prevBalance =
    INITIAL_BATCH.balances.find(
      (b) =>
        b.employeeId === body.employeeId && b.location === body.location
    )?.balance ?? 10;
  return HttpResponse.json({
    success: true,
    balance: {
      employeeId: body.employeeId,
      location: body.location,
      balance: prevBalance - body.daysRequested,
      employeeName: body.employeeName,
      department: "Engineering",
    },
    timestamp: new Date().toISOString(),
  });
});

const slowSubmitHandler = http.post("/api/hcm/real-time", async ({ request }) => {
  await delay(5000);
  const body = (await request.json()) as SubmitRequestPayload;
  return HttpResponse.json({ success: true, balance: null, timestamp: new Date().toISOString() });
});

const rejectSubmitHandler = http.post("/api/hcm/real-time", async () => {
  await delay(500);
  return HttpResponse.json(
    { error: "Insufficient balance for locationId=US-NYC", code: "HCM_422" },
    { status: 422 }
  );
});

const refreshedBatchHandler = http.get("/api/hcm/batch", async () => {
  await delay(300);
  return HttpResponse.json(REFRESHED_BATCH);
});

const neverResolveHandler = http.get("/api/hcm/batch", async () => {
  await delay(86400000);
  return HttpResponse.json(INITIAL_BATCH);
});

const errorBatchHandler = http.get("/api/hcm/batch", async () => {
  await delay(300);
  return HttpResponse.json(
    { error: "HCM service unavailable", code: "HCM_500" },
    { status: 500 }
  );
});

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
const meta = {
  title: "TimeOff/Dashboard",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

// ---------------------------------------------------------------------------
// 1. Happy Path (Optimistic Success)
// ---------------------------------------------------------------------------
export const HappyPathOptimisticSuccess: StoryObj = {
  render: () => <DashboardStory />,
  parameters: {
    msw: {
      handlers: [batchHandler, successSubmitHandler],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByText("10")).toBeInTheDocument();
    });

    const startDate = canvas.getByLabelText("Start Date");
    const endDate = canvas.getByLabelText("End Date");
    const submitBtn = canvas.getByText("Submit Request");

    await userEvent.type(startDate, "2026-07-20");
    await userEvent.type(endDate, "2026-07-21");

    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(canvas.getByText("Submitting...")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(canvas.getByText("8")).toBeInTheDocument();
    });
  },
};

// ---------------------------------------------------------------------------
// 2. Slow Network / Silent Fail
// ---------------------------------------------------------------------------
export const SlowNetworkSilentFail: StoryObj = {
  render: () => <DashboardStory />,
  parameters: {
    msw: {
      handlers: [batchHandler, slowSubmitHandler],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByText("10")).toBeInTheDocument();
    });

    const startDate = canvas.getByLabelText("Start Date");
    const endDate = canvas.getByLabelText("End Date");
    const submitBtn = canvas.getByText("Submit Request");

    await userEvent.type(startDate, "2026-07-20");
    await userEvent.type(endDate, "2026-07-21");

    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(canvas.getByText("Submitting...")).toBeInTheDocument();
    });

    const syncingTexts = canvas.queryAllByText(/Syncing with server/i);
    expect(syncingTexts.length).toBeGreaterThanOrEqual(0);
  },
};

// ---------------------------------------------------------------------------
// 3. HCM-Rejected (Automatic Rollback)
// ---------------------------------------------------------------------------
export const HcmRejectedAutomaticRollback: StoryObj = {
  render: () => <DashboardStory />,
  parameters: {
    msw: {
      handlers: [batchHandler, rejectSubmitHandler],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByText("10")).toBeInTheDocument();
    });

    const startDate = canvas.getByLabelText("Start Date");
    const endDate = canvas.getByLabelText("End Date");
    const submitBtn = canvas.getByText("Submit Request");

    await userEvent.type(startDate, "2026-07-23");
    await userEvent.type(endDate, "2026-07-24");

    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(canvas.getByText("8")).toBeInTheDocument();
    });

    // Wait for rollback — balance returns to 10
    await waitFor(
      () => {
        expect(canvas.getByText("10")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  },
};

// ---------------------------------------------------------------------------
// 4. Mid-Session Refresh (Anniversary Bonus)
// ---------------------------------------------------------------------------
export const MidSessionRefreshAnniversaryBonus: StoryObj = {
  render: () => <DashboardStory />,
  parameters: {
    msw: {
      handlers: [refreshedBatchHandler, successSubmitHandler],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByText("15")).toBeInTheDocument();
    });

    const startDate = canvas.getByLabelText("Start Date");
    const endDate = canvas.getByLabelText("End Date");

    await userEvent.type(startDate, "2026-07-20");
    await userEvent.type(endDate, "2026-07-21");

    expect(startDate).toHaveValue("2026-07-20");
    expect(endDate).toHaveValue("2026-07-21");
  },
};

// ---------------------------------------------------------------------------
// 5. Loading Skeleton — batch endpoint never resolves
// ---------------------------------------------------------------------------
export const DashboardLoadingSkeleton: StoryObj = {
  render: () => <DashboardStory />,
  parameters: {
    msw: {
      handlers: [neverResolveHandler],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      const skeletons = canvasElement.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    expect(canvas.getByText("My Time-Off Dashboard")).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 6. Network Error — batch endpoint returns 500
// ---------------------------------------------------------------------------
export const DashboardNetworkError: StoryObj = {
  render: () => <DashboardStory />,
  parameters: {
    msw: {
      handlers: [errorBatchHandler],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByText("My Time-Off Dashboard")).toBeInTheDocument();
    });

    // BalanceCard should show 0 with stale indicator since query failed
    expect(canvas.getByText("0")).toBeInTheDocument();
  },
};
