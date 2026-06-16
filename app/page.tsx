import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          HCM Time-Off Module
        </h1>
        <p className="max-w-md text-lg text-zinc-500 dark:text-zinc-400">
          Manage employee time-off requests with real-time balance tracking and
          manager approval workflows.
        </p>
        <div className="flex gap-4">
          <Link
            href="/employee"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Employee View
          </Link>
          <Link
            href="/manager"
            className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Manager View
          </Link>
        </div>
      </div>
    </div>
  );
}
