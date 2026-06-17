# Feature Plan: Cảnh báo và Bộ lọc khi Người dùng Sửa tay (Thiết kế Chuẩn hóa v7)

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã thông qua hội đồng review kỹ thuật (Sẵn sàng triển khai)
> **Feature slug**: manual-edit-warnings
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-17

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Trong ứng dụng XuLyBaoCo_Ngoc, người dùng có thể chỉnh sửa trực tiếp từng dòng chứng từ đã đối soát thông qua chức năng sửa inline trên bảng xem trước.
- **Vấn đề cần giải quyết:** 
  - Đánh dấu các dòng đã được chỉnh sửa thủ công để kế toán dễ dàng quản lý.
  - Sửa đổi các lỗ hổng logic kế toán sâu sắc từ thiết kế cũ:
    1. **Mất cảnh báo vàng khi reset (P0):** Nếu reset `isYellowWarning` về `false` cho toàn bộ các dòng trước khi recompute, nhưng việc remap Nhóm 2 chỉ chạy khi `linkTien` thay đổi, thì các dòng không bị sửa gì sẽ bị mất hoàn toàn cảnh báo vàng. Thiết kế phải reset và recompute `isYellowWarning` từ `nhom2TrangThai` hiện tại đối với **mọi dòng** trong mảng.
    2. **Stale mã giao dịch khi rời nhóm trùng (P0):** Khi một dòng ban đầu thuộc nhóm trùng khớp tiền (`maGiaoDichFinal = '3'`) được sửa `linkTien` để trở thành dòng đơn lẻ, nó có thể giữ nguyên giá trị `'3'` thay vì quay về mặc định. Thiết kế phải thực hiện reset `isDuplicateLinkTien = false`, `isRedWarning = false` và reset `maGiaoDichFinal = config.maGiaoDich` (nếu không manual override) cho **mọi dòng** trước khi chạy đối soát nhóm trùng.
    3. **Đóng băng derived fields & baseline mutation (P0):** Áp dụng `manualEdits` (index -> dirty fields) độc lập. Clone object dòng khi gộp để giữ baseline thô `rawResult` bất biến.
    4. **Lệch chỉ số dòng (P0):** Sử dụng wrapper `rowsWithIndex` trong `DataPreviewTable.tsx` để lưu giữ `originalIndex` gốc của từng dòng chứng từ.
    5. **Lệch pha đếm và lọc (P0):** Dòng sửa tay được coi là đã xử lý và bị loại khỏi `warningsCount` UI, chỉ hiển thị ở tab "Sửa tay" và tab "Tất cả".
    6. **Chặn xuất Excel UI sai tầng (P1):** Logic validation ném ngoại lệ (`throw Error`) ở utility `etl.ts`; React Controller (`App.tsx`) chịu trách nhiệm try-catch để hiển thị alert đỏ và chặn log thành công.
    7. **Hủy confirm đổi file & Reset State (P1):** Đặt Confirm reset ở các handler thay đổi file, và khi người dùng xác nhận OK, bắt buộc thực hiện `setManualEdits({})` đồng thời với cập nhật `files` để tránh áp nhầm chỉnh sửa cũ lên tệp mới.
- **Mục tiêu:** Một thiết kế state management phân tách, nhất quán tuyệt đối về số liệu hạch toán kế toán, và trải nghiệm người dùng tối ưu.

## 2. Phạm vi

### In scope
- Cập nhật `ProcessedRow` trong `src/types.ts`: Thêm trường bắt buộc `isManuallyEdited: boolean` và `editedFields: EditableProcessedRowField[]`.
- Cập nhật `ETLResult` trong `src/types.ts`: Thêm trường `manualEditCount: number`.
- Khai báo kiểu dữ liệu strict trong `src/types.ts`:
  ```typescript
  export type EditableProcessedRowField = keyof Pick<ProcessedRow, 
    'maKhach' | 'soChungTuFinal' | 'ngayTienVe' | 'maGiaoDichFinal' |
    'tienVe' | 'linkTien' | 'maNganHang' | 'soTienGhiCo' |
    'bangKeMapped' | 'dienGiai' | 'maHopDong'
  >;

  export interface ManualEditState {
    values: Partial<Pick<ProcessedRow, EditableProcessedRowField>>;
    editedFields: EditableProcessedRowField[];
  }
  ```
