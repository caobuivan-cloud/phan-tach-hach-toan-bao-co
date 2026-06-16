# Feature Plan: Nhật ký hoạt động người dùng lên Google Sheets

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: [Khuyến nghị gọi `feature-review` / Bắt buộc review trước khi thực thi / User bỏ qua review với rủi ro đã nêu]
> **Feature slug**: user-activity-logging
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-16

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Dự án hiện tại (`XuLyBaoCo_Ngoc`) chưa có cơ chế lưu vết hoạt động của người dùng (tải file đối soát, xóa file, sửa thông tin dòng hạch toán, xuất excel kế toán). Dự án mẫu `XuLyBaoCo` đã giải quyết vấn đề này bằng cách kết nối với một Google Sheets App Script Web App để ghi log hành vi của người dùng cùng với email người dùng được trích xuất tự động.
- **Vấn đề cần giải quyết:** Tích hợp tính năng tự động phát hiện email đăng nhập của người dùng qua Firebase IndexedDB local storage và ghi lại toàn bộ hoạt động (Tải file, Xóa file, Sửa dòng, Xuất file kế toán) lên Google Sheets.
- **Mục tiêu:** Đồng bộ hóa hoạt động nghiệp vụ hạch toán, tăng tính minh bạch và khả năng kiểm soát dữ liệu kế toán tại VCC.
- **Kết quả mong đợi:** Người dùng có thể cấu hình thông tin đồng bộ tại Sidebar; hệ thống tự động trích xuất thông tin người dùng từ portal và bắn log lên Google Sheets thành công bất cứ khi nào một hành động thuộc danh mục cần log được thực hiện.

## 2. Phạm vi

### In scope
- Cập nhật file tiện ích `src/utils/googleSheetsSync.ts` để đọc/ghi cấu hình nhật ký (mặc định trống Web App URL, mặc định tắt nhật ký), lấy email từ IndexedDB, và gửi POST ghi log.
- Cập nhật `src/components/ConfigPanel.tsx` để bổ sung phần giao diện cấu hình Google Sheets ở chân Sidebar (Tên người dùng, URL Web App, và Toggle bật/tắt Nhật ký hoạt động). Trạng thái cấu hình nhật ký (`SheetsConfig`) được lưu giữ ở một React state riêng biệt tách hoàn toàn khỏi cấu hình hạch toán nghiệp vụ `ETLConfig`.
- Cập nhật `DataPreviewTable.tsx` để điều chỉnh callback thay đổi dòng sang contract: `onUpdateRow: (originalRow: ProcessedRow, updatedRow: ProcessedRow) => void` để dễ dàng tính toán phần dữ liệu thay đổi cũ -> mới.
- Tích hợp gọi ghi nhật ký hoạt động (`logUserActionOnSheets`) bất đồng bộ (fire-and-forget, không await trên UI thread) trong `src/App.tsx` cho các hành động:
  - Tải file đối soát thành công (tên file, nhóm file, số dòng) sau khi đã lọc trùng tệp tin thực tế được chấp nhận.
  - Xóa danh sách file hoặc xóa từng file (có lấy đầy đủ metadata trước khi xóa).
  - Sửa đổi trực tiếp dữ liệu dòng chứng từ (ghi nhận thay đổi cột cũ -> cột mới).
  - Kết xuất file kế toán dạng Excel thành công (gói trong block try/catch, chỉ ghi log sau khi file được ghi thành công).

### Out of scope
- Đồng bộ và quản lý quy tắc từ khóa (Keyword Rules) từ Google Sheets (bỏ hoàn toàn toggle `syncEnabled` và các logic liên quan vì dự án này sử dụng cấu hình tĩnh nghiệp vụ và đối chiếu theo file Excel không dùng quy tắc từ khóa linh hoạt như dự án mẫu).
- Giao diện biểu đồ Dashboard báo cáo log (chỉ ghi nhận log lên Sheets).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Tiếp tục xử lý ETL thuần túy phía Client-side để đảm bảo an toàn dữ liệu doanh nghiệp.
- **"Cấm kỵ" cần tránh:** Tuyệt đối không hardcode link Web App URL mặc định hoặc thông tin tài khoản nhạy cảm vào codebase. Mọi cấu hình phải được tải/lưu qua local storage và bảo mật.
- **Ràng buộc kiến trúc liên quan:** Tách biệt hàm ghi log (`writeActionLogToSheet`) ra file tiện ích để không làm phình code giao diện hoặc code ETL nghiệp vụ.

## 4. Giả định và câu hỏi mở

### Giả định
- Mã nguồn tiện ích Google Apps Script dùng cho Backend Sheets đã được chuẩn bị sẵn tại tệp [google-apps-script.js](./google-apps-script.js) để người dùng sao chép và triển khai (Deploy) làm Web App URL.

