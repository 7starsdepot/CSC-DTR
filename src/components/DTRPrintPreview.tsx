import React, { useState } from 'react';
import { Printer, ArrowLeft, User, Users, CheckCircle2 } from 'lucide-react';
import { DTRDocument } from '../types/csc';
import { CSCForm48Card } from './CSCForm48Card';

interface DTRPrintPreviewProps {
  document: DTRDocument;
  onExitPreview: () => void;
  onSelectEmployeeIndex: (index: number) => void;
}

export const DTRPrintPreview: React.FC<DTRPrintPreviewProps> = ({
  document,
  onExitPreview,
  onSelectEmployeeIndex
}) => {
  const { month, year, personnelList, selectedEmployeeIndex, signatories, schedule } = document;
  const [printMode, setPrintMode] = useState<'single' | 'all'>('single');

  const currentPersonnel = personnelList[selectedEmployeeIndex] || personnelList[0] || {
    id: 'EMP-01',
    name: 'JUAN D. DELA CRUZ',
    records: []
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 pb-12 print:pb-0 print:bg-white">
      {/* Non-Printable Header & Toolbar */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onExitPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Records</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="text-xs font-bold text-slate-800">
                DPWH Daily Time Record · CSC Form 48
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Print Mode Selector: Single or All Personnel */}
            {personnelList.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPrintMode('single')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    printMode === 'single'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Current Employee
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('all')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    printMode === 'all'
                      ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All ({personnelList.length})</span>
                </button>
              </div>
            )}

            {/* Personnel Selector Dropdown (when single mode) */}
            {personnelList.length > 1 && printMode === 'single' && (
              <div className="flex items-center gap-1.5 text-xs">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedEmployeeIndex}
                  onChange={(e) => onSelectEmployeeIndex(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 uppercase cursor-pointer"
                >
                  {personnelList.map((p, idx) => (
                    <option key={idx} value={idx}>
                      {idx + 1}. {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Print Action Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{printMode === 'all' ? `Print All ${personnelList.length} (1 Page/Employee)` : 'Print to PDF (1 Page)'}</span>
            </button>
          </div>
        </div>

        {/* Status Banner: 1 Page Per Employee & Default A4 */}
        <div className="bg-emerald-50 border-t border-emerald-200 py-1.5 px-4 text-center text-xs text-emerald-900 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          <span>
            <strong>1 Page per Employee Guaranteed:</strong> Calibrated to fit completely on a single <strong>A4</strong> (or Letter) portrait page without spilling over.
          </span>
        </div>
      </div>

      {/* Printable Area */}
      <div className="print-container max-w-4xl mx-auto mt-6 px-4 flex flex-col items-center print:m-0 print:p-0 print:max-w-none print:w-full">
        {printMode === 'single' ? (
          <div className="dtr-page-wrapper w-full flex flex-col items-center">
            <div className="no-print text-center text-xs font-semibold text-slate-600 mb-2">
              Civil Service Form No. 48: <strong className="text-slate-900 uppercase">{currentPersonnel.name}</strong>
            </div>
            <CSCForm48Card
              month={month}
              year={year}
              employeeName={currentPersonnel.name}
              records={currentPersonnel.records}
              signatories={signatories}
              schedule={schedule}
            />
          </div>
        ) : (
          <div className="w-full space-y-8 print:space-y-0 flex flex-col items-center">
            {personnelList.map((person, idx) => (
              <div
                key={idx}
                className="dtr-page-wrapper w-full flex flex-col items-center"
              >
                <div className="no-print text-center text-xs font-semibold text-slate-600 mb-2">
                  Card {idx + 1} of {personnelList.length}: <strong className="text-slate-900 uppercase">{person.name}</strong>
                </div>
                <CSCForm48Card
                  month={month}
                  year={year}
                  employeeName={person.name}
                  records={person.records}
                  signatories={signatories}
                  schedule={schedule}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
