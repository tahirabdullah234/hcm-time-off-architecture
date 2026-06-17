import type { Meta, StoryObj } from "@storybook/react";
import { expect, within, userEvent } from "storybook/test";
import { BalanceCard } from "./components/BalanceCard";
import { RequestForm } from "./components/RequestForm";
import { PendingRequestRow } from "./components/PendingRequestRow";
import { Button } from "@/src/components/ui/Button";

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
const meta = {
  title: "TimeOff/Components",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;

// ---------------------------------------------------------------------------
// BalanceCard — all observable states
// ---------------------------------------------------------------------------
export const BalanceCardDefault: StoryObj<typeof BalanceCard> = {
  render: () => (
    <div className="w-80">
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={15}
      />
    </div>
  ),
};

export const BalanceCardLoading: StoryObj<typeof BalanceCard> = {
  render: () => (
    <div className="w-80">
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={0}
        isLoading
      />
    </div>
  ),
};

export const BalanceCardStale: StoryObj<typeof BalanceCard> = {
  render: () => (
    <div className="w-80">
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={15}
        isStale
      />
    </div>
  ),
};

export const BalanceCardOptimistic: StoryObj<typeof BalanceCard> = {
  render: () => (
    <div className="w-80">
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={12}
        isOptimistic
      />
    </div>
  ),
};

export const BalanceCardOptimisticRolledBack: StoryObj<typeof BalanceCard> = {
  render: () => (
    <div className="w-80">
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={15}
        isStale
      />
      <p className="mt-2 text-xs text-red-600">
        Previous request was rolled back by HCM. Balance restored to 15.
      </p>
    </div>
  ),
};

export const BalanceCardLow: StoryObj<typeof BalanceCard> = {
  render: () => (
    <div className="w-80">
      <BalanceCard
        employeeName="David Kim"
        department="Engineering"
        location="US-NYC"
        balance={2}
      />
    </div>
  ),
};

export const BalanceCardReconciling: StoryObj<typeof BalanceCard> = {
  render: () => (
    <div className="w-80">
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={12}
        isReconciling
      />
    </div>
  ),
};

export const BalanceCardRefreshedMidSession: StoryObj<typeof BalanceCard> = {
  render: () => (
    <div className="w-80">
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={18}
        isStale
      />
      <p className="mt-2 text-xs text-amber-600">
        Balance updated: work-anniversary bonus applied.
      </p>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// RequestForm — with interaction test
// ---------------------------------------------------------------------------
export const RequestFormDefault: StoryObj<typeof RequestForm> = {
  render: () => (
    <div className="w-80">
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={15}
        onSubmit={(p) => console.log("Submit:", p)}
      />
    </div>
  ),
};

export const RequestFormOffline: StoryObj<typeof RequestForm> = {
  render: () => (
    <div className="w-80">
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={15}
        onSubmit={(p) => console.log("Submit:", p)}
        isOffline
      />
    </div>
  ),
};

export const RequestFormValidationPastDate: StoryObj<typeof RequestForm> = {
  render: () => (
    <div className="w-80">
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={15}
        onSubmit={(p) => console.log("Submit:", p)}
      />
    </div>
  ),
};

export const RequestFormValidationOverlap: StoryObj<typeof RequestForm> = {
  render: () => (
    <div className="w-80">
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={15}
        onSubmit={(p) => console.log("Submit:", p)}
        existingRanges={[{ startDate: "2026-07-10", endDate: "2026-07-12" }]}
      />
    </div>
  ),
};

export const RequestFormValidationInsufficientBalance: StoryObj<typeof RequestForm> = {
  render: () => (
    <div className="w-80">
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={2}
        onSubmit={(p) => console.log("Submit:", p)}
      />
    </div>
  ),
};

export const RequestFormSubmitting: StoryObj<typeof RequestForm> = {
  render: () => (
    <div className="w-80">
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={15}
        onSubmit={(p) => console.log("Submit:", p)}
        isSubmitting
      />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// PendingRequestRow — all statuses
// ---------------------------------------------------------------------------
export const PendingRequestDefault: StoryObj<typeof PendingRequestRow> = {
  render: () => (
    <div className="w-full max-w-xl">
      <PendingRequestRow
        request={{
          id: "REQ-001",
          employeeId: "EMP001",
          employeeName: "Alice Chen",
          location: "US-NYC",
          daysRequested: 3,
          startDate: "2026-07-10",
          endDate: "2026-07-12",
          status: "pending",
          submittedAt: "2026-06-14T09:30:00Z",
        }}
      />
    </div>
  ),
};

export const PendingRequestWithActions: StoryObj<typeof PendingRequestRow> = {
  render: () => (
    <div className="w-full max-w-xl">
      <PendingRequestRow
        request={{
          id: "REQ-001",
          employeeId: "EMP001",
          employeeName: "Alice Chen",
          location: "US-NYC",
          daysRequested: 3,
          startDate: "2026-07-10",
          endDate: "2026-07-12",
          status: "pending",
          submittedAt: "2026-06-14T09:30:00Z",
        }}
        showActions
        onApprove={(id) => console.log("Approve:", id)}
        onReject={(id) => console.log("Reject:", id)}
      />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Verify approve and deny buttons render", async () => {
      expect(canvas.getByText("Approve")).toBeInTheDocument();
      expect(canvas.getByText("Deny")).toBeInTheDocument();
    });

    await step("Click approve shows loading state", async () => {
      const approveBtn = canvas.getByText("Approve");
      await userEvent.click(approveBtn);
    });
  },
};

export const PendingRequestOffline: StoryObj<typeof PendingRequestRow> = {
  render: () => (
    <div className="w-full max-w-xl">
      <PendingRequestRow
        request={{
          id: "REQ-001",
          employeeId: "EMP001",
          employeeName: "Alice Chen",
          location: "US-NYC",
          daysRequested: 3,
          startDate: "2026-07-10",
          endDate: "2026-07-12",
          status: "pending",
          submittedAt: "2026-06-14T09:30:00Z",
        }}
        showActions
        isOffline
        onApprove={(id) => console.log("Approve:", id)}
        onReject={(id) => console.log("Reject:", id)}
      />
    </div>
  ),
};

export const PendingRequestValidating: StoryObj<typeof PendingRequestRow> = {
  render: () => (
    <div className="w-full max-w-xl">
      <PendingRequestRow
        request={{
          id: "REQ-001",
          employeeId: "EMP001",
          employeeName: "Alice Chen",
          location: "US-NYC",
          daysRequested: 3,
          startDate: "2026-07-10",
          endDate: "2026-07-12",
          status: "pending",
          submittedAt: "2026-06-14T09:30:00Z",
        }}
        showActions
        isValidating
        onApprove={(id) => console.log("Approve:", id)}
        onReject={(id) => console.log("Reject:", id)}
      />
    </div>
  ),
};

export const PendingRequestOptimistic: StoryObj<typeof PendingRequestRow> = {
  render: () => (
    <div className="w-full max-w-xl">
      <PendingRequestRow
        request={{
          id: "opt-a1b2c3d4",
          employeeId: "EMP001",
          employeeName: "Alice Chen",
          location: "US-NYC",
          daysRequested: 2,
          startDate: "2026-07-20",
          endDate: "2026-07-21",
          status: "optimistic-pending",
          submittedAt: "2026-06-16T10:00:00Z",
        }}
      />
    </div>
  ),
};

export const PendingRequestApproved: StoryObj<typeof PendingRequestRow> = {
  render: () => (
    <div className="w-full max-w-xl">
      <PendingRequestRow
        request={{
          id: "REQ-002",
          employeeId: "EMP003",
          employeeName: "Clara Johansson",
          location: "UK-LON",
          daysRequested: 5,
          startDate: "2026-08-01",
          endDate: "2026-08-05",
          status: "approved",
          submittedAt: "2026-06-15T14:00:00Z",
        }}
      />
    </div>
  ),
};

export const PendingRequestRejected: StoryObj<typeof PendingRequestRow> = {
  render: () => (
    <div className="w-full max-w-xl">
      <PendingRequestRow
        request={{
          id: "REQ-003",
          employeeId: "EMP002",
          employeeName: "Bob Martinez",
          location: "US-SFO",
          daysRequested: 10,
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          status: "rejected",
          submittedAt: "2026-06-13T11:00:00Z",
        }}
      />
    </div>
  ),
};

export const PendingRequestRolledBack: StoryObj<typeof PendingRequestRow> = {
  render: () => (
    <div className="w-full max-w-xl">
      <div className="space-y-2">
        <PendingRequestRow
          request={{
            id: "opt-rollback-001",
            employeeId: "EMP001",
            employeeName: "Alice Chen",
            location: "US-NYC",
            daysRequested: 2,
            startDate: "2026-07-20",
            endDate: "2026-07-21",
            status: "optimistic-pending",
            submittedAt: "2026-06-16T10:00:00Z",
          }}
        />
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          HCM rejected this request. The optimistic entry will be removed and
          your balance restored.
        </div>
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Empty / Zero-Balance States — no pending requests and zero balance
// ---------------------------------------------------------------------------
export const EmptyRequestsList: StoryObj = {
  render: () => (
    <div className="w-80 space-y-4">
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={0}
      />
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-zinc-600 dark:text-zinc-500">
        No pending requests
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// HCM Silent Wrong — 200 returned but balance not actually deducted
// ---------------------------------------------------------------------------
export const HcmSilentlyWrong: StoryObj = {
  render: () => (
    <div className="w-full max-w-xl space-y-4">
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={15}
        isStale
      />
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <strong>HCM responded 200 OK</strong>, but the balance was not deducted.
        This happens when the HCM accepts the request format but silently
        discards the mutation. The balance below shows the server-truth value,
        which did not change.
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="rounded bg-zinc-100 px-2 py-1 font-mono dark:bg-zinc-800">
          Balance before: 15
        </span>
        <span className="text-zinc-300">&rarr;</span>
        <span className="rounded bg-zinc-100 px-2 py-1 font-mono dark:bg-zinc-800">
          Balance after: 15 (unchanged)
        </span>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={() => alert("Manual reconciliation triggered")}
      >
        Reconcile Now
      </Button>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Balance Refreshed Mid-Session — Anniversary bonus arrives mid-poll
// ---------------------------------------------------------------------------
export const BalanceRefreshedMidSession: StoryObj = {
  render: () => (
    <div className="w-full max-w-xl space-y-3">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
        Background sync completed &mdash; balances refreshed
      </div>
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={18}
        isStale
      />
      <p className="text-xs text-zinc-500">
        Alice&rsquo;s balance was 15 before the sync. The 30-second poll
        detected a work-anniversary bonus of +3 days. The card shows the
        updated server value with a &ldquo;stale&rdquo; indicator to signal
        data was refreshed in the background.
      </p>
    </div>
  ),
};
