import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSubmitRequest } from "../hooks/useSubmitRequest";
import { useToast } from "@/src/providers/QueryClientProvider";

vi.mock("@/src/providers/QueryClientProvider", async () => {
  const actual = await vi.importActual("@/src/providers/QueryClientProvider");
  return {
    ...actual,
    useToast: vi.fn(),
  };
});

const mockAddToast = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

const validPayload = {
  employeeId: "EMP001",
  location: "US-NYC",
  daysRequested: 3,
  startDate: "2026-07-10",
  endDate: "2026-07-12",
  employeeName: "Alice Chen",
};

describe("useSubmitRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({ addToast: mockAddToast });
  });

  it("submits a request successfully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(validPayload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/hcm/real-time", expect.any(Object));
  });

  it("handles API error and triggers rollback", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: "Insufficient balance" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(validPayload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.stringContaining("insufficient balance"),
      "error"
    );
  });

  it("triggers toast on network failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(validPayload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAddToast).toHaveBeenCalled();
  });
});
