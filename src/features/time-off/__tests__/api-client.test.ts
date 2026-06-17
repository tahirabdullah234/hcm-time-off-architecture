import { describe, it, expect, vi, beforeEach } from "vitest";
import { realTimeBalanceCheck, approveRequest, rejectRequest } from "../api-client";

function createFetchResponse(ok: boolean, status: number, data: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  });
}

describe("realTimeBalanceCheck", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns balance data on 200", async () => {
    const data = { success: true, balance: { employeeId: "EMP001", location: "US-NYC", balance: 10 } };
    vi.stubGlobal("fetch", createFetchResponse(true, 200, data));
    const result = await realTimeBalanceCheck("EMP001", "US-NYC");
    expect(result).toEqual(data);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", createFetchResponse(false, 404, { error: "Employee not found" }));
    await expect(realTimeBalanceCheck("EMP999", "UNKNOWN")).rejects.toThrow("Employee not found");
  });

  it("throws generic error when response body has no error field", async () => {
    vi.stubGlobal("fetch", createFetchResponse(false, 500, {}));
    await expect(realTimeBalanceCheck("EMP001", "US-NYC")).rejects.toThrow("Balance check failed");
  });

  it("throws generic error when json parse fails on error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("Invalid JSON"); },
    });
    vi.stubGlobal("fetch", mockFetch);
    await expect(realTimeBalanceCheck("EMP001", "US-NYC")).rejects.toThrow("Balance check failed");
  });

  it("encodes query parameters correctly", async () => {
    vi.stubGlobal("fetch", createFetchResponse(true, 200, {}));
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", mockFetch);
    await realTimeBalanceCheck("EMP001", "US-NYC");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/hcm/real-time?employeeId=EMP001&location=US-NYC"
    );
  });
});

describe("approveRequest", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns data on successful approval", async () => {
    const data = { success: true, request: { id: "REQ-001", status: "approved" } };
    vi.stubGlobal("fetch", createFetchResponse(true, 200, data));
    const result = await approveRequest("REQ-001", "EMP001", "US-NYC");
    expect(result).toEqual(data);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", createFetchResponse(false, 409, { error: "Insufficient balance" }));
    await expect(approveRequest("REQ-001", "EMP001", "US-NYC")).rejects.toThrow("Insufficient balance");
  });

  it("throws generic error when response has no error field", async () => {
    vi.stubGlobal("fetch", createFetchResponse(false, 500, {}));
    await expect(approveRequest("REQ-001", "EMP001", "US-NYC")).rejects.toThrow("Approval failed");
  });

  it("throws generic error when json parse fails on error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("Invalid JSON"); },
    });
    vi.stubGlobal("fetch", mockFetch);
    await expect(approveRequest("REQ-001", "EMP001", "US-NYC")).rejects.toThrow("Approval failed");
  });

  it("sends PATCH with correct body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", mockFetch);
    await approveRequest("REQ-001", "EMP001", "US-NYC");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/hcm/real-time",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: "REQ-001", action: "approve", employeeId: "EMP001", location: "US-NYC" }),
      })
    );
  });
});

describe("rejectRequest", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns data on successful rejection", async () => {
    const data = { success: true, request: { id: "REQ-001", status: "rejected" } };
    vi.stubGlobal("fetch", createFetchResponse(true, 200, data));
    const result = await rejectRequest("REQ-001");
    expect(result).toEqual(data);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", createFetchResponse(false, 404, { error: "Request not found" }));
    await expect(rejectRequest("REQ-001")).rejects.toThrow("Request not found");
  });

  it("throws generic error when response has no error field", async () => {
    vi.stubGlobal("fetch", createFetchResponse(false, 500, {}));
    await expect(rejectRequest("REQ-001")).rejects.toThrow("Rejection failed");
  });

  it("throws generic error when json parse fails on error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("Invalid JSON"); },
    });
    vi.stubGlobal("fetch", mockFetch);
    await expect(rejectRequest("REQ-001")).rejects.toThrow("Rejection failed");
  });

  it("sends PATCH with correct body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", mockFetch);
    await rejectRequest("REQ-002");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/hcm/real-time",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ requestId: "REQ-002", action: "reject" }),
      })
    );
  });
});
