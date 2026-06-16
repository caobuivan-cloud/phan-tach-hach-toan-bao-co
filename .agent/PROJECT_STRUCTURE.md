# Project Structure - XuLyBaoCo_Ngoc

> Tạo ngày: 2026-06-16
> Cập nhật gần nhất: 2026-06-16
> Mục đích: Lưu snapshot cấu trúc codebase để AI có thể onboard và resume nhanh.

---

## 1. Snapshot cây thư mục

```text
[root]/
|-- .agent/
|   |-- skills/
|   |   |-- ... (thư mục chứa skill packs của agent)
|   |-- CONTEXT.md
|   |-- KNOWLEDGE_BASE.md
|   |-- PROJECT_STRUCTURE.md
|-- assets/
|   |-- .aistudio/
|-- src/
|   |-- components/
|   |   |-- ConfigPanel.tsx
|   |   |-- DataPreviewTable.tsx
|   |   |-- FileDropzone.tsx
|   |-- utils/
|   |   |-- etl.ts
|   |   |-- googleSheetsSync.ts
|   |-- App.tsx
|   |-- index.css
|   |-- main.tsx
|   |-- types.ts
|-- .env.example
|-- .gitignore
|-- index.html
|-- package.json
|-- package-lock.json
|-- tsconfig.json
|-- vite.config.ts
|-- README.md
```

## 2. Entry Points

| Loại | File/Path | Vai trò | Ghi chú |
|------|-----------|---------|---------|
| Frontend | `src/main.tsx` | Khởi chạy React App | Import App và CSS |
| Layout chính | `src/App.tsx` | Quản lý layout và state chung | Nơi chứa config state và tệp tải lên |
| Pipeline ETL | `src/utils/etl.ts` | Trái tim xử lý dữ liệu | Chứa hàm chạy ETL pipeline và hàm xuất file Excel |

## 3. Services / Modules chính

| Module/Service | Path | Trách nhiệm | Phụ thuộc chính |
|----------------|------|-------------|------------------|
| ETL Pipeline | `src/utils/etl.ts` | Phân loại tệp Excel, gộp dòng, mapping thông tin và tính toán cảnh báo | `xlsx` (SheetJS) |
| File Uploader | `src/components/FileDropzone.tsx` | Nhận tệp tải lên qua kéo thả, đọc nội dung thô và lưu vào state | `xlsx` (SheetJS) |
| Configuration | `src/components/ConfigPanel.tsx` | Cung cấp UI cập nhật cấu hình hạch toán và map tài khoản ngân hàng | `src/types.ts` |
| Preview Table | `src/components/DataPreviewTable.tsx` | Hiển thị bảng kết quả xử lý và phân biệt cảnh báo bằng màu sắc | `lucide-react` |
| Google Sheets Log | `src/utils/googleSheetsSync.ts` | Đồng bộ cấu hình log và bắn log bất đồng bộ lên Apps Script Web App | `indexedDB` (Firebase Local Storage) |

## 4. Config / Infra quan trọng

| File | Nhóm | Ý nghĩa | Lưu ý khi chỉnh sửa |
|------|------|---------|---------------------|
| `package.json` | Build/Deps | Định nghĩa dependencies (React 19, Tailwind CSS v4, Motion, express) | Chú ý phiên bản `@tailwindcss/vite` |
| `vite.config.ts` | Build Config | Cấu hình tích hợp plugin React, Tailwind và định nghĩa Path Alias | Alias `@` trỏ trực tiếp đến root folder |
| `.env.example` | Runtime Config | File mẫu chứa API Key cho mô hình Gemini nếu cần tích hợp thêm | Nên copy thành `.env.local` khi chạy |

## 5. Commands

| Mục đích | Lệnh | Điều kiện | Ghi chú |
|----------|------|-----------|---------|
| Chạy local | `npm run dev` | Đã chạy `npm install` | Khởi chạy trên cổng 3000 |
| Build | `npm run build` | Đã kiểm tra kiểu | Tạo thư mục tĩnh `/dist` |
| Lint | `npm run lint` | - | Chạy `tsc --noEmit` để soát lỗi kiểu |
| Dọn dẹp | `npm run clean` | - | Xóa thư mục `/dist` và file `server.js` |

## 6. Luồng đọc nhanh cho AI

- **Khi sửa UI/Giao diện/Layout**: Đọc [App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/App.tsx) và [components](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/components) đầu tiên.
- **Khi sửa logic tính toán, mapping dữ liệu hoặc định dạng xuất file Excel**: Đọc [etl.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/utils/etl.ts) đầu tiên.
- **Khi sửa logic lưu trữ, cấu hình đồng bộ, hoặc API bắn log lên Google Sheets**: Đọc [googleSheetsSync.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/utils/googleSheetsSync.ts) đầu tiên.
- **Khi cập nhật cấu trúc dữ liệu**: Thay đổi [types.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/types.ts).

## 7. Ghi chú từ lần quét đầu

- **Package manager**: npm
- **Kiểu repo**: single app (client-side only)
- **Đặc trưng nghiệp vụ**:
  - Tự động nhận diện 4 nhóm tệp dựa trên tiêu đề cột (Group 1: Báo cáo tiền về, Group 2: Báo cáo ngân hàng, Group 3: Sổ phụ chi tiết/bảng kê, Group 4: Danh mục mã khách/hợp đồng).
  - Ghép tệp Group 1 với Group 2 bằng `Link Tiền` (Col H trong Nhóm 1 và Col F trong Nhóm 2).
  - Ánh xạ mã khách từ Group 4 dựa trên mã hợp đồng và hậu tố (Suffix).
  - Ánh xạ bảng kê từ Group 3 dựa trên số hóa đơn chỉ định.
  - Cảnh báo màu Vàng nếu trạng thái ngân hàng ở Nhóm 2 là "Chưa ghi nhận".
  - Cảnh báo màu Đỏ nếu tổng tiền về của các dòng trùng `Link Tiền` khác với số tiền ghi có ở ngân hàng. Nếu bằng nhau, mã giao dịch mặc định chuyển thành `"3"`.
