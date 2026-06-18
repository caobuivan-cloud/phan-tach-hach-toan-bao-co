/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { RawFile, ETLConfig, ETLResult, ManualEditState, ProcessedRow, EditableProcessedRowField } from './types';
import ConfigPanel from './components/ConfigPanel';
import FileDropzone from './components/FileDropzone';
import DataPreviewTable from './components/DataPreviewTable';
import { runETLPipeline, exportToAccountingExcel, recomputeRowsAfterManualEdits, deriveWarningsCount } from './utils/etl';
import { FileSpreadsheet, CheckCircle2, Calculator, FileWarning, Calendar, Info, HelpCircle, AlertTriangle, ChevronLeft, Settings } from 'lucide-react';
import { loadSheetsConfig, saveSheetsConfig, getPortalUserEmail, writeActionLogToSheet, SheetsConfig } from './utils/googleSheetsSync';

export default function App() {
  const [files, setFiles] = useState<RawFile[]>([]);
  const [config, setConfig] = useState<ETLConfig | null>(null);
  const [etlResult, setEtlResult] = useState<ETLResult | null>(null);
  const [manualEdits, setManualEdits] = useState<Record<number, ManualEditState>>({});
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportedWithWarnings, setExportedWithWarnings] = useState(false);
  const [currentTime, setCurrentTime] = useState('2026-06-15 21:06:34');
  const [showTutorial, setShowTutorial] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig>(loadSheetsConfig());

  // Custom confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Baseline thô từ files và config
  const rawResult = useMemo(() => {
    if (files.length > 0 && config) {
      return runETLPipeline(files, config);
    }
    return null;
  }, [files, config]);

  // Auto-fetch portal user email on mount
  useEffect(() => {
    const fetchPortalEmail = async () => {
      try {
        // 1. Thử lấy từ URL query hoặc hash (email=...)
        const hash = window.location.hash || window.location.search;
        const match = hash.match(/email=([^&]+)/);
        if (match && match[1]) {
          const email = decodeURIComponent(match[1]);
          setSheetsConfig(prev => {
            const updated = { ...prev, userName: email };
            saveSheetsConfig(updated);
            return updated;
          });
          return;
        }

        // 2. Thử lấy từ portal IndexedDB
        const portalEmail = await getPortalUserEmail();
        if (portalEmail) {
          setSheetsConfig(prev => {
            const updated = { ...prev, userName: portalEmail };
            saveSheetsConfig(updated);
            return updated;
          });
        }
      } catch (e) {
        console.error('Failed to get portal user email:', e);
      }
    };
    fetchPortalEmail();
  }, []);

  // Non-blocking fire-and-forget log helper
  const logUserActionOnSheets = (actionName: string, actionDetails: string) => {
    if (sheetsConfig.logsEnabled && sheetsConfig.webAppUrl) {
      writeActionLogToSheet(
        sheetsConfig.webAppUrl,
        sheetsConfig.userName,
        actionName,
        actionDetails
      ).catch(err => {
        console.error('Lỗi ghi log lên Sheets:', err);
      });
    }
  };

  // Cập nhật ETLResult gộp khi rawResult hoặc manualEdits thay đổi
  useEffect(() => {
    if (rawResult && config) {
      const mergedRows = recomputeRowsAfterManualEdits(
        rawResult.processedRows,
        manualEdits,
        files,
        config
      );
      const warningsCount = deriveWarningsCount(mergedRows);
      const manualEditCount = mergedRows.filter(r => r.isManuallyEdited).length;
      
      setEtlResult({
        ...rawResult,
        processedRows: mergedRows,
        warningsCount,
        manualEditCount
      });
    } else {
      setEtlResult(null);
    }
  }, [rawResult, manualEdits, files, config]);

  const handleFilesParsed = (newFiles: RawFile[]) => {
    const filteredNew = newFiles.filter(nf => !files.some(pf => pf.name === nf.name));
    if (filteredNew.length === 0) return;

    const proceedWithFiles = () => {
      setFiles((prev) => [...prev, ...filteredNew]);
      filteredNew.forEach(f => {
        let groupName = "Không xác định";
        if (f.groupType === "group1") groupName = "Tiền về (Nhóm 1)";
        else if (f.groupType === "group2") groupName = "Báo có ngân hàng (Nhóm 2)";
        else if (f.groupType === "group3") groupName = "Mã bảng kê (Nhóm 3)";
        else if (f.groupType === "group4") groupName = "Danh mục hợp đồng (Nhóm 4)";
        
        logUserActionOnSheets(
          "Tải file đối soát",
          `Tải thành công file đối soát "${f.name}" thuộc nhóm: ${groupName} (${f.rows.length} dòng)`
        );
      });
    };

    if (Object.keys(manualEdits).length > 0) {
      showConfirm(
        "Thay đổi cấu hình tệp tin",
        "Cấu hình tệp tin thay đổi sẽ làm mất toàn bộ các chỉnh sửa tay hiện có. Bạn có chắc chắn muốn tiếp tục?",
        () => {
          setManualEdits({});
          proceedWithFiles();
        }
      );
    } else {
      proceedWithFiles();
    }
  };

  const handleClearFiles = () => {
    const proceedWithClear = () => {
      setFiles([]);
      setEtlResult(null);
      logUserActionOnSheets("Xóa danh sách file", "Đã xóa toàn bộ danh sách file đối soát hiện tại");
    };

    if (Object.keys(manualEdits).length > 0) {
      showConfirm(
        "Xóa toàn bộ tệp tin",
        "Xóa toàn bộ danh sách tệp tin sẽ làm mất các chỉnh sửa tay hiện có. Bạn có chắc chắn muốn tiếp tục?",
        () => {
          setManualEdits({});
          proceedWithClear();
        }
      );
    } else {
      proceedWithClear();
    }
  };

  const handleRemoveFile = (index: number) => {
    const proceedWithRemove = () => {
      const removedFile = files[index];
      if (removedFile) {
        logUserActionOnSheets("Xóa file đối soát", `Đã xóa file "${removedFile.name}" khỏi danh sách`);
      }
      setFiles((prev) => prev.filter((_, idx) => idx !== index));
    };

    if (Object.keys(manualEdits).length > 0) {
      showConfirm(
        "Xóa tệp tin khỏi danh sách",
        "Thay đổi danh sách tệp tin sẽ làm mất toàn bộ các chỉnh sửa tay hiện có. Bạn có chắc chắn muốn tiếp tục?",
        () => {
          setManualEdits({});
          proceedWithRemove();
        }
      );
    } else {
      proceedWithRemove();
    }
  };

  const handleExport = () => {
    if (!etlResult || etlResult.processedRows.length === 0 || !config) return;
    
    // Check if there are active warnings in the exported rows
    const warningsCount = etlResult.warningsCount;
    const hasWarnings = (warningsCount.noClientCode + warningsCount.notAcknowledged + warningsCount.amountMismatch) > 0;

    const proceedWithExport = () => {
      try {
        // Call SheetJS exporter helper
        exportToAccountingExcel(etlResult.processedRows, config);
        
        // Show success banner
        setExportedWithWarnings(hasWarnings);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 5000);
        
        logUserActionOnSheets(
          "Xuất file kế toán",
          `Xuất thành công File kế toán dạng Excel chứa ${etlResult.processedRows.length} dòng chứng từ đã đối chiếu`
        );
      } catch (err: any) {
        console.error("Lỗi xuất file Excel:", err);
        showConfirm(
          "Lỗi kết xuất Excel",
          err.message || "Xuất file Excel thất bại!",
          () => {}
        );
      }
    };

    if (hasWarnings) {
      showConfirm(
        "Dữ liệu xuất còn lỗi nghiệp vụ",
        "Dữ liệu kết xuất hiện vẫn còn tồn tại lỗi nghiệp vụ chưa được xử lý. Bạn có chắc chắn muốn xuất tệp Excel kế toán kèm theo cột Cảnh báo lỗi?",
        proceedWithExport
      );
    } else {
      proceedWithExport();
    }
  };

  const handleUpdateRow = (originalIndex: number, originalRow: ProcessedRow, updatedRow: ProcessedRow) => {
    if (!rawResult) return;

    const rawRow = rawResult.processedRows[originalIndex];
    if (!rawRow) return;

    setManualEdits(prev => {
      const currentEdit = prev[originalIndex] || { values: {}, editedFields: [] };
      const newValues = { ...currentEdit.values };
      const newEditedFields = [...currentEdit.editedFields];

      const EDITABLE_FIELDS: EditableProcessedRowField[] = [
        'maKhach', 'soChungTuFinal', 'ngayTienVe', 'maGiaoDichFinal',
        'tienVe', 'linkTien', 'maNganHang', 'soTienGhiCo',
        'bangKeMapped', 'dienGiai', 'maHopDong'
      ];

      EDITABLE_FIELDS.forEach(field => {
        const updatedVal = updatedRow[field];
        const originalVal = originalRow[field];
        const rawVal = rawRow[field];

        // 1. So sánh updatedRow với originalRow để phát hiện thay đổi mới trong lần edit này
        if (updatedVal !== originalVal) {
          if (!newEditedFields.includes(field)) {
            newEditedFields.push(field);
          }
          (newValues as any)[field] = updatedVal;
        }

        // 2. So sánh với baseline thô. Nếu giá trị mới sau khi cập nhật bằng giá trị thô, revert nó
        if (updatedVal === rawVal) {
          const index = newEditedFields.indexOf(field);
          if (index > -1) {
            newEditedFields.splice(index, 1);
          }
          delete (newValues as any)[field];
        }
      });

      const nextEdits = { ...prev };
      if (newEditedFields.length > 0) {
        nextEdits[originalIndex] = {
          values: newValues,
          editedFields: newEditedFields
        };
      } else {
        delete nextEdits[originalIndex];
      }
      return nextEdits;
    });

    // Compute diff changes and log
    const changes: string[] = [];
    const EDITABLE_FIELDS: EditableProcessedRowField[] = [
      'maKhach', 'soChungTuFinal', 'ngayTienVe', 'maGiaoDichFinal',
      'tienVe', 'linkTien', 'maNganHang', 'soTienGhiCo',
      'bangKeMapped', 'dienGiai', 'maHopDong'
    ];
    EDITABLE_FIELDS.forEach(field => {
      if (originalRow[field] !== updatedRow[field]) {
        changes.push(`${field}: "${originalRow[field]}" -> "${updatedRow[field]}"`);
      }
    });
    
    const desc = changes.length > 0 ? `Cập nhật các trường: ${changes.join(', ')}` : 'Không có thay đổi dữ liệu';
    logUserActionOnSheets(
      "Sửa dòng chứng từ",
      `Sửa dòng chứng từ số ${originalRow.soChungTuFinal} - ${desc}`
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden selection:bg-blue-500 selection:text-white relative">
      
      {/* Left Sidebar: Persistent Navigation and Business configurations with toggle support */}
      <aside className={`relative h-full transition-all duration-300 ease-in-out bg-white text-slate-800 flex flex-col shrink-0 border-r border-slate-200 overflow-visible z-40 ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
        {/* Sidebar Interior - Fixed width container wraps inside to prevent children squeezing when width reduces */}
        <div className={`w-80 h-full flex flex-col overflow-hidden transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <ConfigPanel 
            onConfigChange={(conf) => setConfig(conf)} 
            sheetsConfig={sheetsConfig}
            onSheetsConfigChange={(sConf) => {
              setSheetsConfig(sConf);
              saveSheetsConfig(sConf);
            }}
            showConfirm={showConfirm}
          />
        </div>
      </aside>

      {/* Right Pane: Interactive Main application Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden h-full bg-[#F8FAFC]">
        
        {/* Top Header Row */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-30">
          <div className="flex items-center space-x-3">
            {/* Compact elegant light toggle button with arrow in the header */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center justify-center w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-600 rounded-lg transition-all cursor-pointer shadow-3xs"
              title={isSidebarOpen ? "Thu gọn bảng cấu hình" : "Mở rộng bảng cấu hình"}
              id="header-sidebar-toggle"
            >
              <ChevronLeft 
                className="w-5 h-5 text-slate-500 transition-transform duration-300 ease-in-out" 
                style={{ transform: `rotate(${isSidebarOpen ? 0 : 180}deg)` }}
              />
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            
            <span className="text-sm font-bold text-slate-700 tracking-tight">Tổng hợp xử lý thông tin báo có</span>
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex space-x-2">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                Nhóm 1: {files.filter(f => f.groupType === 'group1').length} file
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                Nhóm 2: {files.filter(f => f.groupType === 'group2').length} file
              </span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                Bảng kê: {files.filter(f => f.groupType === 'group3').length} file
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            {/* UTC clock state */}
            <span className="hidden lg:inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-mono text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {currentTime}
            </span>

            {/* Quick Tutorial Toggle button */}
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className="flex items-center gap-1.5 hover:text-blue-600 font-medium text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Mẫu dữ liệu</span>
            </button>

            {etlResult && config && (
              <button 
                onClick={handleExport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>XUẤT FILE KẾ TOÁN</span>
              </button>
            )}
          </div>
        </header>

        {/* Outer scroll container for layout items */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Global Export Success notification */}
          {exportSuccess && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4.5 text-emerald-800 text-sm font-semibold animate-fade-in" id="export-success-message">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <p>Khởi tạo và kết xuất File thành công!</p>
                <p className="font-normal opacity-85 text-xs mt-0.5">
                  {exportedWithWarnings 
                    ? 'File "import_phieu_bao_co.xlsx" đã được kết xuất thành công kèm theo cột Cảnh báo lỗi thứ 22.'
                    : 'File "import_phieu_bao_co.xlsx" đã được kết xuất thành công với cấu trúc 21 cột tiêu chuẩn.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Drag & Drop Upload Module Container */}
          <FileDropzone 
            files={files}
            onFilesParsed={handleFilesParsed}
            onClearFiles={handleClearFiles}
            onRemoveFile={handleRemoveFile}
          />

          {/* Dynamic Spreadsheet Result Grid or Placeholder */}
          {etlResult && config ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-md font-bold text-slate-800 tracking-tight">Chi tiết đối chiếu dữ liệu kế toán (Nhóm 1 Mapped)</h2>
                  <p className="text-xs text-slate-440 mt-0.5">Dữ liệu được tự động truy vấn ngân hàng, gán bảng kê và rà soát cảnh báo</p>
                </div>
                
                {/* Warnings Summaries Badges */}
                <div className="flex items-center gap-3 text-xs font-semibold">
                  {etlResult.warningsCount.noClientCode > 0 && (
                    <span className="text-red-650 bg-red-50 border border-red-100 px-3 py-1 rounded-full flex items-center gap-1.5" id="warn-total-client">
                      <FileWarning className="w-3.5 h-3.5 text-red-500" />
                      Có {etlResult.warningsCount.noClientCode} mã khách trống
                    </span>
                  )}
                  {etlResult.warningsCount.amountMismatch > 0 && (
                    <span className="text-rose-650 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full flex items-center gap-1.5" id="warn-total-mismatch">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      Có {etlResult.warningsCount.amountMismatch} dòng lệch tiền
                    </span>
                  )}
                </div>
              </div>

              <DataPreviewTable 
                etlResult={etlResult} 
                config={config} 
                onUpdateRow={handleUpdateRow}
              />
            </div>
          ) : null}

          {/* Empty state initialization panel - Only shown after user has uploaded at least one file but the ETL pipeline doesn't have enough data to match */}
          {files.length > 0 && !etlResult && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm animate-fade-in" id="empty-state-panel">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-3 animate-pulse" />
              <h3 className="font-bold text-slate-750 text-sm">Đang Chờ File Để Hoàn Tất Đối Chiếu</h3>
              <p className="text-xs text-slate-440 mt-1.5 max-w-md mx-auto leading-relaxed">
                Hệ thống đã nhận các tệp của bạn. Vui lòng tải lên thêm tệp tin <strong className="text-slate-700">Nhóm 1 (Báo cáo tiền về)</strong> để thực hiện đối chiếu tự động.
              </p>
              <p className="text-[10px] text-slate-400 mt-2.5 max-w-sm mx-auto font-normal leading-normal">
                Hệ thống hỗ trợ rà soát chênh lệch tiền từ tệp Nhóm 2, Mã bảng kê Nhóm 3 và Mã khách hàng từ Danh mục hợp đồng Nhóm 4 ngay lập tức.
              </p>
            </div>
          )}

          {/* Collapsible Instruction guide panel placed at the bottom */}
          {showTutorial && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden animate-fade-in" id="tutorial-card">
              <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50/20 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="flex items-start gap-3.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5">
                  <Info className="w-5 h-5" />
                </div>
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm">Hướng dẫn các nhóm file Excel tương thích</h3>
                    <button 
                      onClick={() => setShowTutorial(false)}
                      className="text-[11px] text-gray-400 hover:text-gray-600 font-semibold transition-colors cursor-pointer"
                    >
                      Đóng hướng dẫn
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 mb-4 leading-relaxed font-normal">
                    Hệ thống ETL tự động bóc tách 15 dòng đầu tiên để phân tích header. Để đối soát thành công, vui lòng cung cấp các file có cột khóa như sau:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                      <div className="font-bold text-blue-600 uppercase tracking-wider mb-1.5">1. Tiền về (Nhóm 1)</div>
                      <ul className="space-y-1 text-slate-500 font-medium">
                        <li>• <strong className="text-slate-700">Số hợp đồng</strong> (Cột A)</li>
                        <li>• <strong className="text-slate-700">Tiền về</strong> (Cột F)</li>
                        <li>• <strong className="text-slate-700">Link Tiền</strong> (Cột H)</li>
                        <li>• <strong className="text-slate-700">Bảng kê</strong> (Cột J)</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                      <div className="font-bold text-indigo-600 uppercase tracking-wider mb-1.5">2. Báo có ngân hàng (Nhóm 2)</div>
                      <ul className="space-y-1 text-slate-500 font-medium">
                        <li>• <strong className="text-slate-700">Ngân hàng</strong> (Cột A)</li>
                        <li>• <strong className="text-slate-700">Số tiền ghi có</strong> (Cột D)</li>
                        <li>• <strong className="text-slate-700">Mô tả</strong> (Cột F)</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                      <div className="font-bold text-purple-600 uppercase tracking-wider mb-1.5">3. Mã bảng kê (Nhóm 3)</div>
                      <ul className="space-y-1 text-slate-500 font-medium">
                        <li>• <strong className="text-slate-700">Số ct</strong> (Cột C)</li>
                        <li>• <strong className="text-slate-700">Mã tự do 1</strong> (Cột O)</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                      <div className="font-bold text-amber-600 uppercase tracking-wider mb-1.5">4. Danh mục hợp đồng (Nhóm 4)</div>
                      <ul className="space-y-1 text-slate-500 font-medium">
                        <li>• <strong className="text-slate-700">Hợp đồng</strong> (Cột A)</li>
                        <li>• <strong className="text-slate-700">Mã khách</strong> (Cột D)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Elegant Footer Row */}
        <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] text-slate-400 font-medium shrink-0">
          <span>© 2026 Accounting ETL Hub • Professional Polish Theme</span>
          <span>Xử lý an toàn tuyệt đối trên Client-side và bảo mật thông tin doanh nghiệp</span>
        </footer>

      </main>

      {/* React custom confirmation modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in" id="custom-confirm-modal">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl max-w-md w-full overflow-hidden transform scale-[1.01] transition-all p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-full shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-slate-800 font-bold text-sm tracking-tight">{confirmModal.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed whitespace-pre-line">{confirmModal.message}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={confirmModal.onCancel || confirmModal.onConfirm}
                className="px-4 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                {confirmModal.onCancel ? "Hủy bỏ" : "Đóng"}
              </button>
              {confirmModal.onCancel && (
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  Xác nhận
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
