import type { PendingRequest } from "@/src/features/time-off/types";
import { Button } from "@/src/components/ui/Button";

interface PendingRequestRowProps {
  request: PendingRequest;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isValidating?: boolean;
  isOffline?: boolean;
}

const statusConfig = {
  "pending": { label: "Pending", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  "approved": { label: "Approved", class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  "rejected": { label: "Rejected", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  "optimistic-pending": { label: "Syncing...", class: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
};

export function PendingRequestRow({
  request,
  showActions = false,
  onApprove,
  onReject,
  isValidating = false,
  isOffline = false,
}: PendingRequestRowProps) {
  const statusInfo = statusConfig[request.status];

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {request.employeeName}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.class}`}>
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{request.daysRequested} days</span>
          <span>{request.startDate} &rarr; {request.endDate}</span>
          <span>{request.location}</span>
        </div>
      </div>
      {showActions && request.status === "pending" && (
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={isValidating}
              disabled={isOffline}
              onClick={() => onApprove?.(request.id)}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isOffline}
              onClick={() => onReject?.(request.id)}
            >
              Deny
            </Button>
          </div>
          {isOffline && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              You are offline. Reconnecting to HCM...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