- Xây dựng helper `deriveWarningsCount(rows: ProcessedRow[])` trong `src/utils/etl.ts` chỉ đếm lỗi đối với các hàng chưa được sửa tay (`isManuallyEdited === false`).
- Xây dựng helper tập trung `recomputeRowsAfterManualEdits(rawRows, manualEdits, files, config)` trong `src/utils/etl.ts` để gộp và tính toán lại các trường phụ thuộc nghiệp vụ (Post-processing):
  - Clone từng object dòng từ `rawRows` để tránh mutation.
  - Áp dụng các thay đổi từ `manualEdits` lên từng dòng.
  - **Quy trình Post-processing**:
    1. *Mapping ngân hàng Nhóm 2*: Nếu `linkTien` được sửa đổi, đối chiếu tệp Nhóm 2 để mapping lại `maNganHang`, `soTienGhiCo`, `nhom2TrangThai` cho các trường không nằm trong `editedFields`. Nếu không tìm thấy, reset các trường ngân hàng về mặc định.
    2. *Tính toán cảnh báo vàng*: Đối với **mọi dòng**, gán `row.isYellowWarning = (row.nhom2TrangThai.toLowerCase() === 'chưa ghi nhận')`.
    3. *Reset trạng thái trùng và mã giao dịch*: Đối với **mọi dòng**, reset `row.isDuplicateLinkTien = false` và `row.isRedWarning = false`. Nếu `maGiaoDichFinal` không nằm trong `editedFields` của dòng, reset `row.maGiaoDichFinal = config.maGiaoDich`.
    4. *Đối soát nhóm trùng*: Nhóm các dòng theo `linkTien` mới. Đối với các nhóm trùng (>1 dòng), tính tổng `tienVe`. Nếu tổng khớp với `soTienGhiCo` nhóm, gán `isRedWarning = false` và gán `maGiaoDichFinal = '3'` (nếu không manual override). Nếu không khớp, gán `isRedWarning = true` và `maGiaoDichFinal = config.maGiaoDich` (nếu không manual override). Gán `isDuplicateLinkTien = true` cho mọi dòng trong nhóm trùng.
    5. *Tính diễn giải*: Nếu `dienGiai` không có trong `editedFields`: Tính lại `dienGiai` dựa trên `bangKeMapped` (mới) và `linkTien` (mới).
    6. *Tính mã hợp đồng*: Nếu `maHopDong` không có trong `editedFields`: Tính lại `maHopDong` dựa trên `soHopDong` và `config.suffixHopDong`.
