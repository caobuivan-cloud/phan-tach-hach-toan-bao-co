# Feature Plan: Đồng bộ Bản đồ tài khoản nợ (Bank Mappings) lên Google Sheets

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã qua review hội đồng (2026-06-16)
> **Feature slug**: bank-mappings-sync
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-16

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Hiện tại Bản đồ cấu hình tài khoản nợ (ánh xạ từ tên viết tắt ngân hàng sang tài khoản kế toán như BIDV -> 112130) chỉ được lưu giữ ở LocalStorage của máy người dùng. Kế toán viên mong muốn đồng bộ cấu hình này lên cùng một tệp Google Sheets Web App đang dùng để ghi log để chia sẻ cấu hình, đồng thời tự động nạp lại khi tải trang và lưu đè khi thêm/xóa.
- **Vấn đề cần giải quyết:** 
  1. Thiếu hàm API kéo/đẩy Bản đồ cấu hình tài khoản nợ sang Google Sheets Web App.
  2. Phía backend Google Apps Script hiện tại chưa hỗ trợ các action đọc/ghi cấu hình này.
- **Mục tiêu:** Cung cấp tính năng tự động tải và lưu đè cấu hình Bản đồ tài khoản nợ trực tiếp từ Google Sheets, giúp thống nhất cấu hình kế toán giữa các phiên làm việc và các máy khác nhau.
- **Kết quả mong đợi:** Bản đồ tài khoản nợ được tự động nạp từ Google Sheets khi mở app; khi người dùng thêm hoặc xóa ánh xạ, hệ thống tự động đẩy thay đổi lên Google Sheets Web App.

## 2. Phạm vi

### In scope
- Sửa đổi tiện ích [googleSheetsSync.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/utils/googleSheetsSync.ts):
  - Viết hàm `pullBankMappingsFromGoogleSheet(webAppUrl: string): Promise<Record<string, string> | null>` để tải cấu hình qua phương thức GET.
  - Viết hàm `pushBankMappingsToGoogleSheet(webAppUrl: string, mappings: Record<string, string>, user: string): Promise<void>` để đẩy cấu hình qua phương thức POST (bằng `mode: "no-cors"`).
- Sửa đổi thành phần [ConfigPanel.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/components/ConfigPanel.tsx):
  - Tải tự động cấu hình Bản đồ tài khoản nợ từ Google Sheets khi component mount (nếu có Web App URL).
  - Khi thêm (`handleAddBankMapping`) hoặc xóa (`handleRemoveBankMapping`), sau khi cập nhật state local và LocalStorage, tự động gọi đẩy cấu hình lên Google Sheets bất đồng bộ.
  - Thêm trạng thái Loading nhỏ/Visual feedback (nếu cần) để hiển thị trạng thái đang đồng bộ cấu hình.
- Cập nhật mã nguồn Google Apps Script mẫu trong [google-apps-script.js](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/.agent/active/bank-mappings-sync/google-apps-script.js) để hỗ trợ:
  - Khởi tạo Sheet mới `"BankMappings"` nếu chưa có (kèm dữ liệu mẫu mặc định).
  - GET `action === "get_bank_mappings"`: Trả về danh sách key-value của bản đồ.
  - POST `action === "save_bank_mappings"`: Ghi đè (overwrite) toàn bộ bảng dữ liệu cấu hình.

### Out of scope
- Đồng bộ các thông số nghiệp vụ khác ở Sidebar (như ĐVCS, TK Có, Mã ngoại tệ, v.v.). Chỉ tập trung vào Bản đồ tài khoản nợ (Bank Mappings).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Tiếp tục cơ chế xử lý Client-side, nạp và đẩy cấu hình từ Client trực tiếp lên Apps Script của người dùng.
- **"Cấm kỵ" cần tránh:** Tránh chặn UI luồng chính khi nạp/lưu cấu hình. Cần bẫy lỗi kết nối an toàn (nếu mạng lỗi hoặc URL chưa đúng thì vẫn chạy bình thường với LocalStorage).

## 4. Giả định và câu hỏi mở

