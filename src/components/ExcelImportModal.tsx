import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, X, ArrowRight, Users, User, Clock } from 'lucide-react';
import { parseExcelFile, convertParsedResultToPersonnelList, ParsedTimeCardResult } from '../utils/excelParser';
import { OfficialSchedule, PersonnelData } from '../types/csc';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (personnelList: PersonnelData[], detectedMonth?: number, detectedYear?: number) => void;
  schedule: OfficialSchedule;
  month: number;
  year: number;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  schedule,
  month,
  year
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedTimeCardResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewEmpIndex, setPreviewEmpIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    setPreviewEmpIndex(0);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelFile(buffer, file.name);
      setParseResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse spreadsheet file. Please check file format.');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleApplyAll = () => {
    if (!parseResult) return;
    const targetYear = parseResult.detectedYear || year;
    const targetMonth = parseResult.detectedMonth || month;
    const personnelList = convertParsedResultToPersonnelList(parseResult, targetYear, targetMonth, schedule);
    onImportSuccess(personnelList, targetMonth, targetYear);
    onClose();
  };

  // Preview sample logs from the selected employee
  const activeEmp = parseResult?.detectedEmployees[previewEmpIndex] || parseResult?.detectedEmployees[0];
  const sampleLogs = activeEmp ? (parseResult?.extractedRecordsByEmployee[activeEmp.name] || []).slice(0, 5) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Import Electronic Time Card</h3>
              <p className="text-xs text-slate-500">
                Excel (.xlsx, .xls) & CSV · Maps: In = AM Arrival, Break = AM Departure, Resume = PM Arrival, Out = PM Departure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Upload Dropzone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFiles(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-1">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-slate-800">
                Click to upload or drag & drop electronic time card file
              </div>
              <div className="text-xs text-slate-500">
                Supports single-sheet stacked employee tables, multi-sheet workbooks, and flat tables
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Import Error: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isProcessing && (
            <div className="py-4 text-center text-xs text-slate-500">
              Reading file and scanning all sheets for employee records and time punches...
            </div>
          )}

          {/* Parsed Result Preview */}
          {parseResult && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">{parseResult.fileName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-blue-700">{parseResult.detectedEmployees.length} personnel found</span>
                  <span className="text-slate-400">·</span>
                  <span>{parseResult.rawRowsCount} rows scanned</span>
                </div>
              </div>

              {/* Personnel List Detected */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Detected Personnel (Name: = Employee):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                  {parseResult.detectedEmployees.map((emp, idx) => {
                    const isSelected = idx === previewEmpIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewEmpIndex(idx)}
                        className={`flex items-center justify-between px-3 py-2 text-xs rounded-md text-left transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-2 border-blue-600 shadow-2xs font-semibold'
                            : 'bg-white border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <User className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-700' : 'text-slate-500'}`} />
                          <span className={`truncate uppercase ${isSelected ? 'text-blue-900 font-bold' : 'text-slate-800'}`}>
                            {idx + 1}. {emp.name}
                          </span>
                        </div>
                        <span className={`text-[10px] tabular-nums ml-2 shrink-0 px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-200/70 text-blue-900 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                          {emp.recordsCount} days
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sample Recorded Punches Preview */}
              {sampleLogs.length > 0 && activeEmp && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Punch Verification for: <strong className="text-slate-900 uppercase">{activeEmp.name}</strong></span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal">Click an employee above to inspect</span>
                  </div>
                  <table className="w-full text-[11px] text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[10px]">
                        <th className="py-1 px-2 border-r border-slate-200">Day</th>
                        <th className="py-1 px-2 border-r border-slate-200">In (AM Arrival)</th>
                        <th className="py-1 px-2 border-r border-slate-200">Break (AM Dep)</th>
                        <th className="py-1 px-2 border-r border-slate-200">Resume (PM Arr)</th>
                        <th className="py-1 px-2">Out (PM Dep)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleLogs.map((log, lIdx) => (
                        <tr key={lIdx} className="border-b border-slate-100 text-slate-800 tabular-nums">
                          <td className="py-1 px-2 border-r border-slate-200 font-medium">Day {log.day}</td>
                          <td className="py-1 px-2 border-r border-slate-200 font-semibold text-blue-700">
                            {log.inTime || ''}
                          </td>
                          <td className="py-1 px-2 border-r border-slate-200">{log.breakTime || ''}</td>
                          <td className="py-1 px-2 border-r border-slate-200">{log.resumeTime || ''}</td>
                          <td className="py-1 px-2">{log.outTime || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleApplyAll}
            disabled={!parseResult}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            <Users className="w-4 h-4" />
            <span>Import All Personnel Data</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
