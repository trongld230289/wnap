# WNAP Phase 3B: Delight Layer (micro-animations) — Design

**Ngày:** 2026-06-08
**Phạm vi:** Phase 3, sub-project thứ 2 (sau 3A design system). Thêm **lớp animation phản hồi** cho các hành động tài chính, để duy trì thói quen nhập liệu — yếu tố sống còn của zero-based budgeting. **CHỈ thêm trình bày/animation — không đổi engine/logic/data flow.**

**Hướng đã chốt (qua brainstorm visual companion, v3):** *"Money as light"* — **không mascot**. Chính UI phản ứng như vật liệu cao cấp (kiểu Linear / Mercury / Monzo): số cuộn có gia tốc, pill nảy spring, thanh đổ chất lỏng + ánh loé, glow + tick khi đạt mục tiêu. Hợp vibe **Calm Fintech** (trắng/emerald/Inter) đã chốt ở 3A.

**Tech đã chốt:** **Framer Motion** (skill `core-3d-animation:motion-framer`) làm lõi + **CSS keyframes** cho particle. **KHÔNG Lottie, KHÔNG 3D** ở v1 (giữ nhẹ, hợp vibe, tránh chỏi).

---

## 1. Nguyên tắc nền

- **Lắng nghe kết quả mutation** — Delight Layer không sửa engine (`app/src/engine/`) hay logic core của `useBudget`. Nó chỉ phản ứng với thay đổi giá trị/status đã tính xong.
- **Không chặn thao tác** — animation không khoá UI; user có thể thao tác tiếp ngay (`pointer-events` không bị chặn, không modal blocking).
- **Thời lượng** — micro-interaction ≤ ~900ms; khoảnh khắc celebratory ≤ ~1.2s. Exit nhanh hơn enter.
- **Tắt được** — tôn trọng `prefers-reduced-motion`; thêm toggle "Hiệu ứng chuyển động" trong Settings (lưu localStorage). Khi tắt → render thẳng kết quả cuối, **0 animation** (số nhảy thẳng, màu đổi tức thì).
- **Không phá test** — vì không đổi logic, **94 vitest hiện có phải tiếp tục xanh**.
- **Token hoá** — mọi duration/spring/màu glow khai báo 1 chỗ (`delight/motion.ts`) để chỉnh đồng bộ.

## 2. Bốn khoảnh khắc v1

| # | Tên | Điều kiện trigger | Hiệu ứng |
|---|---|---|---|
| 1 | **Assign** | Một category có `assigned` tăng (qua inline edit / AssignPopover / Auto-assign) | Pill RTA phát gợn sáng đẩy ra (`emit`) + số RTA cuộn xuống; thẻ category nhận: viền sáng + vệt sáng quét ngang (`sweep`) + pill Available nảy spring + số cuộn lên + thanh Available đổ chất lỏng + ánh loé |
| 2 | **Đạt target** | Status category chuyển **vàng (underfunded) → xanh (funded)** | Chấm status cạnh tên to ra + chuyển xanh + vẽ dấu tick trắng bên trong (stroke draw) + sparkle burst nhỏ (3–4 hạt) |
| 3 | **Cover overspending** | Status category chuyển **đỏ (overspent) → ≥0** (qua Move Money / cover) | Thẻ "lành lại": quét sáng nền đỏ → xanh, pill số đổi màu mượt |
| 4 | **Nhận lương (payday)** | Inflow vào RTA / "Ready to Assign" (transaction `amount > 0` vào category hệ thống) làm RTA tăng | Pill RTA nảy (`bump`) + glow emerald + số RTA cuộn lên |
| — | **Nền chung** | Mọi thay đổi giá trị hiển thị | Số count-up có easing (`easeOutCubic`); bar width & màu transition mượt; pill color-morph amber↔emerald |

**Ngoài scope v1 (ghi nhận, làm sau nếu muốn):**
- Hiệu ứng outflow theo `categories.icon` (phở/cà phê/xăng…) — v1 chỉ flash hàng nhẹ khi có giao dịch chi mới, không mascot.
- Lottie cho payday (đã cân nhắc, hoãn — giữ v1 thuần CSS/Framer).
- Dark mode cho Delight Layer, haptic, âm thanh.

## 3. Kiến trúc

Module mới **`app/src/delight/`** — gom toàn bộ hạ tầng animation, tách khỏi logic:

```
app/src/delight/
  motion.ts          # tokens: DURATION, SPRING, GLOW… + helper variants Framer
  useReducedMotion.ts# gộp prefers-reduced-motion (matchMedia) + setting localStorage
  usePrevious.ts     # giữ giá trị render trước để diff (value/status transition)
  useDelightEnabled.ts # context provider đọc setting; cung cấp cờ on/off toàn app
  Sparkle.tsx        # particle burst nhỏ, tái dùng (CSS keyframes, nhận anchor)
  Count.tsx          # <Count value=… /> số count-up có easing, tôn trọng reduced-motion
```