- Cập nhật `exportToAccountingExcel` trong `src/utils/etl.ts` thực hiện validate: nếu còn dòng nào có `maKhach` trống hoặc chứa `"Cảnh báo"` thì `throw new Error(...)`.
- Cập nhật `App.tsx`:
  - Khai báo state `manualEdits: Record<number, ManualEditState>`.
  - Khai báo `rawResult` bằng `useMemo` tính toán ETL thô làm baseline sạch.
  - Cập nhật `useEffect` chạy ETL để gộp dữ liệu: Gọi `recomputeRowsAfterManualEdits` để ra mảng gộp và recomputed, gọi `deriveWarningsCount` để tính `warningsCount` động, và gán `manualEditCount = mergedRows.filter(r => r.isManuallyEdited).length`.
  - Cập nhật `handleUpdateRow`: Nhận tham số `originalIndex: number` và `originalRow: ProcessedRow` từ bảng preview.
    - Lấy `manualEdits[originalIndex]` hiện tại.
    - Duyệt qua `EditableProcessedRowField`, so sánh `updatedRow[field]` với `originalRow[field]` (dòng hiện tại trong bảng trước edit) để phát hiện dirty fields thực tế của phiên sửa hiện tại $\rightarrow$ Thêm vào mảng `editedFields` và `values`.
    - Đối chiếu `updatedRow[field]` với baseline thô `rawResult.processedRows[originalIndex][field]`. Nếu trùng khớp thô $\rightarrow$ Xóa khỏi `editedFields` và `values` (Revert logic).
    - Cập nhật state `manualEdits`. Nếu mảng `editedFields` rỗng, xóa hoàn toàn index đó khỏi state.
  - Cập nhật các handler cập nhật tệp (`handleFilesParsed`, `handleClearFiles`, `onRemoveFile`): Hiển thị Confirm dialog cảnh báo mất dữ liệu sửa tay. Khi người dùng xác nhận OK, bắt buộc thực hiện `setManualEdits({})` đồng thời với cập nhật `files`.
  - Cập nhật `handleExport`: Try-catch lỗi ném ra từ utility, hiển thị alert đỏ và chặn log thành công.
- Cập nhật `DataPreviewTable.tsx`:
  - Tạo wrapper mảng `rowsWithIndex` từ `processedRows` chứa index gốc: `processedRows.map((row, originalIndex) => ({ row, originalIndex }))`.
  - Thực hiện bộ lọc tab và tìm kiếm trên wrapper này, truyền `originalIndex` và `row` gốc cho `onUpdateRow`.
  - Tab "Cần chú ý" và các tab lỗi chi tiết chỉ hiển thị các dòng chưa sửa tay (`isManuallyEdited === false`). Tab "Sửa tay" chỉ hiển thị các dòng đã sửa tay (`isManuallyEdited === true`).
  - Render nền hàng `bg-sky-50 text-sky-900 border-l-4 border-sky-400`, icon `Info` màu xanh da trời, tooltip "Người dùng sửa tay" cho hàng đã sửa. Thêm chú thích màu xanh da trời ở bảng Chú thích.

### Out of scope
- Lưu trữ dữ liệu sửa tay lâu dài qua database (dự án chạy thuần client-side, trạng thái sửa tay sẽ reset khi tải lại trang).
- Không tự động chạy lại toàn bộ quy trình ETL từ tệp tin thô trên đĩa khi sửa dòng, nhưng **bắt buộc chạy lại logic tính toán phụ thuộc cho dòng/nhóm (Row/Group Post-processing)** ngay sau khi gộp manual edits.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - *Xử lý ETL thuần túy ở Client-side:* Vẫn duy trì cơ chế quản lý state trên React và không lưu trữ server-side.
  - *Công cụ đối chiếu quy tắc tập trung trong etl.ts:* Viết helper đếm lỗi và validation ném ngoại lệ xuất Excel trong `etl.ts`.
- **"Cấm kỵ" cần tránh:** Không làm xáo trộn cấu trúc cột xuất ra file Excel. Dữ liệu xuất ra Excel vẫn phải tuân thủ chuẩn 21 cột của hệ thống. Đồng thời **cấm xuất** file nếu còn chứa chuỗi cảnh báo lỗi trong dữ liệu cột mã khách.

## 4. Giả định và câu hỏi mở

### Giả định
- Việc chỉnh sửa tay của người dùng là quyết định override tối thượng của kế toán. Hệ thống tôn trọng giá trị này, miễn là giá trị hạch toán cơ bản (Mã khách) không vi phạm định dạng cảnh báo lỗi thô.
- Việc so khớp hàng cũ/mới khi config thay đổi bằng index gốc là đủ tin cậy do cấu trúc dòng của tệp Nhóm 1 tải lên không thay đổi khi cấu hình thay đổi.

