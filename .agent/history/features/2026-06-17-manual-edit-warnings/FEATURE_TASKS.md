# Feature Tasks: Cảnh báo và Bộ lọc khi Người dùng Sửa tay (Thiết kế Chuẩn hóa v7)

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-17

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Data Model, Helper & Export Validation Contract

**Mục tiêu:** Định nghĩa cấu trúc dữ liệu, kiểu dữ liệu strict, xây dựng hàm helper đếm lỗi và helper tính toán lại phụ thuộc nghiệp vụ (Post-processing) với các quy tắc reset chính xác, và contract validation xuất Excel thông qua cơ chế throw Error.

- [x] Task 1.1: Cập nhật `ProcessedRow` trong `src/types.ts` để bắt buộc các trường `isManuallyEdited: boolean` và `editedFields: EditableProcessedRowField[]`. Thêm kiểu union `EditableProcessedRowField` và interface `ManualEditState` trong `src/types.ts`.
- [x] Task 1.2: Cập nhật `runETLPipeline` trong `src/utils/etl.ts` để khởi tạo `isManuallyEdited: false` và `editedFields: []` mặc định cho tất cả các dòng.
- [x] Task 1.3: Cập nhật `ETLResult` trong `src/types.ts` để thêm trường `manualEditCount: number` (tách độc lập khỏi `warningsCount`).
- [x] Task 1.4: Xây dựng hàm helper `deriveWarningsCount(rows: ProcessedRow[])` trong `src/utils/etl.ts` để đếm các lỗi chưa xử lý (unresolved errors):
  - Lỗi mã khách: `maKhach` trống hoặc chứa từ `"Cảnh báo"`, và có `isManuallyEdited === false`. (Dòng đã sửa tay được xem là đã xử lý và bị loại bỏ khỏi unresolved warning để đồng bộ UI).
  - Lỗi vàng/đỏ: `isYellowWarning`/`isRedWarning` là `true` và có `isManuallyEdited === false`.
- [x] Task 1.5: Xây dựng hàm helper tập trung `recomputeRowsAfterManualEdits(rawRows, manualEdits, files, config)` trong `src/utils/etl.ts` để gộp và tính toán lại các trường phụ thuộc nghiệp vụ (Post-processing):
  - Clone từng object dòng từ `rawRows` để tránh mutation.
  - Áp dụng các thay đổi từ `manualEdits` lên từng dòng.
  - **Mapping ngân hàng & Recompute Yellow Warning**:
    - Đối chiếu tệp Nhóm 2 để mapping lại `maNganHang`, `soTienGhiCo`, `nhom2TrangThai` cho các trường thay đổi `linkTien` (chỉ khi không nằm trong `editedFields`).
    - Tính toán lại cảnh báo vàng đối với **mọi dòng** trong mảng: `row.isYellowWarning = (row.nhom2TrangThai.toLowerCase() === 'chưa ghi nhận')`.
  - **Reset duplicate status & maGiaoDichFinal**:
    - Đối với **mọi dòng**, reset `row.isDuplicateLinkTien = false` and `row.isRedWarning = false`.
    - Nếu `maGiaoDichFinal` không nằm trong `editedFields`, reset `row.maGiaoDichFinal = config.maGiaoDich`.
  - **Đối soát nhóm trùng**: Nhóm theo `linkTien` mới. Đối với các nhóm trùng (>1 dòng):
    - sum(tienVe) === soTienGhiCo $\rightarrow$ Cập nhật `isRedWarning = false` and `maGiaoDichFinal = '3'` (nếu `maGiaoDichFinal` không được sửa).
    - sum(tienVe) !== soTienGhiCo $\rightarrow$ Gán `isRedWarning = true` and reset `maGiaoDichFinal = config.maGiaoDich`.
    - Gán `row.isDuplicateLinkTien = true` cho mọi dòng trong nhóm.
  - *Diễn giải & Hợp đồng*: Tính lại `dienGiai` and `maHopDong` (nếu không nằm trong `editedFields`).
