import { useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/src/components/ui/Card";

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
}

export function RequestForm({
  employeeId,
  employeeName,
  location,
  maxBalance,
  onSubmit,
  isSubmitting = false,
}: RequestFormProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [daysRequested, setDaysRequested] = useState(1);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
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
    setDaysRequested(1);
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
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="days" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Days Requested
          </label>
          <input
            id="days"
            type="number"
            min={1}
            max={maxBalance}
            value={daysRequested}
            onChange={(e) => setDaysRequested(Math.min(Number(e.target.value), maxBalance))}
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Available balance: {maxBalance} days
          </p>
        </div>
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </Card>
  );
}