### Câu hỏi mở
- *Đã giải quyết:* Hàng đã sửa tay nhưng vẫn còn mã khách cảnh báo có được phép xuất Excel không? -> **Tuyệt đối không được phép**. Hệ thống phải chặn bằng cách ném ngoại lệ ở tầng utility và bắt lỗi hiển thị UI ở tầng App.

## 5. Acceptance Criteria

- [ ] Kiểu dữ liệu `ProcessedRow` có thuộc tính bắt buộc `isManuallyEdited: boolean` và `editedFields: EditableProcessedRowField[]`.
- [ ] Khi chạy ETL lần đầu, toàn bộ các hàng được gán `isManuallyEdited = false` và `editedFields = []` mặc định.
- [ ] Khi người dùng lưu chỉnh sửa của một dòng:
  - Chỉ những trường thực tế thay đổi so với baseline thô mới được ghi nhận vào `manualEdits`.
  - Hàng đổi màu nền sang `bg-sky-50 text-sky-900 border-l-4 border-sky-400`.
  - Icon ở cột STT chuyển thành `Info` màu xanh da trời.
  - Tooltip khi rê chuột vào STT hiển thị duy nhất nội dung: "Người dùng sửa tay".
  - Các cờ cảnh báo gốc (`isYellowWarning`, `isRedWarning`, mã khách chứa `"Cảnh báo"`) vẫn được lưu giữ trong object dữ liệu để audit.
- [ ] Bộ đếm lỗi động (`warningsCount`) chỉ giảm đi khi dòng được sửa tay (loại hoàn toàn khỏi danh sách unresolved cảnh báo trên UI). Bộ đếm sử dụng helper tập trung `deriveWarningsCount`.
- [ ] Tab bộ lọc hoạt động đồng bộ:
  - Tab "Cần chú ý" và các tab lỗi chi tiết chỉ hiển thị các dòng có lỗi và chưa được sửa tay (`isManuallyEdited === false`).
  - Tab "Sửa tay" chỉ hiển thị các dòng đã được chỉnh sửa thủ công (`isManuallyEdited === true`).
- [ ] Khi thay đổi cấu hình ở Sidebar:
  - Các hàng đã sửa tay được bảo toàn các trường đã sửa tay (State Preservation) thông qua so khớp index gốc.
  - Các trường tự động tính toán từ config (derived fields) của các hàng đã sửa tay nhưng không bị gõ đè (ví dụ: số chứng từ mới, diễn giải mới) **vẫn được tính toán lại theo config mới**.
- [ ] Khi thay đổi các trường nền (như `linkTien`, `tienVe`, `soTienGhiCo`):
  - Các trường ngân hàng phụ thuộc (`maNganHang`, `soTienGhiCo`, `nhom2TrangThai`, `isYellowWarning`) được recompute dựa trên matching tệp Nhóm 2.
  - Tất cả các dòng đều được tự động recompute `isYellowWarning` dựa trên `nhom2TrangThai` hiện tại của dòng đó.
  - Các cảnh báo lệch tiền (`isRedWarning`), trùng link (`isDuplicateLinkTien`) và mã giao dịch (`maGiaoDichFinal`) được recompute tự động theo nhóm trùng tiền. Mọi dòng đơn lẻ (không trùng) tự động quay về `maGiaoDichFinal = config.maGiaoDich` (nếu không manual override).
  - Trường diễn giải (`dienGiai`) tự động tính toán lại giá trị mới.
  - Invariant "Hợp đồng trống nếu có bảng kê" được giữ vững trên cả UI preview và Excel xuất ra khi `bangKeMapped` có dữ liệu.