- [x] Task 1.6: Cập nhật hàm `exportToAccountingExcel` trong `src/utils/etl.ts` để thực hiện validation dữ liệu: Duyệt toàn bộ `rows` (bao gồm cả dòng đã sửa tay), nếu còn dòng nào có `maKhach` trống hoặc chứa từ `"Cảnh báo"` thì thực hiện `throw new Error(...)` với thông điệp lỗi chi tiết.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Chạy `npm run lint` để kiểm tra kiểu TypeScript và đảm bảo logic build thành công).

## Phase 2: App Controller, Immutability & UI Flow Integration

**Mục tiêu:** Quản lý state `manualEdits` độc lập, sử dụng `useMemo` làm baseline thô, bảo toàn sửa tay và tự động gọi helper tính toán lại derived accounting fields, xử lý các confirm flow và export try-catch.

- [x] Task 2.1: Khai báo state `manualEdits: Record<number, ManualEditState>` trong `src/App.tsx`. Sử dụng `useMemo` để tính toán `rawResult` thô từ `files` và `config`.
- [x] Task 2.2: Cập nhật `useEffect` chạy ETL gộp trong `src/App.tsx`:
  - Lấy `rawResult` từ `useMemo`.
  - Gọi helper tập trung `recomputeRowsAfterManualEdits` để ra mảng gộp và recomputed.
  - Gọi helper `deriveWarningsCount` trên mảng đã gộp để tính `warningsCount` động, và gán `manualEditCount = mergedRows.filter(r => r.isManuallyEdited).length` (tránh stale keys).
- [x] Task 2.3: Cập nhật `handleUpdateRow` trong `src/App.tsx`:
  - Nhận tham số `originalIndex: number` và `originalRow: ProcessedRow` từ bảng preview.
  - So sánh `updatedRow[field]` với `originalRow[field]` (dòng trước khi sửa) để phát hiện dirty fields thực tế của phiên sửa hiện tại. Cập nhật mảng `editedFields` và `values` trong `manualEdits[originalIndex]`.
  - So sánh `updatedRow[field]` với baseline thô `rawResult.processedRows[originalIndex][field]`. Nếu trùng khớp thô $\rightarrow$ Xóa khỏi `editedFields` và `values` (Revert logic).
  - Cập nhật state `manualEdits`. Nếu mảng `editedFields` rỗng, xóa hoàn toàn index đó khỏi state.
- [x] Task 2.4: Bổ sung confirm reset sửa tay trước khi thay đổi state `files` trong `App.tsx` (trong các hàm `handleFilesParsed`, `handleClearFiles`, `onRemoveFile`):
  - Nếu `Object.keys(manualEdits).length > 0`, hiển thị `window.confirm` cảnh báo mất toàn bộ nội dung sửa tay nếu tải file mới hoặc xóa file.
  - Nếu người dùng nhấn OK, thực hiện **xóa sạch state `manualEdits` (`setManualEdits({})`)** và tiến hành cập nhật files.
  - Nếu người dùng nhấn Cancel, chặn hành động cập nhật files và giữ nguyên state hiện tại.
- [x] Task 2.5: Cập nhật hàm `handleExport` trong `src/App.tsx`:
  - Wrap lời gọi `exportToAccountingExcel` trong block `try-catch`.
  - Nếu bắt được lỗi ném ra, hiển thị `alert(err.message)` và **không** set success banner, **không** bắn log hoạt động lên Sheets.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Kiểm tra sửa tay, đổi cấu hình Sidebar, xác nhận các derived fields tự động cập nhật và manual edits được giữ nguyên ở đúng chỉ mục).

## Phase 3: User Interface Polish

**Mục tiêu:** Đồng bộ hóa tab bộ lọc sử dụng wrapper index gốc, cập nhật render màu sắc, tooltip, icon và bổ sung chú thích màu trong bảng preview.

