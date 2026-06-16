"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBalances } from "@/src/features/time-off/hooks/useBalances";
import {
  realTimeBalanceCheck,
  approveRequest,
  rejectRequest,
} from "@/src/features/time-off/api-client";
import { BalanceCard } from "@/src/features/time-off/components/BalanceCard";
import { PendingRequestRow } from "@/src/features/time-off/components/PendingRequestRow";
import { Card, CardHeader, CardTitle } from "@/src/components/ui/Card";
import { useToast } from "@/src/providers/QueryClientProvider";

export default function ManagerDashboard() {
  const { data, isLoading, isFetching } = useBalances();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const handleApprove = useCallback(async (requestId: string) => {
    const req = data?.pendingRequests.find((r) => r.id === requestId);
    if (!req) return;

    setValidatingId(requestId);

    try {
      await realTimeBalanceCheck(req.employeeId, req.location);
      await approveRequest(requestId, req.employeeId, req.location);
      addToast(
        `Approved ${req.employeeName}'s request for ${req.daysRequested} days.`,
        "success"
      );
      queryClient.invalidateQueries({ queryKey: ["hcm", "balances"] });
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Approval failed: balance may have changed.",
        "error"
      );
    } finally {
      setValidatingId(null);
    }
  }, [data, queryClient, addToast]);

  const handleReject = useCallback(async (requestId: string) => {
    const req = data?.pendingRequests.find((r) => r.id === requestId);
    if (!req) return;

    setValidatingId(requestId);

    try {
      await rejectRequest(requestId);
      addToast(`Denied ${req.employeeName}'s request.`, "info");
      queryClient.invalidateQueries({ queryKey: ["hcm", "balances"] });
    } catch (err) {
      addToast("Failed to reject request.", "error");
    } finally {
      setValidatingId(null);
    }
  }, [data, queryClient, addToast]);

  const pendingRequests =
    data?.pendingRequests.filter(
      (r) => r.status === "pending" || r.status === "optimistic-pending"
    ) ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Manager Dashboard
      </h1>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Team Balances
        </h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.balances.map((balance) => (
              <BalanceCard
                key={`${balance.employeeId}-${balance.location}`}
                employeeName={balance.employeeName}
                department={balance.department}
                location={balance.location}
                balance={balance.balance}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Pending Requests
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : pendingRequests.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No pending requests</CardTitle>
            </CardHeader>
            <p className="text-sm text-zinc-400">
              All requests have been reviewed.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <PendingRequestRow
                key={req.id}
                request={req}
                showActions
                isValidating={validatingId === req.id}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </section>

      {isFetching && !isLoading && (
        <p className="mt-4 text-center text-xs text-zinc-400">
          Refreshing team data...
        </p>
      )}
    </div>
  );
}
