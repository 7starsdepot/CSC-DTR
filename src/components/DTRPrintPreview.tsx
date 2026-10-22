import React from 'react';
import { Printer, ArrowLeft, User } from 'lucide-react';
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

  const currentPersonnel = personnelList[selectedEmployeeIndex] || personnelList[0] || {
    id: 'EMP-01',
    name: 'JUAN D. DELA CRUZ',
    records: []
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 pb-12">
      {/* Non-Printable Header & Toolbar */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onExitPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Records</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

            <div className="text-xs font-semibold text-slate-800">
              CSC Form 48 · Daily Time Record
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Personnel Selector Dropdown (if multiple loaded) */}
            {personnelList.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600 font-medium">Personnel:</span>
                <select
                  value={selectedEmployeeIndex}
                  onChange={(e) => onSelectEmployeeIndex(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 uppercase"
                >
                  {personnelList.map((p, idx) => (
                    <option key={idx} value={idx}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Print Action Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Print to PDF</span>
            </button>
          </div>
        </div>

        {/* Tip Banner */}
        <div className="bg-slate-50 border-t border-slate-200 py-1.5 px-4 text-center text-xs text-slate-600">
          💡 <span className="font-medium">Printing Tip:</span> In the print dialog, select{' '}
          <strong>"Save as PDF"</strong>, paper size <strong>Letter</strong> (or A4), portrait orientation.
        </div>
      </div>

      {/* Printable Area: Centered CSC Form 48 Card */}
      <div className="print-container max-w-4xl mx-auto mt-6 px-4 flex flex-col items-center">
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
    </div>
  );
};