- [ ] Khi người dùng revert giá trị về trùng khớp hoàn toàn với dữ liệu thô ban đầu, dòng chứng từ mất trạng thái màu xanh dương sửa tay, icon chuyển về bình thường, và bộ đếm sửa tay giảm đi.
- [ ] Khi người dùng bấm xuất Excel:
  - Nếu còn dòng nào (kể cả đã sửa tay) có `maKhach` trống hoặc chứa chữ `"Cảnh báo"`, utility `exportToAccountingExcel` ném lỗi `Error`. Tầng `App.tsx` bắt lỗi này, chặn tải xuống, hiển thị Dialog/Alert báo lỗi đỏ, và không set success/bắn log.
  - Nếu không còn dòng nào vi phạm mã khách, tệp tin Excel 21 cột được tải xuống bình thường, banner success hiển thị và log hạch toán được gửi đi.
- [ ] Khi người dùng tải tệp mới, xóa tệp, hoặc xóa danh sách file: Nếu có dòng đã sửa tay, hiển thị Confirm dialog cảnh báo reset dữ liệu. Nếu người dùng chọn OK, **xóa sạch state `manualEdits`** và tiến hành cập nhật tệp; nếu chọn Cancel, giữ nguyên toàn bộ trạng thái hiện tại.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| [src/types.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/types.ts) | Sửa | Thêm `isManuallyEdited: boolean` và `editedFields: EditableProcessedRowField[]` vào `ProcessedRow`; thêm `manualEditCount: number` vào `ETLResult`; định nghĩa strict `EditableProcessedRowField` và `ManualEditState`. | 🟢 Thấp | Có |
| [src/utils/etl.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/utils/etl.ts) | Sửa | Khởi tạo `isManuallyEdited: false` và `editedFields: []` trong pipeline; thêm helper `deriveWarningsCount` và `recomputeRowsAfterManualEdits`; thêm logic kiểm tra validate và throw error trong `exportToAccountingExcel`. | 🟡 Trung bình | Có |
| [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/App.tsx) | Sửa | Quản lý state `manualEdits` độc lập; sử dụng `useMemo` tính `rawResult` baseline; gọi helper `recomputeRowsAfterManualEdits` để gộp không mutate; thêm confirm reset và xóa `manualEdits` khi đổi file; cập nhật `handleExport` try-catch lỗi. | 🟡 Trung bình | Có |
| [src/components/DataPreviewTable.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/components/DataPreviewTable.tsx) | Sửa | Tạo wrapper `rowsWithIndex` để lọc và truyền đúng `originalIndex` gốc cho `onUpdateRow`; cập nhật render màu nền/icon `Info`/tooltip và lọc tab đồng bộ. | 🟢 Thấp | Có |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Logic bảo toàn state khi thay đổi config cần đảm bảo chỉ map đè đúng các trường nằm trong `editedFields` và thực hiện clone object để tránh mutation. Việc recompute derived fields cần đồng bộ chính xác logic nghiệp vụ thông qua helper tập trung. Logic confirm files cần đảm bảo xóa sạch `manualEdits` khi OK.
- **Review focus areas:** Tính chính xác của helper đếm lỗi dùng chung và sự đồng bộ hiển thị của các tab lọc.
- **Known pitfalls / historical issues:** Việc import các icon từ thư viện `lucide-react` trong component con `DataPreviewTable.tsx` (nhớ import `Info`).

## 8. Chiến lược triển khai

- **Phase strategy:** 
  - **Phase 1: Data Model, Helper & Export Validation Contract:** Cập nhật types (mô hình state, strict fields), viết helper `deriveWarningsCount` và `recomputeRowsAfterManualEdits`, khởi tạo `isManuallyEdited`/`editedFields` trong ETL và viết logic validate ném ngoại lệ trong `exportToAccountingExcel`.
  - **Phase 2: App Controller, Immutability & UI Flow Integration:** Quản lý state `manualEdits`, sử dụng `useMemo` làm baseline, cập nhật `useEffect` chạy ETL gộp gọi helper tập trung không mutate, thêm confirm reset và xóa `manualEdits` ở các file handlers, và cập nhật `handleExport` try-catch lỗi.
  - **Phase 3: User Interface Polish:** Tạo wrapper `rowsWithIndex` trong preview table, đồng bộ hóa logic lọc tab, render hàng, tooltip, icon và thêm chú thích.
