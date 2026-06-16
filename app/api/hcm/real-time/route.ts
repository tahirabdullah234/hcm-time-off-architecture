import { NextRequest, NextResponse } from "next/server";
import { employees, pendingRequests } from "@/src/features/time-off/api-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const location = searchParams.get("location");

  const delay = 200 + Math.random() * 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const employee = employees.find(
    (e) => e.employeeId === employeeId && e.location === location
  );

  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found", code: "HCM_404" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    balance: { ...employee },
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const silentFail = searchParams.get("silentFail") === "true";

  const body = await request.json();
  const { employeeId, location, daysRequested, startDate, endDate, employeeName } = body;

  if (!employeeId || !location || !daysRequested || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required fields", code: "HCM_400" },
      { status: 400 }
    );
  }

  const delay = 800 + Math.random() * 1200;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const employee = employees.find(
    (e) => e.employeeId === employeeId && e.location === location
  );

  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found", code: "HCM_404" },
      { status: 404 }
    );
  }

  const chaosRoll = Math.random();
  if (chaosRoll < 0.1) {
    return NextResponse.json(
      { error: "Insufficient balance", code: "HCM_422" },
      { status: 422 }
    );
  }

  if (employee.balance < daysRequested) {
    return NextResponse.json(
      { error: "Insufficient balance", code: "HCM_422" },
      { status: 422 }
    );
  }

  if (silentFail) {
    return NextResponse.json({
      success: true,
      balance: { ...employee, balance: employee.balance },
      request: null,
      warning: "HCM silently declined this request without deducting balance",
      timestamp: new Date().toISOString(),
    });
  }

  employee.balance -= daysRequested;

  const newRequest = {
    id: `REQ-${String(pendingRequests.length + 1).padStart(3, "0")}`,
    employeeId,
    employeeName: employeeName || employee.employeeName,
    location,
    daysRequested,
    startDate,
    endDate,
    status: "pending" as const,
    submittedAt: new Date().toISOString(),
  };
  pendingRequests.push(newRequest);

  return NextResponse.json({
    success: true,
    balance: { ...employee },
    request: newRequest,
    timestamp: new Date().toISOString(),
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { requestId, action, employeeId, location } = body;

  if (!requestId || !action) {
    return NextResponse.json(
      { error: "Missing required fields", code: "HCM_400" },
      { status: 400 }
    );
  }

  const pendingReq = pendingRequests.find((r) => r.id === requestId);
  if (!pendingReq) {
    return NextResponse.json(
      { error: "Request not found", code: "HCM_404" },
      { status: 404 }
    );
  }

  if (action === "approve") {
    const employee = employees.find(
      (e) =>
        e.employeeId === (employeeId || pendingReq.employeeId) &&
        e.location === (location || pendingReq.location)
    );

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found", code: "HCM_404" },
        { status: 404 }
      );
    }

    if (employee.balance < pendingReq.daysRequested) {
      return NextResponse.json(
        { error: "Insufficient balance for approval", code: "HCM_422" },
        { status: 422 }
      );
    }
  }

  if (action === "approve") {
    pendingReq.status = "approved";
  } else if (action === "reject") {
    pendingReq.status = "rejected";
  } else {
    return NextResponse.json(
      { error: "Invalid action", code: "HCM_400" },
      { status: 400 }
    );
  }

  const delay = 400 + Math.random() * 400;
  await new Promise((resolve) => setTimeout(resolve, delay));

  return NextResponse.json({
    success: true,
    request: { ...pendingReq },
    timestamp: new Date().toISOString(),
  });
}
