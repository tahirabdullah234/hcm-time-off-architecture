import { useState, useMemo, type FormEvent } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/src/components/ui/Card";

const today = new Date().toISOString().slice(0, 10);

function diffDays(start: string, end: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(
    (new Date(end).getTime() - new Date(start).getTime()) / msPerDay,
  ) + 1;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface RequestFormProps {
  employeeId: string;
  employeeName: string;
  location: string;
  maxBalance: number;
  onSubmit: (payload: {
    employeeId: string;
    location: string;
    daysRequested: number;
    startDate: string;
    endDate: string;
    employeeName: string;
  }) => void;
  isSubmitting?: boolean;
  isOffline?: boolean;
  existingRanges?: DateRange[];
}

function hasOverlap(start: string, end: string, ranges: DateRange[]): boolean {
  return ranges.some((r) => start <= r.endDate && end >= r.startDate);
}

export function RequestForm({
  employeeId,
  employeeName,
  location,
  maxBalance,
  onSubmit,
  isSubmitting = false,
  isOffline = false,
  existingRanges = [],
}: RequestFormProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const daysRequested = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const d = diffDays(startDate, endDate);
    return d > 0 ? d : 0;
  }, [startDate, endDate]);

  const error = useMemo(() => {
    if (!startDate || !endDate) return "";
    if (startDate < today) return "Start date cannot be in the past";
    if (endDate < today) return "End date cannot be in the past";
    if (endDate < startDate) return "End date must be on or after start date";
    if (hasOverlap(startDate, endDate, existingRanges)) return "Selected dates overlap with an existing request";
    if (daysRequested > maxBalance) return `Not enough balance (${daysRequested} requested, ${maxBalance} available)`;
    return "";
  }, [startDate, endDate, daysRequested, maxBalance, existingRanges]);

  const blockingError = useMemo(() => {
    if (!startDate || !endDate) return true;
    if (startDate < today) return true;
    if (endDate < today) return true;
    if (endDate < startDate) return true;
    if (hasOverlap(startDate, endDate, existingRanges)) return true;
    return false;
  }, [startDate, endDate, existingRanges]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || blockingError) return;
    onSubmit({
      employeeId,
      location,
      daysRequested,
      startDate,
      endDate,
      employeeName,
    });
    setStartDate("");
    setEndDate("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Time-Off</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        {startDate && endDate && (
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Days requested: <strong>{daysRequested}</strong> &middot; Available
            balance: <strong>{maxBalance}</strong>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting || blockingError || isOffline}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
        {isOffline && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400">
            You are offline. Reconnecting to HCM...
          </p>
        )}
      </form>
    </Card>
  );
}
