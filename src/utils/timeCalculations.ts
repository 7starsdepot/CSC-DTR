import {
  DailyRecord,
  DTRPeriodTotals,
  OfficialSchedule,
  WorkScheduleType,
  WORK_SCHEDULES,
  getScheduleConfig,
  detectScheduleType
} from '../types/csc';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Standard Philippine Regular and Special Non-working Holidays (reference)
export const COMMON_PH_HOLIDAYS: Record<string, string> = {
  '1-1': "New Year's Day",
  '4-9': 'Araw ng Kagitingan',
  '5-1': 'Labor Day',
  '6-12': 'Independence Day',
  '8-21': 'Ninoy Aquino Day',
  '8-31': 'National Heroes Day',
  '11-1': "All Saints' Day",
  '11-2': "All Souls' Day",
  '11-30': 'Bonifacio Day',
  '12-8': 'Feast of the Immaculate Conception',
  '12-25': 'Christmas Day',
  '12-30': 'Rizal Day',
  '12-31': 'Last Day of the Year',
};

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Robust parser for time formats:
 * - "8:10", "8:10 AM", "4:50 PM", "7:15 AM", "3:45 PM"
 * - "8:05", "08:05", "8:5", "8.05", "8.5"
 * - 3 or 4 digit numbers (e.g. 800, 805, 1700)
 * - Decimal Excel day fractions
 * Returns minutes from midnight, or null if empty/invalid.
 */
export function parseTimeToMinutes(
  timeStr: any,
  assumePmIfHourUnder?: number
): number | null {
  if (timeStr === null || timeStr === undefined || timeStr === '') return null;

  // Handle number input (e.g. Excel day fraction 0.3368 or integer 805)
  if (typeof timeStr === 'number') {
    if (isNaN(timeStr)) return null;
    // Excel decimal day fraction (between 0 and 1)
    if (timeStr > 0 && timeStr < 1) {
      const totalMins = Math.round(timeStr * 24 * 60);
      return totalMins % (24 * 60);
    }
    // 3 or 4 digit integer (e.g. 805, 800, 1700)
    if (timeStr >= 100 && timeStr <= 2400 && Number.isInteger(timeStr)) {
      const h = Math.floor(timeStr / 100);
      const m = timeStr % 100;
      if (h <= 24 && m < 60) {
        let adjH = h;
        if (assumePmIfHourUnder && adjH >= 1 && adjH <= 7) adjH += 12;
        return adjH * 60 + m;
      }
    }
  }

  let cleaned = String(timeStr)
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[()]/g, '')
    .replace(/A\.M\./gi, 'AM')
    .replace(/P\.M\./gi, 'PM');

  if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'n/a') return null;

  // Handle decimal string like "0.3368055555555556"
  const decVal = parseFloat(cleaned);
  if (!isNaN(decVal) && decVal > 0 && decVal < 1 && /^\d*\.\d+$/.test(cleaned)) {
    const totalMins = Math.round(decVal * 24 * 60);
    return totalMins % (24 * 60);
  }

  // Handle colon or dot formatted: e.g. "8:10", "8:10 AM", "4:50 PM", "7:15", "3:45 PM"
  const colonDotMatch = cleaned.match(/^(\d{1,2})[:.](\d{1,2})(?::(\d{1,2}))?(?:\.\d+)?\s*(AM|PM)?$/i);
  if (colonDotMatch) {
    let hours = parseInt(colonDotMatch[1], 10);
    const minutes = parseInt(colonDotMatch[2], 10);
    const meridiem = colonDotMatch[4]?.toUpperCase();

    if (minutes >= 0 && minutes < 60 && hours >= 0 && hours <= 24) {
      if (meridiem === 'PM' && hours < 12) {
        hours += 12;
      } else if (meridiem === 'AM' && hours === 12) {
        hours = 0;
      } else if (!meridiem && assumePmIfHourUnder && hours >= 1 && hours <= 7) {
        hours += 12;
      }
      return hours * 60 + minutes;
    }
  }

  // 3-digit or 4-digit military format (e.g. "0805", "805", "800", "0800", "1700")
  const numMatch = cleaned.match(/^(\d{1,2})(\d{2})$/);
  if (numMatch) {
    let hours = parseInt(numMatch[1], 10);
    const minutes = parseInt(numMatch[2], 10);
    if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes < 60) {
      if (assumePmIfHourUnder && hours >= 1 && hours <= 7) {
        hours += 12;
      }
      return hours * 60 + minutes;
    }
  }

  return null;
}

