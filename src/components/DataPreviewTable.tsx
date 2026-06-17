import React, { useState } from 'react';
import { ProcessedRow, ETLResult, ETLConfig } from '../types';
import { AlertTriangle, Download, Search, CheckCircle2, ChevronRight, FileSpreadsheet, RefreshCw, XCircle, Edit2, Check, Info } from 'lucide-react';
import { exportToAccountingExcel } from '../utils/etl';

interface DataPreviewTableProps {
  etlResult: ETLResult;
  config: ETLConfig;
  onUpdateRow: (originalIndex: number, originalRow: ProcessedRow, updatedRow: ProcessedRow) => void;
}

export default function DataPreviewTable({ etlResult, config, onUpdateRow }: DataPreviewTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'warnings_only' | 'yellow' | 'red' | 'no_client' | 'manual_edits'>('all');
  const [highlightDuplicates, setHighlightDuplicates] = useState(true);

  // Row Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProcessedRow>>({});

  const handleStartEdit = (row: ProcessedRow) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = (rowId: string, originalIndex: number) => {
    const originalRow = processedRows[originalIndex];
    if (!originalRow) return;

    // Build the updated ProcessedRow object
    const updatedRow: ProcessedRow = {
      ...originalRow,
      ...editForm,
    } as ProcessedRow;

    onUpdateRow(originalIndex, originalRow, updatedRow);
    setEditingId(null);
    setEditForm({});
  };

  const { processedRows, warningsCount } = etlResult;

  // Tạo wrapper rowsWithIndex chứa chỉ mục gốc
  const rowsWithIndex = processedRows.map((row, originalIndex) => ({ row, originalIndex }));

  // Lọc hàng dựa trên tìm kiếm và tab bộ lọc
  const filteredRowsWithIndex = rowsWithIndex.filter(({ row }) => {
    // 1. So khớp tìm kiếm văn bản
    const searchLow = searchTerm.toLowerCase();
    const matchSearch = 
      row.soHopDong.toLowerCase().includes(searchLow) ||
      row.maKhach.toLowerCase().includes(searchLow) ||
      row.linkTien.toLowerCase().includes(searchLow) ||
      row.maNganHang.toLowerCase().includes(searchLow) ||
      row.dienGiai.toLowerCase().includes(searchLow) ||
      row.bangKeMapped.toLowerCase().includes(searchLow) ||
      row.hoaDonChiDinh.toLowerCase().includes(searchLow);

    if (!matchSearch) return false;

    // 2. Bộ lọc Tab
    if (activeTab === 'all') return true;
    if (activeTab === 'manual_edits') return row.isManuallyEdited === true;

    // Các bộ lọc lỗi/cảnh báo chỉ hiển thị các dòng CHƯA sửa tay (isManuallyEdited === false)
    if (row.isManuallyEdited) return false;

    if (activeTab === 'warnings_only') {
      const isNoClient = row.maKhach.includes('Cảnh báo') || !row.maKhach || row.maKhach === '';
      return row.isYellowWarning || row.isRedWarning || isNoClient;
    }
    if (activeTab === 'yellow') return row.isYellowWarning;
    if (activeTab === 'red') return row.isRedWarning;
    if (activeTab === 'no_client') {
      const isNoClient = row.maKhach.includes('Cảnh báo') || !row.maKhach || row.maKhach === '';
      return isNoClient;
    }

    return true;
  });

  const totalAmountTienVe = processedRows.reduce((sum, r) => sum + r.tienVe, 0);
  const totalAmountGhiCo = processedRows.reduce((sum, r) => sum + (r.soTienGhiCo || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="data-preview-table-section">
      {/* Action panel & searching fields */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              id="tab-all"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'all' 
                  ? 'bg-gray-900 text-white shadow-xs' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              Tất cả ({processedRows.length})
            </button>
            <button
              id="tab-warnings"
              onClick={() => setActiveTab('warnings_only')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                activeTab === 'warnings_only' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100/70'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Cần chú ý ({warningsCount.noClientCode + warningsCount.notAcknowledged + warningsCount.amountMismatch})
            </button>
            <button
              id="tab-no-client"
              onClick={() => setActiveTab('no_client')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'no_client' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-red-50 text-red-600 hover:bg-red-100/70'
              }`}
            >
              Sai Mã khách ({warningsCount.noClientCode})
            </button>
            <button
              id="tab-yellow"
              onClick={() => setActiveTab('yellow')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'yellow' 
                  ? 'bg-yellow-500 text-gray-900' 
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100/70'
              }`}
            >
              Chưa ghi nhận ({warningsCount.notAcknowledged})
            </button>
            <button
              id="tab-red"
              onClick={() => setActiveTab('red')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'red' 
                  ? 'bg-red-700 text-white' 
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100/70'
              }`}
            >
              Lệch tiền ({warningsCount.amountMismatch})
            </button>
            <button
              id="tab-manual-edits"
              onClick={() => setActiveTab('manual_edits')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                activeTab === 'manual_edits' 
                  ? 'bg-sky-600 text-white shadow-xs' 
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100/70'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              Sửa tay ({etlResult.manualEditCount || 0})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-preview-rows"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm hợp đồng, tiền, ngân hàng..."
                className="pl-9.5 pr-4.5 py-2 border border-gray-200 rounded-xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Legend explanations */}
        <div className="flex flex-col gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold">Chú thích các màu hàng trên giao diện:</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-sky-50 border border-sky-400 rounded-md shrink-0 block"></span>
              <span className="text-gray-600">Người dùng sửa tay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-yellow-100 border border-yellow-200 rounded-md shrink-0 block"></span>
              <span className="text-gray-600">Chưa ghi nhận (Trong báo có ngân hàng)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-red-100 border border-red-200 rounded-md shrink-0 block"></span>
              <span className="text-gray-600">Trùng Link tiền + Lệch tiền với ghi có</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-dashed border-red-500 rounded-md shrink-0 block"></span>
              <span className="text-red-600 font-semibold">Cảnh báo không tìm thấy Mã khách</span>
            </div>
          </div>
        </div>

        {/* HTML preview table wrapper */}
        <div className="overflow-x-auto border border-gray-100 rounded-xl max-h-[500px]">
          <table className="w-full text-left border-collapse" id="excel-data-grid">
            <thead>
              <tr className="bg-gray-100/80 text-gray-600 text-xxs font-bold uppercase tracking-wider sticky top-0 bg-opacity-100 backdrop-blur-xs z-10 border-b border-gray-100 select-none">
                <th className="py-3 px-3.5 text-center w-10">Stt</th>
                <th className="py-3 px-3.5 text-center w-20">Sửa</th>
                <th className="py-3 px-3.5 min-w-[70px]">Số ct</th>
                <th className="py-3 px-3.5 min-w-[80px]">Ngày ct</th>
                <th className="py-3 px-3.5 min-w-[130px]">Mã khách</th>
                <th className="py-3 px-3.5 min-w-[110px]">Tài khoản nợ</th>
                <th className="py-3 px-3.5 min-w-[60px] text-center">M.giao dịch</th>
                <th className="py-3 px-3.5 min-w-[110px] text-right">Tiền nt</th>
                <th className="py-3 px-3.5 min-w-[110px] text-right">Tiền VNĐ</th>
                <th className="py-3 px-3.5 min-w-[150px]">Lý do nộp (Link tiền)</th>
                <th className="py-3 px-3.5 min-w-[120px]">Mã ngân hàng</th>
                <th className="py-3 px-3.5 min-w-[120px] text-right">Ghi có (N2)</th>
                <th className="py-3 px-3.5 min-w-[160px]">Bảng kê (N3 / Map)</th>
                <th className="py-3 px-3.5 min-w-[180px]">Diễn giải</th>
                <th className="py-3 px-3.5 min-w-[125px]">Hợp đồng (Ô 18)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium">
              {filteredRowsWithIndex.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-gray-400 font-medium">
                    <XCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    Không tìm thấy dòng chứng từ nào thỏa mãn bộ lọc hiện tại
                  </td>
                </tr>
              ) : (
                filteredRowsWithIndex.map(({ row, originalIndex }, i) => {
                  const isEditing = editingId === row.id;

                  // Kiểu hiển thị màu nền cho hàng tùy theo cảnh báo hoặc sửa tay
                  let rowBg = 'hover:bg-gray-50/50 text-gray-700';
                  if (row.isManuallyEdited) {
                    rowBg = 'bg-sky-50 text-sky-900 border-l-4 border-sky-400 hover:bg-sky-100/30';
                  } else if (row.isRedWarning) {
                    rowBg = 'bg-red-50 text-red-900 border-l-4 border-red-500 hover:bg-rose-100/30';
                  } else if (row.isYellowWarning) {
                    rowBg = 'bg-yellow-50 text-amber-900 border-l-4 border-yellow-400 hover:bg-yellow-100/30';
                  }

                  const isNoClient = row.maKhach.includes('Cảnh báo') || !row.maKhach || row.maKhach === '';

                  const rowErrors: string[] = [];
                  if (isNoClient) {
                    rowErrors.push('Cảnh báo không tìm thấy Mã khách');
                  }
                  if (row.isYellowWarning) {
                    rowErrors.push('Chưa ghi nhận (Trong báo có ngân hàng)');
                  }
                  if (row.isRedWarning) {
                    rowErrors.push('Trùng Link tiền + Lệch tiền với ghi có');
                  }
                  const hasErrors = rowErrors.length > 0;

                  return (
                    <tr key={row.id} className={`transition-colors text-[11px] ${isEditing ? 'bg-blue-50/40 text-slate-900 ring-2 ring-blue-100 border-l-4 border-blue-500' : rowBg}`} id={`row-${i}`}>
                      {/* 1. STT */}
                      <td 
                        className={`py-2 px-3.5 text-center select-none font-medium relative group ${row.isManuallyEdited ? 'cursor-help text-sky-500' : hasErrors ? 'cursor-help' : 'text-gray-400'}`}
                        title={row.isManuallyEdited ? "Người dùng sửa tay" : hasErrors ? rowErrors.join('\n') : undefined}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{i + 1}</span>
                          {row.isManuallyEdited ? (
                            <>
                              <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:flex flex-col bg-slate-900 text-white text-[10px] rounded-lg py-2 px-3 z-50 shadow-xl border border-slate-700 pointer-events-none text-left leading-normal font-medium normal-case whitespace-nowrap">
                                Người dùng sửa tay
                              </div>
                            </>
                          ) : hasErrors && (
                            <>
                              <AlertTriangle 
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  row.isRedWarning || isNoClient ? 'text-red-500' : 'text-yellow-500'
                                }`} 
                              />
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:flex flex-col gap-1 bg-slate-900 text-white text-[10px] rounded-lg py-2 px-3 z-50 shadow-xl border border-slate-700 pointer-events-none min-w-[220px] text-left leading-normal font-medium normal-case">
                                <div className="font-bold text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Chi tiết lỗi/cảnh báo:</div>
                                {rowErrors.map((err, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${err.includes('Mã khách') || err.includes('Lệch tiền') ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 2. ACTIONS */}
                      <td className="py-2 px-2 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`save-btn-${row.id}`}
                              onClick={() => handleSaveEdit(row.id, originalIndex)}
                              className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-md transition-all cursor-pointer"
                              title="Lưu dòng"
                            >
                              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                            </button>
                            <button
                              id={`cancel-btn-${row.id}`}
                              onClick={handleCancelEdit}
                              className="p-1 text-red-550 hover:bg-red-100 rounded-md transition-all cursor-pointer"
                              title="Hủy"
                            >
                              <XCircle className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`edit-btn-${row.id}`}
                            onClick={() => handleStartEdit(row)}
                            className="text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 font-bold px-2 py-1 rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
                          >
                            Sửa
                          </button>
                        )}
                      </td>

                      {/* 3. SỐ CT */}
                      <td className="py-2 px-3.5 font-mono font-semibold text-gray-800">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.soChungTuFinal || ''}
                            onChange={(e) => setEditForm({ ...editForm, soChungTuFinal: e.target.value })}
                            className="bg-white border border-gray-300 rounded px-2 py-1 font-mono text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold"
                          />
                        ) : (
                          row.soChungTuFinal
                        )}
                      </td>

                      {/* 4. NGÀY CT */}
                      <td className="py-2 px-3.5 text-gray-500">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.ngayTienVe || ''}
                            onChange={(e) => setEditForm({ ...editForm, ngayTienVe: e.target.value })}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                          />
                        ) : (
                          row.ngayTienVe
                        )}
                      </td>
                      
                      {/* 5. MÃ KHÁCH */}
                      <td className="py-2 px-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.maKhach || ''}
                            onChange={(e) => setEditForm({ ...editForm, maKhach: e.target.value })}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold"
                            placeholder="Mã khách"
                          />
                        ) : (
                          isNoClient ? (
                            <div className="inline-flex items-center gap-1 text-red-500 bg-red-100/50 px-2.5 py-1 rounded-lg border border-red-200 font-bold max-w-[140px] truncate" title="Không tìm thấy hợp đồng trùng khớp ở Nhóm 4">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              Mã trống
                            </div>
                          ) : (
                            <span className="font-semibold">{row.maKhach}</span>
                          )
                        )}
                      </td>

                      {/* 6. TÀI KHOẢN NỢ */}
                      <td className="py-2 px-3.5 font-mono text-blue-600">
                        {isEditing ? (
                          <span className="bg-blue-50 px-2.5 py-1 rounded-md font-extrabold block text-center max-w-[90px]">
                            {config.bankMappings[(editForm.maNganHang || '').toUpperCase()] || '112130'}
                          </span>
                        ) : (
                          row.maNganHang ? (
                            <span className="bg-blue-50 px-2 py-0.5 rounded-md font-bold">
                              {config.bankMappings[row.maNganHang.toUpperCase()] || '112130'}
                            </span>
                          ) : (
                            <span className="text-gray-300">N/A</span>
                          )
                        )}
                      </td>

                      {/* 7. MÃ GIAO DỊCH */}
                      <td className="py-2 px-3.5 text-center">
                        {isEditing ? (
                          <select
                            value={editForm.maGiaoDichFinal || '2'}
                            onChange={(e) => setEditForm({ ...editForm, maGiaoDichFinal: e.target.value })}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold"
                          >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xxs font-bold ${row.maGiaoDichFinal === '3' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {row.maGiaoDichFinal}
                          </span>
                        )}
                      </td>

                      {/* 8. TIỀN NT */}
                      <td className="py-2 px-3.5 text-right font-mono font-bold text-gray-800">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.tienVe !== undefined ? editForm.tienVe : 0}
                            onChange={(e) => setEditForm({ ...editForm, tienVe: parseFloat(e.target.value) || 0 })}
                            className="bg-white border border-gray-300 rounded px-1.5 py-1 text-xs w-24 text-right focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold"
                          />
                        ) : (
                          row.tienVe.toLocaleString('vi-VN')
                        )}
                      </td>

                      {/* 9. TIỀN VNĐ */}
                      <td className="py-2 px-3.5 text-right font-mono font-bold text-emerald-600 w-[100px]">
                        {isEditing ? (
                          ((editForm.tienVe || 0) * config.tyGia).toLocaleString('vi-VN')
                        ) : (
                          (row.tienVe * config.tyGia).toLocaleString('vi-VN')
                        )}
                      </td>

                      {/* 10. LINK TIỀN (LÝ DO NỘP) */}
                      <td className="py-2 px-3.5 truncate max-w-[160px]" title={row.linkTien}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.linkTien || ''}
                            onChange={(e) => setEditForm({ ...editForm, linkTien: e.target.value })}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                          />
                        ) : (
                          <span className="text-gray-600 font-normal">{row.linkTien}</span>
                        )}
                      </td>

                      {/* 11. MÃ NGÂN HÀNG */}
                      <td className="py-2 px-3.5 font-semibold text-gray-600 uppercase">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.maNganHang || ''}
                            onChange={(e) => setEditForm({ ...editForm, maNganHang: e.target.value.toUpperCase() })}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs w-[80px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 uppercase font-bold"
                            placeholder="VCB..."
                          />
                        ) : (
                          row.maNganHang ? row.maNganHang : <span className="text-gray-300 uppercase">Không thấy</span>
                        )}
                      </td>

                      {/* 12. GHI CÓ N2 */}
                      <td className="py-2 px-3.5 text-right font-mono text-gray-500">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.soTienGhiCo === null || editForm.soTienGhiCo === undefined ? '' : editForm.soTienGhiCo}
                            onChange={(e) => setEditForm({ ...editForm, soTienGhiCo: e.target.value === '' ? null : parseFloat(e.target.value) })}
                            className="bg-white border border-gray-300 rounded px-1.5 py-1 text-xs w-24 text-right focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                            placeholder="N/A"
                          />
                        ) : (
                          row.soTienGhiCo !== null ? (
                            row.soTienGhiCo.toLocaleString('vi-VN')
                          ) : (
                            <span className="text-gray-300 font-normal">N/A</span>
                          )
                        )}
                      </td>

                      {/* 13. BẢNG KÊ */}
                      <td className="py-2 px-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.bangKeMapped || ''}
                            onChange={(e) => setEditForm({ ...editForm, bangKeMapped: e.target.value })}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold"
                            placeholder="Mã bảng kê"
                          />
                        ) : (
                          row.bangKeMapped ? (
                            <div className="flex items-center gap-1">
                              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100 font-bold max-w-[150px] truncate" title={row.bangKeOrig}>
                                {row.bangKeMapped}
                              </span>
                              {row.bangKeOrig !== row.bangKeMapped && (
                                <span className="text-[9px] text-purple-400 select-none shrink-0 italic">(Đã gán đè)</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 font-normal">Để trống</span>
                          )
                        )}
                      </td>

                      {/* 14. DIỄN GIẢI */}
                      <td className="py-2 px-3.5 truncate max-w-[180px] font-normal text-gray-500" title={row.dienGiai}>
                        {isEditing ? (
                          <textarea
                            value={editForm.dienGiai || ''}
                            onChange={(e) => setEditForm({ ...editForm, dienGiai: e.target.value })}
                            rows={1}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 min-h-[30px]"
                          />
                        ) : (
                          row.dienGiai
                        )}
                      </td>

                      {/* 15. HỢP ĐỒNG (Ô 18) */}
                      <td className="py-2 px-3.5 font-mono text-gray-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.maHopDong || ''}
                            onChange={(e) => setEditForm({ ...editForm, maHopDong: e.target.value })}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold"
                            placeholder="Mã HĐ"
                          />
                        ) : (
                          row.bangKeMapped ? (
                            <span className="text-gray-300 italic font-normal select-none">Để trống do bảng kê</span>
                          ) : (
                            <span className="font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-md">{row.maHopDong}</span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-3">
          <div className="text-xs text-gray-400 font-medium">
            Đang hiển thị <strong className="text-gray-700">{filteredRowsWithIndex.length}</strong> trong tổng số <strong className="text-gray-700">{processedRows.length}</strong> dòng báo có.
          </div>
          <p className="text-[11px] text-gray-400 max-w-md hidden sm:block text-right leading-relaxed font-normal">
            * Cột Hợp đồng được tự động để trống cho các dòng chứa dữ liệu bảng kê theo nghiệp vụ kế toán quy định.
          </p>
        </div>
      </div>
    </div>
  );
}
