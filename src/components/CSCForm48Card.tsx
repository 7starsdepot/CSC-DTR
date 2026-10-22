import React from 'react';
import { DailyRecord, Signatories, OfficialSchedule } from '../types/csc';
import { MONTH_NAMES } from '../utils/timeCalculations';

interface CSCForm48CardProps {
  month: number;
  year: number;
  employeeName: string;
  records: DailyRecord[];
  signatories: Signatories;
  schedule: OfficialSchedule;
}

export const CSCForm48Card: React.FC<CSCForm48CardProps> = ({
  month,
  year,
  employeeName,
  records,
  signatories,
  schedule
}) => {
  const monthName = MONTH_NAMES[month - 1];

  // Calculate totals
  const totalUndertimeHours = records.reduce((sum, r) => sum + (r.undertimeHours || 0), 0);
  const totalUndertimeMinutes = records.reduce((sum, r) => sum + (r.undertimeMinutes || 0), 0);
  const normalizedHours = totalUndertimeHours + Math.floor(totalUndertimeMinutes / 60);
  const normalizedMinutes = totalUndertimeMinutes % 60;

  return (
    <div
      className="relative bg-white text-black font-csc-serif p-5 border-2 border-black w-full max-w-[530px] mx-auto shadow-sm page-break-avoid select-none"
      style={{
        boxSizing: 'border-box',
        fontSize: '11px',
        lineHeight: 1.3
      }}
    >
      {/* Top Header */}
      <div className="text-center mb-1.5">
        <div className="text-[10px] tracking-wide font-normal uppercase">
          Civil Service Form No. 48
        </div>
        <div className="text-base font-bold tracking-wider mt-0.5 uppercase">
          DAILY TIME RECORD
        </div>
        <div className="text-[10px] tracking-widest text-black/70 -mt-0.5">
          -----o0o-----
        </div>
      </div>

      {/* Employee Name Box */}
      <div className="text-center mt-2 mb-2">
        <div className="font-bold text-sm tracking-wide border-b border-black uppercase pb-0.5 px-4 inline-block min-w-[280px]">
          {employeeName || 'JUAN D. DELA CRUZ'}
        </div>
        <div className="text-[9px] uppercase tracking-wider text-black/80 mt-0.5">
          (Name of Employee)
        </div>
      </div>

      {/* Month & Official Hours Schedule - Centered & Highly Visible OCTOBER 2026 */}
      <div className="text-[10px] border-t border-black pt-2 mb-2 text-center">
        <div className="text-[10.5px] italic text-black/85 mb-0.5">
          For the month of
        </div>
        <div className="font-bold text-sm tracking-widest uppercase border-b-2 border-black inline-block px-10 pb-0.5 mb-2.5">
          {monthName} {year}
        </div>

        <div className="text-[9px] leading-tight space-y-0.5 text-left border-t border-black/40 pt-1.5">
          <div className="flex justify-between">
            <span>Official hours for arrival:</span>
            <span className="font-medium">{schedule.regularHoursDisplay || '8:00 AM - 12:00 PM / 1:00 PM - 5:00 PM'}</span>
          </div>
          <div className="flex justify-between text-black/80">
            <span>and departure / Saturdays:</span>
            <span>{schedule.saturdaysDisplay || 'As required / Off'}</span>
          </div>
        </div>
      </div>

      {/* The Official Form 48 Table with Spacing x2 & Blank Remarks */}
      <div className="overflow-hidden">
        <table className="w-full border-collapse border border-black text-center text-[9.5px]">
          <thead>
            {/* Super Header Row */}
            <tr className="border-b border-black bg-slate-50/50">
              <th
                rowSpan={2}
                className="border-r border-black p-1 w-[26px] font-bold text-[9px] align-middle"
              >
                Day
              </th>
              <th
                colSpan={2}
                className="border-r border-black p-1 font-bold text-[9px] tracking-wide"
              >
                A.M.
              </th>
              <th
                colSpan={2}
                className="border-r border-black p-1 font-bold text-[9px] tracking-wide"
              >
                P.M.
              </th>
              <th
                colSpan={2}
                className="border-r border-black p-1 font-bold text-[9px] tracking-wide"
              >
                UNDERTIME
              </th>
              {/* Remarks column: widen 7 times the size of Hours */}
              <th
                rowSpan={2}
                className="p-1 font-bold text-[9px] tracking-wide align-middle w-[196px] min-w-[196px]"
              >
                REMARKS
              </th>
            </tr>
            {/* Sub Header Row */}
            <tr className="border-b border-black bg-slate-50/50 text-[8.5px]">
              <th className="border-r border-black p-0.5 w-[42px] font-semibold">Arrival</th>
              <th className="border-r border-black p-0.5 w-[42px] font-semibold">Departure</th>
              <th className="border-r border-black p-0.5 w-[42px] font-semibold">Arrival</th>
              <th className="border-r border-black p-0.5 w-[42px] font-semibold">Departure</th>
              <th className="border-r border-black p-0.5 w-[28px] font-semibold">Hours</th>
              <th className="border-r border-black p-0.5 w-[28px] font-semibold">Min.</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const isSat = r.status === 'weekend' && r.dayOfWeek === 'Sat';
              const isSun = r.status === 'weekend' && r.dayOfWeek === 'Sun';
              const isHoliday = r.status === 'holiday';
              const isSpecial = isSat || isSun || isHoliday || !r.dateStr;

              const spanLabel = isHoliday
                ? (r.statusLabel || 'HOLIDAY')
                : isSat
                ? 'SATURDAY'
                : isSun
                ? 'SUNDAY'
                : '';

              return (
                <tr
                  key={r.day}
                  className="border-b border-black/70 hover:bg-slate-50/30 transition-colors"
                  style={{ height: '24px' }} /* Spacing x2 */
                >
                  {/* Day Column */}
                  <td className="border-r border-black font-semibold text-[9.5px] p-0 tabular-nums align-middle">
                    {r.day}
                  </td>

                  {isSpecial && spanLabel ? (
                    <>
                      <td
                        colSpan={4}
                        className="border-r border-black text-[8px] font-bold tracking-widest text-black/75 uppercase px-1 align-middle"
                      >
                        {spanLabel}
                      </td>
                      <td className="border-r border-black text-[8.5px] tabular-nums text-black/60 p-0 align-middle">-</td>
                      <td className="border-r border-black text-[8.5px] tabular-nums text-black/60 p-0 align-middle">-</td>
                      {/* Remarks (Blank per user request) */}
                      <td className="text-[8.5px] text-left px-1.5 py-0 max-w-[196px] align-middle"></td>
                    </>
                  ) : (
                    <>
                      {/* AM Arrival */}
                      <td className="border-r border-black text-[9.5px] tabular-nums p-0 align-middle">
                        {r.inTime || ''}
                      </td>
                      {/* AM / Noon Departure */}
                      <td className="border-r border-black text-[9.5px] tabular-nums p-0 align-middle">
                        {r.breakTime || ''}
                      </td>
                      {/* PM Arrival */}
                      <td className="border-r border-black text-[9.5px] tabular-nums p-0 align-middle">
                        {r.resumeTime || ''}
                      </td>
                      {/* PM Departure */}
                      <td className="border-r border-black text-[9.5px] tabular-nums p-0 align-middle">
                        {r.outTime || ''}
                      </td>
                      {/* Undertime Hours */}
                      <td className="border-r border-black text-[9px] tabular-nums p-0 align-middle">
                        {r.undertimeHours > 0 ? r.undertimeHours : ''}
                      </td>
                      {/* Undertime Minutes */}
                      <td className="border-r border-black text-[9px] tabular-nums p-0 align-middle">
                        {r.undertimeMinutes > 0 ? r.undertimeMinutes : ''}
                      </td>
                      {/* Remarks column (Blank per user request, with x2 spacing) */}
                      <td className="text-[8.5px] text-left px-1.5 py-0 max-w-[196px] align-middle"></td>
                    </>
                  )}
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="border-t-2 border-black font-bold bg-slate-50/50" style={{ height: '24px' }}>
              <td colSpan={5} className="border-r border-black text-right pr-2 text-[9px] uppercase tracking-wider align-middle">
                Total :
              </td>
              <td className="border-r border-black text-center text-[9.5px] tabular-nums align-middle">
                {normalizedHours > 0 ? normalizedHours : '0'}
              </td>
              <td className="border-r border-black text-center text-[9.5px] tabular-nums align-middle">
                {normalizedMinutes > 0 ? normalizedMinutes : '0'}
              </td>
              <td className="p-0 text-center text-[8px] text-black/60 italic align-middle">
                {/* Remarks column total space (Blank) */}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Official Certification Oath */}
      <div className="mt-3 text-[8.5px] leading-relaxed text-justify px-0.5">
        <p>
          <em>
            I certify on my honor that the above is a true and correct report of the
            hours of work performed, record of which was made daily at the time of
            arrival and departure from office.
          </em>
        </p>
      </div>

      {/* SIGNATORIES: Employee, Timekeeper, and RETAINED Approved */}
      <div className="mt-4 pt-1 border-t border-black/30 space-y-4">
        {/* 1. Employee Signature Part (Just "Employee" underneath) */}
        <div className="text-center">
          <div className="w-[85%] mx-auto border-b border-black pb-0.5">
            <span className="font-bold text-[10.5px] uppercase tracking-wide">
              {employeeName || signatories.employee.name || 'EMPLOYEE SIGNATURE'}
            </span>
          </div>
          <div className="text-[9px] text-black/85 mt-0.5 tracking-wide">
            Employee
          </div>
        </div>

        {/* 2. Timekeeper Signature Part - Exact Format from User Image */}
        <div className="text-center pt-1">
          <div className="text-[10px] italic font-semibold text-black mb-3 tracking-wide">
            Verified as to the prescribed office hours:
          </div>
          <div className="w-[85%] mx-auto border-b border-black pb-0.5">
            {signatories.timekeeper.name ? (
              <span className="font-bold text-[10.5px] uppercase tracking-wide">
                {signatories.timekeeper.name}
              </span>
            ) : (
              <span className="inline-block h-3" />
            )}
          </div>
          <div className="font-bold text-[9.5px] tracking-wider uppercase mt-1">
            TIMEKEEPER
          </div>
        </div>

        {/* 3. Retained Approved: Signature Part */}
        <div className="text-center pt-1">
          <div className="text-[9.5px] font-bold uppercase text-left pl-7 mb-2 tracking-wide">
            Approved:
          </div>
          <div className="w-[85%] mx-auto border-b border-black pb-0.5">
            {signatories.chiefSupervisor?.name ? (
              <span className="font-bold text-[10.5px] uppercase tracking-wide">
                {signatories.chiefSupervisor.name}
              </span>
            ) : (
              <span className="inline-block h-3" />
            )}
          </div>
          <div className="text-[8.5px] text-black/85 mt-0.5">
            {signatories.chiefSupervisor?.roleLabel || 'In-Charge / Supervisor'}
          </div>
          {signatories.chiefSupervisor?.designation && (
            <div className="text-[7.5px] text-black/60 italic">
              ({signatories.chiefSupervisor.designation})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