/**
 * Formats time for CSC Form 48 table display (e.g. "8:10", "4:50", "7:15", "3:45")
 */
export function formatCSCTimeDisplay(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return String(timeStr).trim();

  let hours = Math.floor(mins / 60);
  const minutes = mins % 60;

  // Convert to 12-hour number representation
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  const paddedMin = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${paddedMin}`;
}

/**
 * Formats a total number of minutes into human-friendly string (e.g. "10m", "15m", "1h 15m")
 */
export function formatMinutesDisplay(
  totalMinutes: number | undefined | null,
  mode: 'both' | 'hoursMinutes' | 'minutes' | boolean = 'both'
): string {
  const mins = totalMinutes ?? 0;
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  if (mode === 'minutes') {
    return `${mins}m`;
  }
  if (mode === 'hoursMinutes' || mode === false) {
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }
  // mode === 'both' or mode === true
  if (h > 0 && m > 0) return `${h}h ${m}m (${mins}m)`;
  if (h > 0) return `${h}h (${mins}m)`;
  return `${mins}m`;
}

export interface DailyTimeLossResult {
  undertimeHours: number;            // Form 48 combined lost hours
  undertimeMinutes: number;          // Form 48 combined lost minutes
  lateHours: number;                 // Tardiness hours
  lateMinutes: number;               // Tardiness minutes (remainder)
  totalLateMinutes: number;          // Total raw minutes of late (e.g. 10, 15, 45)
  undertimeOnlyHours: number;        // Pure early departure hours
  undertimeOnlyMinutes: number;      // Pure early departure minutes
  totalUndertimeOnlyMinutes: number; // Total raw minutes of early departure
  morningLateMinutes: number;
  morningUndertimeMinutes: number;
  afternoonLateMinutes: number;
  afternoonUndertimeMinutes: number;
  totalUndertimeDailyMinutes: number;
  combinedLateUndertimeMinutes: number;
  totalWorkedMinutes: number;
  isLate: boolean;
  isUndertime: boolean;
  appliedSchedule: OfficialSchedule;
  appliedScheduleType: WorkScheduleType;
}

/**
 * Computes daily tardiness (minutes of late) and undertime (early departure)
 * based on the employee's assigned schedule (Schedule 1: 8-5 or Schedule 2: 7-4).
 *
 * Rules:
 * 1. If employee clocks in at or before scheduled time-in, record 0 minutes late.
 * 2. If employee clocks in after scheduled time-in, calculate difference in minutes between actual and scheduled.
 * 3. If employee clocks out at or after scheduled time-out, record 0 minutes undertime.
 * 4. If employee clocks out before scheduled time-out, calculate difference in minutes between actual and scheduled.
 * 5. If time-in or time-out records are missing, treat as zero late or zero undertime.
 */
export function calculateDailyUndertime(
  record: Pick<DailyRecord, 'inTime' | 'breakTime' | 'resumeTime' | 'outTime' | 'status' | 'assignedSchedule'>,
  fallbackSchedule?: OfficialSchedule
): DailyTimeLossResult {
  const isWeekendOrHoliday = record.status === 'weekend' || record.status === 'holiday';

  // Resolve schedule for this specific record (supports per-day or employee assigned schedule)
  const schedKey: WorkScheduleType = record.assignedSchedule || (fallbackSchedule ? detectScheduleType(fallbackSchedule) : 'schedule1');
  const scheduleConfig: OfficialSchedule = WORK_SCHEDULES[schedKey] || fallbackSchedule || WORK_SCHEDULES.schedule1;

  const schedAmIn = parseTimeToMinutes(scheduleConfig.amIn) ?? (schedKey === 'schedule2' ? 420 : 480);   // 8:00 AM (480) or 7:00 AM (420)
  const schedAmOut = parseTimeToMinutes(scheduleConfig.amOut) ?? 720;                                     // 12:00 PM (720)
  const schedPmIn = parseTimeToMinutes(scheduleConfig.pmIn) ?? 780;                                       // 1:00 PM (780)
  const schedPmOut = parseTimeToMinutes(scheduleConfig.pmOut) ?? (schedKey === 'schedule2' ? 960 : 1020); // 5:00 PM (1020) or 4:00 PM (960)

  const actAmIn = parseTimeToMinutes(record.inTime);
  const actAmOut = parseTimeToMinutes(record.breakTime);
  // PM Session columns: 1:00 to 11:59 are PM times (add 12 if under 12)
  const actPmIn = parseTimeToMinutes(record.resumeTime, 12);
  const actPmOut = parseTimeToMinutes(record.outTime, 12);

  let morningLateMins = 0;
  let morningUndertimeMins = 0;
  let afternoonLateMins = 0;
  let afternoonUndertimeMins = 0;
  let amWorkedMins = 0;
  let pmWorkedMins = 0;

  if (!isWeekendOrHoliday) {
    // 1. AM Official Time-In (Minutes of Late)
    // Rule: If clocks in at or before scheduled, record 0 late.
    // If clocks in after, difference in minutes.
    // If missing, automatically 0 late.
    if (actAmIn !== null) {
      if (actAmIn > schedAmIn) {
        morningLateMins = actAmIn - schedAmIn;
      } else {
        morningLateMins = 0;
      }
    } else {
      morningLateMins = 0; // Rule 11: Missing time-in is 0 late
    }

    // 2. AM Break Departure (Lunch Out)
    // If clocked out before 12:00 PM, undertime. Missing lunch punch is 0 undertime.
    if (actAmOut !== null) {
      if (actAmOut < schedAmOut) {
        morningUndertimeMins = schedAmOut - actAmOut;
      } else {
        morningUndertimeMins = 0;
      }
    } else {
      morningUndertimeMins = 0;
    }

    // 3. PM Lunch Return (Lunch In)
    // If clocked in after 1:00 PM, afternoon late. Missing lunch return is 0 late.
    if (actPmIn !== null) {
      if (actPmIn > schedPmIn) {
        afternoonLateMins = actPmIn - schedPmIn;
      } else {
        afternoonLateMins = 0;
      }
    } else {
      afternoonLateMins = 0;
    }

    // 4. PM Official Time-Out (Minutes of Undertime)
    // Rule: If clocks out at or after scheduled time-out, record 0 undertime.
    // If clocks out before scheduled time-out, calculate difference in minutes.
    // If missing, automatically 0 undertime.
    if (actPmOut !== null) {
      if (actPmOut < schedPmOut) {
        afternoonUndertimeMins = schedPmOut - actPmOut;
      } else {
        afternoonUndertimeMins = 0;
      }
    } else {
      afternoonUndertimeMins = 0; // Rule 11: Missing time-out is 0 undertime
    }

    // Worked Minutes calculation
    if (actAmIn !== null && actAmOut !== null) {
      amWorkedMins = Math.max(0, Math.min(actAmOut, schedAmOut) - Math.max(actAmIn, schedAmIn));
    } else if (actAmIn !== null) {
      amWorkedMins = Math.max(0, schedAmOut - Math.max(actAmIn, schedAmIn));
    }

    if (actPmIn !== null && actPmOut !== null) {
      pmWorkedMins = Math.max(0, Math.min(actPmOut, schedPmOut) - Math.max(actPmIn, schedPmIn));
    } else if (actPmOut !== null) {
      pmWorkedMins = Math.max(0, Math.min(actPmOut, schedPmOut) - schedPmIn);
    }
  } else {
    // Weekend or holiday hours worked (if punched)
    if (actAmIn !== null && actAmOut !== null) {
      amWorkedMins = Math.max(0, actAmOut - actAmIn);
    }
    if (actPmIn !== null && actPmOut !== null) {
      pmWorkedMins = Math.max(0, actPmOut - actPmIn);
    }
  }

  const lateMins = isWeekendOrHoliday ? 0 : (morningLateMins + afternoonLateMins);
  const undertimeOnlyMins = isWeekendOrHoliday ? 0 : (morningUndertimeMins + afternoonUndertimeMins);
  const combinedTotalMins = isWeekendOrHoliday ? 0 : (lateMins + undertimeOnlyMins);

  const hours = isWeekendOrHoliday ? 0 : Math.floor(combinedTotalMins / 60);
  const minutes = isWeekendOrHoliday ? 0 : combinedTotalMins % 60;

  const lateHours = isWeekendOrHoliday ? 0 : Math.floor(lateMins / 60);
  const lateMinutes = isWeekendOrHoliday ? 0 : lateMins % 60;

  const undertimeOnlyHours = isWeekendOrHoliday ? 0 : Math.floor(undertimeOnlyMins / 60);
  const undertimeOnlyMinutes = isWeekendOrHoliday ? 0 : undertimeOnlyMins % 60;

  const totalWorked = amWorkedMins + pmWorkedMins;

  return {
    // Under UNDERTIME column, record only the time undertime (early departure)
    undertimeHours: undertimeOnlyHours,
    undertimeMinutes: undertimeOnlyMinutes,
    lateHours,
    lateMinutes,
    totalLateMinutes: lateMins,
    undertimeOnlyHours,
    undertimeOnlyMinutes,
    totalUndertimeOnlyMinutes: undertimeOnlyMins,
    morningLateMinutes: isWeekendOrHoliday ? 0 : morningLateMins,
    morningUndertimeMinutes: isWeekendOrHoliday ? 0 : morningUndertimeMins,
    afternoonLateMinutes: isWeekendOrHoliday ? 0 : afternoonLateMins,
    afternoonUndertimeMinutes: isWeekendOrHoliday ? 0 : afternoonUndertimeMins,
    totalUndertimeDailyMinutes: undertimeOnlyMins,
    combinedLateUndertimeMinutes: combinedTotalMins,
    totalWorkedMinutes: totalWorked,
    isLate: lateMins > 0,
    isUndertime: undertimeOnlyMins > 0,
    appliedSchedule: scheduleConfig,
    appliedScheduleType: schedKey
  };
}

/**
 * Alias for calculateDailyUndertime with complete breakdown
 */
export function calculateDailyLateAndUndertime(
  record: Pick<DailyRecord, 'inTime' | 'breakTime' | 'resumeTime' | 'outTime' | 'status' | 'assignedSchedule'>,
  schedule?: OfficialSchedule
): DailyTimeLossResult {
  return calculateDailyUndertime(record, schedule);
}

/**
 * Creates 31 rows (standard CSC Form 48 contains exactly 31 day lines).
 */
export function generateMonthRecords(
  year: number,
  month: number,
  schedule: OfficialSchedule,
  defaultAssignedSchedule?: WorkScheduleType
): DailyRecord[] {
  const daysInMonth = getDaysInMonth(year, month);
  const records: DailyRecord[] = [];
  const assignedSched: WorkScheduleType = defaultAssignedSchedule || detectScheduleType(schedule);

  for (let d = 1; d <= 31; d++) {
    if (d <= daysInMonth) {
      const date = new Date(year, month - 1, d);
      const dayOfWeekIdx = date.getDay();
      const dayOfWeek = DAYS_OF_WEEK[dayOfWeekIdx];
      const isWeekend = dayOfWeekIdx === 0 || dayOfWeekIdx === 6;
      const holidayKey = `${month}-${d}`;
      const holidayName = COMMON_PH_HOLIDAYS[holidayKey];

      let status: DailyRecord['status'] = 'regular';
      let statusLabel: string | undefined = undefined;

      if (holidayName) {
        status = 'holiday';
        statusLabel = holidayName;
      } else if (isWeekend) {
        status = 'weekend';
        statusLabel = dayOfWeekIdx === 6 ? 'SATURDAY' : 'SUNDAY';
      }

      records.push({
        day: d,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayOfWeek,
        isWeekend,
        status,
        statusLabel,
        inTime: '',
        breakTime: '',
        resumeTime: '',
        outTime: '',
        assignedSchedule: assignedSched,
        undertimeHours: 0,
        undertimeMinutes: 0,
        lateHours: 0,
        lateMinutes: 0,
        totalLateMinutes: 0,
        undertimeOnlyHours: 0,
        undertimeOnlyMinutes: 0,
        totalUndertimeOnlyMinutes: 0,
        morningLateMinutes: 0,
        morningUndertimeMinutes: 0,
        afternoonLateMinutes: 0,
        afternoonUndertimeMinutes: 0,
        totalUndertimeDailyMinutes: 0,
        combinedLateUndertimeMinutes: 0,
        hoursWorked: 0,
        remarks: ''
      });
    } else {
      records.push({
        day: d,
        dateStr: '',
        dayOfWeek: '',
        isWeekend: false,
        status: 'weekend',
        statusLabel: '',
        inTime: '',
        breakTime: '',
        resumeTime: '',
        outTime: '',
        assignedSchedule: assignedSched,
        undertimeHours: 0,
        undertimeMinutes: 0,
        lateHours: 0,
        lateMinutes: 0,
        totalLateMinutes: 0,
        undertimeOnlyHours: 0,
        undertimeOnlyMinutes: 0,
        totalUndertimeOnlyMinutes: 0,
        morningLateMinutes: 0,
        morningUndertimeMinutes: 0,
        afternoonLateMinutes: 0,
        afternoonUndertimeMinutes: 0,
        totalUndertimeDailyMinutes: 0,
        combinedLateUndertimeMinutes: 0,
        hoursWorked: 0,
        remarks: ''
      });
    }
  }

  return records;
}

/**
 * Recalculates all daily records and returns overall totals.
 * Uses the employee's assigned schedule (or per-record schedule) consistently.
 */
export function recalculateRecords(
  records: DailyRecord[],
  fallbackSchedule: OfficialSchedule,
  defaultAssignedSchedule?: WorkScheduleType
): {
  updatedRecords: DailyRecord[];
  totals: DTRPeriodTotals;
  totalUndertimeHours: number;
  totalUndertimeMinutes: number;
  totalLateMinutes: number;
  totalLateHours: number;
  totalLateRemainingMinutes: number;
  totalUndertimeOnlyMinutes: number;
  totalUndertimeOnlyHours: number;
  totalUndertimeOnlyRemainingMinutes: number;
  lateDaysCount: number;
  undertimeDaysCount: number;
  daysPresent: number;
  totalWorkedHours: number;
  combinedLostMinutes: number;
  assignedSchedule: WorkScheduleType;
  effectiveScheduleConfig: OfficialSchedule;
} {
  let sumUndertimeMins = 0;
  let sumLateMins = 0;
  let sumUndertimeOnlyMins = 0;
  let sumMorningLateMins = 0;
  let sumAfternoonLateMins = 0;
  let sumMorningUndertimeMins = 0;
  let sumAfternoonUndertimeMins = 0;
  let lateDaysCount = 0;
  let undertimeDaysCount = 0;
  let presentDays = 0;
  let sumWorkedMins = 0;

  const resolvedEmployeeSchedule: WorkScheduleType = defaultAssignedSchedule || detectScheduleType(fallbackSchedule);

  const updatedRecords = records.map(rec => {
    // If the record has no specific schedule, inherit employee assigned schedule
    const recordSched: WorkScheduleType = rec.assignedSchedule || resolvedEmployeeSchedule;

    if (!rec.dateStr) {
      return {
        ...rec,
        assignedSchedule: recordSched,
        undertimeHours: 0,
        undertimeMinutes: 0,
        lateHours: 0,
        lateMinutes: 0,
        totalLateMinutes: 0,
        undertimeOnlyHours: 0,
        undertimeOnlyMinutes: 0,
        totalUndertimeOnlyMinutes: 0,
        morningLateMinutes: 0,
        morningUndertimeMinutes: 0,
        afternoonLateMinutes: 0,
        afternoonUndertimeMinutes: 0,
        totalUndertimeDailyMinutes: 0,
        combinedLateUndertimeMinutes: 0,
        hoursWorked: 0
      };
    }

    const hasLog = Boolean(rec.inTime || rec.breakTime || rec.resumeTime || rec.outTime);
    if (!hasLog) {
      return {
        ...rec,
        assignedSchedule: recordSched,
        undertimeHours: 0,
        undertimeMinutes: 0,
        lateHours: 0,
        lateMinutes: 0,
        totalLateMinutes: 0,
        undertimeOnlyHours: 0,
        undertimeOnlyMinutes: 0,
        totalUndertimeOnlyMinutes: 0,
        morningLateMinutes: 0,
        morningUndertimeMinutes: 0,
        afternoonLateMinutes: 0,
        afternoonUndertimeMinutes: 0,
        totalUndertimeDailyMinutes: 0,
        combinedLateUndertimeMinutes: 0,
        hoursWorked: 0
      };
    }

    presentDays += 1;
    const {
      undertimeHours,
      undertimeMinutes,
      lateHours,
      lateMinutes,
      totalLateMinutes,
      undertimeOnlyHours,
      undertimeOnlyMinutes,
      totalUndertimeOnlyMinutes,
      morningLateMinutes,
      morningUndertimeMinutes,
      afternoonLateMinutes,
      afternoonUndertimeMinutes,
      totalUndertimeDailyMinutes,
      combinedLateUndertimeMinutes,
      totalWorkedMinutes,
      isLate,
      isUndertime
    } = calculateDailyUndertime({ ...rec, assignedSchedule: recordSched }, fallbackSchedule);

    const isNonWork = rec.status === 'weekend' || rec.status === 'holiday';

    if (!isNonWork) {
      sumUndertimeMins += (undertimeHours * 60 + undertimeMinutes);
      sumLateMins += totalLateMinutes;
      sumUndertimeOnlyMins += totalUndertimeOnlyMinutes;
      sumMorningLateMins += morningLateMinutes;
      sumAfternoonLateMins += afternoonLateMinutes;
      sumMorningUndertimeMins += morningUndertimeMinutes;
      sumAfternoonUndertimeMins += afternoonUndertimeMinutes;
      if (isLate) lateDaysCount += 1;
      if (isUndertime) undertimeDaysCount += 1;
    }

    sumWorkedMins += totalWorkedMinutes;

    return {
      ...rec,
      assignedSchedule: recordSched,
      undertimeHours: isNonWork ? 0 : undertimeHours,
      undertimeMinutes: isNonWork ? 0 : undertimeMinutes,
      lateHours: isNonWork ? 0 : lateHours,
      lateMinutes: isNonWork ? 0 : lateMinutes,
      totalLateMinutes: isNonWork ? 0 : totalLateMinutes,
      undertimeOnlyHours: isNonWork ? 0 : undertimeOnlyHours,
      undertimeOnlyMinutes: isNonWork ? 0 : undertimeOnlyMinutes,
      totalUndertimeOnlyMinutes: isNonWork ? 0 : totalUndertimeOnlyMinutes,
      morningLateMinutes: isNonWork ? 0 : morningLateMinutes,
      morningUndertimeMinutes: isNonWork ? 0 : morningUndertimeMinutes,
      afternoonLateMinutes: isNonWork ? 0 : afternoonLateMinutes,
      afternoonUndertimeMinutes: isNonWork ? 0 : afternoonUndertimeMinutes,
      totalUndertimeDailyMinutes: isNonWork ? 0 : totalUndertimeDailyMinutes,
      combinedLateUndertimeMinutes: isNonWork ? 0 : combinedLateUndertimeMinutes,
      hoursWorked: Number((totalWorkedMinutes / 60).toFixed(1))
    };
  });

  const totalUndertimeHours = Math.floor(sumUndertimeMins / 60);
  const totalUndertimeMinutes = sumUndertimeMins % 60;

  const totalLateHours = Math.floor(sumLateMins / 60);
  const totalLateRemainingMinutes = sumLateMins % 60;

  const totalUndertimeOnlyHours = Math.floor(sumUndertimeOnlyMins / 60);
  const totalUndertimeOnlyRemainingMinutes = sumUndertimeOnlyMins % 60;

  const totalWorkedHours = Number((sumWorkedMins / 60).toFixed(1));

  const totals: DTRPeriodTotals = {
    daysPresent: presentDays,
    totalWorkedHours,
    totalLateMinutes: sumLateMins,
    totalLateHours,
    totalLateRemainingMinutes,
    lateDaysCount,
    totalUndertimeOnlyMinutes: sumUndertimeOnlyMins,
    totalUndertimeMinutes: sumUndertimeOnlyMins,
    totalUndertimeOnlyHours,
    totalUndertimeOnlyRemainingMinutes,
    undertimeDaysCount,
    totalUndertimeHours,
    combinedLostMinutes: sumUndertimeMins,
    grandTotalHours: totalUndertimeHours,
    grandTotalMinutes: totalUndertimeMinutes,
    totalMorningLateMinutes: sumMorningLateMins,
    totalAfternoonLateMinutes: sumAfternoonLateMins,
    totalMorningUndertimeMinutes: sumMorningUndertimeMins,
    totalAfternoonUndertimeMinutes: sumAfternoonUndertimeMins,
    grandTotalLateUndertimeMinutes: sumUndertimeMins
  };

  return {
    updatedRecords,
    totals,
    totalUndertimeHours,
    totalUndertimeMinutes,
    totalLateMinutes: sumLateMins,
    totalLateHours,
    totalLateRemainingMinutes,
    totalUndertimeOnlyMinutes: sumUndertimeOnlyMins,
    totalUndertimeOnlyHours,
    totalUndertimeOnlyRemainingMinutes,
    lateDaysCount,
    undertimeDaysCount,
    daysPresent: presentDays,
    totalWorkedHours,
    combinedLostMinutes: sumUndertimeMins,
    assignedSchedule: resolvedEmployeeSchedule,
    effectiveScheduleConfig: WORK_SCHEDULES[resolvedEmployeeSchedule] || fallbackSchedule
  };
}
