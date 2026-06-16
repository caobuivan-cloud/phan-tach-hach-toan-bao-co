# Changelog FE - XuLyBaoCo_Ngoc

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client
> Format: [Conventional Commits](https://www.conventionalcommits.org/)
> Ngôn ngữ: Tiếng Việt

---

## 2026-06-16

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
