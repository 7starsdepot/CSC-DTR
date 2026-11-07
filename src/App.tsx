import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Eye,
  User,
  ShieldCheck,
  Clock,
  Calendar,
  ArrowDownRight,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Settings,
  HelpCircle
} from 'lucide-react';
import {
  DailyRecord,
  DTRDocument,
  OfficialSchedule,
  PersonnelData,
  Signatories,
  WorkScheduleType,
  WORK_SCHEDULES,
  detectScheduleType
} from './types/csc';
import { generateMonthRecords, recalculateRecords, getDaysInMonth, formatMinutesDisplay } from './utils/timeCalculations';
import { DTRControlPanel } from './components/DTRControlPanel';
import { CSCForm48Card } from './components/CSCForm48Card';
import { DTRPrintPreview } from './components/DTRPrintPreview';
import { ExcelImportModal } from './components/ExcelImportModal';

const STORAGE_KEY = 'csc_daily_time_card_persisted_v6';

export default function App() {
  const currentYear = 2026;
  const currentMonth = 10; // October

  const initialSchedule: OfficialSchedule = WORK_SCHEDULES.schedule1;

  const initialSignatories: Signatories = {
    employee: {
      name: 'JAY MANALO',
      designation: '',
      roleLabel: 'Employee'
    },
    timekeeper: {
      name: '',
      designation: '',
      roleLabel: 'TIMEKEEPER'
    },
    chiefSupervisor: {
      name: 'DIR. ROBERTO V. MENDOZA, CESO III',
      designation: 'Director IV / Chief Supervisor',
      roleLabel: 'In-Charge / Supervisor'
    }
  };

  // Generate initial sample personnel records reflecting the prompt's two selectable work schedules and sample calculations
  const initialPersonnelList: PersonnelData[] = useMemo(() => {
    const staffList: { id: string; name: string; assignedSchedule: WorkScheduleType }[] = [
      { id: '1', name: 'JAY MANALO', assignedSchedule: 'schedule1' },
      { id: '2', name: 'MARIA CLARA P. SANTOS', assignedSchedule: 'schedule2' },
      { id: '3', name: 'JUAN D. DELA CRUZ', assignedSchedule: 'schedule1' }
    ];

    return staffList.map((staff) => {
      const staffSchedule = WORK_SCHEDULES[staff.assignedSchedule];
      const raw = generateMonthRecords(currentYear, currentMonth, staffSchedule, staff.assignedSchedule);
      const populated = raw.map((r) => {
        const d = r.day;

        if (staff.assignedSchedule === 'schedule1') {
          // Schedule 1: 8:00 AM to 5:00 PM
          // Sample from prompt:
          // Day 15: 8:10 AM In (10 min late), 4:50 PM Out (10 min undertime)
          if (d === 15) {
            return {
              ...r,
              inTime: '8:10',
              breakTime: '12:00',
              resumeTime: '1:00',
              outTime: '4:50',
              remarks: ''
            };
          }
          // Day 16: 7:55 AM In (0 min late), 5:00 PM Out (0 min undertime)
          if (d === 16) {
            return {
              ...r,
              inTime: '7:55',
              breakTime: '12:00',
              resumeTime: '1:00',
              outTime: '5:00',
              remarks: ''
            };
          }
        } else {
          // Schedule 2: 7:00 AM to 4:00 PM
          // Sample from prompt:
          // Day 15: 7:15 AM In (15 min late), 3:45 PM Out (15 min undertime)
          if (d === 15) {
            return {
              ...r,
              inTime: '7:15',
              breakTime: '12:00',
              resumeTime: '1:00',
              outTime: '3:45',
              remarks: ''
            };
          }
          // Day 16: 6:55 AM In (0 min late), 4:00 PM Out (0 min undertime)
          if (d === 16) {
            return {
              ...r,
              inTime: '6:55',
              breakTime: '12:00',
              resumeTime: '1:00',
              outTime: '4:00',
              remarks: ''
            };
          }
        }

        // All other days blank
        return {
          ...r,
          inTime: '',
          breakTime: '',
          resumeTime: '',
          outTime: '',
          remarks: ''
        };
      });

      return {
        id: staff.id,
        name: staff.name,
        assignedSchedule: staff.assignedSchedule,
        records: recalculateRecords(populated, staffSchedule, staff.assignedSchedule).updatedRecords
      };
    });
  }, []);

  // Initialize from localStorage so imported and recorded data is preserved across page reloads
  const [dtrDoc, setDtrDoc] = useState<DTRDocument>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.personnelList) && parsed.personnelList.length > 0) {
          const currentSched = parsed.schedule || initialSchedule;
          const cleanedPersonnel = parsed.personnelList.map((p: any) => {
            const pSchedKey: WorkScheduleType = p.assignedSchedule === 'schedule2' ? 'schedule2' : 'schedule1';
            const pSched = WORK_SCHEDULES[pSchedKey] || currentSched;
            return {
              ...p,
              assignedSchedule: pSchedKey,
              records: recalculateRecords(
                (p.records || []).map((r: any) => ({
                  ...r,
                  assignedSchedule: r.assignedSchedule || pSchedKey,
                  remarks: (r.remarks && /^(saturday|sunday)$/i.test(String(r.remarks).trim())) ? '' : (r.remarks || '')
                })),
                pSched,
                pSchedKey
              ).updatedRecords
            };
          });
          return {
            ...parsed,
            schedule: currentSched,
            personnelList: cleanedPersonnel
          };
        }
      }
    } catch (e) {
      console.warn('Could not read saved time card data from localStorage', e);
    }

    return {
      id: 'dtr-doc-01',
      month: currentMonth,
      year: currentYear,
      personnelList: initialPersonnelList,
      selectedEmployeeIndex: 0,
      officeAgency: 'Civil Service Commission · Central Office',
      signatories: initialSignatories,
      schedule: initialSchedule
    };
  });

  // Automatically save to localStorage whenever dtrDoc is updated or imported
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dtrDoc));
    } catch (e) {
      console.warn('Could not persist time card data to localStorage', e);
    }
  }, [dtrDoc]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDailyLogOpen, setIsDailyLogOpen] = useState(false);
  const [isScheduleInfoOpen, setIsScheduleInfoOpen] = useState(false);

  // Active selected personnel
  const currentPersonnel = dtrDoc.personnelList[dtrDoc.selectedEmployeeIndex] || dtrDoc.personnelList[0] || {
    id: 'EMP-01',
    name: 'JUAN D. DELA CRUZ',
    assignedSchedule: 'schedule1' as WorkScheduleType,
    records: []
  };

  const currentPersonnelSchedule: OfficialSchedule = WORK_SCHEDULES[currentPersonnel.assignedSchedule || 'schedule1'] || dtrDoc.schedule;

  // Total days in currently selected month
  const daysInCurrentMonth = useMemo(() => {
    return getDaysInMonth(dtrDoc.year, dtrDoc.month);
  }, [dtrDoc.year, dtrDoc.month]);

  // Active Personnel Summary figures calculated using assigned work schedule
  const summaryStats = useMemo(() => {
    return recalculateRecords(currentPersonnel.records, currentPersonnelSchedule, currentPersonnel.assignedSchedule);
  }, [currentPersonnel.records, currentPersonnelSchedule, currentPersonnel.assignedSchedule]);

  // Attendance & Minutes of Late summary calculated for EVERY employee using their assigned schedule
  const allPersonnelStats = useMemo(() => {
    return dtrDoc.personnelList.map((person, index) => {
      const personSchedKey: WorkScheduleType = person.assignedSchedule || 'schedule1';
      const personSched = WORK_SCHEDULES[personSchedKey] || dtrDoc.schedule;
      const stats = recalculateRecords(person.records, personSched, personSchedKey);
      return {
        index,
        id: person.id,
        name: person.name,
        assignedSchedule: personSchedKey,
        scheduleLabel: personSchedKey === 'schedule2' ? 'Schedule 2 (7:00 AM - 4:00 PM)' : 'Schedule 1 (8:00 AM - 5:00 PM)',
        daysPresent: stats.daysPresent,
        totalWorkedHours: stats.totalWorkedHours,
        totalLateMinutes: stats.totalLateMinutes,
        totalLateHours: stats.totalLateHours,
        totalLateRemainingMinutes: stats.totalLateRemainingMinutes,
        lateDaysCount: stats.lateDaysCount,
        totalUndertimeOnlyMinutes: stats.totalUndertimeOnlyMinutes,
        totalUndertimeOnlyHours: stats.totalUndertimeOnlyHours,
        totalUndertimeOnlyRemainingMinutes: stats.totalUndertimeOnlyRemainingMinutes,
        undertimeDaysCount: stats.undertimeDaysCount,
        totalUndertimeHours: stats.totalUndertimeHours,
        totalUndertimeMinutes: stats.totalUndertimeMinutes,
        combinedLostMinutes: stats.combinedLostMinutes
      };
    });
  }, [dtrDoc.personnelList, dtrDoc.schedule]);

  // Handlers
  const handleUpdateSignatories = (sig: Partial<Signatories>) => {
    setDtrDoc((prev) => ({
      ...prev,
      signatories: { ...prev.signatories, ...sig }
    }));
  };

  const handleUpdateSchedule = (sched: Partial<OfficialSchedule>) => {
    setDtrDoc((prev) => {
      const newSched = { ...prev.schedule, ...sched };
      return {
        ...prev,
        schedule: newSched
      };
    });
  };

  // Rule 10: Allow administrator to change employee assigned schedule with scope control
  const handleChangeEmployeeSchedule = (
    employeeIndex: number,
    scheduleType: WorkScheduleType,
    scope: 'all' | 'fromDay' = 'all',
    fromDay?: number
  ) => {
    setDtrDoc((prev) => {
      const currentList = [...prev.personnelList];
      const p = currentList[employeeIndex];
      if (!p) return prev;

      const newScheduleConfig = WORK_SCHEDULES[scheduleType];

      // Update records based on date scope
      const updatedRecords = p.records.map((r) => {
        if (scope === 'all' || !fromDay || r.day >= fromDay) {
          return {
            ...r,
            assignedSchedule: scheduleType
          };
        }
        return r; // Previous dates remain untouched!
      });

      const recalculated = recalculateRecords(updatedRecords, newScheduleConfig, scheduleType);

      currentList[employeeIndex] = {
        ...p,
        assignedSchedule: scheduleType,
        records: recalculated.updatedRecords
      };

      const isCurrentSelected = employeeIndex === prev.selectedEmployeeIndex;

      return {
        ...prev,
        schedule: isCurrentSelected ? newScheduleConfig : prev.schedule,
        personnelList: currentList
      };
    });
  };

  const handleChangeMonthYear = (month: number, year: number) => {
    setDtrDoc((prev) => {
      const updatedList = prev.personnelList.map((p) => {
        const pSchedKey = p.assignedSchedule || 'schedule1';
        const pSched = WORK_SCHEDULES[pSchedKey] || prev.schedule;
        // Generate new month's baseline calendar (correct days of week, saturdays/sundays, and PH holidays)
        const newRecords = generateMonthRecords(year, month, pSched, pSchedKey);

        // Map existing recorded punches by day number to preserve logged times
        const oldLogByDay = new Map<number, DailyRecord>();
        (p.records || []).forEach((r) => {
          if (r.inTime || r.breakTime || r.resumeTime || r.outTime || r.remarks) {
            oldLogByDay.set(r.day, r);
          }
        });

        // Re-align existing punches to the new calendar days
        const alignedRecords = newRecords.map((newRec) => {
          const oldLog = oldLogByDay.get(newRec.day);
          if (!oldLog) return newRec;

          // If day exists in the new month, transfer punch times
          if (newRec.dateStr) {
            return {
              ...newRec,
              inTime: oldLog.inTime || '',
              breakTime: oldLog.breakTime || '',
              resumeTime: oldLog.resumeTime || '',
              outTime: oldLog.outTime || '',
              remarks: oldLog.remarks || ''
            };
          }
          return newRec;
        });

        return {
          ...p,
          records: recalculateRecords(alignedRecords, pSched, pSchedKey).updatedRecords
        };
      });
      return {
        ...prev,
        month,
        year,
        personnelList: updatedList
      };
    });
  };

  const handleSelectPersonnelIndex = (index: number) => {
    setDtrDoc((prev) => {
      const targetEmp = prev.personnelList[index];
      const targetSchedKey = targetEmp?.assignedSchedule || detectScheduleType(prev.schedule);
      return {
        ...prev,
        selectedEmployeeIndex: index,
        schedule: WORK_SCHEDULES[targetSchedKey] || prev.schedule
      };
    });
  };

  const handleImportSuccess = (importedPersonnel: PersonnelData[], newMonth?: number, newYear?: number) => {
    if (importedPersonnel.length === 0) return;
    setDtrDoc((prev) => ({
      ...prev,
      month: newMonth || prev.month,
      year: newYear || prev.year,
      personnelList: importedPersonnel,
      selectedEmployeeIndex: 0
    }));
  };

  const handleUpdateRecord = (day: number, updatedFields: Partial<DailyRecord>) => {
    setDtrDoc((prev) => {
      const currentList = [...prev.personnelList];
      const p = currentList[prev.selectedEmployeeIndex];
      if (!p) return prev;
      const updatedRecords = p.records.map((r) => (r.day === day ? { ...r, ...updatedFields } : r));
      const pSchedKey = p.assignedSchedule || 'schedule1';
      currentList[prev.selectedEmployeeIndex] = {
        ...p,
        records: recalculateRecords(updatedRecords, WORK_SCHEDULES[pSchedKey], pSchedKey).updatedRecords
      };
      return {
        ...prev,
        personnelList: currentList
      };
    });
  };

  // Full-page Print Preview Mode
  if (isPreviewOpen) {
    return (
      <DTRPrintPreview
        document={dtrDoc}
        onExitPreview={() => setIsPreviewOpen(false)}
        onSelectEmployeeIndex={handleSelectPersonnelIndex}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Application Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner font-black text-sm tracking-tighter">
              48
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight">
                  CSC Form 48 Generator
                </h1>
                <span className="text-[10px] uppercase font-bold bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Dual Schedule System
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                DPWH / CSC Compliant · Schedule 1 (8:00 AM - 5:00 PM) &amp; Schedule 2 (7:00 AM - 4:00 PM)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScheduleInfoOpen(!isScheduleInfoOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Schedule Rules</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Time Card</span>
            </button>

            <button
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-800" />
              <span>Print Preview</span>
            </button>
          </div>
        </div>
      </header>

      {/* Schedule Reference Dialog Banner */}
      {isScheduleInfoOpen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Selectable Work Schedules &amp; Calculation Rules</span>
              </div>
              <button
                onClick={() => setIsScheduleInfoOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-0.5"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 space-y-1.5">
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span>Schedule 1: 8:00 AM to 5:00 PM</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Standard</span>
                </div>
                <div className="text-slate-700">Official In: <strong>8:00 AM</strong> · Official Out: <strong>5:00 PM</strong></div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>• <strong>Late:</strong> In &gt; 8:00 AM (e.g. 8:10 AM = 10 min late; 7:55 AM = 0 min late)</div>
                  <div>• <strong>Undertime:</strong> Out &lt; 5:00 PM (e.g. 4:50 PM = 10 min undertime; 5:00 PM = 0 min undertime)</div>
                </div>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 space-y-1.5">
                <div className="font-bold text-purple-900 flex items-center justify-between">
                  <span>Schedule 2: 7:00 AM to 4:00 PM</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Early Shift</span>
                </div>
                <div className="text-slate-700">Official In: <strong>7:00 AM</strong> · Official Out: <strong>4:00 PM</strong></div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>• <strong>Late:</strong> In &gt; 7:00 AM (e.g. 7:15 AM = 15 min late; 6:55 AM = 0 min late)</div>
                  <div>• <strong>Undertime:</strong> Out &lt; 4:00 PM (e.g. 3:45 PM = 15 min undertime; 4:00 PM = 0 min undertime)</div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Missing time-in or time-out records are automatically treated as 0 late and 0 undertime.</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI / Metric Strip - Active Employee & Schedule Context */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Active Employee */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Active Employee</span>
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-base font-bold text-slate-900 truncate uppercase">
                {currentPersonnel.name}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
                ID: {currentPersonnel.id} · <span className="font-semibold text-blue-700">{currentPersonnel.assignedSchedule === 'schedule2' ? 'Schedule 2 (7am-4pm)' : 'Schedule 1 (8am-5pm)'}</span>
              </div>
            </div>
          </div>

          {/* 2. Days Present */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Days Present</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {summaryStats.daysPresent}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {daysInCurrentMonth}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {summaryStats.totalWorkedHours} hrs total rendered
              </div>
            </div>
          </div>

          {/* 3. Total Late (Minutes of Late) */}
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-2xs bg-amber-50/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Minutes of Late</span>
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                {summaryStats.lateDaysCount} {summaryStats.lateDaysCount === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-amber-700 tabular-nums">
                {summaryStats.totalLateMinutes} <span className="text-sm font-bold text-amber-900">mins</span>
              </div>
              <div className="text-[11px] text-amber-700/90 mt-0.5 font-medium">
                {summaryStats.totalLateHours}h {summaryStats.totalLateRemainingMinutes}m · In past {currentPersonnelSchedule.amIn}
              </div>
            </div>
          </div>

          {/* 4. Total Undertime (Minutes of Undertime) */}
          <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-2xs bg-rose-50/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-800 font-semibold flex items-center gap-1.5">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                <span>Minutes of Undertime</span>
              </span>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                {summaryStats.undertimeDaysCount} {summaryStats.undertimeDaysCount === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-rose-700 tabular-nums">
                {summaryStats.totalUndertimeOnlyMinutes} <span className="text-sm font-bold text-rose-900">mins</span>
              </div>
              <div className="text-[11px] text-rose-700/90 mt-0.5 font-medium">
                {summaryStats.totalUndertimeOnlyHours}h {summaryStats.totalUndertimeOnlyRemainingMinutes}m · Out before {currentPersonnelSchedule.pmOut}
              </div>
            </div>
          </div>

          {/* 5. Form 48 Combined Undertime */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Form 48 Total</span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                Combined
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-800 tabular-nums">
                {summaryStats.totalUndertimeHours}h {summaryStats.totalUndertimeMinutes}m
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {summaryStats.combinedLostMinutes} total mins lost
              </div>
            </div>
          </div>
        </div>

        {/* Rule 9: Attendance Report with required columns */}
        {dtrDoc.personnelList.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Attendance Report &amp; Employee Schedule Manager
                  </h3>
                  <p className="text-xs text-slate-500">
                    Each employee calculates late and undertime based on their assigned work schedule. Change schedules anytime below.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDailyLogOpen(!isDailyLogOpen)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  {isDailyLogOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <span>{isDailyLogOpen ? 'Hide Daily Log Inspector' : 'Inspect Daily Breakdown'}</span>
                </button>
                <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {dtrDoc.personnelList.length} Staff Monitored
                </div>
              </div>
            </div>

            {/* Attendance Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-700 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Employee ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Assigned Schedule</th>
                    <th className="py-2.5 px-3 text-center">Minutes of Late</th>
                    <th className="py-2.5 px-3 text-center">Minutes of Undertime</th>
                    <th className="py-2.5 px-3 text-center">Total Daily Late Minutes</th>
                    <th className="py-2.5 px-3 text-center">Total Daily Undertime Minutes</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPersonnelStats.map((staff) => {
                    const isSelected = staff.index === dtrDoc.selectedEmployeeIndex;

                    return (
                      <tr
                        key={staff.id + staff.index}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-blue-50/40 font-semibold text-slate-900'
                            : 'hover:bg-slate-50/70 text-slate-700'
                        }`}
                      >
                        {/* 1. Employee ID */}
                        <td className="py-2.5 px-3 font-semibold text-slate-800 tabular-nums">
                          {staff.id}
                        </td>

                        {/* 2. Employee Name */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 uppercase">
                            {staff.name}
                          </div>
                        </td>

                        {/* 3. Assigned Work Schedule with direct selector */}
                        <td className="py-2.5 px-3">
                          <select
                            value={staff.assignedSchedule}
                            onChange={(e) =>
                              handleChangeEmployeeSchedule(staff.index, e.target.value as WorkScheduleType, 'all')
                            }
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              staff.assignedSchedule === 'schedule2'
                                ? 'bg-purple-50 text-purple-900 border-purple-300'
                                : 'bg-blue-50 text-blue-900 border-blue-300'
                            }`}
                          >
                            <option value="schedule1">Schedule 1: 8:00 AM to 5:00 PM</option>
                            <option value="schedule2">Schedule 2: 7:00 AM to 4:00 PM</option>
                          </select>
                        </td>

                        {/* 4. Minutes of Late */}
                        <td className="py-2.5 px-3 text-center">
                          {staff.totalLateMinutes > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 tabular-nums">
                              {staff.totalLateMinutes} mins
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                              0 min
                            </span>
                          )}
                        </td>

                        {/* 5. Minutes of Undertime */}
                        <td className="py-2.5 px-3 text-center">
                          {staff.totalUndertimeOnlyMinutes > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 tabular-nums">
                              {staff.totalUndertimeOnlyMinutes} mins
                            </span>
                          ) : (
                            <span className="text-slate-400">0 min</span>
                          )}
                        </td>

                        {/* 6. Total Daily Late Minutes */}
                        <td className="py-2.5 px-3 text-center tabular-nums">
                          <span className="font-bold text-slate-900">{staff.totalLateMinutes}m</span>
                          <span className="text-[10px] text-slate-400 ml-1">({staff.lateDaysCount} days)</span>
                        </td>

                        {/* 7. Total Daily Undertime Minutes */}
                        <td className="py-2.5 px-3 text-center tabular-nums">
                          <span className="font-bold text-slate-900">{staff.totalUndertimeOnlyMinutes}m</span>
                          <span className="text-[10px] text-slate-400 ml-1">({staff.undertimeDaysCount} days)</span>
                        </td>

                        {/* 8. Action */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSelectPersonnelIndex(staff.index)}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white font-semibold'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium'
                            }`}
                          >
                            {isSelected ? 'Active Card' : 'Select Card'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expandable Daily Breakdown Inspector */}
            {isDailyLogOpen && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Daily Attendance &amp; Schedule Breakdown for {currentPersonnel.name}:</span>
                  <span className="text-slate-500 font-normal">
                    Schedule: {currentPersonnel.assignedSchedule === 'schedule2' ? 'Schedule 2 (7:00 AM - 4:00 PM)' : 'Schedule 1 (8:00 AM - 5:00 PM)'}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-2">Day</th>
                        <th className="py-1.5 px-2">Day of Week</th>
                        <th className="py-1.5 px-2">Assigned Sched</th>
                        <th className="py-1.5 px-2 text-center">Time-In</th>
                        <th className="py-1.5 px-2 text-center">Daily Late (min)</th>
                        <th className="py-1.5 px-2 text-center">Time-Out</th>
                        <th className="py-1.5 px-2 text-center">Daily Undertime (min)</th>
                        <th className="py-1.5 px-2 text-center">Undertime (H/M)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentPersonnel.records.map((r) => {
                        const schedKey = r.assignedSchedule || currentPersonnel.assignedSchedule || 'schedule1';
                        const hasPunch = Boolean(r.inTime || r.breakTime || r.resumeTime || r.outTime);

                        return (
                          <tr key={r.day} className={hasPunch ? 'bg-white font-medium' : 'text-slate-400'}>
                            <td className="py-1 px-2 font-bold tabular-nums">{r.day}</td>
                            <td className="py-1 px-2">{r.dayOfWeek}</td>
                            <td className="py-1 px-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${schedKey === 'schedule2' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                {schedKey === 'schedule2' ? 'Sched 2 (7-4)' : 'Sched 1 (8-5)'}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-center tabular-nums font-bold text-slate-900">
                              {r.inTime || '-'}
                            </td>
                            <td className="py-1 px-2 text-center tabular-nums">
                              {(r.totalLateMinutes || 0) > 0 ? (
                                <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded">
                                  {r.totalLateMinutes} min
                                </span>
                              ) : (
                                <span>0 min</span>
                              )}
                            </td>
                            <td className="py-1 px-2 text-center tabular-nums font-bold text-slate-900">
                              {r.outTime || '-'}
                            </td>
                            <td className="py-1 px-2 text-center tabular-nums">
                              {(r.totalUndertimeOnlyMinutes || 0) > 0 ? (
                                <span className="font-bold text-rose-700 bg-rose-50 px-1 rounded">
                                  {r.totalUndertimeOnlyMinutes} min
                                </span>
                              ) : (
                                <span>0 min</span>
                              )}
                            </td>
                            <td className="py-1 px-2 text-center tabular-nums font-bold text-slate-800">
                              {r.undertimeHours}h {r.undertimeMinutes}m
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Control Panel: Signatories, Schedule Assignment */}
        <div id="signatories-section">
          <DTRControlPanel
            document={dtrDoc}
            onChangeSignatories={handleUpdateSignatories}
            onChangeSchedule={handleUpdateSchedule}
            onChangeEmployeeSchedule={handleChangeEmployeeSchedule}
            onChangeMonthYear={handleChangeMonthYear}
            onSelectPersonnelIndex={handleSelectPersonnelIndex}
            onOpenImport={() => setIsImportModalOpen(true)}
            onPreviewPrint={() => setIsPreviewOpen(true)}
          />
        </div>

        {/* Main Centerpiece: CSC Form 48 Card */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-between w-full max-w-[840px] px-2 text-xs">
            <span className="font-semibold text-slate-700">
              Official DPWH Form 48 (Daily Time Record) Preview · Assigned: <strong className="text-slate-900">{currentPersonnel.assignedSchedule === 'schedule2' ? 'Schedule 2 (7:00 AM - 4:00 PM)' : 'Schedule 1 (8:00 AM - 5:00 PM)'}</strong>
            </span>
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Full Print / PDF View</span>
            </button>
          </div>

          <div className="bg-slate-200/80 p-5 sm:p-8 rounded-2xl border border-slate-300 w-full max-w-[840px] flex justify-center shadow-inner overflow-x-auto">
            <CSCForm48Card
              month={dtrDoc.month}
              year={dtrDoc.year}
              employeeName={currentPersonnel.name}
              records={currentPersonnel.records}
              signatories={dtrDoc.signatories}
              schedule={currentPersonnelSchedule}
              onUpdateRecord={handleUpdateRecord}
            />
          </div>
        </div>
      </main>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        schedule={currentPersonnelSchedule}
        month={dtrDoc.month}
        year={dtrDoc.year}
      />
    </div>
  );
}
