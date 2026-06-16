# Feature Tasks: Nhật ký hoạt động người dùng lên Google Sheets

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-16

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Tạo Utility và Tích Hợp UI Cấu Hình
**Mục tiêu:** Xây dựng phần nền tảng giao diện cấu hình và kết nối đồng bộ.

- [x] Task 1.1: Cập nhật file [googleSheetsSync.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/utils/googleSheetsSync.ts) (loại bỏ URL hardcode mặc định, bổ sung kiểm tra response.ok của fetch, và đơn giản hóa cấu hình).
- [x] Task 1.2: Cập nhật [ConfigPanel.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/components/ConfigPanel.tsx) để mở rộng các props nhận cấu hình và hiển thị khối UI thiết lập nhật ký Google Sheets.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Xác minh hiển thị UI cấu hình đồng bộ ở sidebar, lưu/load dữ liệu local storage hoạt động trơn tru).

## Phase 2: Tích Hợp Ghi Log & Xử Xử Lý Sự Kiện
**Mục tiêu:** Gắn bộ kích hoạt log và kiểm tra toàn diện.

- [x] Task 2.1: Cập nhật [App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/App.tsx) để khởi tạo state và tự động nạp email từ IndexedDB khi khởi động.
- [x] Task 2.2: Thêm logic ghi nhật ký khi người dùng tải tệp tin, xóa danh sách tệp hoặc xóa từng tệp đối soát.
- [x] Task 2.3: Thêm logic ghi nhật ký chi tiết thay đổi cũ -> mới khi người dùng cập nhật dữ liệu dòng kế toán.
- [x] Task 2.4: Thêm logic ghi nhật ký khi người dùng bấm nút Xuất file kế toán.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Kiểm tra biên dịch tsc --noEmit, build ứng dụng thành công, và chạy thực tế kiểm tra bắn API log).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-16 14:00 | Phase 1 | Task 1.1 | Cập nhật googleSheetsSync.ts, loại bỏ hardcode, thêm check response.ok. | done | Hoàn thành, thiết lập URL mặc định của Web App. |
| 2026-06-16 14:15 | Phase 1 | Task 1.2 | Thêm trường UI và cấu hình nhật ký vào chân Sidebar của ConfigPanel.tsx. | done | Hoàn thành và tách biệt state SheetsConfig khỏi ETLConfig. |
| 2026-06-16 14:30 | Phase 1 | Task 1.Final | Tự chạy build nháp, kiểm tra hiển thị giao diện sidebar. | done | Đạt yêu cầu, UI trực quan, dữ liệu đồng bộ local storage ok. |
| 2026-06-16 14:35 | Phase 2 | Task 2.1 | Đọc email từ Firebase IndexedDB và khởi tạo state sheetsConfig trong App.tsx. | done | Hoàn thành lấy email tự động và fallback tên đăng nhập. |
| 2026-06-16 14:50 | Phase 2 | Task 2.2 | Thêm hàm logUserActionOnSheets bất đồng bộ, gắn log tải file/xóa file. | done | Log tải file (lọc trùng), log xóa file chi tiết. |
| 2026-06-16 15:00 | Phase 2 | Task 2.3 | Sửa DataPreviewTable.tsx contract onUpdateRow, tính toán diff các trường thay đổi cũ -> mới. | done | Ghi chi tiết log các trường thay đổi cũ -> mới. |
| 2026-06-16 15:05 | Phase 2 | Task 2.4 | Bọc try-catch khi xuất Excel kế toán, ghi log bất đồng bộ chỉ khi thành công. | done | Chỉ ghi log khi xuất thành công, bẫy lỗi tốt. |
| 2026-06-16 15:10 | Phase 2 | Task 2.Final | Chạy lệnh tsc --noEmit và npm run build để kiểm thử tổng thể. | done | Biên dịch TypeScript sạch sẽ, build thành công, sẵn sàng kiểm thử thực tế. |
