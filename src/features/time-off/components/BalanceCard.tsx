import { Card, CardHeader, CardTitle } from "@/src/components/ui/Card";

interface BalanceCardProps {
  employeeName: string;
  department: string;
  location: string;
  balance: number;
  isLoading?: boolean;
  isStale?: boolean;
  isOptimistic?: boolean;
  isReconciling?: boolean;
}

export function BalanceCard({
  employeeName,
  department,
  location,
  balance,
  isLoading = false,
  isStale = false,
  isOptimistic = false,
  isReconciling = false,
}: BalanceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time-Off Balance</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Time-Off Balance</CardTitle>
          {isStale && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              stale
            </span>
          )}
          {isOptimistic && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              pending
            </span>
          )}
          {isReconciling && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              ⚠️ Out of sync with HCM. Re-verifying...
            </span>
          )}
        </div>
      </CardHeader>
      <div className="space-y-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {employeeName} &middot; {department}
        </p>
        <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          {balance}
          <span className="ml-1 text-base font-normal text-zinc-400">days</span>
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{location}</p>
      </div>
    </Card>
  );
}
