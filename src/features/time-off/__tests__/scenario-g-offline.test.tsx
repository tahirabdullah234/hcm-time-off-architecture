import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { RequestForm } from "../components/RequestForm";
import { PendingRequestRow } from "../components/PendingRequestRow";
import { OfflineBanner } from "@/src/components/OfflineBanner";
import type { PendingRequest } from "../types";

// ---------------------------------------------------------------------------
// Scenario G: Offline Degradation
//   When the browser goes offline:
//     - A sticky banner displays "You are offline. Reconnecting to HCM..."
//     - Submit, Approve, and Deny buttons become disabled
//   When the browser comes back online:
//     - The banner disappears
//     - Buttons re-enable
// ---------------------------------------------------------------------------

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

// -----------------------------------------------------------------------
// Helpers: mock navigator.onLine to simulate offline/online transitions
// -----------------------------------------------------------------------
function setNavigatorOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    writable: false,
    value: online,
  });
}

describe("Scenario G: Offline Degradation", () => {
  beforeEach(() => {
    setNavigatorOnline(true);
  });

  // -----------------------------------------------------------------------
  // RequestForm offline behaviour
  // -----------------------------------------------------------------------
  describe("RequestForm", () => {
    it("disables submit button and shows offline message when isOffline is true", () => {
      render(
        <RequestForm
          employeeId="EMP001"
          employeeName="Alice Chen"
          location="US-NYC"
          maxBalance={15}
          onSubmit={vi.fn()}
          isOffline
        />
      );

      expect(screen.getByRole("button")).toBeDisabled();
      expect(
        screen.getByText("You are offline. Reconnecting to HCM...")
      ).toBeInTheDocument();
    });

    it("enables submit button and hides offline message when isOffline is false", () => {
      render(
        <RequestForm
          employeeId="EMP001"
          employeeName="Alice Chen"
          location="US-NYC"
          maxBalance={15}
          onSubmit={vi.fn()}
          isOffline={false}
        />
      );

      const startInput = screen.getByLabelText("Start Date");
      const endInput = screen.getByLabelText("End Date");
      fireEvent.change(startInput, { target: { value: "2026-07-10" } });
      fireEvent.change(endInput, { target: { value: "2026-07-12" } });

      expect(screen.getByRole("button")).not.toBeDisabled();
      expect(
        screen.queryByText("You are offline. Reconnecting to HCM...")
      ).not.toBeInTheDocument();
    });

    it("defaults to enabled when isOffline is not set", () => {
      render(
        <RequestForm
          employeeId="EMP001"
          employeeName="Alice Chen"
          location="US-NYC"
          maxBalance={15}
          onSubmit={vi.fn()}
        />
      );

      const startInput = screen.getByLabelText("Start Date");
      const endInput = screen.getByLabelText("End Date");
      fireEvent.change(startInput, { target: { value: "2026-07-10" } });
      fireEvent.change(endInput, { target: { value: "2026-07-12" } });

      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // PendingRequestRow offline behaviour
  // -----------------------------------------------------------------------
  describe("PendingRequestRow", () => {
    it("disables approve and deny buttons and shows offline message when isOffline is true", () => {
      render(
        <PendingRequestRow
          request={baseRequest}
          showActions
          isOffline
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
      expect(
        screen.getByText("You are offline. Reconnecting to HCM...")
      ).toBeInTheDocument();
    });

    it("enables approve and deny buttons when isOffline is false", () => {
      render(
        <PendingRequestRow
          request={baseRequest}
          showActions
          isOffline={false}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
      expect(
        screen.queryByText("You are offline. Reconnecting to HCM...")
      ).not.toBeInTheDocument();
    });

    it("hides offline message when showActions is false even if isOffline is true", () => {
      render(
        <PendingRequestRow
          request={baseRequest}
          showActions={false}
          isOffline
        />
      );

      expect(
        screen.queryByText("You are offline. Reconnecting to HCM...")
      ).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // OfflineBanner integration: responds to online/offline window events
  // -----------------------------------------------------------------------
  describe("OfflineBanner", () => {
    it("renders nothing when online", () => {
      const { container } = render(<OfflineBanner />);
      expect(container).toBeEmptyDOMElement();
    });

    it("appears on window offline event and disappears on window online event", () => {
      const { container } = render(<OfflineBanner />);
      expect(container).toBeEmptyDOMElement();

      setNavigatorOnline(false);
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });

      expect(
        screen.getByText("You are offline. Reconnecting to HCM...")
      ).toBeInTheDocument();

      setNavigatorOnline(true);
      act(() => {
        window.dispatchEvent(new Event("online"));
      });

      expect(
        screen.queryByText("You are offline. Reconnecting to HCM...")
      ).not.toBeInTheDocument();
    });
  });
});
