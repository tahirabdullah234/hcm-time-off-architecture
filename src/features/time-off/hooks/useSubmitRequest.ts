"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BatchResponse, SubmitRequestPayload, PendingRequest } from "@/src/features/time-off/types";
import { useToast } from "@/src/providers/QueryClientProvider";

async function submitRequest(payload: SubmitRequestPayload): Promise<{ success: boolean }> {
  const res = await fetch("/api/hcm/real-time", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useSubmitRequest() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: submitRequest,

    onMutate: async (payload: SubmitRequestPayload) => {
      await queryClient.cancelQueries({ queryKey: ["hcm", "balances"] });

      const previousData = queryClient.getQueryData<BatchResponse>(["hcm", "balances"]);

      if (previousData) {
        const optimisticRequest: PendingRequest = {
          id: `opt-${crypto.randomUUID().slice(0, 8)}`,
          employeeId: payload.employeeId,
          employeeName: payload.employeeName,
          location: payload.location,
          daysRequested: payload.daysRequested,
          startDate: payload.startDate,
          endDate: payload.endDate,
          status: "optimistic-pending",
          submittedAt: new Date().toISOString(),
        };

        const updatedBalances = previousData.balances.map((b) => {
          if (b.employeeId === payload.employeeId && b.location === payload.location) {
            return { ...b, balance: b.balance - payload.daysRequested };
          }
          return b;
        });

        queryClient.setQueryData<BatchResponse>(["hcm", "balances"], {
          balances: updatedBalances,
          pendingRequests: [...previousData.pendingRequests, optimisticRequest],
        });
      }

      return { previousData };
    },

    onError: (error: Error, _payload, context) => {
      if (context?.previousData) {
        queryClient.setQueryData<BatchResponse>(["hcm", "balances"], context.previousData);
      }
      addToast(
        error.message === "Insufficient balance"
          ? "Time-off request rejected: insufficient balance. Your original balance has been restored."
          : `Request failed: ${error.message}. Your balance has been restored.`,
        "error"
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["hcm", "balances"] });
    },
  });
}
