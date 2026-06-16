# .agent/KNOWLEDGE_BASE.md - Bộ não của dự án XuLyBaoCo_Ngoc

Lưu trữ những **quyết định kiến trúc** quan trọng và **lý do chiến lược** của dự án.

> ⚠️ **QUY TẮC GHI:**
> - Chỉ ghi quyết định kiến trúc và lý do chiến lược (high-level decisions)
> - Tuyệt đối tránh liệt kê tính năng, changelog chi tiết, hoặc mô tả cấu hình thuần túy
> - Mỗi dòng phải trả lời được câu hỏi: "Tại sao chúng ta quyết định làm vậy?"
>
> **Ví dụ đúng:** "Dùng monorepo workspace để chia sẻ package và thống nhất quy trình build giữa frontend và backend."
> **Ví dụ sai:** "Thêm tính năng login bằng Firebase." (đây là changelog, không phải knowledge)

---

## Initial Decisions From Repo Scan

- 2026-06-16 **[Kiến trúc: Xử lý ETL thuần túy ở Client-Side]**. Why: Toàn bộ quá trình đọc, gộp dòng, ánh xạ mã khách/tài khoản và sinh file Excel kế toán được thực hiện trực tiếp trên browser bằng SheetJS (`xlsx`). Quyết định này giúp bảo vệ tối đa tính riêng tư của dữ liệu tài chính doanh nghiệp, loại bỏ độ trễ truyền tải dữ liệu qua mạng, và không phụ thuộc vào hạ tầng máy chủ/cơ sở dữ liệu.
- 2026-06-16 **[Giao diện: Sử dụng Tailwind CSS v4 và tích hợp trực tiếp qua @tailwindcss/vite]**. Why: Dự án sử dụng Tailwind CSS v4 với cấu hình tối giản không cần file `tailwind.config.js` riêng biệt. Việc này đồng bộ hóa quy trình biên dịch CSS với Vite, tăng tốc độ Hot Module Replacement (HMR) và tinh giản số lượng file cấu hình trong dự án.
- 2026-06-16 **[Luồng xử lý: Công cụ đối chiếu quy tắc tập trung trong etl.ts]**. Why: Gom toàn bộ logic nghiệp vụ (ghép tệp bằng Link Tiền, lọc trùng lặp, sinh cảnh báo Vàng/Đỏ và hạch toán kế toán) vào file `src/utils/etl.ts`. Điều này giúp cô lập nghiệp vụ khỏi giao diện UI, tạo điều kiện thuận lợi cho việc viết test tự động và chỉnh sửa quy tắc nghiệp vụ mà không làm ảnh hưởng tới React components.

---

## Ongoing Decisions

- 2026-06-16 **[Kiến trúc: Tách biệt cấu hình SheetsConfig khỏi ETLConfig]**. Why: Tách cấu hình nhật ký hoạt động (Google Sheets) độc lập khỏi cấu hình hạch toán nghiệp vụ (ETLConfig) để tránh việc kích hoạt chạy lại quy trình ETL khi người dùng chỉnh sửa thiết lập nhật ký ở Sidebar, từ đó tối ưu hiệu năng hiển thị và tránh lặp thao tác xử lý dữ liệu.