- **Thứ tự triển khai:** `types.ts` -> `etl.ts` -> `App.tsx` -> `DataPreviewTable.tsx`.

## 9. Test Strategy

- **Automated tests:** Chạy `npm run lint` để kiểm tra kiểu TypeScript.
- **Manual verification:**
  1. **Test Validate & Chặn xuất Excel:** Sửa đổi trường tiền của một hàng lỗi mã khách (vẫn giữ nguyên mã khách trống/cảnh báo) $\rightarrow$ Nhấn Lưu $\rightarrow$ Nhấn "Xuất file kế toán" $\rightarrow$ Hệ thống phải chặn xuất, hiện alert đỏ, và KHÔNG hiện banner success hay bắn log lên Sheets.
  2. **Test Khắc phục lỗi mã khách:** Sửa mã khách của dòng trên thành mã hợp lệ (ví dụ: `"KH020219"`) và bấm Lưu $\rightarrow$ Bấm xuất Excel $\rightarrow$ Hệ thống cho phép xuất file, hiện banner success và bắn log thành công.
  3. **Test State Preservation & Derived Config Updates:** Sửa tay mã khách của một hàng $\rightarrow$ Đổi số chứng từ bắt đầu ở Sidebar (ví dụ: từ 0001 thành 0005) $\rightarrow$ Xác nhận dòng đó vẫn giữ nguyên mã khách đã sửa, nhưng số chứng từ của dòng đó tự động được tính lại thành số chứng từ mới theo config (không bị đóng băng ở giá trị cũ).
  4. **Test Recompute các field phụ thuộc (linkTien / bangKeMapped):** 
     - Sửa đổi `linkTien` của một dòng sang link mới khớp với tệp Nhóm 2 $\rightarrow$ Nhấn Lưu $\rightarrow$ Xác nhận cột Diễn giải, Ngân hàng, Số tiền ghi có tự động thay đổi đồng bộ.
     - Sửa `bangKeMapped` $\rightarrow$ Nhấn Lưu $\rightarrow$ Xác nhận cột Hợp đồng hiển thị *"Để trống do bảng kê"*.
  5. **Test Recompute mã giao dịch và cảnh báo trùng/lệch:** 
     - Sửa `tienVe` của dòng trong nhóm trùng link khớp với số tiền ghi có ngân hàng $\rightarrow$ Nhấn Lưu $\rightarrow$ Xác nhận cảnh báo lệch tiền đỏ biến mất, `isDuplicateLinkTien` và `isRedWarning` cập nhật lại, và `maGiaoDichFinal` tự động đổi thành `'3'`.
     - Sửa `linkTien` của một dòng trong nhóm trùng sang link khác không trùng $\rightarrow$ Nhấn Lưu $\rightarrow$ Xác nhận dòng đó được reset `isDuplicateLinkTien = false`, `isRedWarning = false`, và `maGiaoDichFinal` quay về mặc định `config.maGiaoDich`.
  6. **Test Bảo toàn cảnh báo vàng của các dòng không sửa:** Tải file có dòng cảnh báo vàng $\rightarrow$ Sửa một dòng khác không có lỗi vàng $\rightarrow$ Nhấn Lưu $\rightarrow$ Xác nhận các dòng cảnh báo vàng ban đầu vẫn giữ nguyên nền vàng và icon cảnh báo (không bị reset mất lỗi vàng).
  7. **Test Dirty-field detection chính xác:** Sửa `maKhach` của một dòng $\rightarrow$ Nhấn Lưu. Thay đổi tỷ giá hoặc config Sidebar $\rightarrow$ Xác nhận `maKhach` vẫn giữ nguyên giá trị đã sửa, nhưng các trường derived khác của dòng (như số chứng từ) vẫn được recompute chính xác theo config mới (không bị đóng băng nhầm).
  8. **Test Revert logic:** Sửa mã khách của một hàng $\rightarrow$ Nhấn Lưu (Hàng đổi màu xanh dương) $\rightarrow$ Sửa lại mã khách đó trùng khớp hoàn toàn với giá trị thô ban đầu và Lưu $\rightarrow$ Xác nhận hàng mất màu xanh dương sửa tay, bộ đếm sửa tay giảm đi.
  9. **Test Confirm & Clear khi tải file:** Sửa tay một dòng $\rightarrow$ Nhấn xóa file hoặc tải file mới $\rightarrow$ Bấm OK $\rightarrow$ Xác nhận tệp thay đổi và cờ sửa tay bị xóa sạch (`manualEditCount = 0`, không còn dòng nào bị màu xanh từ state cũ áp sang).
  10. **Test Confirm Cancel thay đổi tệp:** Sửa tay một dòng $\rightarrow$ Nhấn xóa file hoặc tải file mới $\rightarrow$ Bấm Cancel ở Confirm dialog $\rightarrow$ Xác nhận danh sách file và dữ liệu đã sửa vẫn giữ nguyên.
  11. **Test Lọc tab đồng bộ:** Chuyển qua lại giữa các tab, xác nhận số đếm trên đầu tab khớp hoàn toàn với số lượng dòng hiển thị thực tế bên dưới (không còn lỗi lệch số đếm). Sửa một dòng trong tab Lọc và xác nhận hàng đó được cập nhật chính xác index gốc của nó.

