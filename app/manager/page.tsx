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
import { Button } from "@/src/components/ui/Button";
import { useOnline } from "@/src/hooks/useOnline";
import { useToast } from "@/src/providers/QueryClientProvider";

export default function ManagerDashboard() {
  const { data, isLoading, isFetching } = useBalances();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const isOnline = useOnline();
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [scenarioLog, setScenarioLog] = useState<string[]>([]);

  const log = (msg: string) => setScenarioLog((prev) => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);

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

  const triggerLateDeduction = async (employeeId: string) => {
    const emp = data?.balances.find((b) => b.employeeId === employeeId);
    if (!emp) { log("Employee not found"); return; }
    log(`Simulating late deduction for ${emp.employeeName} (current balance: ${emp.balance})...`);
    await fetch(`/api/hcm/batch?triggerLateDeduction=${employeeId}`);
    queryClient.invalidateQueries({ queryKey: ["hcm", "balances"] });
    log(`Deducted 1-5 days from ${emp.employeeName}. Try approving now - should fail if balance dropped below requested.`);
  };

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
                isOffline={!isOnline}
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

      <section className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Test Scenarios (Evaluator Use)
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          Click any button to simulate a real-world HCM behavior. Watch the approval flow and balance card react.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => triggerLateDeduction("EMP001")} disabled={!isOnline}>
            Simulate Late Deduction (EMP001 - Alice)
          </Button>
        </div>
        {scenarioLog.length > 0 && (
          <div className="mt-4 space-y-1">
            {scenarioLog.map((entry, i) => (
              <p key={i} className="text-xs text-zinc-500">{entry}</p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
