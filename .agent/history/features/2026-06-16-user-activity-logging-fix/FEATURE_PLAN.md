# Feature Plan: Sửa lỗi lấy Email và ghi Log hoạt động lên Google Sheets

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã qua review hội đồng (2026-06-16)
> **Feature slug**: user-activity-logging-fix
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-16

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Tính năng nhật ký hoạt động người dùng lên Google Sheets đã được tích hợp trước đó nhưng gặp lỗi không lấy được email người dùng trên portal Hub (hub.playai.vn) và không ghi log được.
- **Vấn đề cần giải quyết:** 
  1. Hàm `getPortalUserEmail()` mở IndexedDB `firebaseLocalStorageDb` nhưng không parse giá trị thô dạng JSON string dẫn đến trả về `undefined`. Ngoài ra thiếu cơ chế fallback lấy email qua tham số trên URL (`window.location.search` hoặc `window.location.hash`) và `localStorage`/`sessionStorage` của Iframe/cửa sổ cha `window.parent`.
  2. Gửi POST request tới Google Apps Script Web App URL bị lỗi CORS do cơ chế chuyển hướng (redirect 302) của Google.
- **Mục tiêu:** Khắc phục triệt để lỗi email và lỗi gửi log để tính năng nhật ký hoạt động người dùng lên Google Sheets chạy mượt mà trên môi trường Hub (nhúng qua Iframe).
- **Kết quả mong đợi:** Email người dùng được tự động phát hiện khi tải app trên Hub và hiển thị trên giao diện; log hoạt động được gửi đi thành công tới Google Sheets Web App.

## 2. Phạm vi

### In scope
- Sửa hàm `getPortalUserEmail()` trong `src/utils/googleSheetsSync.ts` để:
  - Thử phân tích cú pháp JSON nếu giá trị trong IndexedDB là một chuỗi trước khi đọc `.email`.
  - Bổ sung cơ chế fallback tìm kiếm email trong `window.location.hash`, `window.location.search`, local `localStorage`/`sessionStorage` và parent `window.parent.localStorage`/`window.parent.sessionStorage` (đảm bảo bọc khối try-catch tránh lỗi cross-origin).
- Sửa `useEffect` tự động lấy email trong `src/App.tsx` để tích hợp đầy đủ luồng kiểm tra URL trước, sau đó mới gọi IndexedDB.
- Sửa hàm `writeActionLogToSheet()` trong `src/utils/googleSheetsSync.ts` để cấu hình `mode: "no-cors"` và loại bỏ kiểm tra `response.ok` (do phản hồi trả về là `opaque`), giúp bỏ qua lỗi CORS của Google Apps Script Web App.

### Out of scope
- Sửa đổi kịch bản Google Apps Script ở phía backend.
- Đồng bộ và quản lý quy tắc từ khóa (Keyword Rules) từ Google Sheets.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Tiếp tục xử lý ETL thuần túy phía Client-side để đảm bảo an toàn dữ liệu doanh nghiệp.
- **"Cấm kỵ" cần tránh:** Tuyệt đối không hardcode link Web App URL mặc định của người dùng khác hoặc thông tin tài khoản nhạy cảm vào codebase. Mọi cấu hình phải lưu qua local storage.
- **Ràng buộc kiến trúc liên quan:** Đảm bảo việc bắn log POST không chặn luồng hiển thị giao diện UI chính (fire-and-forget). Tách biệt cấu hình SheetsConfig khỏi ETLConfig.

## 4. Giả định và câu hỏi mở

### Giả định
- Web App URL cấu hình bởi kế toán viên đã được deploy dưới dạng công khai (Anyone có quyền truy cập) để client-side có thể ghi log trực tiếp mà không cần cấu hình xác thực Google OAuth phức tạp.

### Câu hỏi mở
- [Non-blocking] Liệu có cần log lại hành vi thay đổi cấu hình nghiệp vụ trong ConfigPanel? (Tạm thời bỏ qua keystroke để tránh spam log, chỉ log các thay đổi lớn khi người dùng bấm Reset).

## 5. Acceptance Criteria

- [ ] Firebase IndexedDB email của người dùng được tự động phát hiện và hiển thị tại phần Cấu hình Nhật ký ở chân Sidebar khi mở app trên Hub.
- [ ] Email được ưu tiên lấy từ URL query parameter `?email=...` hoặc hash `#email=...` nếu có.
- [ ] Các hành động tải tệp đối soát, xóa tệp, sửa dòng chứng từ và xuất tệp kế toán đều gửi POST request thành công đến Web App URL khi chế độ Nhật ký được bật.
- [ ] Cuộc gọi API POST không gây ra lỗi CORS trong cửa sổ Console của trình duyệt.
- [ ] Toàn bộ code compile thành công, không gặp lỗi kiểu dữ liệu TypeScript, và build sản phẩm tĩnh không cảnh báo lỗi.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/utils/googleSheetsSync.ts` | Sửa | Sửa logic lấy email và hàm fetch log hỗ trợ `mode: "no-cors"` | 🟢 Thấp | Có |
| `src/App.tsx` | Sửa | Cập nhật hàm `useEffect` tự động lấy email để kiểm tra URL trước, sau đó là IndexedDB | 🟡 Trung bình | Có |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Việc truy xuất `window.parent` có thể gây crash trang web nếu hai cửa sổ thuộc hai domain khác nhau và không được bọc trong khối try-catch an toàn.
- **Review focus areas:** 
  1. Bảo mật: Đảm bảo việc try-catch bao bọc kỹ các hoạt động tương tác với `window.parent` và `localStorage`/`sessionStorage` của cha.
  2. Tính ổn định: Đảm bảo việc gọi log với `mode: "no-cors"` hoạt động trơn tru, không phát sinh lỗi kiểu dữ liệu.

## 8. Chiến lược triển khai

- **Phase strategy:** Chia làm 2 phase chính:
  - **Phase 1: Sửa đổi Utilities & Logic lấy Email**: Viết lại hàm lấy email và sửa hàm ghi log trong `googleSheetsSync.ts`.
  - **Phase 2: Event Binding & Cập nhật App.tsx**: Tích hợp luồng URL query param vào `App.tsx` và thực hiện kiểm thử.
- **Thứ tự triển khai:** `googleSheetsSync.ts` -> `App.tsx` -> Kiểm thử build & chạy thử.

## 9. Test Strategy

- **Automated tests:** Chạy lệnh lint TypeScript `npm run lint` để đảm bảo an toàn kiểu dữ liệu.
- **Manual verification:**
  1. Mở app với tham số `?email=test_user@vccorp.vn` và kiểm tra email có hiển thị tự động trên Sidebar.
  2. Bật debug F12 Network tab, bật Nhật ký, kích hoạt hành động log để kiểm tra request POST thành công đến Google Sheet Web App (trạng thái HTTP là 200 hoặc opaque status 0).

## 10. Rollback Plan

- Có thể khôi phục nhanh bằng cách sử dụng git checkout/revert lại phiên bản trước đó của `googleSheetsSync.ts` và `App.tsx`.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`
