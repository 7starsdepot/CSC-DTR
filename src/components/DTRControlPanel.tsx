import React from 'react';
import { Users, Clock, Calendar, FileSpreadsheet, Download, Printer, User, CheckCircle2 } from 'lucide-react';
import { DTRDocument, OfficialSchedule, Signatories } from '../types/csc';
import { MONTH_NAMES } from '../utils/timeCalculations';

interface DTRControlPanelProps {
  document: DTRDocument;
  onChangeSignatories: (sig: Partial<Signatories>) => void;
  onChangeSchedule: (sched: Partial<OfficialSchedule>) => void;
  onChangeMonthYear: (month: number, year: number) => void;
  onSelectPersonnelIndex: (index: number) => void;
  onOpenImport: () => void;
  onPreviewPrint: () => void;
}

export const DTRControlPanel: React.FC<DTRControlPanelProps> = ({
  document,
  onChangeSignatories,
  onChangeSchedule,
  onChangeMonthYear,
  onSelectPersonnelIndex,
  onOpenImport,
  onPreviewPrint
}) => {
  const { month, year, personnelList, selectedEmployeeIndex, signatories, schedule } = document;
  const currentPersonnel = personnelList[selectedEmployeeIndex] || personnelList[0] || {
    id: 'EMP-01',
    name: 'JUAN D. DELA CRUZ'
  };

  return (
    <div className="space-y-6">
      {/* Primary Action Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            CSC Form 48 · Daily Time Card Generator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Electronic Excel import: <span className="font-semibold text-slate-700">In = AM Arrival</span> · <span className="font-semibold text-slate-700">Break = PM Departure</span> · <span className="font-semibold text-slate-700">Resume = PM Arrival</span> · <span className="font-semibold text-slate-700">Out = PM Departure</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">

          <button
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Import Electronic Time Card</span>
          </button>

          <button
            onClick={onPreviewPrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print to PDF</span>
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
              <span>Imported Personnel</span>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {personnelList.length} Staff
            </span>
          </div>

          {/* Personnel Selection Dropdown */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Select Personnel Record:
            </label>
            <select
              value={selectedEmployeeIndex}
              onChange={(e) => onSelectPersonnelIndex(parseInt(e.target.value, 10))}
              className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 uppercase"
            >
              {personnelList.map((p, idx) => (
                <option key={idx} value={idx}>
                  {idx + 1}. {p.name}
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
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
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
              Only data imported from the Excel file will be printed. Manual table modifications are disabled.
            </p>
          </div>
        </div>

        {/* Panel 2: Signatories (Employee & Timekeeper) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Signatories</span>
            </div>
          </div>

          {/* 1. Employee Signature (Just "Employee") */}
          <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-800 flex items-center justify-between">
              <span>1. Employee Signature</span>
              <span className="text-[10px] text-slate-500">Signatory</span>
            </div>
            <div className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-bold text-xs text-slate-900 uppercase">
              {currentPersonnel.name}
            </div>
            <div className="text-[10px] text-slate-500 pl-0.5">
              Role text on card: <span className="font-semibold text-slate-700">Employee</span>
            </div>
          </div>

          {/* 2. Timekeeper Signature */}
          <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-2">
            <div className="text-[11px] font-semibold text-slate-800 flex items-center justify-between">
              <span>2. Timekeeper Signature</span>
              <span className="text-[10px] text-slate-500">Prescribed Office Hours</span>
            </div>
            <div className="p-2.5 bg-white rounded-md border border-slate-200 text-center space-y-1">
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
                placeholder="Optional Name or leave blank for signature line"
                className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded text-center font-semibold text-slate-800 uppercase"
              />
              <div className="font-bold text-[10px] tracking-wider uppercase text-slate-900 pt-0.5">
                TIMEKEEPER
              </div>
            </div>
          </div>

          {/* 3. Retained Approved: Signature */}
          <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1.5">
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
              placeholder="Name of Approving Officer (e.g. DIR. ROBERTO V. MENDOZA)"
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

        {/* Panel 3: Official Working Hours Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-purple-600" />
            <span>Official Working Schedule</span>
          </div>

          {/* Schedule Presets */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Working Schedule Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onChangeSchedule({
                    amIn: '08:00',
                    amOut: '12:00',
                    pmIn: '13:00',
                    pmOut: '17:00',
                    regularHoursDisplay: '8:00 AM - 12:00 PM / 1:00 PM - 5:00 PM'
                  })
                }
                className={`px-2.5 py-1.5 text-xs rounded-md border text-center transition-colors ${
                  schedule.amIn === '08:00' && schedule.pmOut === '17:00'
                    ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Standard 8:00 - 5:00
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeSchedule({
                    amIn: '07:00',
                    amOut: '12:00',
                    pmIn: '13:00',
                    pmOut: '16:00',
                    regularHoursDisplay: '7:00 AM - 12:00 PM / 1:00 PM - 4:00 PM'
                  })
                }
                className={`px-2.5 py-1.5 text-xs rounded-md border text-center transition-colors ${
                  schedule.amIn === '07:00' && schedule.pmOut === '16:00'
                    ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Early 7:00 - 4:00
              </button>
            </div>
          </div>

          {/* Card Header Display */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Card Header Display (Regular Days)
            </label>
            <input
              type="text"
              value={schedule.regularHoursDisplay}
              onChange={(e) => onChangeSchedule({ regularHoursDisplay: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Saturdays Header Display
            </label>
            <input
              type="text"
              value={schedule.saturdaysDisplay}
              onChange={(e) => onChangeSchedule({ saturdaysDisplay: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
