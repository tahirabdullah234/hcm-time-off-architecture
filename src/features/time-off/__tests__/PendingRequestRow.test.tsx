import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PendingRequestRow } from "../components/PendingRequestRow";
import type { PendingRequest } from "../types";

const baseRequest: PendingRequest = {
  id: "REQ-001",
  employeeId: "EMP001",
  employeeName: "Alice Chen",
  location: "US-NYC",
  daysRequested: 3,
  startDate: "2026-07-10",
  endDate: "2026-07-12",
  status: "pending",
  submittedAt: "2026-06-14T09:30:00Z",
};

describe("PendingRequestRow", () => {
  it("renders employee name and request details", () => {
    render(<PendingRequestRow request={baseRequest} />);

    expect(screen.getByText("Alice Chen")).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText(/2026-07-10/)).toBeInTheDocument();
    expect(screen.getByText(/US-NYC/)).toBeInTheDocument();
  });

  it("shows pending status badge", () => {
    render(<PendingRequestRow request={baseRequest} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows approved status badge", () => {
    render(
      <PendingRequestRow
        request={{ ...baseRequest, status: "approved" }}
      />
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("shows rejected status badge", () => {
    render(
      <PendingRequestRow
        request={{ ...baseRequest, status: "rejected" }}
      />
    );
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("shows optimistic-pending status badge", () => {
    render(
      <PendingRequestRow
        request={{ ...baseRequest, status: "optimistic-pending" }}
      />
    );
    expect(screen.getByText("Syncing...")).toBeInTheDocument();
  });

  it("renders approve and deny buttons when showActions is true", () => {
    render(
      <PendingRequestRow request={baseRequest} showActions />
    );

    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Deny")).toBeInTheDocument();
  });

  it("does not render action buttons when showActions is false", () => {
    render(<PendingRequestRow request={baseRequest} />);

    expect(screen.queryByText("Approve")).not.toBeInTheDocument();
    expect(screen.queryByText("Deny")).not.toBeInTheDocument();
  });

  it("calls onApprove when approve button is clicked", () => {
    const onApprove = vi.fn();
    render(
      <PendingRequestRow
        request={baseRequest}
        showActions
        onApprove={onApprove}
      />
    );

    fireEvent.click(screen.getByText("Approve"));
    expect(onApprove).toHaveBeenCalledWith("REQ-001");
  });

  it("calls onReject when deny button is clicked", () => {
    const onReject = vi.fn();
    render(
      <PendingRequestRow
        request={baseRequest}
        showActions
        onReject={onReject}
      />
    );

    fireEvent.click(screen.getByText("Deny"));
    expect(onReject).toHaveBeenCalledWith("REQ-001");
  });
});
