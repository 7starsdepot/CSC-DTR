import React, { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, Filter, ArrowUpDown, ChevronDown, ChevronUp, Edit3, Save, X } from 'lucide-react';
import { DailyRecord, DTRPeriodTotals, OfficialSchedule } from '../types/csc';
import { formatMinutesDisplay, calculateDailyLateAndUndertime } from '../utils/timeCalculations';

interface LateUndertimeBreakdownTableProps {
  employeeName: string;
  monthName: string;
  year: number;
  records: DailyRecord[];
  totals: DTRPeriodTotals;
  schedule: OfficialSchedule;
  onUpdateRecord?: (day: number, updatedFields: Partial<DailyRecord>) => void;
}

export const LateUndertimeBreakdownTable: React.FC<LateUndertimeBreakdownTableProps> = ({
  employeeName,
  monthName,
  year,
  records,
  totals,
  schedule,
  onUpdateRecord
}) => {
  const [displayMode, setDisplayMode] = useState<'minutes' | 'hoursMinutes' | 'both'>('both');
  const [filterMode, setFilterMode] = useState<'all' | 'withTardiness' | 'workdays'>('all');
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editPunches, setEditPunches] = useState<{
    inTime: string;
    breakTime: string;
    resumeTime: string;
    outTime: string;
    remarks: string;
  }>({ inTime: '', breakTime: '', resumeTime: '', outTime: '', remarks: '' });

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (!r.dateStr) return false;
    if (filterMode === 'withTardiness') {
      return (r.combinedLateUndertimeMinutes || 0) > 0;
    }
    if (filterMode === 'workdays') {
      return r.status === 'regular';
    }
    return true;
  });

  const handleStartEdit = (r: DailyRecord) => {
    setEditingDay(r.day);
    setEditPunches({
      inTime: r.inTime || '',
      breakTime: r.breakTime || '',
      resumeTime: r.resumeTime || '',
      outTime: r.outTime || '',
      remarks: r.remarks || ''
    });
  };

  const handleSaveEdit = (day: number) => {
    if (onUpdateRecord) {
      onUpdateRecord(day, editPunches);
    }
    setEditingDay(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Banner / Section Header */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold tracking-tight">
                Late Arrivals & Undertime Automatic Computation
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Official Schedule: <span className="text-white font-semibold">Morning 8:00 AM – 12:00 PM</span> (Lunch 12–1 PM excluded) · <span className="text-white font-semibold">Afternoon 1:00 PM – 5:00 PM</span> · 8 hrs/day
            </p>
          </div>

          {/* Unit Display Toggle: Minutes vs Hours & Minutes */}
          <div className="flex items-center gap-2 text-xs bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <span className="text-slate-300 text-[11px] px-2">Display unit:</span>
            <button
              type="button"
              onClick={() => setDisplayMode('minutes')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                displayMode === 'minutes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Minutes
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('hoursMinutes')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                displayMode === 'hoursMinutes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Hours & Min
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('both')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                displayMode === 'both' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Both
            </button>
          </div>
        </div>

        {/* Period Totals Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/80">
          {/* Card 1: Total Late */}
          <div className="bg-slate-800/70 backdrop-blur-xs rounded-lg p-3 border border-slate-700">
            <div className="text-[11px] text-slate-300 font-medium">Total Late (Period)</div>
            <div className="text-xl font-bold text-amber-300 mt-0.5 tabular-nums">
              {formatMinutesDisplay(totals.totalLateMinutes, displayMode)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
              <span>AM: <strong className="text-slate-200">{formatMinutesDisplay(totals.totalMorningLateMinutes, 'minutes')}</strong></span>
              <span>PM: <strong className="text-slate-200">{formatMinutesDisplay(totals.totalAfternoonLateMinutes, 'minutes')}</strong></span>
            </div>
          </div>

          {/* Card 2: Total Undertime */}
          <div className="bg-slate-800/70 backdrop-blur-xs rounded-lg p-3 border border-slate-700">
            <div className="text-[11px] text-slate-300 font-medium">Total Undertime (Period)</div>
            <div className="text-xl font-bold text-orange-300 mt-0.5 tabular-nums">
              {formatMinutesDisplay(totals.totalUndertimeMinutes, displayMode)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
              <span>AM: <strong className="text-slate-200">{formatMinutesDisplay(totals.totalMorningUndertimeMinutes, 'minutes')}</strong></span>
              <span>PM: <strong className="text-slate-200">{formatMinutesDisplay(totals.totalAfternoonUndertimeMinutes, 'minutes')}</strong></span>
            </div>
          </div>

          {/* Card 3: Grand Total Combined */}
          <div className="bg-slate-800/70 backdrop-blur-xs rounded-lg p-3 border border-slate-700">
            <div className="text-[11px] text-slate-300 font-medium">Grand Total (Late + Undertime)</div>
            <div className="text-xl font-black text-rose-300 mt-0.5 tabular-nums">
              {formatMinutesDisplay(totals.grandTotalLateUndertimeMinutes, displayMode)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Reflected on Form 48 undertime total
            </div>
          </div>

          {/* Card 4: Hours Worked (Lunch Excluded) */}
          <div className="bg-slate-800/70 backdrop-blur-xs rounded-lg p-3 border border-slate-700">
            <div className="text-[11px] text-slate-300 font-medium">Actual Worked Hours</div>
            <div className="text-xl font-bold text-emerald-300 mt-0.5 tabular-nums">
              {totals.totalWorkedHours} hrs
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Lunch 12–1 PM strictly excluded
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-700">Filter workdays:</span>
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                filterMode === 'all' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Days ({records.filter((r) => Boolean(r.dateStr)).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('withTardiness')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                filterMode === 'withTardiness' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              With Late/Undertime ({records.filter((r) => (r.combinedLateUndertimeMinutes || 0) > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('workdays')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                filterMode === 'workdays' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Regular Workdays
            </button>
          </div>
        </div>

        <div className="text-slate-500 text-[11px]">
          Editing any punch triggers <strong>instant automatic recalculation</strong> of all totals.
        </div>
      </div>

      {/* Computations Table */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider sticky top-0 z-10 shadow-2xs">
            <tr>
              <th className="py-2.5 px-3 border-b border-r border-slate-200">Day</th>
              <th colSpan={2} className="py-1 px-3 border-b border-r border-slate-200 text-center bg-blue-50/60 text-blue-900">
                Morning Arrival (Late &gt; 8:00 AM)
              </th>
              <th colSpan={2} className="py-1 px-3 border-b border-r border-slate-200 text-center bg-amber-50/60 text-amber-900">
                Morning Departure (Undertime &lt; 12:00 PM)
              </th>
              <th colSpan={2} className="py-1 px-3 border-b border-r border-slate-200 text-center bg-blue-50/60 text-blue-900">
                Afternoon Arrival (Late &gt; 1:00 PM)
              </th>
              <th colSpan={2} className="py-1 px-3 border-b border-r border-slate-200 text-center bg-amber-50/60 text-amber-900">
                Afternoon Departure (Undertime &lt; 5:00 PM)
              </th>
              <th colSpan={3} className="py-1 px-3 border-b border-slate-200 text-center bg-rose-50/60 text-rose-900">
                Daily Computations
              </th>
              <th className="py-2.5 px-3 border-b border-slate-200 text-center">Action</th>
            </tr>
            <tr className="text-[9px] bg-slate-50 text-slate-600">
              <th className="py-1.5 px-3 border-b border-r border-slate-200">Date</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center">In Time</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center text-amber-700">AM Late</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center">Break (Out)</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center text-orange-700">AM Undertime</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center">Resume (In)</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center text-amber-700">PM Late</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center">Out Time</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center text-orange-700">PM Undertime</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center font-bold text-amber-800">Total Late</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center font-bold text-orange-800">Total Undertime</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 text-center font-black text-rose-800">Combined</th>
              <th className="py-1.5 px-2 border-b border-slate-200 text-center">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredRecords.map((r) => {
              const isEditing = editingDay === r.day;
              const hasLateOrUndertime = (r.combinedLateUndertimeMinutes || 0) > 0;
              const isWeekend = r.status === 'weekend';
              const isHoliday = r.status === 'holiday';

              // Live interactive calculation as the user types (e.g. 8:05 instantly shows 5 min late)
              const liveBreakdown = isEditing
                ? calculateDailyLateAndUndertime(
                    {
                      inTime: editPunches.inTime,
                      breakTime: editPunches.breakTime,
                      resumeTime: editPunches.resumeTime,
                      outTime: editPunches.outTime,
                      status: r.status
                    },
                    schedule
                  )
                : null;

              const morningLateMins = (isEditing ? liveBreakdown!.morningLateMinutes : r.morningLateMinutes) || 0;
              const morningUtMins = (isEditing ? liveBreakdown!.morningUndertimeMinutes : r.morningUndertimeMinutes) || 0;
              const afternoonLateMins = (isEditing ? liveBreakdown!.afternoonLateMinutes : r.afternoonLateMinutes) || 0;
              const afternoonUtMins = (isEditing ? liveBreakdown!.afternoonUndertimeMinutes : r.afternoonUndertimeMinutes) || 0;
              const totalLateMins = (isEditing ? liveBreakdown!.totalLateMinutes : r.totalLateMinutes) || 0;
              const totalUtMins = (isEditing ? liveBreakdown!.totalUndertimeDailyMinutes : r.totalUndertimeDailyMinutes) || 0;
              const combinedMins = (isEditing ? liveBreakdown!.combinedLateUndertimeMinutes : r.combinedLateUndertimeMinutes) || 0;

              return (
                <tr
                  key={r.day}
                  className={`hover:bg-slate-50 transition-colors ${
                    isEditing
                      ? 'bg-blue-50/40 ring-1 ring-blue-300'
                      : combinedMins > 0
                      ? 'bg-amber-50/30'
                      : isWeekend
                      ? 'bg-slate-50/50 text-slate-400'
                      : ''
                  }`}
                >
                  {/* Day & Day of Week */}
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold tabular-nums">
                    <span className="font-bold text-slate-900">{r.day}</span>{' '}
                    <span className="text-[10px] text-slate-500 font-normal">({r.dayOfWeek})</span>
                    {isHoliday && (
                      <span className="ml-1 text-[9px] bg-red-100 text-red-700 px-1 py-0.25 rounded font-bold">
                        HOLIDAY
                      </span>
                    )}
                  </td>

                  {/* Morning In Time */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums">
                    {isEditing ? (
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={editPunches.inTime}
                          onChange={(e) => setEditPunches({ ...editPunches, inTime: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(r.day);
                          }}
                          placeholder="8:00"
                          autoFocus
                          className="w-16 px-1 py-0.5 text-xs border border-blue-400 rounded text-center bg-white font-bold text-slate-900 shadow-2xs focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setEditPunches({ ...editPunches, inTime: '8:05' })}
                          className="text-[9px] px-1 py-0.2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded font-bold cursor-pointer"
                          title="Click to fill 8:05 AM (5 min late)"
                        >
                          8:05
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-900">{r.inTime || <span className="text-slate-300 font-normal">-</span>}</span>
                    )}
                  </td>

                  {/* Morning Late */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums">
                    {morningLateMins > 0 ? (
                      <span className="font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded shadow-2xs">
                        {formatMinutesDisplay(morningLateMins, displayMode)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">0</span>
                    )}
                  </td>

                  {/* Morning Break Time (Out) */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editPunches.breakTime}
                        onChange={(e) => setEditPunches({ ...editPunches, breakTime: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(r.day);
                        }}
                        placeholder="12:00"
                        className="w-16 px-1 py-0.5 text-xs border rounded text-center bg-white"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{r.breakTime || <span className="text-slate-300">-</span>}</span>
                    )}
                  </td>

                  {/* Morning Undertime */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums">
                    {morningUtMins > 0 ? (
                      <span className="font-bold text-orange-700 bg-orange-100/90 px-1.5 py-0.5 rounded shadow-2xs">
                        {formatMinutesDisplay(morningUtMins, displayMode)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">0</span>
                    )}
                  </td>

                  {/* Afternoon Resume Time (In) */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editPunches.resumeTime}
                        onChange={(e) => setEditPunches({ ...editPunches, resumeTime: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(r.day);
                        }}
                        placeholder="1:00"
                        className="w-16 px-1 py-0.5 text-xs border rounded text-center bg-white"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{r.resumeTime || <span className="text-slate-300">-</span>}</span>
                    )}
                  </td>

                  {/* Afternoon Late */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums">
                    {afternoonLateMins > 0 ? (
                      <span className="font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded shadow-2xs">
                        {formatMinutesDisplay(afternoonLateMins, displayMode)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">0</span>
                    )}
                  </td>

                  {/* Afternoon Out Time */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editPunches.outTime}
                        onChange={(e) => setEditPunches({ ...editPunches, outTime: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(r.day);
                        }}
                        placeholder="5:00"
                        className="w-16 px-1 py-0.5 text-xs border rounded text-center bg-white"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{r.outTime || <span className="text-slate-300">-</span>}</span>
                    )}
                  </td>

                  {/* Afternoon Undertime */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums">
                    {afternoonUtMins > 0 ? (
                      <span className="font-bold text-orange-700 bg-orange-100/90 px-1.5 py-0.5 rounded shadow-2xs">
                        {formatMinutesDisplay(afternoonUtMins, displayMode)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">0</span>
                    )}
                  </td>

                  {/* Day Total Late */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums font-semibold">
                    {totalLateMins > 0 ? (
                      <span className="text-amber-800 font-bold bg-amber-50 px-1 py-0.5 rounded">
                        {formatMinutesDisplay(totalLateMins, displayMode)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">0</span>
                    )}
                  </td>

                  {/* Day Total Undertime */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums font-semibold">
                    {totalUtMins > 0 ? (
                      <span className="text-orange-800 font-bold bg-orange-50 px-1 py-0.5 rounded">
                        {formatMinutesDisplay(totalUtMins, displayMode)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">0</span>
                    )}
                  </td>

                  {/* Day Combined (Late + Undertime) */}
                  <td className="py-2 px-2 border-r border-slate-200 text-center tabular-nums font-black">
                    {combinedMins > 0 ? (
                      <span className="text-rose-700 font-black bg-rose-100/90 px-1.5 py-0.5 rounded shadow-2xs">
                        {formatMinutesDisplay(combinedMins, displayMode)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">0</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-2 px-2 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(r.day)}
                          title="Save and Recalculate (Enter)"
                          className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDay(null)}
                          title="Cancel (Esc)"
                          className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      onUpdateRecord && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(r)}
                          title="Edit punch times"
                          className="p-1.5 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 text-slate-900 font-bold text-xs border-t-2 border-slate-300 sticky bottom-0 z-10">
            <tr>
              <td className="py-2.5 px-3 uppercase tracking-wider font-bold">Total</td>
              <td className="py-2.5 px-2 border-r border-slate-200"></td>
              <td className="py-2.5 px-2 border-r border-slate-200 text-center text-amber-700 font-bold tabular-nums">
                {formatMinutesDisplay(totals.totalMorningLateMinutes, displayMode)}
              </td>
              <td className="py-2.5 px-2 border-r border-slate-200"></td>
              <td className="py-2.5 px-2 border-r border-slate-200 text-center text-orange-700 font-bold tabular-nums">
                {formatMinutesDisplay(totals.totalMorningUndertimeMinutes, displayMode)}
              </td>
              <td className="py-2.5 px-2 border-r border-slate-200"></td>
              <td className="py-2.5 px-2 border-r border-slate-200 text-center text-amber-700 font-bold tabular-nums">
                {formatMinutesDisplay(totals.totalAfternoonLateMinutes, displayMode)}
              </td>
              <td className="py-2.5 px-2 border-r border-slate-200"></td>
              <td className="py-2.5 px-2 border-r border-slate-200 text-center text-orange-700 font-bold tabular-nums">
                {formatMinutesDisplay(totals.totalAfternoonUndertimeMinutes, displayMode)}
              </td>
              <td className="py-2.5 px-2 border-r border-slate-200 text-center text-amber-800 font-black tabular-nums">
                {formatMinutesDisplay(totals.totalLateMinutes, displayMode)}
              </td>
              <td className="py-2.5 px-2 border-r border-slate-200 text-center text-orange-800 font-black tabular-nums">
                {formatMinutesDisplay(totals.totalUndertimeMinutes, displayMode)}
              </td>
              <td className="py-2.5 px-2 border-r border-slate-200 text-center text-rose-800 font-black tabular-nums">
                {formatMinutesDisplay(totals.grandTotalLateUndertimeMinutes, displayMode)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