**Mô hình "component tự phát celebration của nó" (không event-bus toàn cục):**
Mỗi điểm chạm dùng `usePrevious` để so giá trị/status render trước với hiện tại; nếu phát hiện chuyển tiếp đúng điều kiện → tự chạy animation cục bộ. Tránh hệ thống anchor overlay toàn cục phức tạp; mỗi hiệu ứng sống cạnh đúng element của nó.

**Điểm chạm (chỉ thêm motion — giữ nguyên data flow, props, hành vi):**

| File hiện có | Thêm gì |
|---|---|
| `plan/RtaHeader.tsx` | `<Count>` cho số RTA; phân biệt **chiều thay đổi**: RTA **tăng** → pill `bump` + `glow` (payday, moment 4); RTA **giảm** (do assign) → pill gợn sáng `emit` (moment 1). |
| `plan/AvailableBar.tsx` (+ pill Available) | bar fill + color-morph qua Framer; diff status: vàng→xanh phát tick+sparkle (moment 2); đỏ→≥0 phát sweep heal (moment 3). |
| `plan/CategoryTable.tsx` (AssignedCell / hàng) | `<Count>` cho Assigned; khi assigned tăng → `receive` sweep trên hàng (moment 1). |
| `plan/PlanScreen.tsx` | bọc `DelightProvider` (cờ enabled) quanh cây Plan. |
| `ledger/TransactionTable.tsx` | flash hàng nhẹ khi có giao dịch mới (tuỳ chọn, nhẹ). |
| Settings (shell/header) | toggle "Hiệu ứng chuyển động". |

**Cơ chế reduced-motion:** `useReducedMotion()` trả `true` nếu OS bật prefers-reduced-motion **hoặc** user tắt setting. Mọi component animation gọi hook này; khi `true` → bỏ qua nhánh animation, set giá trị/màu cuối trực tiếp. `<Count>` khi reduced → hiện số cuối ngay.

## 4. Tech & thư viện

- **Framer Motion** (`motion` / `framer-motion`) — spring, `animate`, `AnimatePresence`, layout. Cài mới vào `app/`. Dùng skill `core-3d-animation:motion-framer` khi implement.
- **CSS keyframes** — particle (sparkle), shimmer thanh, gợn sáng pill, sweep. Giữ ở module CSS hoặc inline style theo pattern hiện tại.
- Token màu lấy từ design system 3A (`--emerald`, `--status-amber`, `--status-red`, `--emerald-soft`…), **không hardcode hex mới**.
- Không thêm Lottie/three.js/babylon.

## 5. Error / edge handling

- **Spam thao tác:** nếu một animation đang chạy mà giá trị đổi tiếp → animation interruptible, lấy giá trị mới nhất làm đích (Framer xử lý; `<Count>` huỷ frame cũ).
- **Reduced-motion bật giữa chừng:** hook phản ứng `matchMedia` change → tắt animation ngay từ lần render kế.
- **Giá trị lớn / âm:** `<Count>` format `vi-VN` (dấu chấm ngăn nghìn), hỗ trợ số âm (overspent) và 0.
- **Mount lần đầu / load dữ liệu:** KHÔNG chạy celebration cho giá trị khởi tạo (chỉ chạy khi có transition thực sau mount) — tránh "pháo hoa" loạn khi mở app. `usePrevious` khởi tạo bằng giá trị đầu, chỉ so từ render thứ 2.
- **Realtime (Phase sau):** khi có realtime, thay đổi từ user kia cũng sẽ trigger animation — chấp nhận được, để Phase realtime tinh chỉnh.

## 6. Testing

- **Vitest (logic thuần):**
  - `usePrevious` / hàm diff: cho (prev,next) status → đúng loại signal (none / target-reached / cover / payday).
  - `useReducedMotion` gating: OS-flag và setting đều ép `true`.
  - `<Count>` formatter: format số `vi-VN`, reduced-motion hiện ngay giá trị cuối.
- **Không unit-test animation thuần thị giác.**
- **Playwright:** screenshot Plan/Ledger sau khi trigger để xác nhận không vỡ layout; kiểm tra reduced-motion (set emulate) → không có chuyển động.
- **Regression:** chạy lại toàn bộ suite — 94 test cũ phải xanh; `npm run build` pass (type-check thật).

## 7. Verify hoàn thành

- 4 khoảnh khắc chạy đúng trên app thật (Supabase) qua Playwright: assign → flow; đạt target → tick+sparkle; move money cover overspent → heal; inflow → payday.
- Toggle Settings + `prefers-reduced-motion` thật sự tắt animation.
- Build pass, toàn bộ test xanh, screenshot xác nhận.

## 8. Ghi chú triển khai

- ⚠️ Type-check thật = **`npm run build`** (root `tsconfig.json` có `files: []`). KHÔNG dùng `tsc --noEmit`. (Xem [[wnap-phase-status]].)
- Theo nếp các phase trước: branch `feat/wnap-phase-3b-delight-layer`, commit nhỏ theo task, verify e2e, merge `main`, xoá branch.
- Tách plan thực thi riêng (writing-plans) sau khi spec được duyệt.

Related spec: `2026-06-07-wnap-design.md` (§5c Delight Layer), `2026-06-08-wnap-phase-3a-design-system-restyle-design.md`.
