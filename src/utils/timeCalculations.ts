import { DailyRecord, OfficialSchedule } from '../types/csc';

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
 * Parses time formats like "08:00", "8:00 AM", "1:30 PM", "13:30", "07:55:00"
 * Returns minutes from midnight, or null if invalid/empty
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim();
  if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'n/a') return null;

  // Check 12-hour AM/PM format
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const meridiem = ampmMatch[3]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  }

  // Check 24-hour HH:MM format
  const militaryMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (militaryMatch) {
    const hours = parseInt(militaryMatch[1], 10);
    const minutes = parseInt(militaryMatch[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Formats time for CSC Form 48 table display
 * Traditional Philippine CSC Form 48 records are displayed in 12-hour clean notation,
 * e.g., "7:58", "12:01", "12:54", "5:02" without excessive AM/PM suffix since the column header is already A.M. or P.M.
 */
export function formatCSCTimeDisplay(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return timeStr.trim();

  let hours = Math.floor(mins / 60);
  const minutes = mins % 60;

  // Convert to 12-hour number representation
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  const paddedMin = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${paddedMin}`;
}

/**
 * Computes undertime (late arrival + early departure) for a day in hours and minutes
 */
export function calculateDailyUndertime(
  record: Pick<DailyRecord, 'inTime' | 'breakTime' | 'resumeTime' | 'outTime' | 'status'>,
  schedule: OfficialSchedule
): { undertimeHours: number; undertimeMinutes: number; totalWorkedMinutes: number } {
  if (record.status !== 'regular') {
    return { undertimeHours: 0, undertimeMinutes: 0, totalWorkedMinutes: 0 };
  }

  const schedAmIn = parseTimeToMinutes(schedule.amIn) ?? 480;   // 8:00 AM = 480
  const schedAmOut = parseTimeToMinutes(schedule.amOut) ?? 720;  // 12:00 PM = 720
  const schedPmIn = parseTimeToMinutes(schedule.pmIn) ?? 780;   // 1:00 PM = 780
  const schedPmOut = parseTimeToMinutes(schedule.pmOut) ?? 1020; // 5:00 PM = 1020

  const actAmIn = parseTimeToMinutes(record.inTime);
  const actAmOut = parseTimeToMinutes(record.breakTime);
  const actPmIn = parseTimeToMinutes(record.resumeTime);
  const actPmOut = parseTimeToMinutes(record.outTime);

  let totalUndertimeMins = 0;
  let amWorkedMins = 0;
  let pmWorkedMins = 0;

  // AM Session calculation
  if (actAmIn !== null && actAmOut !== null) {
    // Late arrival in morning
    if (actAmIn > schedAmIn) {
      totalUndertimeMins += (actAmIn - schedAmIn);
    }
    // Early departure for lunch break
    if (actAmOut < schedAmOut) {
      totalUndertimeMins += (schedAmOut - actAmOut);
    }
    amWorkedMins = Math.max(0, Math.min(actAmOut, schedAmOut) - Math.max(actAmIn, schedAmIn));
  } else if (actAmIn === null && actAmOut === null) {
    // If empty on regular day, that's half day absence (240 mins)
    // Only count if PM was attended, otherwise treated as full day absence
    if (actPmIn !== null || actPmOut !== null) {
      totalUndertimeMins += (schedAmOut - schedAmIn); // 240 mins
    }
  }

  // PM Session calculation
  if (actPmIn !== null && actPmOut !== null) {
    // Late arrival from lunch resume
    if (actPmIn > schedPmIn) {
      totalUndertimeMins += (actPmIn - schedPmIn);
    }
    // Early departure at end of day
    if (actPmOut < schedPmOut) {
      totalUndertimeMins += (schedPmOut - actPmOut);
    }
    pmWorkedMins = Math.max(0, Math.min(actPmOut, schedPmOut) - Math.max(actPmIn, schedPmIn));
  } else if (actPmIn === null && actPmOut === null) {
    if (actAmIn !== null || actAmOut !== null) {
      totalUndertimeMins += (schedPmOut - schedPmIn); // 240 mins
    }
  }

  const hours = Math.floor(totalUndertimeMins / 60);
  const minutes = totalUndertimeMins % 60;
  const totalWorked = amWorkedMins + pmWorkedMins;

  return {
    undertimeHours: hours,
    undertimeMinutes: minutes,
    totalWorkedMinutes: totalWorked
  };
}

/**
 * Creates 31 rows (standard CSC Form 48 contains exactly 31 day lines).
 * If the month has fewer days (28, 29, 30), the remaining days are marked or left blank.
 */
export function generateMonthRecords(year: number, month: number, schedule: OfficialSchedule): DailyRecord[] {
  const daysInMonth = getDaysInMonth(year, month);
  const records: DailyRecord[] = [];

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
        undertimeHours: 0,
        undertimeMinutes: 0,
        hoursWorked: 0,
        remarks: statusLabel || ''
      });
    } else {
      // Non-existent day in month (e.g. Feb 29-31, Apr 31)
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
        undertimeHours: 0,
        undertimeMinutes: 0,
        hoursWorked: 0,
        remarks: ''
      });
    }
  }

  return records;
}

/**
 * Recalculates all daily records and returns overall totals
 */
export function recalculateRecords(records: DailyRecord[], schedule: OfficialSchedule): {
  updatedRecords: DailyRecord[];
  totalUndertimeHours: number;
  totalUndertimeMinutes: number;
  daysPresent: number;
  totalWorkedHours: number;
} {
  let sumUndertimeMins = 0;
  let presentDays = 0;
  let sumWorkedMins = 0;

  const updatedRecords = records.map(rec => {
    if (rec.status === 'weekend' || rec.status === 'holiday' || !rec.dateStr) {
      return { ...rec, undertimeHours: 0, undertimeMinutes: 0, hoursWorked: 0 };
    }

    const hasLog = Boolean(rec.inTime || rec.breakTime || rec.resumeTime || rec.outTime);
    if (!hasLog) {
      return { ...rec, undertimeHours: 0, undertimeMinutes: 0, hoursWorked: 0 };
    }

    presentDays += 1;
    const { undertimeHours, undertimeMinutes, totalWorkedMinutes } = calculateDailyUndertime(rec, schedule);
    sumUndertimeMins += (undertimeHours * 60 + undertimeMinutes);
    sumWorkedMins += totalWorkedMinutes;

    return {
      ...rec,
      undertimeHours,
      undertimeMinutes,
      hoursWorked: Number((totalWorkedMinutes / 60).toFixed(1))
    };
  });

  const totalUndertimeHours = Math.floor(sumUndertimeMins / 60);
  const totalUndertimeMinutes = sumUndertimeMins % 60;
  const totalWorkedHours = Number((sumWorkedMins / 60).toFixed(1));

  return {
    updatedRecords,
    totalUndertimeHours,
    totalUndertimeMinutes,
    daysPresent: presentDays,
    totalWorkedHours
  };
}
