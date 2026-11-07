import React, { useState, useMemo } from 'react';
import { Users, Clock, Calendar, FileSpreadsheet, Printer, User, CheckCircle2, ShieldAlert, ArrowRight, AlertTriangle } from 'lucide-react';
import { DTRDocument, OfficialSchedule, Signatories, WorkScheduleType, WORK_SCHEDULES, detectScheduleType } from '../types/csc';
import { MONTH_NAMES, recalculateRecords } from '../utils/timeCalculations';

interface DTRControlPanelProps {
  document: DTRDocument;
  onChangeSignatories: (sig: Partial<Signatories>) => void;
  onChangeSchedule: (sched: Partial<OfficialSchedule>) => void;
  onChangeEmployeeSchedule?: (employeeIndex: number, scheduleType: WorkScheduleType, scope: 'all' | 'fromDay', fromDay?: number) => void;
  onChangeMonthYear: (month: number, year: number) => void;
  onSelectPersonnelIndex: (index: number) => void;
  onOpenImport: () => void;
  onPreviewPrint: () => void;
}

export const DTRControlPanel: React.FC<DTRControlPanelProps> = ({
  document,
  onChangeSignatories,
  onChangeSchedule,
  onChangeEmployeeSchedule,
  onChangeMonthYear,
  onSelectPersonnelIndex,
  onOpenImport,
  onPreviewPrint
}) => {
  const { month, year, personnelList, selectedEmployeeIndex, signatories, schedule } = document;
  const currentPersonnel = personnelList[selectedEmployeeIndex] || personnelList[0] || {
    id: 'EMP-01',
    name: 'JUAN D. DELA CRUZ',
    assignedSchedule: 'schedule1' as WorkScheduleType,
    records: []
  };

  const activeEmpScheduleType: WorkScheduleType = currentPersonnel.assignedSchedule || detectScheduleType(schedule);
  const [scopeMode, setScopeMode] = useState<'all' | 'fromDay'>('all');
  const [effectiveFromDay, setEffectiveFromDay] = useState<number>(16);

  const handleSelectSchedule = (type: WorkScheduleType) => {
    // 1. Update overall schedule config
    const targetConfig = WORK_SCHEDULES[type];
    onChangeSchedule(targetConfig);

    // 2. Update employee assigned schedule with scope handling
    if (onChangeEmployeeSchedule) {
      onChangeEmployeeSchedule(selectedEmployeeIndex, type, scopeMode, effectiveFromDay);
    }
  };

  // Precalculate simulated minutes of late and undertime for BOTH schedules on the current employee
  const sched1Stats = useMemo(() => {
    return recalculateRecords(currentPersonnel.records, WORK_SCHEDULES.schedule1, 'schedule1');
  }, [currentPersonnel.records]);

  const sched2Stats = useMemo(() => {
    return recalculateRecords(currentPersonnel.records, WORK_SCHEDULES.schedule2, 'schedule2');
  }, [currentPersonnel.records]);

  return (
    <div className="space-y-6">
      {/* Primary Action Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            CSC Form 48 · Daily Time Card Generator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Electronic Excel import: <span className="font-semibold text-slate-700">Name: = Employee</span> · <span className="font-semibold text-slate-700">In = AM Arrival</span> · <span className="font-semibold text-slate-700">Break = Lunch Out</span> · <span className="font-semibold text-slate-700">Resume = Lunch In</span> · <span className="font-semibold text-slate-700">Out = PM Departure</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onPreviewPrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print to PDF (1 Page/Emp)</span>
          </button>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Personnel & Period Setup */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <User className="w-4 h-4 text-blue-600" />
              <span>Imported Employee Records</span>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {personnelList.length} Staff Loaded
            </span>
          </div>

          {/* Personnel Selection Dropdown */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Active Employee Card:
            </label>
            <select
              value={selectedEmployeeIndex}
              onChange={(e) => onSelectPersonnelIndex(parseInt(e.target.value, 10))}
              className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 uppercase cursor-pointer"
            >
              {personnelList.map((p, idx) => (
                <option key={idx} value={idx}>
                  {idx + 1}. {p.name} [{p.assignedSchedule === 'schedule2' ? 'Schedule 2: 7am-4pm' : 'Schedule 1: 8am-5pm'}]
                </option>
              ))}
            </select>
          </div>

          {/* Month & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => onChangeMonthYear(parseInt(e.target.value, 10), year)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => onChangeMonthYear(month, parseInt(e.target.value, 10) || 2026)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 tabular-nums"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Direct Electronic Mapping</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Only authentic logs from the imported time card appear in the table. Missing punches are treated as 0 late and 0 undertime.
            </p>
          </div>
        </div>

        {/* Panel 2: Signatories (Employee, Timekeeper & Approved) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Signatories (CSC Form 48)</span>
            </div>
          </div>

          {/* 1. Employee Signature */}
          <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-800 flex items-center justify-between">
              <span>1. Employee Signature</span>
              <span className="text-[10px] text-slate-500">Signatory</span>
            </div>
            <div className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-bold text-xs text-slate-900 uppercase">
              {currentPersonnel.name}
            </div>
          </div>

          {/* 2. Timekeeper Signature */}
          <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-800 flex items-center justify-between">
              <span>2. Timekeeper Signature</span>
              <span className="text-[10px] text-slate-500">Prescribed Office Hours</span>
            </div>
            <div className="p-2 bg-white rounded-md border border-slate-200 text-center space-y-1">
              <div className="text-[10px] italic font-medium text-slate-700">
                Verified as to the prescribed office hours:
              </div>
              <input
                type="text"
                value={signatories.timekeeper.name}
                onChange={(e) =>
                  onChangeSignatories({
                    timekeeper: { ...signatories.timekeeper, name: e.target.value }
                  })
                }
                placeholder="Optional Name or leave blank for line"
                className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded text-center font-semibold text-slate-800 uppercase"
              />
              <div className="font-bold text-[9.5px] tracking-wider uppercase text-slate-900">
                TIMEKEEPER
              </div>
            </div>
          </div>

          {/* 3. Approved Signature */}
          <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-800 flex items-center justify-between">
              <span>3. Approved: Signature</span>
              <span className="text-[10px] text-slate-500">In-Charge</span>
            </div>
            <input
              type="text"
              value={signatories.chiefSupervisor?.name || ''}
              onChange={(e) =>
                onChangeSignatories({
                  chiefSupervisor: {
                    name: e.target.value,
                    designation: signatories.chiefSupervisor?.designation || '',
                    roleLabel: signatories.chiefSupervisor?.roleLabel || 'In-Charge / Supervisor'
                  }
                })
              }
              placeholder="Approving Officer (e.g. DIR. ROBERTO V. MENDOZA)"
              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white font-medium text-slate-800 uppercase"
            />
            <input
              type="text"
              value={signatories.chiefSupervisor?.designation || ''}
              onChange={(e) =>
                onChangeSignatories({
                  chiefSupervisor: {
                    name: signatories.chiefSupervisor?.name || '',
                    designation: e.target.value,
                    roleLabel: signatories.chiefSupervisor?.roleLabel || 'In-Charge / Supervisor'
                  }
                })
              }
              placeholder="Designation / Role Title"
              className="w-full px-2 py-0.5 text-[11px] border border-slate-200 rounded-md bg-white text-slate-600"
            />
          </div>
        </div>

        {/* Panel 3: Two Selectable Work Schedules (Schedule 1 & Schedule 2) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Official Work Schedules</span>
            </div>
            <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              {activeEmpScheduleType === 'schedule2' ? 'Schedule 2 (7-4)' : 'Schedule 1 (8-5)'}
            </span>
          </div>

          {/* Schedule 1 vs Schedule 2 Selection Buttons */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
              Select Assigned Work Schedule for <strong className="text-slate-900 uppercase">{currentPersonnel.name}</strong>:
            </label>
            <div className="space-y-2">
              {/* Option A: Schedule 1 */}
              <button
                type="button"
                onClick={() => handleSelectSchedule('schedule1')}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeEmpScheduleType === 'schedule1'
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50/70 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    Schedule 1: 8:00 AM to 5:00 PM
                  </span>
                  {activeEmpScheduleType === 'schedule1' ? (
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">
                      Click to switch
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-2">
                  <span>AM In: <strong>8:00 AM</strong></span>
                  <span>·</span>
                  <span>PM Out: <strong>5:00 PM</strong></span>
                </div>

                {/* Live Late and Undertime for Schedule 1 */}
                <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center gap-2 text-[11px]">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Under Sched 1:</span>
                  <span className={`px-2 py-0.5 rounded font-bold tabular-nums ${sched1Stats.totalLateMinutes > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800'}`}>
                    Late: {sched1Stats.totalLateMinutes} mins
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold tabular-nums ${sched1Stats.totalUndertimeOnlyMinutes > 0 ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-slate-100 text-slate-600'}`}>
                    Undertime: {sched1Stats.totalUndertimeOnlyMinutes} mins
                  </span>
                </div>
              </button>

              {/* Option B: Schedule 2 */}
              <button
                type="button"
                onClick={() => handleSelectSchedule('schedule2')}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeEmpScheduleType === 'schedule2'
                    ? 'border-purple-500 bg-purple-50/70 shadow-xs ring-1 ring-purple-500'
                    : 'border-slate-200 hover:bg-slate-50/70 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    Schedule 2: 7:00 AM to 4:00 PM
                  </span>
                  {activeEmpScheduleType === 'schedule2' ? (
                    <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">
                      Click to switch
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-2">
                  <span>AM In: <strong>7:00 AM</strong></span>
                  <span>·</span>
                  <span>PM Out: <strong>4:00 PM</strong></span>
                </div>

                {/* Live Late and Undertime for Schedule 2 */}
                <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center gap-2 text-[11px]">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Under Sched 2:</span>
                  <span className={`px-2 py-0.5 rounded font-bold tabular-nums ${sched2Stats.totalLateMinutes > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800'}`}>
                    Late: {sched2Stats.totalLateMinutes} mins
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold tabular-nums ${sched2Stats.totalUndertimeOnlyMinutes > 0 ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-slate-100 text-slate-600'}`}>
                    Undertime: {sched2Stats.totalUndertimeOnlyMinutes} mins
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Schedule Change Scope & Preservation of Previous Records */}
          <div className="p-3 bg-slate-50/90 border border-slate-200 rounded-lg space-y-2">
            <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
              <span>Schedule Change Date Scope:</span>
              <span className="text-[10px] text-slate-500">Preserves History</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scheduleScope"
                  checked={scopeMode === 'all'}
                  onChange={() => setScopeMode('all')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-700">
                  Apply to all dates in month
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scheduleScope"
                  checked={scopeMode === 'fromDay'}
                  onChange={() => setScopeMode('fromDay')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-700">
                  Apply from Day
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={effectiveFromDay}
                    onChange={(e) => setEffectiveFromDay(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                    disabled={scopeMode !== 'fromDay'}
                    className="w-10 px-1 py-0.5 ml-1 mr-1 border border-slate-300 rounded text-center text-xs font-bold text-slate-800 bg-white"
                  />
                  onwards (prior records unchanged)
                </span>
              </label>
            </div>
          </div>

          {/* Header Display Info */}
          <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg text-[10.5px] text-blue-900 leading-tight space-y-1">
            <div className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>Automatic Form 48 Header Sync</span>
            </div>
            <p className="text-blue-800/90 text-[10px]">
              Printed Form 48 header automatically reads: <strong>{schedule.regularHoursDisplay}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