### Câu hỏi mở
- [Non-blocking] Liệu có cần log lại hành vi thay đổi cấu hình nghiệp vụ trong ConfigPanel? (Tạm thời bỏ qua keystroke để tránh spam log, chỉ log các thay đổi lớn khi người dùng bấm Reset).

## 5. Acceptance Criteria

- [ ] Firebase IndexedDB email của người dùng được tự động phát hiện và hiển thị tại phần Cấu hình Nhật ký ở chân Sidebar khi mở app.
- [ ] Các hành động tải tệp đối soát, xóa tệp, sửa dòng chứng từ và xuất tệp kế toán đều gửi POST request thành công đến Web App URL khi chế độ Nhật ký được bật.
- [ ] Chế độ Bật/Tắt nhật ký hoạt động hoạt động chính xác theo toggle thiết lập ở Sidebar và lưu lại trong localStorage.
- [ ] Toàn bộ code compile thành công, không gặp lỗi kiểu dữ liệu TypeScript, và build sản phẩm tĩnh không cảnh báo lỗi.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/utils/googleSheetsSync.ts` | Sửa | Chốt logic lưu nhật ký, thêm validate URL, loại bỏ syncEnabled và kiểm soát mã lỗi HTTP | 🟢 Thấp | Có |
| `src/components/ConfigPanel.tsx` | Sửa | Cung cấp UI điền cấu hình URL, tên đăng nhập và bật tắt switch nhật ký | 🟢 Thấp | Có |
| `src/App.tsx` | Sửa | Khởi tạo cấu hình đồng bộ, định nghĩa hàm `logUserActionOnSheets` và gọi bắn log tại các điểm tương tác | 🟡 Trung bình (do là file layout và state chính) | Có |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Việc truy vấn IndexedDB của Firebase Local Storage (`firebaseLocalStorageDb`) có thể bị chặn hoặc không có sẵn nếu ứng dụng chạy ngoài iframe cổng thông tin. Cần có cơ chế fallback an toàn sang tên người dùng thủ công trong local storage.
- **Review focus areas:** 
  1. Hiệu năng: Đảm bảo việc bắn log POST không chặn luồng hiển thị giao diện UI chính.
  2. Bẫy lỗi: Fallback an toàn khi Web App URL không thể kết nối hoặc bị lỗi 404/500, tránh làm crash ứng dụng hoặc gián đoạn luồng làm việc của kế toán viên.
- **Known pitfalls / historical issues:** Chú ý việc gọi log liên tiếp khi người dùng sửa đổi nhanh dòng hạch toán hoặc thay đổi hàng loạt.
- **Dependencies / rollout concerns:** Cần người dùng cung cấp hoặc cấu hình đúng URL Web App App Script trên Google Drive của doanh nghiệp.

## 8. Chiến lược triển khai

- **Phase strategy:** Chia làm 2 phase chính:
  - **Phase 1: Foundation & UI Configuration Panel**: Viết utility sync/log và tích hợp các trường cấu hình ở ConfigPanel.
  - **Phase 2: Event Binding & Error Handling**: Gắn các điểm kích hoạt log hoạt động trong App.tsx và kiểm thử, tối ưu bẫy lỗi kết nối.
- **Thứ tự triển khai:** `googleSheetsSync.ts` -> `ConfigPanel.tsx` -> `App.tsx` -> Kiểm thử build & chạy thử.

## 9. Test Strategy

- **Automated tests:** Chạy lệnh lint TypeScript `npx tsc --noEmit` để đảm bảo an toàn kiểu dữ liệu.
- **Manual verification:**
  1. Thay đổi thông tin tại sidebar và kiểm tra dữ liệu lưu dưới LocalStorage tương ứng.
  2. Mở tab F12 Network, thực hiện thao tác tải tệp hoặc chỉnh sửa dòng để kiểm tra API POST được kích hoạt đến URL định cấu hình.
- **Data / env chuẩn bị trước khi test:** Chuẩn bị các file excel mẫu Nhóm 1, Nhóm 2, Nhóm 3 để chạy ETL kiểm thử.

## 10. Rollback Plan

- Có thể khôi phục nhanh bằng cách loại bỏ các dòng gọi `logUserActionOnSheets` và ẩn khối UI cấu hình Google Sheets ở Sidebar.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

## Review Notes

- **2026-06-16 (feature-review)**: ✅ ĐỒNG Ý
  - FR-01 (Trung bình): Cần gọi `logUserActionOnSheets` bất đồng bộ (không dùng await ở UI thread).
  - FR-02 (Thấp): Xác thực định dạng URL trước khi gọi API fetch.

