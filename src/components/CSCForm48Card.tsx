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
      className="relative bg-white text-black font-csc-serif p-4 sm:p-5 border-2 border-black w-full max-w-[650px] mx-auto shadow-sm page-break-avoid select-none"
      style={{
        boxSizing: 'border-box',
        fontSize: '11px',
        lineHeight: 1.25
      }}
    >
      {/* Official DPWH & CSC Form 48 Top Header */}
      <div className="text-center mb-2">
        <div className="text-[9px] font-bold tracking-wider text-black uppercase leading-tight">
          Republic of the Philippines
        </div>
        <div className="text-[10px] font-black tracking-wide text-black uppercase font-brand leading-tight mt-0.5">
          DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS
        </div>

        <div className="text-[10px] tracking-wide font-bold text-black uppercase mt-1">
          Civil Service Form No. 48
        </div>
        <div className="text-base font-black tracking-wider text-black mt-0.5 uppercase">
          DAILY TIME RECORD
        </div>
        <div className="text-[10px] tracking-widest text-black font-bold -mt-0.5">
          -----o0o-----
        </div>
      </div>

      {/* Employee Name Box */}
      <div className="text-center mt-1.5 mb-2">
        <div className="font-black text-sm tracking-wide border-b-2 border-black text-black uppercase pb-0.5 px-4 inline-block min-w-[280px]">
          {employeeName || 'EMPLOYEE'}
        </div>
        <div className="text-[9px] uppercase tracking-wider text-black font-bold mt-0.5">
          (Employee)
        </div>
      </div>

      {/* Month & Official Hours Schedule */}
      <div className="text-[10px] text-black border-t-2 border-black pt-1.5 mb-2">
        <div className="flex items-baseline mb-1.5 text-left">
          <span className="text-[10.5px] italic text-black shrink-0 mr-2 font-bold">
            For the month of:
          </span>
          <div className="flex-1 border-b-2 border-black text-center pb-0.5">
            <span className="font-black text-sm tracking-widest text-black uppercase">
              {monthName} {year}
            </span>
          </div>
        </div>

        <div className="text-[9px] leading-tight space-y-0.5 text-left border-t border-black pt-1 text-black font-semibold">
          <div className="flex justify-between">
            <span>Official hours for arrival:</span>
            <span className="font-bold text-black">{schedule.regularHoursDisplay || '8:00 AM - 12:00 PM / 1:00 PM - 5:00 PM'}</span>
          </div>
          <div className="flex justify-between text-black">
            <span>and departure / Saturdays:</span>
            <span className="font-bold text-black">{schedule.saturdaysDisplay || 'As required / Off'}</span>
          </div>
        </div>
      </div>

      {/* The Official Form 48 Table with Balanced Remarks & Highly Visible Arrival/Departure */}
      <div className="overflow-x-auto sm:overflow-hidden">
        <table className="w-full table-fixed border-collapse border-2 border-black text-center text-[9.5px] text-black">
          <colgroup>
            <col style={{ width: '28px' }} />
            <col style={{ width: '50px' }} />
            <col style={{ width: '50px' }} />
            <col style={{ width: '50px' }} />
            <col style={{ width: '50px' }} />
            <col style={{ width: '30px' }} />
            <col style={{ width: '30px' }} />
            <col style={{ width: 'auto' }} />
          </colgroup>
          <thead>
            {/* Super Header Row */}
            <tr className="border-b-2 border-black bg-white text-black font-bold">
              <th
                rowSpan={2}
                className="border-r border-black p-1 font-bold text-[9px] text-black align-middle"
              >
                Day
              </th>
              <th
                colSpan={2}
                className="border-r border-black p-1 font-bold text-[9.5px] text-black tracking-wide"
              >
                A.M.
              </th>
              <th
                colSpan={2}
                className="border-r border-black p-1 font-bold text-[9.5px] text-black tracking-wide"
              >
                P.M.
              </th>
              <th
                colSpan={2}
                className="border-r border-black p-1 font-bold text-[9px] text-black tracking-wide"
              >
                UNDERTIME
              </th>
              {/* Remarks column: Balanced spacing */}
              <th
                rowSpan={2}
                className="p-1 font-bold text-[9px] text-black tracking-wider align-middle min-w-[220px]"
              >
                REMARKS
              </th>
            </tr>
            {/* Sub Header Row */}
            <tr className="border-b-2 border-black bg-white text-[8.5px] text-black">
              <th className="border-r border-black p-0.5 font-bold text-black">Arrival</th>
              <th className="border-r border-black p-0.5 font-bold text-black">Departure</th>
              <th className="border-r border-black p-0.5 font-bold text-black">Arrival</th>
              <th className="border-r border-black p-0.5 font-bold text-black">Departure</th>
              <th className="border-r border-black p-0.5 font-bold text-black">Hours</th>
              <th className="border-r border-black p-0.5 font-bold text-black">Min.</th>
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

              // If any punches are recorded, ALWAYS display all the data recorded
              const hasRecordedData = Boolean(r.inTime || r.breakTime || r.resumeTime || r.outTime);
              const shouldSpanSpecial = isSpecial && spanLabel && !hasRecordedData;

              // Strictly blank remarks; never input saturday or sunday
              const isWeekendDay = isSat || isSun;
              const displayRemarks = (!isWeekendDay && r.remarks && !/^(saturday|sunday)$/i.test(r.remarks.trim()))
                ? r.remarks
                : '';

              return (
                <tr
                  key={r.day}
                  className="border-b border-black text-black"
                  style={{ height: '23px' }}
                >
                  {/* Day Column */}
                  <td className="border-r border-black font-bold text-[9.5px] text-black p-0 tabular-nums align-middle">
                    {r.day}
                  </td>

                  {shouldSpanSpecial ? (
                    <>
                      <td
                        colSpan={4}
                        className="border-r border-black text-[8.5px] font-black tracking-widest text-black uppercase px-1 align-middle"
                      >
                        {spanLabel}
                      </td>
                      <td className="border-r border-black text-[9px] tabular-nums font-bold text-black p-0 align-middle">-</td>
                      <td className="border-r border-black text-[9px] tabular-nums font-bold text-black p-0 align-middle">-</td>
                      {/* Remarks (Strictly blank for Saturdays/Sundays/Holidays) */}
                      <td className="text-[9px] text-black text-left px-2 py-0 min-w-[220px] align-middle"></td>
                    </>
                  ) : (
                    <>
                      {/* AM Arrival (In) - highly visible bold font in black */}
                      <td className="border-r border-black text-[10.5px] font-bold text-black tabular-nums px-0.5 whitespace-nowrap align-middle tracking-tight">
                        {r.inTime || ''}
                      </td>
                      {/* AM Departure (Break) - highly visible bold font in black */}
                      <td className="border-r border-black text-[10.5px] font-bold text-black tabular-nums px-0.5 whitespace-nowrap align-middle tracking-tight">
                        {r.breakTime || ''}
                      </td>
                      {/* PM Arrival (Resume) - highly visible bold font in black */}
                      <td className="border-r border-black text-[10.5px] font-bold text-black tabular-nums px-0.5 whitespace-nowrap align-middle tracking-tight">
                        {r.resumeTime || ''}
                      </td>
                      {/* PM Departure (Out) - highly visible bold font in black */}
                      <td className="border-r border-black text-[10.5px] font-bold text-black tabular-nums px-0.5 whitespace-nowrap align-middle tracking-tight">
                        {r.outTime || ''}
                      </td>
                      {/* Undertime Hours */}
                      <td className="border-r border-black text-[9.5px] font-bold text-black tabular-nums p-0 align-middle">
                        {r.undertimeHours > 0 ? r.undertimeHours : ''}
                      </td>
                      {/* Undertime Minutes */}
                      <td className="border-r border-black text-[9.5px] font-bold text-black tabular-nums p-0 align-middle">
                        {r.undertimeMinutes > 0 ? r.undertimeMinutes : ''}
                      </td>
                      {/* Remarks column: Balanced blank writing space (no saturday/sunday) */}
                      <td className="text-[9px] text-black font-semibold text-left px-2 py-0 min-w-[220px] align-middle">
                        {displayRemarks}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="border-t-2 border-black font-black bg-white text-black" style={{ height: '24px' }}>
              <td colSpan={5} className="border-r border-black text-right pr-2 text-[9.5px] uppercase tracking-wider align-middle font-bold text-black">
                Total :
              </td>
              <td className="border-r border-black text-center text-[10px] font-black text-black tabular-nums align-middle">
                {normalizedHours > 0 ? normalizedHours : '0'}
              </td>
              <td className="border-r border-black text-center text-[10px] font-black text-black tabular-nums align-middle">
                {normalizedMinutes > 0 ? normalizedMinutes : '0'}
              </td>
              <td className="p-0 text-center text-[8.5px] text-black font-bold align-middle min-w-[220px]">
                {/* Remarks column total space */}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Official Certification Oath */}
      <div className="mt-2.5 text-[8.5px] leading-snug text-justify px-0.5 text-black font-semibold">
        <p>
          <em>
            I certify on my honor that the above is a true and correct report of the
            hours of work performed, record of which was made daily at the time of
            arrival and departure from office.
          </em>
        </p>
      </div>

      {/* SIGNATORIES: Employee, Timekeeper, and Approved */}
      <div className="mt-3 pt-1 border-t border-black space-y-3.5 text-black">
        {/* 1. Employee Signature Part */}
        <div className="text-center">
          <div className="w-[85%] mx-auto border-b border-black pb-0.5">
            <span className="font-bold text-[10.5px] text-black uppercase tracking-wide">
              {employeeName || signatories.employee.name || 'EMPLOYEE SIGNATURE'}
            </span>
          </div>
          <div className="text-[9px] text-black font-bold mt-0.5 tracking-wide">
            Employee
          </div>
        </div>

        {/* 2. Timekeeper Signature Part */}
        <div className="text-center pt-0.5">
          <div className="text-[10px] italic font-bold text-black mb-2.5 tracking-wide">
            Verified as to the prescribed office hours:
          </div>
          <div className="w-[85%] mx-auto border-b border-black pb-0.5">
            {signatories.timekeeper.name ? (
              <span className="font-bold text-[10.5px] text-black uppercase tracking-wide">
                {signatories.timekeeper.name}
              </span>
            ) : (
              <span className="inline-block h-3" />
            )}
          </div>
          <div className="font-black text-[9.5px] text-black tracking-wider uppercase mt-1">
            TIMEKEEPER
          </div>
        </div>

        {/* 3. Retained Approved: Signature Part */}
        <div className="text-center pt-0.5">
          <div className="text-[9.5px] font-black text-black uppercase text-left pl-7 mb-1.5 tracking-wide">
            Approved:
          </div>
          <div className="w-[85%] mx-auto border-b border-black pb-0.5">
            {signatories.chiefSupervisor?.name ? (
              <span className="font-bold text-[10.5px] text-black uppercase tracking-wide">
                {signatories.chiefSupervisor.name}
              </span>
            ) : (
              <span className="inline-block h-3" />
            )}
          </div>
          <div className="text-[9px] text-black font-bold mt-0.5">
            {signatories.chiefSupervisor?.roleLabel || 'In-Charge / Supervisor'}
          </div>
          {signatories.chiefSupervisor?.designation && (
            <div className="text-[8px] text-black font-semibold italic">
              ({signatories.chiefSupervisor.designation})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
