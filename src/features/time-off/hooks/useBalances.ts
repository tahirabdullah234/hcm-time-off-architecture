"use client";

import { useQuery } from "@tanstack/react-query";
import type { BatchResponse } from "@/src/features/time-off/types";

async function fetchBalances(): Promise<BatchResponse> {
  const res = await fetch("/api/hcm/batch");
  if (!res.ok) {
    throw new Error(`Batch fetch failed: ${res.status}`);
  }
  return res.json();
}

export function useBalances() {
  return useQuery<BatchResponse>({
    queryKey: ["hcm", "balances"],
    queryFn: fetchBalances,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });
}
