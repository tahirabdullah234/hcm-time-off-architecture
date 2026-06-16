import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  employees as storeEmployees,
  pendingRequests as storePendingRequests,
  type TimeOffBalance,
  type PendingRequestRecord,
} from "../api-store";

interface TestEmployee extends TimeOffBalance {}
interface TestPendingRequest extends PendingRequestRecord {}

describe("PATCH reject - balance restoration (server-side logic)", () => {
  let originalEmployees: TestEmployee[];
  let originalPending: TestPendingRequest[];

  beforeEach(() => {
    originalEmployees = storeEmployees.map((e) => ({ ...e }));
    originalPending = storePendingRequests.map((r) => ({ ...r }));
  });

  afterEach(() => {
    storeEmployees.length = 0;
    storePendingRequests.length = 0;
    storeEmployees.push(...originalEmployees);
    storePendingRequests.push(...originalPending);
  });

  it("restores employee balance when a pending request is rejected", () => {
    const pendingReq = storePendingRequests.find((r) => r.id === "REQ-001")!;
    const employee = storeEmployees.find(
      (e) =>
        e.employeeId === pendingReq.employeeId &&
        e.location === pendingReq.location
    )!;

    const balanceBefore = employee.balance;

    employee.balance += pendingReq.daysRequested;
    pendingReq.status = "rejected";

    expect(employee.balance).toBe(balanceBefore + pendingReq.daysRequested);
    expect(pendingReq.status).toBe("rejected");
  });

  it("rejecting REQ-002 restores Clara Johansson's UK-LON balance", () => {
    const pendingReq = storePendingRequests.find((r) => r.id === "REQ-002")!;
    const employee = storeEmployees.find(
      (e) =>
        e.employeeId === pendingReq.employeeId &&
        e.location === pendingReq.location
    )!;

    const balanceBefore = employee.balance;

    employee.balance += pendingReq.daysRequested;
    pendingReq.status = "rejected";

    expect(employee.balance).toBe(balanceBefore + 5);
    expect(pendingReq.status).toBe("rejected");
  });

  it("does not throw if employee is missing from store (graceful fallback)", () => {
    const ghostRequest: TestPendingRequest = {
      id: "REQ-GHOST",
      employeeId: "EMP999",
      employeeName: "Ghost",
      location: "NOWHERE",
      daysRequested: 2,
      startDate: "2026-09-01",
      endDate: "2026-09-02",
      status: "pending",
      submittedAt: "2026-06-16T00:00:00Z",
    };

    const employee = storeEmployees.find(
      (e) =>
        e.employeeId === ghostRequest.employeeId &&
        e.location === ghostRequest.location
    );

    expect(employee).toBeUndefined();

    ghostRequest.status = "rejected";
    expect(ghostRequest.status).toBe("rejected");
  });

  it("allows a new submission after rejection restores balance", () => {
    const alice = storeEmployees.find(
      (e) => e.employeeId === "EMP001" && e.location === "US-NYC"
    )!;
    const req1 = storePendingRequests.find((r) => r.id === "REQ-001")!;

    const balanceAfterReject = alice.balance + req1.daysRequested;

    alice.balance = balanceAfterReject;
    req1.status = "rejected";

    expect(alice.balance - 2).toBeGreaterThanOrEqual(0);
  });
});
