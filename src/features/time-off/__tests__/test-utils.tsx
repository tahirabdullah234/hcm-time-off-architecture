import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { BatchResponse } from "@/src/features/time-off/types";
import { ToastContext } from "@/src/providers/QueryClientProvider";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function createWrapper(
  queryClient?: QueryClient,
  toastValue?: { addToast: ReturnType<typeof vi.fn> }
) {
  const client = queryClient ?? createTestQueryClient();
  const addToast = toastValue?.addToast ?? (() => {});

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ToastContext.Provider value={{ toasts: [], addToast, removeToast: () => {} }}>
          {children}
        </ToastContext.Provider>
      </QueryClientProvider>
    );
  };
}

export function seedBalances(
  queryClient: QueryClient,
  overrides?: Partial<BatchResponse>
) {
  const defaultData: BatchResponse = {
    balances: [
      {
        employeeId: "EMP001",
        location: "US-NYC",
        balance: 15,
        employeeName: "Alice Chen",
        department: "Engineering",
      },
      {
        employeeId: "EMP002",
        location: "US-SFO",
        balance: 22,
        employeeName: "Bob Martinez",
        department: "Design",
      },
    ],
    pendingRequests: [
      {
        id: "REQ-001",
        employeeId: "EMP001",
        employeeName: "Alice Chen",
        location: "US-NYC",
        daysRequested: 3,
        startDate: "2026-07-10",
        endDate: "2026-07-12",
        status: "pending",
        submittedAt: "2026-06-14T09:30:00Z",
      },
    ],
  };

  queryClient.setQueryData<BatchResponse>(["hcm", "balances"], {
    ...defaultData,
    ...overrides,
    balances: overrides?.balances ?? defaultData.balances,
    pendingRequests: overrides?.pendingRequests ?? defaultData.pendingRequests,
  });
}

export function getBalances(queryClient: QueryClient): BatchResponse | undefined {
  return queryClient.getQueryData<BatchResponse>(["hcm", "balances"]);
}

export interface ControlledFetch {
  mockFetch: ReturnType<typeof vi.fn>;
  resolve: (response?: Partial<Response>) => void;
  reject: (error: Error) => void;
}

export function createControlledFetch(): ControlledFetch {
  let resolvePromise!: (value: Response) => void;
  let rejectPromise!: (reason: Error) => void;

  const promise = new Promise<Response>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const mockFetch = vi.fn().mockImplementation(() => promise);

  return {
    mockFetch,
    resolve: (response?: Partial<Response>) => {
      resolvePromise({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        redirected: false,
        type: "basic" as ResponseType,
        url: "",
        clone: () => null as unknown as Response,
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
        text: () => Promise.resolve(""),
        json: () => Promise.resolve(response ?? {}),
        ...response,
      } as Response);
    },
    reject: (error: Error) => {
      rejectPromise(error);
    },
  };
}

export function createSuccessResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    redirected: false,
    type: "basic" as ResponseType,
    url: "",
    clone: () => null as unknown as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(""),
    json: () => Promise.resolve(data),
  } as Response;
}

export function createErrorResponse(
  status: number,
  errorBody: Record<string, string>
): Response {
  return {
    ok: false,
    status,
    statusText:
      status === 422
        ? "Unprocessable Entity"
        : status === 500
          ? "Internal Server Error"
          : "Error",
    headers: new Headers(),
    redirected: false,
    type: "basic" as ResponseType,
    url: "",
    clone: () => null as unknown as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(""),
    json: () => Promise.resolve(errorBody),
  } as Response;
}
