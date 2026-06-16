export interface TimeOffEntry {
  employeeId: string;
  location: string;
  balance: number;
  employeeName: string;
  department: string;
}

export interface PendingRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  location: string;
  daysRequested: number;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected" | "optimistic-pending";
  submittedAt: string;
}

export interface TimeOffBalance {
  employeeId: string;
  location: string;
  balance: number;
  employeeName: string;
  department: string;
}

export interface BatchResponse {
  balances: TimeOffBalance[];
  pendingRequests: PendingRequest[];
}

export interface RealTimeResponse {
  success: boolean;
  balance: TimeOffBalance;
  timestamp: string;
}

export interface SubmitRequestPayload {
  employeeId: string;
  location: string;
  daysRequested: number;
  startDate: string;
  endDate: string;
  employeeName: string;
}

export interface MutationState {
  status: "idle" | "optimistic-pending" | "rolling-back" | "settled";
  error: string | null;
}
