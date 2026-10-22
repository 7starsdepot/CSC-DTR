import * as XLSX from 'xlsx';
import { DailyRecord, OfficialSchedule, PersonnelData } from '../types/csc';
import { formatCSCTimeDisplay, generateMonthRecords, recalculateRecords } from './timeCalculations';

export interface ParsedTimeCardResult {
  fileName: string;
  detectedEmployees: {
    name: string;
    id: string;
    department?: string;
    recordsCount: number;
  }[];
  extractedRecordsByEmployee: Record<string, Partial<DailyRecord>[]>;
  rawHeaders: string[];
  rawRowsCount: number;
}

// Normalized field detector helper
function normalizeColumnName(col: string): string {
  return col.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function detectColumnMapping(headers: string[]): {
  inCol: string | null;
  breakCol: string | null;
  resumeCol: string | null;
  outCol: string | null;
  dateCol: string | null;
  dayCol: string | null;
  employeeNameCol: string | null;
  employeeIdCol: string | null;
  remarksCol: string | null;
} {
  let inCol: string | null = null;
  let breakCol: string | null = null;
  let resumeCol: string | null = null;
  let outCol: string | null = null;
  let dateCol: string | null = null;
  let dayCol: string | null = null;
  let employeeNameCol: string | null = null;
  let employeeIdCol: string | null = null;
  let remarksCol: string | null = null;

  for (const header of headers) {
    const norm = normalizeColumnName(header);

    // Employee name detection
    if (!employeeNameCol && (norm.includes('employeename') || norm.includes('fullname') || norm === 'employee' || norm === 'name' || norm === 'staffname' || norm.includes('empname') || norm === 'personnel')) {
      employeeNameCol = header;
      continue;
    }
    // Employee ID detection
    if (!employeeIdCol && (norm.includes('employeeid') || norm.includes('empid') || norm === 'badge' || norm === 'badgenumber' || norm === 'id' || norm === 'bioid')) {
      employeeIdCol = header;
      continue;
    }
    // Date detection
    if (!dateCol && (norm.includes('date') || norm === 'logdate' || norm === 'attendance' || norm === 'punchdate')) {
      dateCol = header;
      continue;
    }
    // Day of month detection
    if (!dayCol && (norm === 'day' || norm === 'dayofmonth' || norm === 'daynum')) {
      dayCol = header;
      continue;
    }
    // Remarks detection
    if (!remarksCol && (norm.includes('remark') || norm.includes('status') || norm.includes('note') || norm.includes('particulars'))) {
      remarksCol = header;
      continue;
    }

    // Electronic Time Card 4 key columns: In, Break, Resume, Out
    // 1. In (AM Arrival)
    if (!inCol && (norm === 'in' || norm === 'amarrival' || norm === 'arrivalam' || norm === 'amin' || norm === 'timein' || norm === 'punch1' || norm === 'checkin' || norm === 'arrival' || norm === 'intime')) {
      inCol = header;
      continue;
    }
    // 2. Break (Noon/PM Departure / AM Departure / Lunch Out)
    if (!breakCol && (norm === 'break' || norm === 'lunchout' || norm === 'amout' || norm === 'punch2' || norm === 'departuream' || norm === 'amdeparture' || norm === 'breakout' || norm === 'timeout1')) {
      breakCol = header;
      continue;
    }
    // 3. Resume (PM Arrival / Lunch In)
    if (!resumeCol && (norm === 'resume' || norm === 'pmarrival' || norm === 'arrivalpm' || norm === 'lunchin' || norm === 'pmin' || norm === 'punch3' || norm === 'breakin' || norm === 'timein2')) {
      resumeCol = header;
      continue;
    }
    // 4. Out (PM Departure / Day Out)
    if (!outCol && (norm === 'out' || norm === 'pmdeparture' || norm === 'departurepm' || norm === 'pmout' || norm === 'punch4' || norm === 'checkout' || norm === 'departure' || norm === 'outtime')) {
      outCol = header;
      continue;
    }
  }

  // Handle case where Break is named "PM Departure" (first departure) and Out is also "PM Departure" (second departure)
  if (!breakCol || !outCol) {
    for (const header of headers) {
      if (header === inCol || header === resumeCol) continue;
      const norm = normalizeColumnName(header);
      if (norm.includes('departure') || norm.includes('out') || norm.includes('break')) {
        if (!breakCol) {
          breakCol = header;
        } else if (!outCol && header !== breakCol) {
          outCol = header;
        }
      }
    }
  }

  return {
    inCol,
    breakCol,
    resumeCol,
    outCol,
    dateCol,
    dayCol,
    employeeNameCol,
    employeeIdCol,
    remarksCol
  };
}

/**
 * Format any cell value into a clean time string like "07:54" or "12:00"
 */
function parseCellTime(rawVal: any): string {
  if (rawVal === null || rawVal === undefined) return '';

  if (typeof rawVal === 'number') {
    let timeFrac = rawVal;
    if (timeFrac > 1) {
      timeFrac = timeFrac - Math.floor(timeFrac);
    }
    const totalMinutes = Math.round(timeFrac * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const str = String(rawVal).trim();
  if (!str) return '';

  if (str.includes(' ') && str.includes(':')) {
    const parts = str.split(' ');
    const timeCandidate = parts.find(p => p.includes(':'));
    if (timeCandidate) {
      const timeParts = timeCandidate.split(':');
      if (timeParts.length >= 2) {
        return `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
      }
    }
  }

  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    if (str.toUpperCase().includes('PM') && h < 12) h += 12;
    if (str.toUpperCase().includes('AM') && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  return str;
}

/**
 * Extracts Day of Month (1-31) from date cell or day cell
 */
function extractDayNumber(dateVal: any, dayVal: any): number | null {
  if (dayVal !== undefined && dayVal !== null && dayVal !== '') {
    const num = parseInt(String(dayVal).trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 31) return num;
  }

  if (dateVal !== undefined && dateVal !== null && dateVal !== '') {
    if (typeof dateVal === 'number') {
      const parsedDate = XLSX.SSF.parse_date_code(dateVal);
      if (parsedDate && parsedDate.d) return parsedDate.d;
    }
    const str = String(dateVal).trim();
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.getDate();
    }
    const slashParts = str.split(/[/.-]/);
    if (slashParts.length >= 2) {
      if (slashParts[0].length === 4) {
        const d = parseInt(slashParts[2], 10);
        if (d >= 1 && d <= 31) return d;
      } else {
        const p2 = parseInt(slashParts[1], 10);
        if (p2 >= 1 && p2 <= 31) return p2;
      }
    }
  }

  return null;
}

export function parseExcelFile(
  fileBuffer: ArrayBuffer,
  fileName: string
): ParsedTimeCardResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });

  if (rawRows.length === 0) {
    throw new Error('The uploaded spreadsheet contains no data rows.');
  }

  const rawHeaders = Object.keys(rawRows[0]);
  const mapping = detectColumnMapping(rawHeaders);

  const detectedEmployeesMap = new Map<string, { id: string; name: string; count: number }>();
  const extractedRecordsByEmployee: Record<string, Partial<DailyRecord>[]> = {};

  rawRows.forEach((row, rowIndex) => {
    let empName = mapping.employeeNameCol ? String(row[mapping.employeeNameCol] || '').trim() : '';
    let empId = mapping.employeeIdCol ? String(row[mapping.employeeIdCol] || '').trim() : '';

    if (!empName && !empId) {
      empName = 'DEFAULT_EMPLOYEE';
    } else if (!empName && empId) {
      empName = `Employee ${empId}`;
    }

    const empKey = empName;
    if (!detectedEmployeesMap.has(empKey)) {
      detectedEmployeesMap.set(empKey, { id: empId || `EMP-${detectedEmployeesMap.size + 1}`, name: empName, count: 0 });
      extractedRecordsByEmployee[empKey] = [];
    }

    const empData = detectedEmployeesMap.get(empKey)!;
    empData.count += 1;

    const dayVal = mapping.dayCol ? row[mapping.dayCol] : undefined;
    const dateVal = mapping.dateCol ? row[mapping.dateCol] : undefined;
    const dayNum = extractDayNumber(dateVal, dayVal) ?? ((rowIndex % 31) + 1);

    const inTime = mapping.inCol ? parseCellTime(row[mapping.inCol]) : '';
    const breakTime = mapping.breakCol ? parseCellTime(row[mapping.breakCol]) : '';
    const resumeTime = mapping.resumeCol ? parseCellTime(row[mapping.resumeCol]) : '';
    const outTime = mapping.outCol ? parseCellTime(row[mapping.outCol]) : '';
    const remarks = mapping.remarksCol ? String(row[mapping.remarksCol] || '').trim() : '';

    extractedRecordsByEmployee[empKey].push({
      day: dayNum,
      inTime,
      breakTime,
      resumeTime,
      outTime,
      remarks
    });
  });

  const detectedEmployees = Array.from(detectedEmployeesMap.values()).map(e => ({
    name: e.name === 'DEFAULT_EMPLOYEE' ? 'Primary Employee (From File)' : e.name,
    id: e.id,
    recordsCount: e.count
  }));

  return {
    fileName,
    detectedEmployees,
    extractedRecordsByEmployee,
    rawHeaders,
    rawRowsCount: rawRows.length
  };
}

/**
 * Merges parsed electronic logs into the official 31-day records structure
 */
export function mergeParsedLogsIntoRecords(
  baseRecords: DailyRecord[],
  importedLogs: Partial<DailyRecord>[],
  schedule: OfficialSchedule
): DailyRecord[] {
  const logByDay = new Map<number, Partial<DailyRecord>>();
  for (const log of importedLogs) {
    if (log.day && log.day >= 1 && log.day <= 31) {
      logByDay.set(log.day, log);
    }
  }

  const merged = baseRecords.map(record => {
    const importData = logByDay.get(record.day);
    if (!importData) {
      return record;
    }

    const status = record.status;
    const inTime = importData.inTime ? formatCSCTimeDisplay(importData.inTime) : record.inTime;
    const breakTime = importData.breakTime ? formatCSCTimeDisplay(importData.breakTime) : record.breakTime;
    const resumeTime = importData.resumeTime ? formatCSCTimeDisplay(importData.resumeTime) : record.resumeTime;
    const outTime = importData.outTime ? formatCSCTimeDisplay(importData.outTime) : record.outTime;
    const remarks = importData.remarks !== undefined ? importData.remarks : record.remarks;

    return {
      ...record,
      inTime,
      breakTime,
      resumeTime,
      outTime,
      status,
      remarks
    };
  });

  return recalculateRecords(merged, schedule).updatedRecords;
}

/**
 * Converts the full parsed Excel result into an array of PersonnelData objects
 * for both All Personnel and Individual printing!
 */
export function convertParsedResultToPersonnelList(
  parseResult: ParsedTimeCardResult,
  year: number,
  month: number,
  schedule: OfficialSchedule
): PersonnelData[] {
  return parseResult.detectedEmployees.map((emp) => {
    const baseRecords = generateMonthRecords(year, month, schedule);
    const importedLogs = parseResult.extractedRecordsByEmployee[emp.name] || [];
    const merged = mergeParsedLogsIntoRecords(baseRecords, importedLogs, schedule);
    return {
      id: emp.id,
      name: emp.name === 'DEFAULT_EMPLOYEE' ? 'JUAN D. DELA CRUZ' : emp.name,
      records: merged
    };
  });
}

/**
 * Generates an official Excel template with multi-personnel records
 * and columns: Employee ID, Employee Name, Date, Day, In, Break, Resume, Out, Remarks
 */
export function generateSampleExcelFile(month: number = 10, year: number = 2026): {
  blob: Blob;
  fileName: string;
} {
  const daysInMonth = new Date(year, month, 0).getDate();
  const sampleData: any[] = [];

  const sampleStaff = [
    { id: 'CSC-2026-001', name: 'JUAN D. DELA CRUZ' },
    { id: 'CSC-2026-002', name: 'MARIA CLARA P. SANTOS' },
    { id: 'CSC-2026-003', name: 'ENGR. RICARDO B. DIZON' }
  ];

  sampleStaff.forEach((staff, staffIdx) => {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWeekend) {
        sampleData.push({
          'Employee ID': staff.id,
          'Employee Name': staff.name,
          'Date': `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          'Day': d,
          'In': '',
          'Break': '',
          'Resume': '',
          'Out': '',
          'Remarks': dayOfWeek === 6 ? 'SATURDAY' : 'SUNDAY'
        });
      } else {
        const morningVariance =
          d === 8 && staffIdx === 0
            ? '08:15'
            : (d % 6 === 0)
            ? '08:05'
            : (d % 4 === 0)
            ? '07:48'
            : '07:56';
        const lunchOutVariance = (d % 3 === 0) ? '12:00' : '12:02';
        const lunchInVariance = (d % 2 === 0) ? '12:55' : '12:58';
        const afternoonOutVariance =
          d === 15 && staffIdx === 1
            ? '16:45'
            : (d % 7 === 0)
            ? '16:50'
            : '17:05';

        let remarks = 'Regular';
        if (d === 8 && staffIdx === 0) remarks = 'Late (15 mins)';
        if (d === 15 && staffIdx === 1) remarks = 'Undertime (15 mins)';
        if (d === 20) remarks = 'Flag Ceremony';
        if (d === 22 && staffIdx === 2) remarks = 'Pass Slip (OB)';

        sampleData.push({
          'Employee ID': staff.id,
          'Employee Name': staff.name,
          'Date': `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          'Day': d,
          'In': morningVariance,
          'Break': lunchOutVariance,
          'Resume': lunchInVariance,
          'Out': afternoonOutVariance,
          'Remarks': remarks
        });
      }
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  worksheet['!cols'] = [
    { wch: 16 }, // Employee ID
    { wch: 26 }, // Employee Name
    { wch: 14 }, // Date
    { wch: 6 },  // Day
    { wch: 10 }, // In
    { wch: 10 }, // Break
    { wch: 10 }, // Resume
    { wch: 10 }, // Out
    { wch: 28 }  // Remarks (wide)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Electronic Time Card');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  return {
    blob,
    fileName: `CSC_Electronic_Time_Card_Template_${year}_${String(month).padStart(2, '0')}.xlsx`
  };
}
