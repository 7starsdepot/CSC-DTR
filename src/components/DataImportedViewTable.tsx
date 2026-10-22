import React from 'react';
import { DailyRecord, OfficialSchedule } from '../types/csc';
import { Lock, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface DataImportedViewTableProps {
  records: DailyRecord[];
  schedule: OfficialSchedule;
  employeeName: string;
  onOpenImport: () => void;
}

export const DataImportedViewTable: React.FC<DataImportedViewTableProps> = ({
  records,
  schedule,
  employeeName,
  onOpenImport
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header Banner - Explaining Non-Editable Rule */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-800 text-sm">
              Imported Electronic Time Card Records
            </h4>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Lock className="w-3 h-3 text-emerald-700" />
              <span>Direct Excel Import · Read Only</span>
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Personnel: <strong className="text-slate-800 uppercase">{employeeName}</strong> · Electronic logs (In, Break, Resume, Out, Remarks) are locked and reflected directly onto CSC Form 48.
          </p>
        </div>

        <button
          onClick={onOpenImport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors shadow-2xs"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
          <span>Upload New Excel File</span>
        </button>
      </div>

      {/* Read-Only Grid Container */}
      <div className="max-h-[540px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 sticky top-0 z-10 text-[11px] font-semibold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 w-14 text-center">Day</th>
              <th className="py-2.5 px-3 w-32">In (AM Arrival)</th>
              <th className="py-2.5 px-3 w-36">Break (PM Departure)</th>
              <th className="py-2.5 px-3 w-32">Resume (PM Arrival)</th>
              <th className="py-2.5 px-3 w-36">Out (PM Departure)</th>
              <th className="py-2.5 px-3 w-24 text-center">Undertime</th>
              <th className="py-2.5 px-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {records.map((r) => {
              const isNonExistent = !r.dateStr;
              if (isNonExistent) return null;

              const isWeekend = r.status === 'weekend';
              const isHoliday = r.status === 'holiday';
              const isSpecial = isWeekend || isHoliday;

              return (
                <tr
                  key={r.day}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    isSpecial ? 'bg-slate-50/40 text-slate-500' : 'text-slate-800'
                  }`}
                >
                  {/* Day & Weekday */}
                  <td className="py-2 px-3 text-center">
                    <span className="font-bold text-slate-900">{r.day}</span>
                    <span className="text-[10px] text-slate-400 block -mt-0.5">
                      {r.dayOfWeek}
                    </span>
                  </td>

                  {/* In Time */}
                  <td className="py-2 px-3 font-mono font-medium">
                    {r.inTime ? (
                      <span className="text-slate-900">{r.inTime}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* Break Time */}
                  <td className="py-2 px-3 font-mono font-medium">
                    {r.breakTime ? (
                      <span className="text-slate-900">{r.breakTime}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* Resume Time */}
                  <td className="py-2 px-3 font-mono font-medium">
                    {r.resumeTime ? (
                      <span className="text-slate-900">{r.resumeTime}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* Out Time */}
                  <td className="py-2 px-3 font-mono font-medium">
                    {r.outTime ? (
                      <span className="text-slate-900">{r.outTime}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* Undertime Display */}
                  <td className="py-2 px-3 text-center">
                    {r.undertimeHours > 0 || r.undertimeMinutes > 0 ? (
                      <span className="font-semibold text-amber-700">
                        {r.undertimeHours > 0 && `${r.undertimeHours}h `}
                        {r.undertimeMinutes > 0 && `${r.undertimeMinutes}m`}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Remarks Display */}
                  <td className="py-2 px-3">
                    {r.remarks ? (
                      <span className="text-slate-800 font-medium">{r.remarks}</span>
                    ) : (
                      <span className="text-slate-300 italic text-[11px]">Regular</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
