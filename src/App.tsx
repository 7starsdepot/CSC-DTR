import React, { useState, useMemo, useEffect } from 'react';
import { Printer, FileSpreadsheet, Eye, User, ShieldCheck } from 'lucide-react';
import { DailyRecord, DTRDocument, OfficialSchedule, PersonnelData, Signatories } from './types/csc';
import { generateMonthRecords, recalculateRecords } from './utils/timeCalculations';
import { DTRControlPanel } from './components/DTRControlPanel';
import { CSCForm48Card } from './components/CSCForm48Card';
import { DTRPrintPreview } from './components/DTRPrintPreview';
import { ExcelImportModal } from './components/ExcelImportModal';

const STORAGE_KEY = 'csc_daily_time_card_persisted_v1';

export default function App() {
  const currentYear = 2026;
  const currentMonth = 10; // October

  const initialSchedule: OfficialSchedule = {
    amIn: '08:00',
    amOut: '12:00',
    pmIn: '13:00',
    pmOut: '17:00',
    regularHoursDisplay: '8:00 AM - 12:00 PM / 1:00 PM - 5:00 PM',
    saturdaysDisplay: 'As required / Off',
    gracePeriodMinutes: 0
  };

  const initialSignatories: Signatories = {
    employee: {
      name: 'JUAN D. DELA CRUZ',
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

  // Generate initial sample personnel records (fallback only if no saved data in localStorage)
  const initialPersonnelList: PersonnelData[] = useMemo(() => {
    const staffList = [
      { id: 'CSC-2026-001', name: 'JUAN D. DELA CRUZ' },
      { id: 'CSC-2026-002', name: 'MARIA CLARA P. SANTOS' },
      { id: 'CSC-2026-003', name: 'ENGR. RICARDO B. DIZON' }
    ];

    return staffList.map((staff, staffIdx) => {
      const raw = generateMonthRecords(currentYear, currentMonth, initialSchedule);
      const populated = raw.map((r) => {
        if (r.status !== 'regular') return r;
        const d = r.day;

        let inTime = (d % 6 === 0) ? '08:05' : (d % 4 === 0) ? '07:49' : '07:56';
        let breakTime = '12:01';
        let resumeTime = (d % 5 === 0) ? '12:55' : '12:58';
        let outTime = (d % 7 === 0) ? '16:50' : '17:04';
        let remarks = 'Regular';

        if (d === 8 && staffIdx === 0) {
          inTime = '08:15';
          remarks = 'Late (15 mins)';
        } else if (d === 15 && staffIdx === 1) {
          outTime = '16:45';
          remarks = 'Undertime (15 mins)';
        } else if (d === 20) {
          remarks = 'Flag Ceremony';
        } else if (d === 22 && staffIdx === 2) {
          remarks = 'Pass Slip (OB)';
        }

        return {
          ...r,
          inTime,
          breakTime,
          resumeTime,
          outTime,
          remarks
        };
      });

      return {
        id: staff.id,
        name: staff.name,
        records: recalculateRecords(populated, initialSchedule).updatedRecords
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
          return parsed;
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

  // Active selected personnel
  const currentPersonnel = dtrDoc.personnelList[dtrDoc.selectedEmployeeIndex] || dtrDoc.personnelList[0] || {
    id: 'EMP-01',
    name: 'JUAN D. DELA CRUZ',
    records: []
  };

  // Active Personnel Summary figures
  const summaryStats = useMemo(() => {
    let daysPresent = 0;
    let totalUndertimeMins = 0;
    let totalWorkedMins = 0;

    for (const r of currentPersonnel.records) {
      if (r.status === 'regular' && (r.inTime || r.outTime)) {
        daysPresent += 1;
        totalUndertimeMins += (r.undertimeHours * 60 + r.undertimeMinutes);
        totalWorkedMins += (r.hoursWorked * 60);
      }
    }

    const utHours = Math.floor(totalUndertimeMins / 60);
    const utMins = totalUndertimeMins % 60;

    return {
      daysPresent,
      totalHours: Number((totalWorkedMins / 60).toFixed(1)),
      undertimeHours: utHours,
      undertimeMinutes: utMins
    };
  }, [currentPersonnel]);

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
      const updatedList = prev.personnelList.map((p) => ({
        ...p,
        records: recalculateRecords(p.records, newSched).updatedRecords
      }));
      return {
        ...prev,
        schedule: newSched,
        personnelList: updatedList
      };
    });
  };

  const handleChangeMonthYear = (month: number, year: number) => {
    setDtrDoc((prev) => {
      const updatedList = prev.personnelList.map((p) => {
        const newRecords = generateMonthRecords(year, month, prev.schedule);
        return {
          ...p,
          records: newRecords
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
    setDtrDoc((prev) => ({
      ...prev,
      selectedEmployeeIndex: index
    }));
  };

  const handleImportSuccess = (importedPersonnel: PersonnelData[]) => {
    if (importedPersonnel.length === 0) return;
    setDtrDoc((prev) => ({
      ...prev,
      personnelList: importedPersonnel,
      selectedEmployeeIndex: 0
    }));
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
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-brand antialiased">
      {/* 1. Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <a
            href="/"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <div className="w-6 h-6 rounded-md bg-blue-700 text-white flex items-center justify-center font-serif font-black text-xs">
              CSC
            </div>
            <span>Daily Time Card</span>
          </a>

          {/* Zone 2: Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Excel</span>
            </button>
            <button
              onClick={() => {
                const el = window.document.getElementById('signatories-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Signatories
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print to PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI / Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">Active Personnel</div>
            <div className="text-base font-bold text-slate-900 mt-1 truncate uppercase">
              {currentPersonnel.name}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              ID: {currentPersonnel.id} · {dtrDoc.personnelList.length} staff loaded
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">Days Present</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {summaryStats.daysPresent}
              <span className="text-xs font-normal text-slate-400 ml-1">/ 31</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">Total Undertime / Late</div>
            <div className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
              {summaryStats.undertimeHours}h {summaryStats.undertimeMinutes}m
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="text-xs text-slate-500 font-medium">Data Status</div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Saved Locally</span>
            </div>
          </div>
        </div>

        {/* Control Panel: Signatories, Roster */}
        <div id="signatories-section">
          <DTRControlPanel
            document={dtrDoc}
            onChangeSignatories={handleUpdateSignatories}
            onChangeSchedule={handleUpdateSchedule}
            onChangeMonthYear={handleChangeMonthYear}
            onSelectPersonnelIndex={handleSelectPersonnelIndex}
            onOpenImport={() => setIsImportModalOpen(true)}
            onPreviewPrint={() => setIsPreviewOpen(true)}
          />
        </div>

        {/* Main Centerpiece: CSC Form 48 Card */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-between w-full max-w-[560px] px-2 text-xs">
            <span className="font-semibold text-slate-700">Official CSC Form 48 Card Preview</span>
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Full Print / PDF View</span>
            </button>
          </div>

          <div className="bg-slate-200/80 p-5 sm:p-8 rounded-2xl border border-slate-300 w-full max-w-[620px] flex justify-center shadow-inner overflow-x-auto">
            <CSCForm48Card
              month={dtrDoc.month}
              year={dtrDoc.year}
              employeeName={currentPersonnel.name}
              records={currentPersonnel.records}
              signatories={dtrDoc.signatories}
              schedule={dtrDoc.schedule}
            />
          </div>
        </div>
      </main>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        schedule={dtrDoc.schedule}
        month={dtrDoc.month}
        year={dtrDoc.year}
      />
    </div>
  );
}
