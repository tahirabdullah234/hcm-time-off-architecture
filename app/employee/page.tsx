"use client";

import { useBalances } from "@/src/features/time-off/hooks/useBalances";
import { useSubmitRequest } from "@/src/features/time-off/hooks/useSubmitRequest";
import { BalanceCard } from "@/src/features/time-off/components/BalanceCard";
import { RequestForm } from "@/src/features/time-off/components/RequestForm";
import { PendingRequestRow } from "@/src/features/time-off/components/PendingRequestRow";
import type { SubmitRequestPayload } from "@/src/features/time-off/types";

const CURRENT_EMPLOYEE = {
  employeeId: "EMP001",
  employeeName: "Alice Chen",
  location: "US-NYC",
  department: "Engineering",
};

export default function EmployeeDashboard() {
  const { data, isLoading, isStale, isFetching } = useBalances();
  const submitMutation = useSubmitRequest();

  const myBalance = data?.balances.find(
    (b) => b.employeeId === CURRENT_EMPLOYEE.employeeId && b.location === CURRENT_EMPLOYEE.location
  );

  const myRequests = data?.pendingRequests.filter(
    (r) => r.employeeId === CURRENT_EMPLOYEE.employeeId
  ) ?? [];

  const hasOptimistic = myRequests.some((r) => r.status === "optimistic-pending");

  const handleSubmit = (payload: SubmitRequestPayload) => {
    submitMutation.mutate(payload);
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
    </div>
  );
}
