import type { Meta, StoryObj } from "@storybook/react";
import { BalanceCard } from "./components/BalanceCard";
import { RequestForm } from "./components/RequestForm";
import { PendingRequestRow } from "./components/PendingRequestRow";

const meta = {
  title: "TimeOff/Components",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;

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

export const BalanceCardLowBalance: StoryObj<typeof BalanceCard> = {
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
