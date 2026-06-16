# Changelog FE - XuLyBaoCo_Ngoc

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client
> Format: [Conventional Commits](https://www.conventionalcommits.org/)
> Ngôn ngữ: Tiếng Việt

---

## 2026-06-16

### fix(logging): sửa lỗi lấy email và ghi log hoạt động lên Google Sheets
- Bổ sung cơ chế parse JSON string khi đọc dữ liệu IndexedDB của Firebase và cơ chế fallback tự động quét email từ URL parameter/hash (`email=...`) cùng bộ nhớ `localStorage`/`sessionStorage` của Iframe và cửa sổ cha `window.parent`.
- Thiết lập `mode: "no-cors"` khi gửi POST request tới Web App URL để tránh lỗi CORS do cơ chế chuyển hướng (302 Redirect) của Google Script.

### feat(logging): tích hợp nhật ký hoạt động người dùng lên Google Sheets
- Tạo tệp tin utility [googleSheetsSync.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/utils/googleSheetsSync.ts) hỗ trợ tải/lưu cấu hình nhật ký, tự động truy vấn email người dùng từ Firebase IndexedDB và thực hiện gọi API POST bất đồng bộ (fire-and-forget).
- Tích hợp UI cấu hình độc lập ở chân Sidebar của [ConfigPanel.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/components/ConfigPanel.tsx) để thiết lập URL Web App, Email và Bật/Tắt nhật ký.
- Sửa đổi prop-type của `onUpdateRow` trong [DataPreviewTable.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/components/DataPreviewTable.tsx) để truyền dòng gốc và dòng cập nhật mới phục vụ diff.
- Cập nhật [App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/App.tsx) để liên kết sự kiện tải tệp, xóa tệp, sửa dòng chứng từ, và xuất Excel kế toán tới API ghi nhật ký.
- Cung cấp mã nguồn Apps Script mẫu tại [google-apps-script.js](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/.agent/history/features/2026-06-16-user-activity-logging/google-apps-script.js) phục vụ triển khai backend.

### feat: Khởi tạo ứng dụng xử lý báo có ngân hàng
- Thiết lập khu vực kéo thả tệp tin tự động nhận diện và phân loại thành 4 nhóm tệp kế toán (`FileDropzone.tsx`).
- Xây dựng bảng điều khiển cấu hình tham số hạch toán kế toán bao gồm ĐVCS, TK Có, Mã ngoại tệ, Tỷ giá, Mã giao dịch mặc định, Tiền tố mã quyển, và bảng ánh xạ tay tài khoản ngân hàng (`ConfigPanel.tsx`).
- Thiết lập bảng xem trước dữ liệu kết quả sau xử lý, hiển thị chi tiết các dòng hạch toán kèm trạng thái cảnh báo màu sắc (`DataPreviewTable.tsx`):
  - Cảnh báo màu Vàng: Trạng thái đối chiếu ngân hàng là "Chưa ghi nhận".
  - Cảnh báo màu Đỏ: Số tiền trùng Link Tiền giữa báo cáo tiền về và báo cáo ngân hàng bị lệch.
  - Cảnh báo không tìm thấy Mã Khách Hàng.
- Files: `src/App.tsx`, `src/components/FileDropzone.tsx`, `src/components/ConfigPanel.tsx`, `src/components/DataPreviewTable.tsx`, `src/utils/etl.ts`, `src/types.ts`

---

*Cập nhật tự động bởi update-docs*
