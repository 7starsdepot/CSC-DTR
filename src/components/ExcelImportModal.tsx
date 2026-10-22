import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Download, X, ArrowRight, Users, User } from 'lucide-react';
import { parseExcelFile, generateSampleExcelFile, convertParsedResultToPersonnelList, ParsedTimeCardResult } from '../utils/excelParser';
import { OfficialSchedule, PersonnelData } from '../types/csc';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (personnelList: PersonnelData[]) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
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

  const handleDownloadSample = () => {
    const { blob, fileName } = generateSampleExcelFile(month, year);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplyAll = () => {
    if (!parseResult) return;
    const personnelList = convertParsedResultToPersonnelList(parseResult, year, month, schedule);
    onImportSuccess(personnelList);
    onClose();
  };

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
                Excel (.xlsx, .xls) and CSV logs containing In, Break, Resume, Out, and Remarks
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
          {/* Download Sample Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div className="space-y-0.5">
              <div className="font-medium text-slate-800">Download Official Multi-Personnel Template</div>
              <div className="text-slate-500">
                Pre-populated sample with 3 employees and columns: In, Break, Resume, Out, Remarks
              </div>
            </div>
            <button
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Download Template (.xlsx)
            </button>
          </div>

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
                Whatever is in the Excel file will be directly imported into the Form 48
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
              Reading file and parsing electronic logs for all personnel...
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
                  <span>{parseResult.detectedEmployees.length} personnel found</span>
                  <span className="text-slate-400">·</span>
                  <span>{parseResult.rawRowsCount} rows total</span>
                </div>
              </div>

              {/* Personnel List Detected */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Detected Personnel in Excel File:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                  {parseResult.detectedEmployees.map((emp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{emp.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 tabular-nums ml-2 shrink-0">
                        {emp.recordsCount} logs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