## 10. Rollback Plan

- Hoàn tác mã nguồn bằng lệnh git checkout đối với các file đã chỉnh sửa.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

## Review Notes

- **FR-01 (Mất cảnh báo vàng của các dòng không sửa) [ĐÃ GIẢI QUYẾT]**: Kế hoạch đã bổ sung logic recompute lại `isYellowWarning` từ `nhom2TrangThai` hiện tại đối với **mọi dòng** trong mảng sau khi merge, đảm bảo các dòng không sửa vẫn giữ nguyên cảnh báo vàng của họ.
- **FR-02 (Rời nhóm trùng giữ sai maGiaoDichFinal = '3') [ĐÃ GIẢI QUYẾT]**: Trước khi recompute duplicate groups, đối với **mọi dòng**, reset `isDuplicateLinkTien = false`, `isRedWarning = false`, và reset `maGiaoDichFinal = config.maGiaoDich` (nếu không manual override), đảm bảo các dòng đơn lẻ tự động quay về trạng thái mặc định chính xác.
- **FR-03 (Immutability Clones) [ĐÃ GIẢI QUYẾT]**: Thực hiện shallow clone cho từng object dòng chứng từ khi merge trong `useEffect` để tránh mutation trực tiếp lên baseline thô của `rawResult`.
- **FR-04 (Lệch index khi lọc) [ĐÃ GIẢI QUYẾT]**: Sử dụng wrapper `rowsWithIndex` trong preview table để giữ chỉ số index gốc (`originalIndex`) của từng dòng khi render bảng đã qua lọc, đảm bảo cập nhật state chính xác.
- **FR-05 (Confirm & Clear khi đổi file) [ĐÃ GIẢI QUYẾT]**: Đặt Confirm reset ở các file handlers; khi người dùng bấm OK, bắt buộc chạy `setManualEdits({})` đồng thời với cập nhật files để dọn sạch edits cũ.
- **FR-06 (Revert logic & Typings) [ĐÃ GIẢI QUYẾT]**: Quy định strict type `EditableProcessedRowField` và `ManualEditState` để tránh typo; tự động gỡ bỏ sửa tay khi giá trị được sửa về đúng giá trị thô ban đầu.

*Hội đồng kỹ thuật chính thức phê duyệt kế hoạch triển khai.*