### Giả định
- Người dùng sẽ sao chép mã nguồn Google Apps Script nâng cấp và triển khai đè (Redeploy) lên Web App hiện tại của họ để hỗ trợ các API mới.

### Câu hỏi mở
- [Non-blocking] Nếu đồng bộ thất bại (mạng lỗi), chúng ta có nên hiển thị thông báo Toast cảnh báo không? (Nên hiển thị cảnh báo nhỏ ở console và fallback dùng LocalStorage bình thường, tránh gây gián đoạn).

## 5. Acceptance Criteria

- [ ] Khi khởi chạy ứng dụng (hoặc điền Web App URL hợp lệ), cấu hình Bản đồ tài khoản nợ tự động được tải về từ Sheet `"BankMappings"` và cập nhật lên Sidebar.
- [ ] Khi người dùng bấm nút **Thêm (+)** một ánh xạ mới, cấu hình mới được lưu vào LocalStorage và đồng thời đẩy thành công lên Google Sheet.
- [ ] Khi người dùng bấm nút **Xóa (thùng rác)** một ánh xạ, cấu hình được cập nhật ở LocalStorage và đồng thời xóa/ghi đè tương ứng trên Google Sheet.
- [ ] Khi người dùng bấm **Reset** cấu hình về mặc định, cấu hình mặc định cũng được đồng bộ lên Google Sheet.
- [ ] Bẫy lỗi kết nối hoạt động tốt: Nếu ngắt kết nối mạng hoặc nhập sai Web App URL, ứng dụng không bị crash và tiếp tục hoạt động bình thường bằng LocalStorage.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/utils/googleSheetsSync.ts` | Sửa | Thêm các hàm `pullBankMappings...` và `pushBankMappings...` | 🟢 Thấp | Có |
| `src/components/ConfigPanel.tsx` | Sửa | Gọi tự động tải khi mount và đẩy đồng bộ khi thêm, xóa, reset | 🟡 Trung bình | Có |
| `.agent/active/bank-mappings-sync/google-apps-script.js` | Tạo mới | Cung cấp mã nguồn Apps Script mới hỗ trợ đọc/ghi cấu hình | 🟢 Thấp | Không |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Việc ghi đè cấu hình đồng thời có thể gây mất mát dữ liệu nếu hai tab trình duyệt ghi đè đan xen. Tuy nhiên do đây là cấu hình đơn lẻ của một kế toán viên nên rủi ro concurrency thấp.
- **Review focus areas:** 
  1. Trạng thái tải: Đảm bảo dữ liệu tải từ Sheet được merge an toàn với LocalStorage (không ghi đè mất các thiết lập nghiệp vụ khác trong `ETLConfig`).
  2. Bẫy lỗi: Đảm bảo không ném exception làm crash sidebar khi URL chưa sẵn sàng.

## 8. Chiến lược triển khai

- **Phase strategy:** Chia làm 2 phase chính:
  - **Phase 1: GAS Script & Utilities**: Tạo mã nguồn Apps Script nâng cấp và viết các hàm API trong `googleSheetsSync.ts`.
  - **Phase 2: UI Integration & Lifecycle Hook**: Tích hợp các sự kiện đồng bộ vào `ConfigPanel.tsx` và kiểm thử.
- **Thứ tự triển khai:** `google-apps-script.js` -> `googleSheetsSync.ts` -> `ConfigPanel.tsx` -> Kiểm thử & Typecheck.

## 9. Test Strategy

- **Automated tests:** Chạy typecheck `npm run lint`.
- **Manual verification:**
  1. Deploy thử Apps Script mới.
  2. Thêm/xóa mapping trên UI và kiểm tra dữ liệu thay đổi trên Google Sheets tương ứng.
  3. Reload trang để xem dữ liệu có tự động nạp lại đúng hay không.

## 10. Rollback Plan

- Có thể rollback nhanh bằng cách loại bỏ các đoạn mã đồng bộ trong `ConfigPanel.tsx` và quay về sử dụng LocalStorage thuần túy.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`
