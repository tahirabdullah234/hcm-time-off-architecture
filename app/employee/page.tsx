"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBalances } from "@/src/features/time-off/hooks/useBalances";
import { useSubmitRequest } from "@/src/features/time-off/hooks/useSubmitRequest";
import { BalanceCard } from "@/src/features/time-off/components/BalanceCard";
import { RequestForm } from "@/src/features/time-off/components/RequestForm";
import { PendingRequestRow } from "@/src/features/time-off/components/PendingRequestRow";
import { Button } from "@/src/components/ui/Button";
import type { SubmitRequestPayload } from "@/src/features/time-off/types";

const CURRENT_EMPLOYEE = {
  employeeId: "EMP001",
  employeeName: "Alice Chen",
  location: "US-NYC",
  department: "Engineering",
};

export default function EmployeeDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isStale, isFetching } = useBalances();
  const submitMutation = useSubmitRequest();

  const myBalance = data?.balances.find(
    (b) => b.employeeId === CURRENT_EMPLOYEE.employeeId && b.location === CURRENT_EMPLOYEE.location
  );

  const myRequests = data?.pendingRequests.filter(
    (r) => r.employeeId === CURRENT_EMPLOYEE.employeeId
  ) ?? [];

  const hasOptimistic = myRequests.some((r) => r.status === "optimistic-pending");

  const pendingRequests = myRequests.filter(
    (r) => r.status === "pending" || r.status === "optimistic-pending"
  );
  const existingDateRanges = pendingRequests.map((r) => ({
    startDate: r.startDate,
    endDate: r.endDate,
  }));

  const handleSubmit = (payload: SubmitRequestPayload) => {
    submitMutation.mutate(payload);
  };

  const [scenarioLog, setScenarioLog] = useState<string[]>([]);

  const log = (msg: string) => setScenarioLog((prev) => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const triggerAnniversary = async () => {
    log("Triggering anniversary bonus...");
    await fetch("/api/hcm/batch?triggerAnniversary=true");
    queryClient.invalidateQueries({ queryKey: ["hcm", "balances"] });
    log("Anniversary bonus applied! Balance should increase by 1-3 days.");
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        My Time-Off Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <BalanceCard
          employeeName={CURRENT_EMPLOYEE.employeeName}
          department={CURRENT_EMPLOYEE.department}
          location={CURRENT_EMPLOYEE.location}
          balance={myBalance?.balance ?? 0}
          isLoading={isLoading}
          isStale={isStale}
          isOptimistic={hasOptimistic}
        />

        <RequestForm
          employeeId={CURRENT_EMPLOYEE.employeeId}
          employeeName={CURRENT_EMPLOYEE.employeeName}
          location={CURRENT_EMPLOYEE.location}
          maxBalance={myBalance?.balance ?? 0}
          existingRanges={existingDateRanges}
          onSubmit={handleSubmit}
          isSubmitting={submitMutation.isPending}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          My Requests
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
        ) : myRequests.length === 0 ? (
          <p className="text-sm text-zinc-400">No requests found.</p>
        ) : (
          <div className="space-y-2">
            {myRequests.map((req) => (
              <PendingRequestRow key={req.id} request={req} />
            ))}
          </div>
        )}
      </section>

      {isFetching && !isLoading && (
        <p className="mt-4 text-center text-xs text-zinc-400">
          Syncing with server...
        </p>
      )}

      {/* Test Scenarios Panel */}
      <section className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Test Scenarios (Evaluator Use)
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          Click any button to simulate a real-world HCM behavior. Watch the balance card, form, and toasts react.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={triggerAnniversary}>
            Trigger Anniversary Bonus (+1-3 days)
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
