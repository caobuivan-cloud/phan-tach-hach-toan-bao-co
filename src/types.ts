export interface ETLConfig {
  dvcs: string;
  tkCo: string;
  bophan: string;
  suffixHopDong: string;
  maGiaoDich: string;
  maNgoaiTe: string;
  tyGia: number;
  tienToMaQuyen: string;
  soChungTuBatDau: string;
  bankMappings: Record<string, string>;
}

export type FileGroup = 'group1' | 'group2' | 'group3' | 'group4' | 'unknown';

export interface RawFile {
  name: string;
  size: number;
  groupType: FileGroup;
  headerIndex: number; // Row index where the header starts
  headers: string[];   // Clean headers detected
  rows: any[][];       // Rows after header
}

export interface ProcessedRow {
  id: string; // unique identifier
  
  // Clean values from Nhóm 1
  soHopDong: string;       // Col A (idx 0)
  tenSale: string;        // Col B (idx 1)
  boPhanOrig: string;     // Col C (idx 3)
  khachHangOrig: string;  // Col D (idx 4)
  giaTriHopDong: number;  // Col E (idx 5)
  tienVe: number;         // Col F (idx 6)
  ngayTienVe: string;     // Col G (idx 7)
  linkTien: string;       // Col H (idx 8)
  hoaDonChiDinh: string;  // Col I (idx 9)
  bangKeOrig: string;     // Col J (idx 10)
  
  // Mapped from Nhóm 2 (Ngân hàng)
  maNganHang: string;
  soTienGhiCo: number | null;
  nhom2TrangThai: string; // e.g., "Chưa ghi nhận" -> triggers Yellow warning
  
  // Mapped from Nhóm 4 (Mã Khách)
  maKhach: string; // from Nhóm 4 or "Cảnh báo không tìm được mã khách" -> triggers error flag
  
  // Mapped from Nhóm 3 (Bảng kê)
  bangKeMapped: string; // overrides J
  
  // Processed values
  dienGiai: string;
  maHopDong: string;
  
  // Warning Flags
  isYellowWarning: boolean; // mapped Nhóm 2 row has Trạng thái = "Chưa ghi nhận"
  isDuplicateLinkTien: boolean; // Row is part of a duplicate Link Tiền group
  isRedWarning: boolean; // Duplicate group where Sum(Tiền về) !== Số tiền ghi có
  
  // Dynamic mapped variables
  maGiaoDichFinal: string; // usually config.maGiaoDich, changed to "3" if duplicate and Sum === ghi_co
  soChungTuFinal: string;
  maQuyenFinal: string;
}

export interface ETLResult {
  processedRows: ProcessedRow[];
  totalFiles: number;
  filesSummary: {
    group1Count: number;
    group2Count: number;
    group3Count: number;
    group4Count: number;
    unknownCount: number;
  };
  warningsCount: {
    noClientCode: number;
    notAcknowledged: number; // yellow status
    amountMismatch: number;  // red status
  };
}
