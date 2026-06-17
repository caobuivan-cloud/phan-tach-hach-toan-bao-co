import * as XLSX from 'xlsx';
import { RawFile, FileGroup, ETLConfig, ProcessedRow, ETLResult, ManualEditState } from '../types';

// Helper to sanitize and normalize text for robust matching
export function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ''); // Remove all whitespaces for perfect matching
}

// Preserve casing but trim extra whitespaces for presentation
export function trimString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

// Format numbers nicely
export function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Format date to DD/MM/YYYY
export function formatDate(val: any): string {
  if (!val) return '';
  
  // Hande SheetJS date numbers (serial number)
  if (typeof val === 'number') {
    try {
      const converted = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(converted.getTime())) {
        return converted.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    } catch (e) {
      // ignore
    }
  }

  const str = String(val).trim();
  
  // Format DD/MM/YYYY HH:MM -> DD/MM/YYYY
  const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
  const match = str.match(dateRegex);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${day}/${month}/${year}`;
  }

  // Handle ISO format
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const year = parsedDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Scan top 15 rows of a spreadsheet to detect the starting header index and category group.
 */
export function detectFileGroup(sheetData: any[][]): { groupType: FileGroup; headerIndex: number } {
  const maxRowsToScan = Math.min(sheetData.length, 15);
  
  for (let r = 0; r < maxRowsToScan; r++) {
    const row = sheetData[r];
    if (!row || row.length === 0) continue;

    // Convert values to lowercase trimmed strings for comparison
    const cell0 = cleanString(row[0]);
    const cell2 = cleanString(row[2]);
    const cell3 = cleanString(row[3]);
    const cell5 = cleanString(row[5]);
    const cell6 = cleanString(row[6]);
    const cell7 = cleanString(row[7]);
    const cell8 = cleanString(row[8]);
    const cell9 = cleanString(row[9]);
    const cell14 = cleanString(row[14]);

    // Group 1 Check: Số hợp đồng (Col A), Tiền về (Col F), Link Tiền (Col H), Hóa đơn chỉ định (Col I), Bảng kê (Col J)
    if (
      cell0.includes('sốhợpđồng') && 
      cell5.includes('tiềnvề') && 
      cell7.includes('linktiền') &&
      cell8.includes('hóađơnchỉđịnh') && 
      cell9.includes('bảngkê')
    ) {
      return { groupType: 'group1', headerIndex: r };
    }

    // Group 2 Check: Ngân hàng (Col A), Số tiền ghi có (Col D), Mô tả (Col F), Trạng thái (Col G)
    if (
      cell0.includes('ngânhàng') && 
      cell3.includes('tiềnghicó') && 
      cell5.includes('môtả') && 
      cell6.includes('trạngthái')
    ) {
      return { groupType: 'group2', headerIndex: r };
    }

    // Group 3 Check: Số ct (Col C), Mã tự do 1 (Col O)
    if (
      cell2.includes('sốct') && 
      cell14.includes('mãtựdo1')
    ) {
      return { groupType: 'group3', headerIndex: r };
    }

    // Group 4 Check: Hợp đồng (Col A), Mã khách (Col D)
    if (
      (cell0 === 'hợpđồng' || cell0 === 'sốhợpđồng') && 
      cell3.includes('mãkhách')
    ) {
      return { groupType: 'group4', headerIndex: r };
    }
  }

  return { groupType: 'unknown', headerIndex: -1 };
}

/**
 * Robust contract code matching:
 * Matches directly, with contract suffix if specified, or checks if Nhóm 4 starts with Nhóm 1 code.
 */
export function isContractMatch(group1Contract: string, group4Contract: string, suffix: string): boolean {
  const c1WithSuf = cleanString(group1Contract + suffix);
  const c4 = cleanString(group4Contract);

  if (!group1Contract || !c4) return false;
  return c1WithSuf === c4 || c4.startsWith(c1WithSuf);
}

/**
 * Increment string transaction number (e.g. 000001 -> 000002) keeping character count
 */
export function generateDocNumber(startNo: string, index: number): string {
  const baseNum = parseInt(startNo, 10);
  if (isNaN(baseNum)) {
    return startNo; // fallback
  }
  const nextNum = baseNum + index;
  const padLength = startNo.length;
  return String(nextNum).padStart(padLength, '0');
}

/**
 * Execute the complete ETL pipeline joining the 4 groups on the provided sheets.
 */
export function runETLPipeline(files: RawFile[], config: ETLConfig): ETLResult {
  // 1. Separate file data per classified groups
  const g1Files = files.filter(f => f.groupType === 'group1');
  const g2Files = files.filter(f => f.groupType === 'group2');
  const g3Files = files.filter(f => f.groupType === 'group3');
  const g4Files = files.filter(f => f.groupType === 'group4');

  // 2. Consolidation: Merge sheets under the same group and strip blanks
  const df1: any[][] = [];
  g1Files.forEach(file => {
    // Only grab rows under header index
    const dataRows = file.rows.slice(file.headerIndex + 1);
    dataRows.forEach(row => {
      // Skip empty row
      const isBlank = row.every(cell => cell === null || cell === undefined || String(cell).trim() === '');
      if (!isBlank && row.length > 0) {
        df1.push(row);
      }
    });
  });

  const df2: any[][] = [];
  g2Files.forEach(file => {
    const dataRows = file.rows.slice(file.headerIndex + 1);
    dataRows.forEach(row => {
      const isBlank = row.every(cell => cell === null || cell === undefined || String(cell).trim() === '');
      if (!isBlank && row.length > 0) {
        df2.push(row);
      }
    });
  });

  const df3: any[][] = [];
  g3Files.forEach(file => {
    const dataRows = file.rows.slice(file.headerIndex + 1);
    dataRows.forEach(row => {
      const isBlank = row.every(cell => cell === null || cell === undefined || String(cell).trim() === '');
      if (!isBlank && row.length > 0) {
        df3.push(row);
      }
    });
  });

  const df4: any[][] = [];
  g4Files.forEach(file => {
    const dataRows = file.rows.slice(file.headerIndex + 1);
    dataRows.forEach(row => {
      const isBlank = row.every(cell => cell === null || cell === undefined || String(cell).trim() === '');
      if (!isBlank && row.length > 0) {
        df4.push(row);
      }
    });
  });

  // 3. Process each row in df1 (Group 1: Báo cáo tiền về)
  const processedRows: ProcessedRow[] = df1.map((row, idx) => {
    // Collect original inputs safe guards
    const soHopDong = trimString(row[0]);
    const tenSale = trimString(row[1]);
    const boPhanOrig = trimString(row[2]);
    const khachHangOrig = trimString(row[3]);
    const giaTriHopDong = parseNumber(row[4]);
    const tienVe = parseNumber(row[5]);
    const ngayTienVe = formatDate(row[6]);
    const linkTien = trimString(row[7]);
    const hoaDonChiDinh = trimString(row[8]);
    const bangKeOrig = trimString(row[9]);

    // PRE-INITIALIZATION
    let maNganHang = '';
    let soTienGhiCo: number | null = null;
    let nhom2TrangThai = '';
    let maKhach = 'Cảnh báo không tìm được mã khách';
    let bangKeMapped = bangKeOrig;

    // Step 2: Reference bank statements (Nhóm 1 + Nhóm 2)
    // Check if clean linkTien is substring of details in group 2
    const cleanLinkTien = cleanString(linkTien);
    if (cleanLinkTien !== '') {
      const match2 = df2.find(r2 => {
        const desc2 = cleanString(r2[5]); // Mô tả (Col F of Nhóm 2)
        return desc2.includes(cleanLinkTien);
      });
      if (match2) {
        maNganHang = trimString(match2[0]); // Ngân hàng (Col A of Nhóm 2)
        soTienGhiCo = parseNumber(match2[3]); // Số tiền ghi có (Col D)
        nhom2TrangThai = trimString(match2[6]); // Trạng thái (Col G)
      }
    }

    // Step 3: Reference client IDs (Nhóm 1 + Nhóm 4)
    if (soHopDong !== '') {
      const match4 = df4.find(r4 => {
        const contract4 = trimString(r4[0]); // Hợp đồng (Cột A)
        return isContractMatch(soHopDong, contract4, config.suffixHopDong);
      });
      if (match4 && trimString(match4[3]) !== '') {
        maKhach = trimString(match4[3]); // Mã khách (Cột D of Nhóm 4)
      }
    }

    // Step 4: Reference statement labels (Nhóm 1 + Nhóm 3)
    if (hoaDonChiDinh !== '') {
      const match3 = df3.find(r3 => {
        const docNo3 = trimString(r3[2]); // Số ct (Cột C of Nhóm 3)
        return cleanString(hoaDonChiDinh) === cleanString(docNo3);
      });
      if (match3 && trimString(match3[14]) !== '') {
        bangKeMapped = trimString(match3[14]); // Mã tự do 1 (Cột O of Nhóm 3, idx 14)
      }
    }

    return {
      id: `${idx}-${Date.now()}`,
      soHopDong,
      tenSale,
      boPhanOrig,
      khachHangOrig,
      giaTriHopDong,
      tienVe,
      ngayTienVe,
      linkTien,
      hoaDonChiDinh,
      bangKeOrig,
      
      maNganHang,
      soTienGhiCo,
      nhom2TrangThai,
      
      maKhach,
      bangKeMapped,
      
      // Defaults to be evaluated
      dienGiai: '',
      maHopDong: '',
      isYellowWarning: false,
      isDuplicateLinkTien: false,
      isRedWarning: false,
      maGiaoDichFinal: config.maGiaoDich,
      soChungTuFinal: '',
      maQuyenFinal: '',
      isManuallyEdited: false,
      editedFields: [],
    };
  });

  // Step 5: Duplicate and calculation evaluations per Link Tiền
  // Group rows of processed Group 1 by their Link Tiền
  const linkGroups: Record<string, ProcessedRow[]> = {};
  processedRows.forEach(row => {
    // Standardize key
    const key = cleanString(row.linkTien);
    if (key !== '') {
      if (!linkGroups[key]) {
        linkGroups[key] = [];
      }
      linkGroups[key].push(row);
    }
  });

  processedRows.forEach(row => {
    const key = cleanString(row.linkTien);
    
    // Evaluate Yellow warning (Báo cáo Ngân hàng has Trạng thái = "Chưa ghi nhận")
    if (row.nhom2TrangThai.toLowerCase() === 'chưa ghi nhận') {
      row.isYellowWarning = true;
    }

    // Evaluate Red & Exception warnings
    if (key !== '' && linkGroups[key] && linkGroups[key].length > 1) {
      row.isDuplicateLinkTien = true;
      
      // Sum the total raw "Tiền về" (Col F) for all matched duplicates
      const sumTienVe = linkGroups[key].reduce((sum, r) => sum + r.tienVe, 0);
      const ghiCoVal = row.soTienGhiCo !== null ? row.soTienGhiCo : 0;

      if (sumTienVe !== ghiCoVal) {
        row.isRedWarning = true;
      } else {
        // Exception: If the sum is exactly equal to the documented ghiCo, transaction code becomes '3'
        row.maGiaoDichFinal = '3';
      }
    }
  });

  // Step 6: Post calculation values & dynamic explanations
  processedRows.forEach((row, i) => {
    // Explanations logic
    if (row.bangKeMapped !== '') {
      row.dienGiai = `${row.bangKeMapped}_${row.linkTien}`;
    } else {
      row.dienGiai = `${row.soHopDong}_${row.linkTien}`;
    }

    // Contract format with suffix
    row.maHopDong = row.soHopDong ? `${row.soHopDong}${config.suffixHopDong}` : '';

    // Auto-increment voucher identifiers
    row.soChungTuFinal = generateDocNumber(config.soChungTuBatDau, i);

    // Book notation (Prefix + Year)
    const currentYear = new Date().getFullYear(); // e.g., 2026
    row.maQuyenFinal = `${config.tienToMaQuyen}${currentYear}`;
  });

  // 4. Summarize warnings count
  const warningsCount = deriveWarningsCount(processedRows);

  return {
    processedRows,
    totalFiles: files.length,
    filesSummary: {
      group1Count: g1Files.length,
      group2Count: g2Files.length,
      group3Count: g3Files.length,
      group4Count: g4Files.length,
      unknownCount: files.filter(f => f.groupType === 'unknown').length,
    },
    warningsCount,
    manualEditCount: 0,
  };
}

/**
 * Convert mapped row data into the specified 21-column Excel output layout.
 */
export function exportToAccountingExcel(rows: ProcessedRow[], config: ETLConfig) {
  // Validate rows (including manually edited ones)
  rows.forEach((row, i) => {
    if (!row.maKhach || row.maKhach.trim() === '' || row.maKhach.includes('Cảnh báo')) {
      throw new Error(`Dòng thứ ${i + 1} có Mã khách không hợp lệ: "${row.maKhach}". Vui lòng sửa lại mã khách trước khi xuất.`);
    }
  });

  // Title row: "Import phiếu báo có" at A1
  const rawData: any[][] = [
    ['Import phiếu báo có'], // Row 1
    [ // Row 2 (Header)
      'ĐVCS',
      'Mã khách',
      'Người nhận tiền',
      'Lý do nộp',
      'Tài khoản', // Header is labeled "Tài khoản", maps to bank accounts
      'Mã giao dịch',
      'Số chứng từ',
      'Ngày chứng từ',
      'Mã ngoại tệ',
      'Tỷ giá',
      'Tk có',
      'Mã khách', // 12. Mã khách ct (labeled Mã khách in Image 5)
      'Tiền nt',
      'Tiền',
      'Diễn giải',
      'Vụ việc',
      'Bộ phận',
      'Hợp đồng',
      'Bảng kê',
      'TD2',
      'Mã quyển'
    ]
  ];

  // Map each processed record from Row 3 onwards
  rows.forEach(row => {
    // Dictionary resolution for "Mã ngân hàng -> Tài khoản nợ" (Col E)
    // Trim banks check
    const bankKey = cleanString(row.maNganHang);
    let mappedAccount = '112130'; // fallback default
    
    // Check if custom user mapping exists
    const userMapKeys = Object.keys(config.bankMappings);
    const matchedKey = userMapKeys.find(k => cleanString(k) === bankKey);
    if (matchedKey) {
      mappedAccount = config.bankMappings[matchedKey];
    } else {
      // default matching guess logic
      if (bankKey.includes('vcb') || bankKey.includes('vietcombank')) mappedAccount = '112130';
      else if (bankKey.includes('bidv')) mappedAccount = '112130';
      else if (bankKey.includes('tcb') || bankKey.includes('techcombank')) mappedAccount = '112150';
      else if (bankKey.includes('acb')) mappedAccount = '112120';
      else if (bankKey.includes('mb') || bankKey.includes('mbbank')) mappedAccount = '112140';
    }

    // Tiền calculation: Tiền nt * Tỷ giá
    const tienCalc = row.tienVe * config.tyGia;

    // 18. Hợp đồng: Lấy từ cột Mã hợp đồng mới tạo ở Nhóm 1. Tuy nhiên, nếu dòng đó CÓ dữ liệu ở cột Bảng kê (Cột J) thì phải ĐỂ TRỐNG ô này.
    const isBangKePresent = row.bangKeMapped && row.bangKeMapped.trim() !== '';
    const hopDongColVal = isBangKePresent ? '' : row.maHopDong;

    rawData.push([
      config.dvcs,               // 1. ĐVCS
      row.maKhach,               // 2. Mã khách
      '',                        // 3. Người nhận tiền (blank)
      row.linkTien,              // 4. Lý do nộp (Link tiền - Col H of Nhóm 1)
      mappedAccount,             // 5. Tài khoản (Tài khoản nợ)
      row.maGiaoDichFinal,       // 6. Mã giao dịch
      row.soChungTuFinal,        // 7. Số chứng từ
      row.ngayTienVe,            // 8. Ngày chứng từ
      config.maNgoaiTe,          // 9. Mã ngoại tệ
      config.tyGia,              // 10. Tỷ giá
      config.tkCo,               // 11. Tk có
      row.maKhach,               // 12. Mã khách (Mã khách ct)
      row.tienVe,                // 13. Tiền nt
      tienCalc,                  // 14. Tiền
      row.dienGiai,              // 15. Diễn giải
      '',                        // 16. Vụ việc (blank)
      config.bophan,             // 17. Bộ phận
      hopDongColVal,             // 18. Hợp đồng
      row.bangKeMapped,          // 19. Bảng kê
      '',                        // 20. TD2 (blank)
      row.maQuyenFinal           // 21. Mã quyển
    ]);
  });

  // Create workspace worksheet
  const ws = XLSX.utils.aoa_to_sheet(rawData);

  // Set column widths so output opens nicely in accounting departments
  const defaultColWidths = [
    { wch: 10 }, // ĐVCS
    { wch: 15 }, // Mã khách
    { wch: 20 }, // Người nhận tiền
    { wch: 35 }, // Lý do nộp
    { wch: 12 }, // Tài khoản
    { wch: 15 }, // Mã giao dịch
    { wch: 15 }, // Số chứng từ
    { wch: 15 }, // Ngày chứng từ
    { wch: 12 }, // Mã ngoại tệ
    { wch: 8 },  // Tỷ giá
    { wch: 12 }, // Tk có
    { wch: 15 }, // Mã khách ct
    { wch: 15 }, // Tiền nt
    { wch: 15 }, // Tiền
    { wch: 45 }, // Diễn giải
    { wch: 10 }, // Vụ việc
    { wch: 15 }, // Bộ phận
    { wch: 18 }, // Hợp đồng
    { wch: 30 }, // Bảng kê
    { wch: 10 }, // TD2
    { wch: 15 }  // Mã quyển
  ];
  ws['!cols'] = defaultColWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Phieu Bao Co');

  // Generate binary buffer download
  XLSX.writeFile(wb, 'import_phieu_bao_co.xlsx');
}

/**
 * Xây dựng hàm helper deriveWarningsCount để đếm các lỗi chưa xử lý (unresolved errors)
 */
export function deriveWarningsCount(rows: ProcessedRow[]): {
  noClientCode: number;
  notAcknowledged: number;
  amountMismatch: number;
} {
  let noClientCode = 0;
  let notAcknowledged = 0;
  let amountMismatch = 0;

  rows.forEach(row => {
    if (row.isManuallyEdited) {
      return; // Dòng đã sửa tay được xem là đã xử lý và bị loại bỏ khỏi unresolved warning để đồng bộ UI
    }
    if (!row.maKhach || row.maKhach.trim() === '' || row.maKhach.includes('Cảnh báo')) {
      noClientCode++;
    }
    if (row.isYellowWarning) {
      notAcknowledged++;
    }
    if (row.isRedWarning) {
      amountMismatch++;
    }
  });

  return {
    noClientCode,
    notAcknowledged,
    amountMismatch,
  };
}

/**
 * Xây dựng hàm helper tập trung recomputeRowsAfterManualEdits để gộp và tính toán lại
 * các trường phụ thuộc nghiệp vụ (Post-processing)
 */
export function recomputeRowsAfterManualEdits(
  rawRows: ProcessedRow[],
  manualEdits: Record<number, ManualEditState>,
  files: RawFile[],
  config: ETLConfig
): ProcessedRow[] {
  // 1. Clone từng object dòng từ rawRows để tránh mutation
  const rows = rawRows.map(row => ({
    ...row,
    editedFields: [...row.editedFields]
  }));

  // 2. Áp dụng các thay đổi từ manualEdits lên từng dòng
  Object.entries(manualEdits).forEach(([indexStr, editState]) => {
    const idx = parseInt(indexStr, 10);
    if (idx >= 0 && idx < rows.length) {
      const row = rows[idx];
      row.isManuallyEdited = true;
      row.editedFields = [...editState.editedFields];
      Object.entries(editState.values).forEach(([field, val]) => {
        (row as any)[field] = val;
      });
    }
  });

  // 3. Mapping ngân hàng & Recompute Yellow Warning
  // Đối chiếu tệp Nhóm 2 để mapping lại maNganHang, soTienGhiCo, nhom2TrangThai cho các trường thay đổi linkTien
  const g2Files = files.filter(f => f.groupType === 'group2');
  const df2: any[][] = [];
  g2Files.forEach(file => {
    const dataRows = file.rows.slice(file.headerIndex + 1);
    dataRows.forEach(row => {
      const isBlank = row.every(cell => cell === null || cell === undefined || String(cell).trim() === '');
      if (!isBlank && row.length > 0) {
        df2.push(row);
      }
    });
  });

  rows.forEach(row => {
    // Chỉ mapping lại khi linkTien thay đổi (nằm trong editedFields)
    if (row.editedFields.includes('linkTien')) {
      const cleanLink = cleanString(row.linkTien);
      if (cleanLink !== '') {
        const match2 = df2.find(r2 => {
          const desc2 = cleanString(r2[5]); // Mô tả ngân hàng
          return desc2.includes(cleanLink);
        });
        if (match2) {
          if (!row.editedFields.includes('maNganHang')) {
            row.maNganHang = trimString(match2[0]);
          }
          if (!row.editedFields.includes('soTienGhiCo')) {
            row.soTienGhiCo = parseNumber(match2[3]);
          }
          row.nhom2TrangThai = trimString(match2[6]);
        } else {
          // Không tìm thấy thì reset về mặc định
          if (!row.editedFields.includes('maNganHang')) {
            row.maNganHang = '';
          }
          if (!row.editedFields.includes('soTienGhiCo')) {
            row.soTienGhiCo = null;
          }
          row.nhom2TrangThai = '';
        }
      } else {
        // Link tiền trống thì reset về mặc định
        if (!row.editedFields.includes('maNganHang')) {
          row.maNganHang = '';
        }
        if (!row.editedFields.includes('soTienGhiCo')) {
          row.soTienGhiCo = null;
        }
        row.nhom2TrangThai = '';
      }
    }

    // Tính toán lại cảnh báo vàng đối với MỌI dòng từ nhom2TrangThai hiện tại
    row.isYellowWarning = (row.nhom2TrangThai || '').toLowerCase() === 'chưa ghi nhận';
  });

  // 4. Reset duplicate status & maGiaoDichFinal cho mọi dòng trước khi chạy đối soát nhóm trùng
  rows.forEach(row => {
    row.isDuplicateLinkTien = false;
    row.isRedWarning = false;
    if (!row.editedFields.includes('maGiaoDichFinal')) {
      row.maGiaoDichFinal = config.maGiaoDich;
    }
  });

  // 5. Đối soát nhóm trùng: Nhóm theo linkTien mới
  const linkGroups: Record<string, ProcessedRow[]> = {};
  rows.forEach(row => {
    const key = cleanString(row.linkTien);
    if (key !== '') {
      if (!linkGroups[key]) {
        linkGroups[key] = [];
      }
      linkGroups[key].push(row);
    }
  });

  Object.values(linkGroups).forEach(group => {
    if (group.length > 1) {
      const sumTienVe = group.reduce((sum, r) => sum + r.tienVe, 0);
      group.forEach(row => {
        row.isDuplicateLinkTien = true;
        const ghiCoVal = row.soTienGhiCo !== null ? row.soTienGhiCo : 0;
        if (sumTienVe !== ghiCoVal) {
          row.isRedWarning = true;
          if (!row.editedFields.includes('maGiaoDichFinal')) {
            row.maGiaoDichFinal = config.maGiaoDich;
          }
        } else {
          row.isRedWarning = false;
          if (!row.editedFields.includes('maGiaoDichFinal')) {
            row.maGiaoDichFinal = '3';
          }
        }
      });
    }
  });

  // 6. Tính lại diễn giải, mã hợp đồng và các trường khác
  rows.forEach((row, i) => {
    // Diễn giải
    if (!row.editedFields.includes('dienGiai')) {
      if (row.bangKeMapped !== '') {
        row.dienGiai = `${row.bangKeMapped}_${row.linkTien}`;
      } else {
        row.dienGiai = `${row.soHopDong}_${row.linkTien}`;
      }
    }

    // Mã hợp đồng
    if (!row.editedFields.includes('maHopDong')) {
      row.maHopDong = row.soHopDong ? `${row.soHopDong}${config.suffixHopDong}` : '';
    }

    // Số chứng từ final
    if (!row.editedFields.includes('soChungTuFinal')) {
      row.soChungTuFinal = generateDocNumber(config.soChungTuBatDau, i);
    }

    // Mã quyển
    const currentYear = new Date().getFullYear();
    row.maQuyenFinal = `${config.tienToMaQuyen}${currentYear}`;
  });

  return rows;
}