- [x] Task 3.1: Cập nhật component `src/components/DataPreviewTable.tsx` để truyền đúng tham số `originalIndex` và `row` gốc khi gọi `onUpdateRow`.
- [x] Task 3.2: Tạo wrapper `rowsWithIndex` trong component `src/components/DataPreviewTable.tsx` chứa chỉ mục gốc: `processedRows.map((row, originalIndex) => ({ row, originalIndex }))`. Thực hiện logic tìm kiếm và lọc tab trên mảng wrapper này.
- [x] Task 3.3: Cập nhật logic lọc hàng `filteredRows` trong `src/components/DataPreviewTable.tsx` để đồng bộ với số đếm trên tab:
  - Tab "Cần chú ý" và các tab lỗi chi tiết chỉ lọc các hàng có `isManuallyEdited === false` và có lỗi tương ứng.
  - Tab "Sửa tay" chỉ lọc các hàng có `isManuallyEdited === true`.
- [x] Task 3.4: Cập nhật render màu nền của dòng trong `src/components/DataPreviewTable.tsx`: Hàng có `isManuallyEdited === true` đổi màu nền thành màu xanh da trời nhạt (`bg-sky-50 text-sky-900 border-l-4 border-sky-400`).
- [x] Task 3.5: Cập nhật cột STT: hiển thị icon `Info` màu xanh da trời (import từ `lucide-react`) và tooltip hiển thị duy nhất nội dung "Người dùng sửa tay" cho hàng đã sửa.
- [x] Task 3.6: Thêm mục chú thích "Người dùng sửa tay" (màu xanh da trời nhạt) trong khung Chú thích ở đầu bảng.
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (Kiểm tra thủ công toàn bộ các acceptance criteria: validate chặn xuất Excel lỗi, xuất Excel thành công, confirm hủy tải tệp, confirm tải tệp mới thành công và xóa sạch manualEdits cũ, bảo toàn sửa tay và cập nhật derived fields, tính toán derived phụ thuộc khi sửa trường nền, revert logic về thô, đồng bộ bộ lọc tab và chỉnh sửa chính xác dòng sau khi lọc).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-17 | - | - | Khởi tạo kế hoạch cập nhật v7 | done | Thiết kế lại theo cấu trúc wrapper originalIndex, strict types, baseline useMemo, immutability clones, recomputation logic và file confirm cleanups |
| 2026-06-17 | Phase 1 | Task 1.1 | Cập nhật src/types.ts thành công | done | Khai báo strict types cho manual edits |
| 2026-06-17 | Phase 1 | Task 1.2 | Khởi tạo thuộc tính isManuallyEdited | done | Thêm isManuallyEdited và editedFields mặc định vào ETL pipeline |
| 2026-06-17 | Phase 1 | Task 1.3 | Cập nhật ETLResult | done | Thêm manualEditCount vào types và runETLPipeline |
| 2026-06-17 | Phase 1 | Task 1.4 | Xây dựng deriveWarningsCount | done | Đếm lỗi động chỉ với các dòng chưa sửa tay |
| 2026-06-17 | Phase 1 | Task 1.5 | Xây dựng recomputeRowsAfterManualEdits | done | Helper gộp và tính toán lại các derived fields, bảo toàn manual edits |
| 2026-06-17 | Phase 1 | Task 1.6 | Cập nhật exportToAccountingExcel | done | Thêm validate ném Error khi mã khách chứa cảnh báo hoặc trống |
| 2026-06-17 | Phase 1 | Task 1.Final | Chạy self-test Phase 1 | done | Kiểm tra compile & typecheck thành công và đã được User phê duyệt |
| 2026-06-17 | Phase 2 | Tasks 2.1-2.5 | Triển khai controller App.tsx | done | Triển khai state, gộp useEffect, confirm handlers, export try-catch và update handler |
| 2026-06-17 | Phase 3 | Tasks 3.1-3.6 | Triển khai UI preview table | done | Cập nhật DataPreviewTable.tsx, thêm tab, thay màu nền, icon và tooltip |
| 2026-06-17 | Phase 2 & 3 | Tasks Final | Khởi chạy và kiểm thử | done | Hoàn thành biên dịch và được User kiểm thử thủ công xác nhận OK |

