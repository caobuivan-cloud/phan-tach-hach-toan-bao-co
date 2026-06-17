# Changelog FE - XuLyBaoCo_Ngoc

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client
> Format: [Conventional Commits](https://www.conventionalcommits.org/)
> Ngôn ngữ: Tiếng Việt

---

## 2026-06-17

### feat: hoàn thành cảnh báo và bộ lọc khi người dùng sửa tay (v7) và chú thích màu giao diện
- Tách biệt state quản lý chỉnh sửa tay thủ công `manualEdits` độc lập dựa trên index gốc của dòng dữ liệu Excel (`originalIndex`), loại bỏ tình trạng lệch index khi thực hiện lọc hoặc tìm kiếm.
- Bổ sung helper `recomputeRowsAfterManualEdits` tập trung để gộp và tính toán lại các trường derived kế toán (đối chiếu ngân hàng Nhóm 2, reset và đánh giá lại cảnh báo trùng tiền đỏ, hạch toán mã giao dịch) dưới dạng immutable clone từ tệp tin thô.
- Cải tiến bộ đếm lỗi `warningsCount` tự động loại bỏ các dòng đã được sửa tay (được coi là đã xử lý xong) để đồng bộ với bộ lọc tab.
- Thêm tab "Sửa tay" và hiển thị dòng sửa tay với nền màu xanh da trời nhạt, biểu tượng `Info` ở cột STT kèm tooltip hiển thị "Người dùng sửa tay".
- Bổ sung validation chặt chẽ khi xuất Excel hạch toán: ném lỗi ngoại lệ từ utility `etl.ts` và thực hiện `try-catch` tại `App.tsx` hiển thị thông báo alert đỏ chặn xuất file nếu còn chứa cảnh báo mã khách trống hoặc lỗi.
- Bổ sung xác nhận `window.confirm` cảnh báo mất dữ liệu sửa tay khi tải tệp mới hoặc xóa tệp tin cũ.
- Tinh chỉnh lại bố cục phần chú thích màu sắc: đưa tiêu đề Chú thích lên hàng riêng biệt phía trên và xếp ngang 4 hộp chú thích màu sắc gọn gàng ở hàng bên dưới.

## 2026-06-16

### feat(sync): đồng bộ Bản đồ tài khoản nợ (Bank Mappings) lên Google Sheets
- Bổ sung các hàm tiện ích `pullBankMappingsFromGoogleSheet` và `pushBankMappingsToGoogleSheet` tại `googleSheetsSync.ts` để đồng bộ cấu hình ngân hàng.
- Tích hợp vòng đời nạp tự động khi Sidebar component mount và gọi API cập nhật bất đồng bộ lên Google Sheets Web App mỗi khi người dùng Thêm/Xóa/Reset ánh xạ ngân hàng trên `ConfigPanel.tsx`.
- Cung cấp mã nguồn nâng cấp Google Apps Script mẫu tại `.agent/history/features/2026-06-16-bank-mappings-sync/google-apps-script.js` hỗ trợ tự tạo sheet `"BankMappings"`, ghi đè dữ liệu và ghi log hệ thống.

### fix(logging): sửa lỗi lấy email và ghi log hoạt động lên Google Sheets
- Bổ sung cơ chế parse JSON string khi đọc dữ liệu IndexedDB của Firebase và cơ chế fallback tự động quét email từ URL parameter/hash (`email=...`) cùng bộ nhớ `localStorage`/`sessionStorage` của Iframe và cửa sổ cha `window.parent`.
- Thiết lập `mode: "no-cors"` khi gửi POST request tới Web App URL để tránh lỗi CORS do cơ chế chuyển hướng (302 Redirect) của Google Script.
- Ẩn khung cấu hình thủ công Nhật ký hoạt động trên Sidebar và tự động hiển thị email người dùng ở chân trang (thay thế dòng chữ "Enterprise Edition" cũ).
- Tự động kích hoạt ghi log hoạt động (`logsEnabled` mặc định là `true`) khi khởi chạy.

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
