import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BalanceCard } from "../components/BalanceCard";

describe("BalanceCard", () => {
  it("renders employee name, department, location, and balance", () => {
    render(
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={15}
      />
    );

    expect(screen.getByText(/Alice Chen/)).toBeInTheDocument();
    expect(screen.getByText(/Engineering/)).toBeInTheDocument();
    expect(screen.getByText(/US-NYC/)).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders low balance correctly", () => {
    render(
      <BalanceCard
        employeeName="David Kim"
        department="Engineering"
        location="US-NYC"
        balance={2}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows loading skeleton when isLoading is true", () => {
    const { container } = render(
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={0}
        isLoading
      />
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText("15")).not.toBeInTheDocument();
  });

  it("displays stale badge when isStale is true", () => {
    render(
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={15}
        isStale
      />
    );

    expect(screen.getByText("stale")).toBeInTheDocument();
  });

  it("renders zero balance without error", () => {
    render(
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={0}
      />
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText(/Alice Chen/)).toBeInTheDocument();
  });

  it("displays pending badge when isOptimistic is true", () => {
    render(
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={12}
        isOptimistic
      />
    );

    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("displays reconciling badge when isReconciling is true", () => {
    render(
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={15}
        isReconciling
      />
    );

    expect(
      screen.getByText("⚠️ Out of sync with HCM. Re-verifying...")
    ).toBeInTheDocument();
  });

  it("hides reconciling badge when isReconciling is false", () => {
    render(
      <BalanceCard
        employeeName="Alice Chen"
        department="Engineering"
        location="US-NYC"
        balance={15}
        isReconciling={false}
      />
    );

    expect(
      screen.queryByText("⚠️ Out of sync with HCM. Re-verifying...")
    ).not.toBeInTheDocument();
  });
});
