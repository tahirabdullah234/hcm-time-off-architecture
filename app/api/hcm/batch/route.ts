import { NextRequest, NextResponse } from "next/server";
import { employees, pendingRequests } from "@/src/features/time-off/api-store";

export async function GET(request: NextRequest) {
  const delay = 2000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const chaosRoll = Math.random();
  if (chaosRoll < 0.1) {
    return NextResponse.json(
      { error: "Batch endpoint unavailable", code: "HCM_500" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const triggerAnniversary = searchParams.get("triggerAnniversary") === "true";

  if (triggerAnniversary) {
    for (const emp of employees) {
      emp.balance += Math.floor(Math.random() * 3) + 1;
    }
  }

  return NextResponse.json({
    balances: employees.map((e) => ({ ...e })),
    pendingRequests: pendingRequests.map((r) => ({ ...r })),
  });
}
