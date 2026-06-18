import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { RawFile, FileGroup } from '../types';
import { detectFileGroup } from '../utils/etl';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';

interface FileDropzoneProps {
  onFilesParsed: (files: RawFile[]) => void;
  onClearFiles: () => void;
  onRemoveFile: (index: number) => void;
  files: RawFile[];
}

export default function FileDropzone({ onFilesParsed, onClearFiles, onRemoveFile, files }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [parsingFiles, setParsingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorText(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      parseMultipleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorText(null);
    if (e.target.files && e.target.files.length > 0) {
      parseMultipleFiles(e.target.files);
      // Reset input value to allow selecting same file again after deleting
      e.target.value = '';
    }
  };

  const parseMultipleFiles = async (fileList: FileList) => {
    const filesArray = Array.from(fileList);
    setParsingFiles(true);
    const parsedFiles: RawFile[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const name = file.name;
      const size = file.size;
      
      // Make sure it is an excel spreadsheet or log warning
      if (!name.match(/\.(xlsx|xls|csv|xlsm)$/i)) {
        continue;
      }

      try {
        const rawBytes = await readFileAsArrayBuffer(file);
        const data = new Uint8Array(rawBytes);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        if (workbook.SheetNames.length === 0) {
          continue;
        }

        // 1. Đọc và chạy detectFileGroup trên sheet đầu tiên trước
        const firstSheetName = workbook.SheetNames[0];
        const firstWorksheet = workbook.Sheets[firstSheetName];
        const firstSheetData: any[][] = XLSX.utils.sheet_to_json(firstWorksheet, { 
          header: 1, 
          defval: '',
          raw: false
        });

        const firstDetection = detectFileGroup(firstSheetData);
        
        // 2. Kiểm tra nếu sheet đầu tiên thuộc Nhóm 1, Nhóm 2 hoặc Nhóm 3
        const isFirstSheetGroup123 = 
          firstDetection.groupType === 'group1' || 
          firstDetection.groupType === 'group2' || 
          firstDetection.groupType === 'group3';

        if (isFirstSheetGroup123) {
          // Giữ nguyên hành vi cũ: chỉ nạp duy nhất sheet đầu tiên
          let headers: string[] = [];
          if (firstDetection.headerIndex !== -1 && firstSheetData[firstDetection.headerIndex]) {
            headers = firstSheetData[firstDetection.headerIndex].map(h => String(h || '').trim());
          }

          parsedFiles.push({
            name,
            size,
            groupType: firstDetection.groupType,
            headerIndex: firstDetection.headerIndex,
            headers,
            rows: firstSheetData
          });
        } else {
          // Sheet đầu không thuộc Nhóm 1/2/3: Quét các sheet còn lại của workbook
          const tempSheets: { sheetName: string; sheetData: any[][]; groupType: FileGroup; headerIndex: number }[] = [];
          
          // Thêm thông tin sheet đầu tiên đã được parse sẵn
          tempSheets.push({
            sheetName: firstSheetName,
            sheetData: firstSheetData,
            groupType: firstDetection.groupType,
            headerIndex: firstDetection.headerIndex
          });

          // Quét và parse các sheet tiếp theo
          for (let s = 1; s < workbook.SheetNames.length; s++) {
            const sheetName = workbook.SheetNames[s];
            const worksheet = workbook.Sheets[sheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1, 
              defval: '',
              raw: false
            });
            const detection = detectFileGroup(sheetData);
            tempSheets.push({
              sheetName,
              sheetData,
              groupType: detection.groupType,
              headerIndex: detection.headerIndex
            });
          }

          // Kiểm tra xem workbook có chứa ít nhất 1 sheet Nhóm 4 hay không
          const hasGroup4Sheet = tempSheets.some(ts => ts.groupType === 'group4');

          if (hasGroup4Sheet) {
            // Bóc tách tất cả các sheet Nhóm 4 (bỏ qua sheet trống/rác/unknown)
            const group4Sheets = tempSheets.filter(ts => ts.groupType === 'group4');
            group4Sheets.forEach(gs => {
              let headers: string[] = [];
              if (gs.headerIndex !== -1 && gs.sheetData[gs.headerIndex]) {
                headers = gs.sheetData[gs.headerIndex].map(h => String(h || '').trim());
              }

              parsedFiles.push({
                name: `${name} - ${gs.sheetName}`,
                size,
                groupType: 'group4',
                headerIndex: gs.headerIndex,
                headers,
                rows: gs.sheetData
              });
            });
          } else {
            // Fallback: Nếu không có sheet Nhóm 4, chỉ nạp duy nhất sheet đầu tiên dưới dạng file unknown
            let headers: string[] = [];
            if (firstDetection.headerIndex !== -1 && firstSheetData[firstDetection.headerIndex]) {
              headers = firstSheetData[firstDetection.headerIndex].map(h => String(h || '').trim());
            }

            parsedFiles.push({
              name,
              size,
              groupType: firstDetection.groupType,
              headerIndex: firstDetection.headerIndex,
              headers,
              rows: firstSheetData
            });
          }
        }
      } catch (err: any) {
        console.error(`Error parsing file ${name}:`, err);
        setErrorText(`Lỗi khi đọc file "${name}". Xin vui lòng kiểm tra xem file có hợp lệ hay không.`);
      }
    }

    if (parsedFiles.length > 0) {
      onFilesParsed(parsedFiles);
    } else {
      setErrorText('Không tìm thấy bất kỳ tệp tin Excel nào hợp lệ. Vui lòng kéo thả file dạng .xlsx hoặc .xls!');
    }
    setParsingFiles(false);
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file buffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Divide current uploaded files based on their resolved group category
  const group1Count = files.filter(f => f.groupType === 'group1').length;
  const group2Count = files.filter(f => f.groupType === 'group2').length;
  const group3Count = files.filter(f => f.groupType === 'group3').length;
  const group4Count = files.filter(f => f.groupType === 'group4').length;
  const unknownCount = files.filter(f => f.groupType === 'unknown').length;

  return (
    <div className="w-full mb-6">
      {errorText && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl p-4 mb-4 text-xs" id="error-file-alert">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-semibold">{errorText}</p>
        </div>
      )}

      <div className={`w-full ${files.length > 0 ? 'grid grid-cols-1 lg:grid-cols-2 lg:items-stretch gap-4.5' : 'block'}`}>
        
        {/* Dropzone Container */}
        <div className="flex flex-col h-full">
          <div
            id="dropzone-container"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center select-none h-full ${
              files.length > 0 ? 'p-5 flex-1' : 'p-8'
            } ${
              isDragging 
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' 
                : 'border-gray-200 hover:border-blue-400 bg-white hover:bg-blue-50/10'
            }`}
          >
            <input
              id="file-uploader"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".xlsx, .xls, .xlsm"
              className="hidden"
            />

            <div className={`rounded-full transition-transform duration-300 flex items-center justify-center ${
              files.length > 0 ? 'p-2.5 mb-2.5 bg-blue-50 text-blue-500' : 'p-4 mb-4 bg-gray-50 text-gray-400'
            } ${isDragging ? 'bg-blue-100 text-blue-600 scale-110' : ''}`}>
              <UploadCloud className={files.length > 0 ? 'w-8 h-8' : 'w-10 h-10'} />
            </div>

            <h3 className={`text-gray-800 font-bold leading-tight ${files.length > 0 ? 'text-sm lg:text-base mb-1' : 'text-lg mb-1.5'}`}>
              Kéo và thả tất cả các file Excel tại đây
            </h3>
            <p className="text-gray-400 text-[11px] max-w-sm leading-relaxed mb-3">
              Hỗ trợ tự động phân loại và quét tìm dòng Header cho từng file!
            </p>

            {parsingFiles ? (
              <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                Đang phân tích...
              </div>
            ) : files.length > 0 ? (
              <div className="flex items-center gap-2 text-green-600 text-xxs font-bold bg-[#ECFDF5] px-3.5 py-1 rounded-full border border-[#D1FAE5]" id="success-badge-files">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Đã tải {files.length} file thành công!
              </div>
            ) : (
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Chưa có tệp nào được chọn
              </span>
            )}
          </div>
        </div>

        {/* File Classification Matrix list info */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-col justify-between h-full" id="file-matrix-container">
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-2.5 shrink-0">
                <div>
                  <h3 className="font-bold text-gray-800 text-xs">Danh sách file đã phân loại ({files.length} tệp)</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Phân loại tệp dựa trên cấu trúc cột tự động:</p>
                </div>
                <button
                  id="btn-clear-files"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFiles();
                  }}
                  className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-650 bg-red-50 hover:bg-red-100/60 py-1 px-2 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Xóa tất cả
                </button>
              </div>

              {/* Warning banner of any unmatched files */}
              {unknownCount > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100/50 border border-amber-100 rounded-lg p-2 text-amber-800 text-[9px] transition-colors mb-2.5 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Có {unknownCount} tệp không khớp mẫu và sẽ lược bỏ khỏi bộ lọc.</span>
                </div>
              )}

              {/* Miniature List of files */}
              <div className="overflow-y-auto pr-1 flex-1 max-h-48 lg:max-h-[125px] xl:max-h-[140px] custom-scrollbar">
                <div className="space-y-1">
                  {files.map((f, fileIdx) => {
                    let badgeStyle = 'bg-gray-155 text-gray-600';
                    let label = 'Không rõ';
                    if (f.groupType === 'group1') { label = 'Nhóm 1'; badgeStyle = 'bg-blue-50 text-blue-700 border border-blue-100'; }
                    else if (f.groupType === 'group2') { label = 'Nhóm 2'; badgeStyle = 'bg-indigo-50 text-indigo-700 border border-indigo-100'; }
                    else if (f.groupType === 'group3') { label = 'Nhóm 3'; badgeStyle = 'bg-purple-50 text-purple-700 border border-purple-100'; }
                    else if (f.groupType === 'group4') { label = 'Nhóm 4'; badgeStyle = 'bg-amber-50 text-amber-750 border border-amber-100'; }

                    return (
                      <div key={fileIdx} className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-gray-50 hover:bg-gray-100/50 rounded-xl transition-colors border border-gray-100/60">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="font-bold text-gray-700 truncate text-[11px]" title={f.name}>{f.name}</span>
                          <span className="text-gray-400 text-[9px] shrink-0 font-normal">({(f.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${badgeStyle}`}>{label}</span>
                          {f.headerIndex !== -1 && (
                            <span className="text-[9px] text-gray-400 font-normal">Dòng {f.headerIndex + 1}</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFile(fileIdx);
                            }}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-colors cursor-pointer"
                            title={`Xóa ${f.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
