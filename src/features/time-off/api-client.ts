export async function realTimeBalanceCheck(employeeId: string, location: string) {
  const res = await fetch(
    `/api/hcm/real-time?employeeId=${encodeURIComponent(employeeId)}&location=${encodeURIComponent(location)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Balance check failed");
  }
  return res.json();
}

export async function approveRequest(
  requestId: string,
  employeeId: string,
  location: string
) {
  const res = await fetch("/api/hcm/real-time", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, action: "approve", employeeId, location }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Approval failed");
  }
  return res.json();
}

export async function rejectRequest(requestId: string) {
  const res = await fetch("/api/hcm/real-time", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, action: "reject" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Rejection failed");
  }
  return res.json();
}
