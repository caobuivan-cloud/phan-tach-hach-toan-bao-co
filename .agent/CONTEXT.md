# XuLyBaoCo_Ngoc - Context for AI Assistants

---

## 1. Project Overview

- **Tên dự án**: XuLyBaoCo_Ngoc (Hệ thống Xử lý Báo có Ngân hàng và Đối chiếu Dữ liệu Kế toán)
- **Repo**: Chưa có (Dự án chạy offline / AI Studio App local)
- **Trạng thái**: Active Development (Đang vận hành & phát triển cục bộ)

### Tech Stack
- Frontend: React 19, Vite 6, Tailwind CSS v4, Motion (framer-motion v12), SheetJS (`xlsx`)
- Backend: None (Client-side app only)
- Database: None (Dữ liệu được xử lý trực tiếp trên browser từ file Excel tải lên)
- Auth: None
- Infrastructure: Local Development / AI Studio App deployment

---

## 2. `.agent/` Directory Navigation

### Core Maps
| File | Mô tả |
|------|------|
| [CONTEXT.md](./CONTEXT.md) | Bản đồ nhanh để onboard và resume |
| [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) | Quyết định kiến trúc và lý do chiến lược |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Snapshot cấu trúc thư mục, entry points, services và commands |

### Changelog
| File | Mô tả |
|------|------|
| [changelog/CHANGELOG-FE.md](./changelog/CHANGELOG-FE.md) | Thay đổi frontend, UI, UX, logic xử lý tệp tin và luồng client-side |

### Agent Skills
| Skill | Mô tả |
|------|------|
| [skills/README.md](./skills/README.md) | Tổng quan skill pack và flow chuẩn |
| [skills/project-init/SKILL.md](./skills/project-init/SKILL.md) | Chuẩn hóa, bổ sung, hoặc audit bộ `.agent/` |
| [skills/feature-plan/SKILL.md](./skills/feature-plan/SKILL.md) | Lập kế hoạch cho feature mới |
| [skills/feature-review/SKILL.md](./skills/feature-review/SKILL.md) | Review plan về kiến trúc, bảo mật, logic và rollout |
| [skills/feature-coordinator/SKILL.md](./skills/feature-coordinator/SKILL.md) | Triển khai feature theo phase và checklist |
| [skills/update-docs/SKILL.md](./skills/update-docs/SKILL.md) | Cập nhật docs sau khi code thay đổi |
| [skills/check-issue/SKILL.md](./skills/check-issue/SKILL.md) | Điều tra root cause của bug hoặc sự cố |
| [skills/docs-hygiene/SKILL.md](./skills/docs-hygiene/SKILL.md) | Rà soát sức khỏe hệ thống tài liệu và read-path |
| [skills/git-sync/SKILL.md](./skills/git-sync/SKILL.md) | Đồng bộ Git sau khi đã chốt docs và commit message |

---

## 3. Critical Files

| File | Mức độ | Ghi chú |
|------|------|---------|
| [src/utils/etl.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/utils/etl.ts) | CRITICAL | Trái tim xử lý dữ liệu: đọc 4 nhóm file Excel, mapping hợp đồng, đối chiếu số tiền, xử lý trùng lặp và xuất tệp kế toán. |
| [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/App.tsx) | CRITICAL | Layout chính, lưu giữ state của các file tải lên, cấu hình ETL và thực hiện kích hoạt xuất Excel. |
| [src/utils/googleSheetsSync.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/utils/googleSheetsSync.ts) | IMPORTANT | Tiện ích đồng bộ cấu hình và ghi nhật ký hoạt động người dùng lên Google Sheets Web App. |
| [src/components/ConfigPanel.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/components/ConfigPanel.tsx) | IMPORTANT | Bảng điều khiển cấu hình: ĐVCS, TK Có, Mã ngoại tệ, Tỷ giá, Mã giao dịch mặc định, Tiền tố mã quyển, và bảng map tay tài khoản ngân hàng. |
| [src/components/DataPreviewTable.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/PhanTach_HachToan/XuLyBaoCo_Ngoc/src/components/DataPreviewTable.tsx) | IMPORTANT | Bảng xem trước dữ liệu sau xử lý, hiển thị các cảnh báo trùng tiền hoặc không tìm thấy mã khách hàng (màu vàng/đỏ). |

---

## 4. Quick Commands

```powershell
# Cài đặt dependencies
npm install

# Khởi chạy môi trường local development (Vite port 3000)
npm run dev

# Build sản phẩm tĩnh (dist)
npm run build

# Kiểm tra kiểu TypeScript (Linter)
npm run lint

# Dọn dẹp thư mục build
npm run clean
```

---

*Last updated: 2026-06-17 | v1.1.0*
