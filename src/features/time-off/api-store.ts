export interface TimeOffBalance {
  employeeId: string;
  location: string;
  balance: number;
  employeeName: string;
  department: string;
}

export interface PendingRequestRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  location: string;
  daysRequested: number;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export const employees: TimeOffBalance[] = [
  { employeeId: "EMP001", location: "US-NYC", balance: 15, employeeName: "Alice Chen", department: "Engineering" },
  { employeeId: "EMP002", location: "US-SFO", balance: 22, employeeName: "Bob Martinez", department: "Design" },
  { employeeId: "EMP003", location: "UK-LON", balance: 18, employeeName: "Clara Johansson", department: "Marketing" },
  { employeeId: "EMP004", location: "US-NYC", balance: 10, employeeName: "David Kim", department: "Engineering" },
  { employeeId: "EMP005", location: "DE-BER", balance: 25, employeeName: "Elena Wolff", department: "Sales" },
];

export const pendingRequests: PendingRequestRecord[] = [
  {
    id: "REQ-001",
    employeeId: "EMP001",
    employeeName: "Alice Chen",
    location: "US-NYC",
    daysRequested: 3,
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    status: "pending",
    submittedAt: "2026-06-14T09:30:00Z",
  },
  {
    id: "REQ-002",
    employeeId: "EMP003",
    employeeName: "Clara Johansson",
    location: "UK-LON",
    daysRequested: 5,
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    status: "pending",
    submittedAt: "2026-06-15T14:00:00Z",
  },
];
