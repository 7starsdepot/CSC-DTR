export type WorkScheduleType = 'schedule1' | 'schedule2';

export interface OfficialSchedule {
  id?: WorkScheduleType;
  name?: string;
  label?: string;
  amIn: string;
  amOut: string;
  pmIn: string;
  pmOut: string;
  regularHoursDisplay: string;
  saturdaysDisplay: string;
  gracePeriodMinutes: number;
}

export const WORK_SCHEDULES: Record<WorkScheduleType, OfficialSchedule> = {
  schedule1: {
    id: 'schedule1',
    name: 'Schedule 1',
    label: 'Schedule 1: 8:00 AM to 5:00 PM',
    amIn: '08:00',
    amOut: '12:00',
    pmIn: '13:00',
    pmOut: '17:00',
    regularHoursDisplay: '8:00 AM - 12:00 PM / 1:00 PM - 5:00 PM',
    saturdaysDisplay: 'As required / Off',
    gracePeriodMinutes: 0
  },
  schedule2: {
    id: 'schedule2',
    name: 'Schedule 2',
    label: 'Schedule 2: 7:00 AM to 4:00 PM',
    amIn: '07:00',
    amOut: '12:00',
    pmIn: '13:00',
    pmOut: '16:00',
    regularHoursDisplay: '7:00 AM - 12:00 PM / 1:00 PM - 4:00 PM',
    saturdaysDisplay: 'As required / Off',
    gracePeriodMinutes: 0
  }
};

export function getScheduleConfig(scheduleOrKey?: WorkScheduleType | OfficialSchedule | null): OfficialSchedule {
  if (!scheduleOrKey) return WORK_SCHEDULES.schedule1;
  if (typeof scheduleOrKey === 'string') {
    return WORK_SCHEDULES[scheduleOrKey] || WORK_SCHEDULES.schedule1;
  }
  return scheduleOrKey;
}

export function detectScheduleType(sched?: OfficialSchedule | null): WorkScheduleType {
  if (!sched) return 'schedule1';
  if (sched.id === 'schedule2') return 'schedule2';
  if (sched.amIn === '07:00' || sched.pmOut === '16:00') return 'schedule2';
  return 'schedule1';
}

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
  // Assigned schedule for this specific date (allows schedule changes to apply only to appropriate dates!)
  assignedSchedule?: WorkScheduleType;
  // Computed values
  undertimeHours: number;        // Form 48 official combined undertime/lost hours
  undertimeMinutes: number;      // Form 48 official combined undertime/lost minutes
  lateHours?: number;            // Tardiness hours (AM/PM late arrival)
  lateMinutes?: number;          // Tardiness minutes
  totalLateMinutes?: number;     // Total raw minutes of late (e.g. 10, 15, 45)
  undertimeOnlyHours?: number;   // Pure undertime (early departure) hours
  undertimeOnlyMinutes?: number; // Pure undertime (early departure) minutes
  totalUndertimeOnlyMinutes?: number; // Total raw minutes of early departure
  // Detailed session breakdowns
  morningLateMinutes?: number;
  morningUndertimeMinutes?: number;
  afternoonLateMinutes?: number;
  afternoonUndertimeMinutes?: number;
  totalUndertimeDailyMinutes?: number;
  combinedLateUndertimeMinutes?: number;
  hoursWorked: number;
  remarks: string;     // Electronic Remarks column
}

export interface DTRPeriodTotals {
  daysPresent: number;
  totalWorkedHours: number;
  totalLateMinutes: number;
  totalLateHours: number;
  totalLateRemainingMinutes: number;
  lateDaysCount: number;
  totalUndertimeOnlyMinutes: number;
  totalUndertimeMinutes: number;
  totalUndertimeOnlyHours: number;
  totalUndertimeOnlyRemainingMinutes: number;
  undertimeDaysCount: number;
  totalUndertimeHours: number;
  combinedLostMinutes: number;
  grandTotalHours: number;
  grandTotalMinutes: number;
  totalMorningLateMinutes: number;
  totalAfternoonLateMinutes: number;
  totalMorningUndertimeMinutes: number;
  totalAfternoonUndertimeMinutes: number;
  grandTotalLateUndertimeMinutes: number;
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

export interface PersonnelData {
  id: string;
  name: string;
  assignedSchedule?: WorkScheduleType; // 'schedule1' (8-5) or 'schedule2' (7-4)
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
