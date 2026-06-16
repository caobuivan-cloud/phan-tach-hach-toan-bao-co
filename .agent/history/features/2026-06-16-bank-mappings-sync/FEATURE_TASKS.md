# Feature Tasks: Đồng bộ Bản đồ tài khoản nợ (Bank Mappings) lên Google Sheets

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-16

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: GAS Script & Utilities

**Mục tiêu:** Cung cấp mã nguồn backend nâng cấp và các hàm gọi API GET/POST đồng bộ trong `googleSheetsSync.ts`.

- [x] Task 1.1: Tạo tệp [google-apps-script.js](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/.agent/active/bank-mappings-sync/google-apps-script.js) nâng cấp hỗ trợ đọc/ghi cấu hình `"BankMappings"`.
- [x] Task 1.2: Viết hàm `pullBankMappingsFromGoogleSheet()` trong `src/utils/googleSheetsSync.ts`.
- [x] Task 1.3: Viết hàm `pushBankMappingsToGoogleSheet()` trong `src/utils/googleSheetsSync.ts`.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Bắt buộc)

## Phase 2: UI Integration & Lifecycle Hook

**Mục tiêu:** Tích hợp các sự kiện đồng bộ vào `ConfigPanel.tsx` và thực hiện kiểm thử.

- [x] Task 2.1: Sửa đổi `ConfigPanel.tsx` để tự động kéo Bản đồ tài khoản nợ từ Google Sheets khi mount và merge vào config hiện tại.
- [x] Task 2.2: Đồng bộ cấu hình lên Google Sheets khi thêm một ánh xạ mới (`handleAddBankMapping`).
- [x] Task 2.3: Đồng bộ cấu hình lên Google Sheets khi xóa ánh xạ (`handleRemoveBankMapping`).
- [x] Task 2.4: Đồng bộ cấu hình lên Google Sheets khi đặt lại mặc định (`handleReset`).
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Bắt buộc)

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| [2026-06-16 18:44] | [Phase 1] | [Task 1.1] | Khởi tạo kế hoạch nhiệm vụ | [done] | Chờ duyệt kế hoạch để thực thi |
| [2026-06-16 18:46] | [Phase 1] | [Task 1.1-1.3] | Bắt đầu viết GAS script và utilities | [done] | Tạo file script mới và viết các hàm API |
| [2026-06-16 18:47] | [Phase 1] | [Task 1.Final] | Chạy lint/tsc type-check thành công | [done] | Không có lỗi kiểu dữ liệu |
| [2026-06-16 18:47] | [Phase 2] | [Task 2.1-2.4] | Bắt đầu cập nhật ConfigPanel.tsx | [done] | Triển khai nạp cấu hình khi mount và đẩy khi thêm/xóa/reset |
| [2026-06-16 18:48] | [Phase 2] | [Task 2.Final] | Chạy lint/tsc typecheck và kiểm thử thành công | [done] | Chờ người dùng nâng cấp GAS Web App và xác nhận kiểm thử |
| [2026-06-16 18:52] | [Phase 2] | [Task 2.Final] | Xác nhận kiểm thử và hoàn tất feature | [done] | Đồng bộ và kiểm thử thành công, chốt feature |
