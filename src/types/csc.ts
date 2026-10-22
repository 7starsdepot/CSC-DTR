export interface DailyRecord {
  day: number;
  dateStr: string;
  dayOfWeek: string;
  isWeekend: boolean;
  status: 'regular' | 'weekend' | 'holiday' | 'leave' | 'travel_order' | 'official_business';
  statusLabel?: string;
  // Electronic Time Card Fields
  inTime: string;      // A.M. Arrival (e.g., "07:54")
  breakTime: string;   // A.M. Departure / Lunch Out (e.g., "12:02")
  resumeTime: string;  // P.M. Arrival / Lunch In (e.g., "12:55")
  outTime: string;     // P.M. Departure / Day Out (e.g., "17:05")
  // Computed values
  undertimeHours: number;
  undertimeMinutes: number;
  hoursWorked: number;
  remarks: string;     // Electronic Remarks column
}

export interface EmployeeProfile {
  name: string;
  employeeId: string;
  officeAgency: string;
}

export interface Signatories {
  employee: {
    name: string;
    designation: string;
    roleLabel: string;
  };
  timekeeper: {
    name: string;
    designation: string;
    roleLabel: string;
  };
  chiefSupervisor?: {
    name: string;
    designation: string;
    roleLabel: string;
  };
}

export interface OfficialSchedule {
  amIn: string;
  amOut: string;
  pmIn: string;
  pmOut: string;
  regularHoursDisplay: string;
  saturdaysDisplay: string;
  gracePeriodMinutes: number;
}

export interface PersonnelData {
  id: string;
  name: string;
  records: DailyRecord[];
}

export interface DTRDocument {
  id: string;
  month: number; // 1-12
  year: number;
  personnelList: PersonnelData[];
  selectedEmployeeIndex: number;
  officeAgency: string;
  signatories: Signatories;
  schedule: OfficialSchedule;
}
