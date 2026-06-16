import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RequestForm } from "../components/RequestForm";

describe("RequestForm", () => {
  it("renders form fields and submit button", () => {
    render(
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={15}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Days Requested")).toBeInTheDocument();
    expect(screen.getByText("Submit Request")).toBeInTheDocument();
  });

  it("displays max balance hint", () => {
    render(
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={15}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText(/Available balance: 15 days/)).toBeInTheDocument();
  });

  it("shows submitting state", () => {
    render(
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={15}
        onSubmit={vi.fn()}
        isSubmitting
      />
    );

    expect(screen.getByText("Submitting...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onSubmit with form data", () => {
    const onSubmit = vi.fn();
    render(
      <RequestForm
        employeeId="EMP001"
        employeeName="Alice Chen"
        location="US-NYC"
        maxBalance={15}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText("Start Date"), {
      target: { value: "2026-07-10" },
    });
    fireEvent.change(screen.getByLabelText("End Date"), {
      target: { value: "2026-07-12" },
    });
    fireEvent.change(screen.getByLabelText("Days Requested"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByText("Submit Request"));

    expect(onSubmit).toHaveBeenCalledWith({
      employeeId: "EMP001",
      employeeName: "Alice Chen",
      location: "US-NYC",
      daysRequested: 3,
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    });
  });
});
