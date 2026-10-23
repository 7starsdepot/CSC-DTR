import * as XLSX from 'xlsx';
import { DailyRecord, OfficialSchedule, PersonnelData } from '../types/csc';
import { formatCSCTimeDisplay, generateMonthRecords, recalculateRecords } from './timeCalculations';

export interface ParsedEmployeeInfo {
  name: string;
  id: string;
  department?: string;
  recordsCount: number;
}

export interface ParsedTimeCardResult {
  fileName: string;
  detectedMonth?: number;
  detectedYear?: number;
  detectedEmployees: ParsedEmployeeInfo[];
  extractedRecordsByEmployee: Record<string, Partial<DailyRecord>[]>;
  rawHeaders: string[];
  rawRowsCount: number;
}

export interface ColumnIndexMapping {
  inColIdx: number | null;
  breakColIdx: number | null;
  resumeColIdx: number | null;
  outColIdx: number | null;
  dateColIdx: number | null;
  dayColIdx: number | null;
  empNameColIdx: number | null;
  empIdColIdx: number | null;
  remarksColIdx: number | null;
}

// Normalized field detector helper
export function normalizeColumnName(col: any): string {
  if (col === null || col === undefined) return '';
  return String(col)
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Detects column indices from a table header row
 * Supports both named columns (In, Break, Resume, Out)
 * and standard paired columns (Arrival/Departure, In/Out)
 */
export function detectColumnIndices(headers: any[]): ColumnIndexMapping {
  let inColIdx: number | null = null;
  let breakColIdx: number | null = null;
  let resumeColIdx: number | null = null;
  let outColIdx: number | null = null;
  let dateColIdx: number | null = null;
  let dayColIdx: number | null = null;
  let empNameColIdx: number | null = null;
  let empIdColIdx: number | null = null;
  let remarksColIdx: number | null = null;

  const arrivals: number[] = [];
  const departures: number[] = [];
  const ins: number[] = [];
  const outs: number[] = [];

  for (let idx = 0; idx < headers.length; idx++) {
    const rawVal = headers[idx];
    const norm = normalizeColumnName(rawVal);
    if (!norm) continue;

    // 1. Employee Name
    if (
      empNameColIdx === null &&
      (norm === 'name' ||
        norm.startsWith('name') ||
        norm.includes('employeename') ||
        norm.includes('fullname') ||
        norm === 'employee' ||
        norm === 'staffname' ||
        norm.includes('empname') ||
        norm === 'personnel')
    ) {
      empNameColIdx = idx;
      continue;
    }

    // 2. Employee ID / User ID / Badge
    if (
      empIdColIdx === null &&
      (norm.includes('employeeid') ||
        norm.includes('empid') ||
        norm === 'badge' ||
        norm === 'badgenumber' ||
        norm === 'userid' ||
        norm === 'id' ||
        norm === 'bioid')
    ) {
      empIdColIdx = idx;
      continue;
    }

    // 3. Date column (e.g. "Date", "Log Date", "Punch Date", "Attendance Date")
    if (
      dateColIdx === null &&
      (norm.includes('date') || norm === 'logdate' || norm === 'attendance' || norm === 'punchdate')
    ) {
      dateColIdx = idx;
      continue;
    }

    // 4. Day of month (e.g. "Day", "Day of Month", "DayNum", "D")
    if (
      dayColIdx === null &&
      (norm === 'day' || norm === 'dayofmonth' || norm === 'daynum' || norm === 'd')
    ) {
      dayColIdx = idx;
      continue;
    }

    // 5. Remarks column
    if (
      remarksColIdx === null &&
      (norm.includes('remark') || norm.includes('status') || norm.includes('note') || norm.includes('particulars'))
    ) {
      remarksColIdx = idx;
      continue;
    }

    // Track Arrival / Departure occurrences
    if (norm.includes('arrival') || norm.includes('dutyin') || norm.includes('onduty')) {
      arrivals.push(idx);
    }
    if (norm.includes('departure') || norm.includes('dutyout') || norm.includes('offduty')) {
      departures.push(idx);
    }

    // Check specific Electronic Time Card columns: In, Break, Resume, Out
    // A. Specific AM Arrival / In
    if (
      inColIdx === null &&
      (norm === 'in' ||
        norm === 'amin' ||
        norm === 'inam' ||
        norm === 'am' ||
        norm === 'amarrival' ||
        norm === 'arrivalam' ||
        norm === 'arrival' ||
        norm === 'timein' ||
        norm === 'intime' ||
        norm === 'timein1' ||
        norm === 'in1' ||
        norm === 'punch1' ||
        norm === 'p1' ||
        norm === '1' ||
        norm === 'clockin' ||
        norm === 'checkin' ||
        norm === 'dutyin' ||
        norm === 'onduty' ||
        norm === 'morningin' ||
        norm === 'morningarrival' ||
        norm === 'morning' ||
        norm === 'signin' ||
        norm === 'entry' ||
        norm === 'start')
    ) {
      inColIdx = idx;
      ins.push(idx);
      continue;
    }

    // B. Specific AM Departure / Break
    if (
      breakColIdx === null &&
      (norm === 'break' ||
        norm === 'amout' ||
        norm === 'amdeparture' ||
        norm === 'departuream' ||
        norm === 'lunchout' ||
        norm === 'breakout' ||
        norm === 'punch2' ||
        norm === 'p2' ||
        norm === '2' ||
        norm === 'out1' ||
        norm === 'timeout1' ||
        norm === 'lunch')
    ) {
      breakColIdx = idx;
      continue;
    }

    // C. Specific PM Arrival / Resume
    if (
      resumeColIdx === null &&
      (norm === 'resume' ||
        norm === 'pmin' ||
        norm === 'pmarrival' ||
        norm === 'arrivalpm' ||
        norm === 'lunchin' ||
        norm === 'breakin' ||
        norm === 'punch3' ||
        norm === 'p3' ||
        norm === '3' ||
        norm === 'in2' ||
        norm === 'timein2')
    ) {
      resumeColIdx = idx;
      continue;
    }

    // D. Specific PM Departure / Out
    if (
      outColIdx === null &&
      (norm === 'out' ||
        norm === 'timeout' ||
        norm === 'timeout2' ||
        norm === 'time-out' ||
        norm === 'time_out' ||
        norm === 'pmtimeout' ||
        norm === 'pmout' ||
        norm === 'outpm' ||
        norm === 'pmdeparture' ||
        norm === 'departurepm' ||
        norm === 'afternoonout' ||
        norm === 'eveningout' ||
        norm === 'checkout' ||
        norm === 'clockout' ||
        norm === 'punch4' ||
        norm === 'p4' ||
        norm === '4' ||
        norm === 'out2' ||
        norm === 'outtime' ||
        norm === 'departure' ||
        norm === 'dutyout' ||
        norm === 'offduty' ||
        norm === 'signout' ||
        norm === 'dismissal' ||
        norm.includes('timeout') ||
        (norm.endsWith('out') && !norm.includes('break') && !norm.includes('am')))
    ) {
      outColIdx = idx;
      outs.push(idx);
      continue;
    }

    // Secondary tracking for generic "in" or "out"
    if (norm === 'in' || norm.includes('in')) {
      ins.push(idx);
    }
    if (norm === 'out' || norm.includes('out')) {
      outs.push(idx);
    }
  }

  // Fallback 1: If Arrival/Departure pairs exist
  if (arrivals.length >= 1 && inColIdx === null) {
    inColIdx = arrivals[0];
  }
  if (arrivals.length >= 2 && resumeColIdx === null) {
    resumeColIdx = arrivals[1];
  }
  if (departures.length >= 1 && breakColIdx === null) {
    breakColIdx = departures[0];
  }
  if (departures.length >= 2 && outColIdx === null) {
    outColIdx = departures[1];
  }

  // Fallback 2: If In/Out pairs exist (e.g. In 1, Out 1, In 2, Out 2)
  if (ins.length >= 1 && inColIdx === null) {
    inColIdx = ins[0];
  }
  if (ins.length >= 2 && resumeColIdx === null) {
    resumeColIdx = ins[1];
  }
  if (outs.length >= 1 && breakColIdx === null && outs[0] !== outColIdx) {
    if (outs.length >= 2) {
      breakColIdx = outs[0];
      outColIdx = outs[1];
    } else {
      outColIdx = outs[0];
    }
  }

  // Fallback 3: Positional inference based on Break, Resume, Out
  // If Break is known, the column immediately before Break is GUARANTEED to be In!
  if (inColIdx === null && breakColIdx !== null && breakColIdx > 0) {
    const candidateIdx = breakColIdx - 1;
    if (candidateIdx !== dateColIdx && candidateIdx !== dayColIdx) {
      inColIdx = candidateIdx;
    }
  }

  // If Resume is known, the column two positions before Resume is In!
  if (inColIdx === null && resumeColIdx !== null && resumeColIdx > 1) {
    const candidateIdx = resumeColIdx - 2;
    if (candidateIdx !== dateColIdx && candidateIdx !== dayColIdx) {
      inColIdx = candidateIdx;
    }
  }

  // If Out is known, the column three positions before Out is In!
  if (inColIdx === null && outColIdx !== null && outColIdx > 2) {
    const candidateIdx = outColIdx - 3;
    if (candidateIdx !== dateColIdx && candidateIdx !== dayColIdx) {
      inColIdx = candidateIdx;
    }
  }

  // Fallback 4: Positional inference for Out (PM Departure) based on Resume, Break, or In
  if (outColIdx === null && resumeColIdx !== null && resumeColIdx + 1 < headers.length) {
    outColIdx = resumeColIdx + 1;
  }
  if (outColIdx === null && breakColIdx !== null && breakColIdx + 2 < headers.length) {
    outColIdx = breakColIdx + 2;
  }
  if (outColIdx === null && inColIdx !== null && inColIdx + 3 < headers.length) {
    outColIdx = inColIdx + 3;
  }

  // Fallback 5: If In is known, and subsequent 3 columns are not mapped,
  // map them to Break, Resume, Out
  if (inColIdx !== null) {
    if (breakColIdx === null && inColIdx + 1 < headers.length) {
      breakColIdx = inColIdx + 1;
    }
    if (resumeColIdx === null && inColIdx + 2 < headers.length) {
      resumeColIdx = inColIdx + 2;
    }
    if (outColIdx === null && inColIdx + 3 < headers.length) {
      outColIdx = inColIdx + 3;
    }
  }

  return {
    inColIdx,
    breakColIdx,
    resumeColIdx,
    outColIdx,
    dateColIdx,
    dayColIdx,
    empNameColIdx,
    empIdColIdx,
    remarksColIdx
  };
}

/**
 * Format any cell value into a clean time string like "07:54" or "12:00"
 * Handles Date objects, Excel numeric serials, fractions, HHMM integers, and formatted strings
 */
export function parseCellTime(rawVal: any): string {
  if (rawVal === null || rawVal === undefined) return '';

  // 1. JavaScript Date object (from XLSX cellDates: true)
  if (rawVal instanceof Date) {
    if (isNaN(rawVal.getTime())) return '';
    const hours = rawVal.getHours();
    const minutes = rawVal.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 2. Numeric value (Excel time fraction or HHMM integer)
  if (typeof rawVal === 'number') {
    if (isNaN(rawVal) || rawVal === 0) return '';

    // If integer representation HHMM (e.g. 800 -> 08:00, 1138 -> 11:38, 1700 -> 17:00, 755 -> 07:55)
    if (rawVal >= 100 && rawVal <= 2400 && Number.isInteger(rawVal)) {
      const h = Math.floor(rawVal / 100);
      const m = rawVal % 100;
      if (h <= 24 && m < 60) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    // Excel day fraction (0.333333 = 8:00 AM)
    let timeFrac = rawVal;
    if (timeFrac >= 1) {
      timeFrac = timeFrac - Math.floor(timeFrac);
    }
    const totalMinutes = Math.round(timeFrac * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 3. String value
  let str = String(rawVal)
    .replace(/\u00a0/g, ' ')
    .replace(/[()]/g, '')
    .trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a') return '';

  // Clean A.M. / P.M. with periods to AM / PM
  str = str.replace(/A\.M\./gi, 'AM').replace(/P\.M\./gi, 'PM');

  // Handle dot separator like "8.00 AM" or "08.00" or "8.00"
  str = str.replace(/(\d{1,2})\.(\d{2})/, '$1:$2');

  // Standard AM/PM format like "11:38 AM", "8:00 AM", "5:00 PM", "8:00AM"
  const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2];
    const meridiem = ampmMatch[3]?.toUpperCase();

    if (meridiem === 'PM' && h < 12) {
      h += 12;
    } else if (meridiem === 'AM' && h === 12) {
      h = 0;
    }
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // Military 24-hour HH:MM format like "08:00", "17:01"
  const militaryMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (militaryMatch) {
    const h = parseInt(militaryMatch[1], 10);
    const m = militaryMatch[2];
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // 3-digit or 4-digit military string e.g. "0800", "1700", "755", "800"
  const numMatch = str.match(/^(\d{1,2})(\d{2})$/);
  if (numMatch) {
    const h = parseInt(numMatch[1], 10);
    const m = parseInt(numMatch[2], 10);
    if (h >= 0 && h <= 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  return str;
}

/**
 * Extracts Day, Month, and Year from date cell or day cell
 */
export function extractDateInfo(
  dateVal: any,
  dayVal: any
): { day: number | null; month: number | null; year: number | null } {
  // If dayVal is given directly (e.g. integer 1-31)
  if (dayVal !== undefined && dayVal !== null && dayVal !== '') {
    const num = parseInt(String(dayVal).trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 31) {
      return { day: num, month: null, year: null };
    }
  }

  if (dateVal === undefined || dateVal === null || dateVal === '') {
    return { day: null, month: null, year: null };
  }

  // If dateVal is a Date object (from XLSX cellDates: true)
  if (dateVal instanceof Date) {
    if (!isNaN(dateVal.getTime())) {
      return {
        day: dateVal.getDate(),
        month: dateVal.getMonth() + 1,
        year: dateVal.getFullYear()
      };
    }
  }

  // If dateVal is an Excel numeric serial
  if (typeof dateVal === 'number') {
    if (dateVal >= 1 && dateVal <= 31 && Number.isInteger(dateVal)) {
      return { day: dateVal, month: null, year: null };
    }
    const parsedDate = XLSX.SSF.parse_date_code(dateVal);
    if (parsedDate && parsedDate.d) {
      return { day: parsedDate.d, month: parsedDate.m, year: parsedDate.y };
    }
  }

  const str = String(dateVal).trim();
  if (!str) return { day: null, month: null, year: null };

  // Standalone day number "1" to "31"
  if (/^\d{1,2}$/.test(str)) {
    const num = parseInt(str, 10);
    if (num >= 1 && num <= 31) {
      return { day: num, month: null, year: null };
    }
  }

  // Matches "2026-10-16 Fri", "2026-10-16", "2026/10/16" (YYYY-MM-DD)
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { day: d, month: m, year: y };
    }
  }

  // Matches "10-16-2026 Fri", "10/16/2026 Fri", "16-10-2026", "16/10/2026"
  const mdyOrDmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mdyOrDmyMatch) {
    const p1 = parseInt(mdyOrDmyMatch[1], 10);
    const p2 = parseInt(mdyOrDmyMatch[2], 10);
    const y = parseInt(mdyOrDmyMatch[3], 10);

    // If p1 > 12, it must be DD-MM-YYYY
    if (p1 > 12 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
      return { day: p1, month: p2, year: y };
    }
    // If p2 > 12, it must be MM-DD-YYYY
    if (p2 > 12 && p2 <= 31 && p1 >= 1 && p1 <= 12) {
      return { day: p2, month: p1, year: y };
    }
    // Default assumption for biometric files (as in image: "10-16-2026 Fri"): MM-DD-YYYY
    if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
      return { day: p2, month: p1, year: y };
    }
  }

  // Fallback JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return { day: parsed.getDate(), month: parsed.getMonth() + 1, year: parsed.getFullYear() };
  }

  return { day: null, month: null, year: null };
}

/**
 * Checks if a row is a header row containing table columns
 */
function isTableHeaderRow(row: any[]): boolean {
  if (!Array.isArray(row) || row.length === 0) return false;
  const rowStrings = row.map((cell: any) => normalizeColumnName(cell));
  const hasDateOrDay = rowStrings.some(
    s => s.includes('date') || s === 'day' || s === 'dayofmonth'
  );
  const hasPunchCol = rowStrings.some(
    s =>
      s === 'in' ||
      s === 'break' ||
      s === 'resume' ||
      s === 'out' ||
      s.includes('arrival') ||
      s.includes('departure') ||
      s.includes('timein') ||
      s.includes('timeout')
  );
  return hasDateOrDay && hasPunchCol;
}

/**
 * Extracts employee metadata (Name and User ID) from a single row
 */
function extractEmployeeMetadataFromRow(row: any[]): { name: string | null; id: string | null } {
  let name: string | null = null;
  let id: string | null = null;

  if (!Array.isArray(row)) return { name, id };

  for (let c = 0; c < row.length; c++) {
    const cellVal = String(row[c] || '').trim();
    if (!cellVal) continue;

    // Pattern 1: Same cell "Name : Jay Manalo" or "Employee : Maria Santos"
    const nameMatch = cellVal.match(/(?:name|employee|personnel)\s*:\s*(.+)$/i);
    if (nameMatch && nameMatch[1]?.trim() && !name) {
      name = nameMatch[1].trim();
    }

    // Pattern 2: Adjacent cell format: Cell c is "Name :" and next non-empty cell has the name
    if (/^(?:name|employee|personnel)\s*:?$/i.test(cellVal) && !name) {
      for (let nextC = c + 1; nextC < Math.min(row.length, c + 5); nextC++) {
        const nextVal = String(row[nextC] || '').trim();
        if (nextVal && !/^(?:user\s*id|id|sche|date|day)/i.test(nextVal)) {
          name = nextVal;
          break;
        }
      }
    }

    // Pattern 3: Same cell "User ID : 1" or "Badge : 004"
    const idMatch = cellVal.match(/(?:user\s*id|employee\s*id|badge\s*no|badge|id)\s*:\s*(\w+)/i);
    if (idMatch && idMatch[1]?.trim() && !id) {
      id = idMatch[1].trim();
    }

    // Pattern 4: Adjacent cell format: Cell c is "User ID :" and next non-empty cell has the id
    if (/^(?:user\s*id|employee\s*id|badge|id)\s*:?$/i.test(cellVal) && !id) {
      for (let nextC = c + 1; nextC < Math.min(row.length, c + 5); nextC++) {
        const nextVal = String(row[nextC] || '').trim();
        if (nextVal) {
          id = nextVal;
          break;
        }
      }
    }
  }

  return { name, id };
}

/**
 * Parses full Excel file across all worksheets and handles:
 * 1. Multiple worksheets (one employee per sheet or multi-sheet exports)
 * 2. Repeating employee blocks within a single sheet (stacked Electronic Time Card tables)
 * 3. Flat tables with Name / Employee as a column
 * 4. All punch columns (In = AM Arrival, Break = AM Departure, Resume = PM Arrival, Out = PM Departure)
 */
export function parseExcelFile(
  fileBuffer: ArrayBuffer,
  fileName: string
): ParsedTimeCardResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded file contains no readable worksheets.');
  }

  const detectedEmployeesMap = new Map<string, { id: string; name: string; count: number }>();
  const extractedRecordsByEmployee: Record<string, Partial<DailyRecord>[]> = {};
  let detectedMonth: number | undefined;
  let detectedYear: number | undefined;
  let globalRawRowsCount = 0;
  let representativeHeaders: string[] = [];
  let fallbackMapping: ColumnIndexMapping | null = null;

  // Iterate across ALL worksheets in the workbook
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const grid: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    if (!grid || grid.length === 0) continue;
    globalRawRowsCount += grid.length;

    // Active state for this sheet / current block
    let activeEmpName: string | null = null;
    let activeEmpId: string | null = null;
    let currentMapping: ColumnIndexMapping | null = fallbackMapping ? { ...fallbackMapping } : null;

    // If sheet name itself looks like a person's name (not "Sheet1", "Page 1", etc.)
    const sheetNameClean = sheetName.trim();
    const isGenericSheet = /^sheet\s*\d+$/i.test(sheetNameClean) || /^page\s*\d+$/i.test(sheetNameClean);
    if (!isGenericSheet && sheetNameClean.length > 2) {
      activeEmpName = sheetNameClean;
    }

    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      if (!row || !Array.isArray(row) || row.every((c: any) => String(c || '').trim() === '')) {
        continue;
      }

      // Check if this row contains Employee Metadata (e.g., "User ID : 1   Name : Jay Manalo")
      const meta = extractEmployeeMetadataFromRow(row);
      if (meta.name) {
        activeEmpName = meta.name.replace(/^(name\s*:\s*|employee\s*:\s*)/i, '').trim();
      }
      if (meta.id) {
        activeEmpId = meta.id;
      }

      // Check if this row is a Table Header Row
      if (isTableHeaderRow(row)) {
        currentMapping = detectColumnIndices(row);
        fallbackMapping = { ...currentMapping };
        if (representativeHeaders.length === 0) {
          representativeHeaders = row.map(c => String(c || '').trim());
        }
        continue; // Header row, move to data rows
      }

      // If we don't have a mapping yet, attempt to infer from current row if it looks like a header
      if (!currentMapping) {
        const rowNorm = row.map(c => normalizeColumnName(c));
        if (rowNorm.some(s => s.includes('date') || s === 'in' || s === 'break')) {
          currentMapping = detectColumnIndices(row);
          fallbackMapping = { ...currentMapping };
          if (representativeHeaders.length === 0) {
            representativeHeaders = row.map(c => String(c || '').trim());
          }
          continue;
        }
      }

      // If mapping still null, use fallbackMapping
      if (!currentMapping && fallbackMapping) {
        currentMapping = { ...fallbackMapping };
      }

      // Now inspect if this is a data row
      if (currentMapping) {
        const getCell = (colIdx: number | null): any => {
          if (colIdx === null || colIdx < 0 || colIdx >= row.length) return '';
          return row[colIdx];
        };

        // Check if row has an in-line employee name column
        if (currentMapping.empNameColIdx !== null) {
          const rowEmp = String(getCell(currentMapping.empNameColIdx) || '').trim();
          if (rowEmp && !/^(name|employee)$/i.test(rowEmp)) {
            activeEmpName = rowEmp.replace(/^(name\s*:\s*|employee\s*:\s*)/i, '').trim();
          }
        }
        if (currentMapping.empIdColIdx !== null) {
          const rowId = String(getCell(currentMapping.empIdColIdx) || '').trim();
          if (rowId && !/^(id|userid|badge)$/i.test(rowId)) {
            activeEmpId = rowId;
          }
        }

        const dateVal = getCell(currentMapping.dateColIdx);
        const dayVal = getCell(currentMapping.dayColIdx);

        // Try extracting date info from date/day columns
        let dateInfo = extractDateInfo(dateVal, dayVal);

        // If not found in designated column, check if col 0 has a date
        if (!dateInfo.day && row.length > 0) {
          dateInfo = extractDateInfo(row[0], undefined);
        }

        // If no day found, check if any cell in row looks like a date
        if (!dateInfo.day) {
          for (let c = 0; c < Math.min(row.length, 3); c++) {
            const candidate = extractDateInfo(row[c], undefined);
            if (candidate.day) {
              dateInfo = candidate;
              break;
            }
          }
        }

        // If this row has a valid day (1-31) and is not a total/header row
        if (dateInfo.day && dateInfo.day >= 1 && dateInfo.day <= 31) {
          if (dateInfo.month && !detectedMonth) {
            detectedMonth = dateInfo.month;
          }
          if (dateInfo.year && !detectedYear) {
            detectedYear = dateInfo.year;
          }

          // Determine final employee key
          let finalEmpName = activeEmpName;
          if (!finalEmpName && activeEmpId) {
            finalEmpName = `Employee ${activeEmpId}`;
          } else if (!finalEmpName) {
            finalEmpName = 'EMPLOYEE';
          }

          const empKey = finalEmpName.trim().toUpperCase();

          if (!detectedEmployeesMap.has(empKey)) {
            detectedEmployeesMap.set(empKey, {
              id: activeEmpId || `EMP-${detectedEmployeesMap.size + 1}`,
              name: empKey,
              count: 0
            });
            extractedRecordsByEmployee[empKey] = [];
          }

          const empData = detectedEmployeesMap.get(empKey)!;
          empData.count += 1;

          // DYNAMIC IN-TIME HEURISTIC:
          // Ensure inColIdx is always resolved properly for every employee
          if (currentMapping.inColIdx === null && currentMapping.breakColIdx !== null && currentMapping.breakColIdx > 0) {
            currentMapping.inColIdx = currentMapping.breakColIdx - 1;
          }

          // Ensure outColIdx is always resolved properly for every employee
          if (currentMapping.outColIdx === null && currentMapping.resumeColIdx !== null && currentMapping.resumeColIdx + 1 < row.length) {
            currentMapping.outColIdx = currentMapping.resumeColIdx + 1;
          } else if (currentMapping.outColIdx === null && currentMapping.breakColIdx !== null && currentMapping.breakColIdx + 2 < row.length) {
            currentMapping.outColIdx = currentMapping.breakColIdx + 2;
          } else if (currentMapping.outColIdx === null && currentMapping.inColIdx !== null && currentMapping.inColIdx + 3 < row.length) {
            currentMapping.outColIdx = currentMapping.inColIdx + 3;
          }

          // Extract punches according to:
          // In = AM Arrival, Break = AM Departure, Resume = PM Arrival, Out = PM Departure
          const inTime = parseCellTime(getCell(currentMapping.inColIdx));
          const breakTime = parseCellTime(getCell(currentMapping.breakColIdx));
          const resumeTime = parseCellTime(getCell(currentMapping.resumeColIdx));
          let outTime = parseCellTime(getCell(currentMapping.outColIdx));

          // Fallback for afternoon departure: if outTime is empty, check column adjacent to resume
          if (!outTime && currentMapping.resumeColIdx !== null && currentMapping.resumeColIdx + 1 < row.length) {
            const candidateOut = parseCellTime(row[currentMapping.resumeColIdx + 1]);
            if (candidateOut) {
              outTime = candidateOut;
              currentMapping.outColIdx = currentMapping.resumeColIdx + 1;
            }
          }

          // When the time in is blank, leave it blank:
          // Do not infer or fabricate time in from other columns.

          const remarks = currentMapping.remarksColIdx !== null
            ? String(getCell(currentMapping.remarksColIdx) || '').trim()
            : '';

          extractedRecordsByEmployee[empKey].push({
            day: dateInfo.day,
            inTime,
            breakTime,
            resumeTime,
            outTime,
            remarks
          });
        }
      }
    }
  }

  // If no employees detected, throw helpful error
  if (detectedEmployeesMap.size === 0) {
    throw new Error(
      'Could not detect valid electronic time card records in the uploaded spreadsheet. Please ensure the file contains Date, In, Break, Resume, and Out columns.'
    );
  }

  const detectedEmployees = Array.from(detectedEmployeesMap.values()).map(e => ({
    name: e.name,
    id: e.id,
    recordsCount: e.count
  }));

  return {
    fileName,
    detectedMonth,
    detectedYear,
    detectedEmployees,
    extractedRecordsByEmployee,
    rawHeaders: representativeHeaders,
    rawRowsCount: globalRawRowsCount
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
      const existing = logByDay.get(log.day);
      if (!existing) {
        logByDay.set(log.day, { ...log });
      } else {
        // Merge so we don't overwrite non-empty punches with empty ones if there are multiple entries
        logByDay.set(log.day, {
          day: log.day,
          inTime: log.inTime || existing.inTime || '',
          breakTime: log.breakTime || existing.breakTime || '',
          resumeTime: log.resumeTime || existing.resumeTime || '',
          outTime: log.outTime || existing.outTime || '',
          remarks: log.remarks || existing.remarks || ''
        });
      }
    }
  }

  const merged = baseRecords.map(record => {
    const importData = logByDay.get(record.day);
    if (!importData) {
      return record;
    }

    const status = record.status;

    // Cleanly display times on CSC Form 48 format; when blank, leave it blank
    const inTime = importData.inTime ? formatCSCTimeDisplay(importData.inTime) : '';
    const breakTime = importData.breakTime ? formatCSCTimeDisplay(importData.breakTime) : '';
    const resumeTime = importData.resumeTime ? formatCSCTimeDisplay(importData.resumeTime) : '';
    const outTime = importData.outTime ? formatCSCTimeDisplay(importData.outTime) : '';
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
 */
export function convertParsedResultToPersonnelList(
  parseResult: ParsedTimeCardResult,
  year: number,
  month: number,
  schedule: OfficialSchedule
): PersonnelData[] {
  return parseResult.detectedEmployees.map(emp => {
    const baseRecords = generateMonthRecords(year, month, schedule);
    const importedLogs = parseResult.extractedRecordsByEmployee[emp.name] || [];
    const merged = mergeParsedLogsIntoRecords(baseRecords, importedLogs, schedule);
    let cleanName = emp.name.replace(/^(name\s*:\s*|employee\s*:\s*)/i, '').trim();
    if (!cleanName || cleanName === 'DEFAULT_EMPLOYEE' || cleanName === 'EMPLOYEE' || cleanName.toLowerCase() === 'name') {
      cleanName = 'EMPLOYEE';
    }
    return {
      id: emp.id,
      name: cleanName.toUpperCase(),
      records: merged
    };
  });
}

/**
 * Generates an official Excel template with multi-personnel records
 */
export function generateSampleExcelFile(month: number = 10, year: number = 2026): {
  blob: Blob;
  fileName: string;
} {
  const daysInMonth = new Date(year, month, 0).getDate();
  const sampleData: any[] = [];

  const sampleStaff = [
    { id: '1', name: 'JAY MANALO' },
    { id: '2', name: 'MARIA CLARA P. SANTOS' },
    { id: '3', name: 'JUAN D. DELA CRUZ' }
  ];

  sampleStaff.forEach((staff, staffIdx) => {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWeekend) {
        sampleData.push({
          'User ID': staff.id,
          'Name': staff.name,
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

        sampleData.push({
          'User ID': staff.id,
          'Name': staff.name,
          'Date': `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          'Day': d,
          'In': morningVariance,
          'Break': lunchOutVariance,
          'Resume': lunchInVariance,
          'Out': afternoonOutVariance,
          'Remarks': ''
        });
      }
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Electronic Time Card');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  return {
    blob,
    fileName: `Electronic_Time_Card_${year}_${String(month).padStart(2, '0')}.xlsx`
  };
}
