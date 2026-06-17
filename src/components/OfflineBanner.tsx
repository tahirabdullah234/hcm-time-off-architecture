"use client";

import { useOnline } from "@/src/hooks/useOnline";

export function OfflineBanner() {
  const isOnline = useOnline();

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white shadow-md">
      You are offline. Reconnecting to HCM...
    </div>
  );
}
