export const guideDict = {
  vi: {
    'guide.modal.title': 'Hướng dẫn WNAP',
    'guide.sidebar.overview': '🗺️ Tổng quan',
    'guide.sidebar.extras': 'Tính năng bổ sung',
    'guide.phase.setup': 'Giai đoạn 1: Thiết lập',
    'guide.phase.assign': 'Giai đoạn 2: Phân bổ',
    'guide.phase.daily': 'Giai đoạn 3: Hoạt động hàng ngày',
    'guide.phase.maint': 'Giai đoạn 4: Bảo trì',
    'guide.phase.family': 'Giai đoạn 5: Đồng bộ gia đình',
    'guide.section.steps': 'Các bước',
    'guide.section.example': 'Ví dụ',
    'guide.section.tips': '💡 Mẹo',

    // ── design-categories (5 steps, 2 tips) ──────────────────────────────────
    'guide.uc.design-categories.title': 'Thiết kế danh mục — Chia "hũ tiền" cho gia đình',
    'guide.uc.design-categories.step.1': 'Mở tab Kế hoạch và bấm "Thêm nhóm" để tạo nhóm danh mục đầu tiên.',
    'guide.uc.design-categories.step.2': 'Tạo nhóm "Chi phí cố định" rồi thêm các danh mục: Tiền nhà, Điện nước, Internet, Bảo hiểm.',
    'guide.uc.design-categories.step.3': 'Tạo nhóm "Nhu cầu hàng ngày": Ăn uống, Đi lại, Sữa & tã em bé.',
    'guide.uc.design-categories.step.4': 'Tạo nhóm "Quỹ dự phòng": Sửa xe, Y tế, Quà tặng (các khoản lớn nhưng không thường xuyên).',
    'guide.uc.design-categories.step.5': 'Tạo nhóm "Cá nhân/Vui chơi": Tiền tiêu riêng của vợ và chồng để chủ động chi tiêu.',
    'guide.uc.design-categories.example':
      'Gia đình Minh có thu nhập 30tr/tháng. Họ tạo 4 nhóm: Chi phí cố định (12tr), Nhu cầu hàng ngày (8tr), Quỹ dự phòng (5tr), Cá nhân (5tr). Mỗi đồng đều có "địa chỉ" rõ ràng.',
    'guide.uc.design-categories.tip.1': 'Bắt đầu đơn giản với 10-15 danh mục — bạn có thể thêm sau khi đã quen.',
    'guide.uc.design-categories.tip.2': 'Tạo danh mục "Tiền tiêu riêng" cho từng người để tránh tranh luận về chi tiêu cá nhân.',

    // ── connect-accounts (4 steps, 2 tips) ───────────────────────────────────
    'guide.uc.connect-accounts.title': 'Kết nối tài khoản — Đưa tất cả tiền vào một nơi',
    'guide.uc.connect-accounts.step.1': 'Mở menu cài đặt và chọn "Thêm tài khoản".',
    'guide.uc.connect-accounts.step.2': 'Thêm tài khoản ngân hàng, ví điện tử (MoMo, ZaloPay), và tiền mặt.',
    'guide.uc.connect-accounts.step.3': 'Thêm thẻ tín dụng nếu có — WNAP sẽ tự động giữ lại tiền từ các danh mục chi tiêu để đảm bảo luôn đủ thanh toán.',
    'guide.uc.connect-accounts.step.4': 'Kiểm tra số dư ban đầu của từng tài khoản khớp với thực tế.',
    'guide.uc.connect-accounts.example':
      'Chị Lan có tài khoản Vietcombank (15tr), ví MoMo (500k), tiền mặt (1tr), thẻ tín dụng Techcombank (dư nợ 3tr). Sau khi thêm đủ, tổng "Sẵn sàng phân bổ" hiển thị 13.500.000₫ — đúng số tiền thực sự còn lại.',
    'guide.uc.connect-accounts.tip.1': 'Luôn thêm cả tiền mặt trong ví — tiền ngoài ngân hàng cũng cần được phân bổ.',
    'guide.uc.connect-accounts.tip.2': 'Với thẻ tín dụng, WNAP tự động tạo danh mục "Thanh toán thẻ" để bạn không bao giờ bị quên trả nợ.',

    // ── payday-assign (the proof-of-pattern case) ─────────────────────────────
    'guide.uc.payday-assign.title': 'Ngày lương — Phân bổ mỗi đồng (Rule 1)',
    'guide.uc.payday-assign.step.1': 'Mở Plan tab',
    'guide.uc.payday-assign.step.2': 'Kiểm tra Sẵn sàng phân bổ (RTA) > 0',
    'guide.uc.payday-assign.step.3': 'Click "+ Phân bổ"',
    'guide.uc.payday-assign.step.4': 'Chọn category và nhập số tiền',
    'guide.uc.payday-assign.step.5': 'Lặp lại đến khi RTA = 0₫',
    'guide.uc.payday-assign.example':
      'Lương 20 triệu về tài khoản. RTA hiển thị 20.000.000₫. Phân bổ 5tr cho Tiền nhà, 3tr cho Ăn uống, 2tr Đi lại… cho đến khi RTA về 0.',
    'guide.uc.payday-assign.tip.1': 'Bắt đầu từ chi phí bắt buộc (Bills) trước, sau đó Needs, cuối cùng Wants.',
    'guide.uc.payday-assign.tip.2': 'Nếu lúng túng, dùng Auto-Assign → Underfunded để phân bổ tự động dựa trên Targets.',

    // ── auto-assign (4 steps, 2 tips) ────────────────────────────────────────
    'guide.uc.auto-assign.title': 'Auto-Assign — Tự động lên kế hoạch chi tiêu',
    'guide.uc.auto-assign.step.1': 'Sau khi nhận lương, mở tab Kế hoạch và bấm "+ Phân bổ" để mở panel Auto-Assign bên phải.',
    'guide.uc.auto-assign.step.2': 'Chọn chiến lược phù hợp: "Underfunded" cho hóa đơn & tiết kiệm, "Spent Last Month" cho chi tiêu biến động như Ăn uống.',
    'guide.uc.auto-assign.step.3': 'Bấm nút chiến lược để WNAP tự động điền số tiền vào các danh mục tương ứng.',
    'guide.uc.auto-assign.step.4': 'Kiểm tra lại và điều chỉnh thủ công những danh mục đặc biệt, rồi đưa RTA về 0.',
    'guide.uc.auto-assign.example':
      'Tháng này lương 22tr. Bấm "Underfunded" → WNAP điền đủ 7tr cho Tiền nhà, 800k cho Internet, 1,2tr cho Bảo hiểm. Bấm "Spent Last Month" → Ăn uống 3,5tr, Xăng 600k. RTA còn 9tr để phân bổ tự do.',
    'guide.uc.auto-assign.tip.1': 'Dùng "Average Spent" cho các khoản theo mùa như tiền điện — tránh bị bất ngờ vào mùa hè.',
    'guide.uc.auto-assign.tip.2': '"Reset Available" cuối tháng giúp gom tiền thừa lại RTA để trả nợ hoặc đầu tư.',

    // ── record-transaction (5 steps, 2 tips) ─────────────────────────────────
    'guide.uc.record-transaction.title': 'Ghi giao dịch — Cập nhật ngay sau khi chi tiêu',
    'guide.uc.record-transaction.step.1': 'Mở tab Sổ giao dịch ngay sau khi thanh toán.',
    'guide.uc.record-transaction.step.2': 'Bấm "+ Giao dịch" và nhập ngày, số tiền, danh mục.',
    'guide.uc.record-transaction.step.3': 'Nhập ghi chú ngắn nếu cần (ví dụ: "Siêu thị Vinmart — mua tuần").',
    'guide.uc.record-transaction.step.4': 'Chọn tài khoản phù hợp (tiền mặt, ngân hàng, hay thẻ tín dụng).',
    'guide.uc.record-transaction.step.5': 'Xác nhận lưu — số dư "Khả dụng" của danh mục sẽ giảm ngay lập tức.',
    'guide.uc.record-transaction.example':
      'Anh Tuấn vừa mua xăng 150.000₫ bằng tiền mặt. Ông mở WNAP, tạo giao dịch: ngày hôm nay, 150.000₫, danh mục "Đi lại", tài khoản "Tiền mặt". Số dư Đi lại giảm từ 800k xuống còn 650k.',
    'guide.uc.record-transaction.tip.1': 'Ghi ngay tại quầy thu ngân — chờ về nhà dễ quên và mất kiểm soát chi tiêu.',
    'guide.uc.record-transaction.tip.2': 'Giao dịch "chưa khớp" (Uncleared) hiện màu xám — chúng vẫn được tính vào số dư thực tế của bạn.',

    // ── overspend-roll (4 steps, 2 tips) ─────────────────────────────────────
    'guide.uc.overspend-roll.title': 'Chi tiêu vượt mức — Roll With The Punches (Rule 3)',
    'guide.uc.overspend-roll.step.1': 'Khi thấy danh mục hiển thị màu đỏ (âm), bấm vào số âm đó.',
    'guide.uc.overspend-roll.step.2': 'Dùng bộ lọc "Overspent" để nhanh chóng tìm tất cả danh mục đang âm.',
    'guide.uc.overspend-roll.step.3': 'Bấm "Di chuyển tiền" và chọn một danh mục đang dư (màu xanh) để lấy tiền bù vào.',
    'guide.uc.overspend-roll.step.4': 'Xác nhận chuyển tiền — danh mục đỏ trở về 0 hoặc xanh, kế hoạch cân bằng trở lại.',
    'guide.uc.overspend-roll.example':
      'Chị Mai chi 500k cho nhà hàng nhưng danh mục "Ăn ngoài" chỉ còn 200k. Danh mục hiển thị đỏ -300k. Chị bấm Di chuyển tiền, lấy 300k từ "Giải trí" (đang còn 800k) bù vào. Cả hai trở về xanh.',
    'guide.uc.overspend-roll.tip.1': 'Không nên "trừng phạt" bản thân khi vượt mức — hãy điều chỉnh linh hoạt và tiếp tục.',
    'guide.uc.overspend-roll.tip.2': 'Nếu thường xuyên vượt cùng một danh mục, đó là tín hiệu bạn cần tăng ngân sách cho danh mục đó.',

    // ── reconcile (5 steps, 2 tips) ───────────────────────────────────────────
    'guide.uc.reconcile.title': 'Đối soát — Kiểm tra khớp với ngân hàng',
    'guide.uc.reconcile.step.1': 'Mở ứng dụng ngân hàng và xem số dư thực tế hiện tại.',
    'guide.uc.reconcile.step.2': 'Trong tab Sổ giao dịch, bấm nút "Đối soát" (Reconcile) ở phần tài khoản.',
    'guide.uc.reconcile.step.3': 'Nhập số dư ngân hàng vừa xem vào ô "Số dư thực tế".',
    'guide.uc.reconcile.step.4': 'Tích dấu ✓ vào từng giao dịch khớp với sao kê ngân hàng (chuyển từ xám sang xanh).',
    'guide.uc.reconcile.step.5': 'Khi số dư Cleared = số dư ngân hàng, bấm "Xác nhận đối soát" để hoàn tất.',
    'guide.uc.reconcile.example':
      'Ngân hàng báo số dư 8.500.000₫. WNAP hiển thị Cleared Balance 8.200.000₫ — chênh 300k. Kiểm tra thấy có 1 giao dịch xăng chưa tích ✓. Sau khi tích xong, hai số khớp nhau và đối soát thành công.',
    'guide.uc.reconcile.tip.1': 'Đối soát 2-3 ngày/lần giúp phát hiện lỗi nhập liệu sớm, tránh nhức đầu cuối tháng.',
    'guide.uc.reconcile.tip.2': 'Sau khi đối soát, WNAP khóa các giao dịch cũ — bạn hoàn toàn tin tưởng vào số liệu.',

    // ── use-together (4 steps, 2 tips) ───────────────────────────────────────
    'guide.uc.use-together.title': 'Dùng chung với gia đình — Đồng bộ ngân sách 2 người',
    'guide.uc.use-together.step.1': 'Người tạo ngân sách mở menu → Mời thành viên và nhận mã mời 6 chữ số.',
    'guide.uc.use-together.step.2': 'Chia sẻ mã mời cho vợ/chồng qua tin nhắn hoặc miệng.',
    'guide.uc.use-together.step.3': 'Vợ/chồng đăng nhập WNAP, chọn "Tham gia ngân sách" và nhập mã mời.',
    'guide.uc.use-together.step.4': 'Từ lúc này, cả hai thấy cùng một tab Kế hoạch — giao dịch của ai cũng cập nhật realtime cho người kia.',
    'guide.uc.use-together.example':
      'Anh Hùng tạo mã mời và nhắn cho vợ. Chị Lan nhập mã, vào app và thấy ngay toàn bộ kế hoạch tháng này. Khi anh Hùng mua xăng 200k, chị Lan thấy danh mục "Đi lại" giảm ngay trên máy mình.',
    'guide.uc.use-together.tip.1': 'Mã mời chỉ dùng một lần — tạo mã mới nếu cần mời thêm người.',
    'guide.uc.use-together.tip.2': 'Thảo luận ngân sách mỗi tuần 5 phút giúp cả hai luôn đồng thuận về mục tiêu tài chính.',

    // ── check-wallet (3 steps, 1 tip) ─────────────────────────────────────────
    'guide.uc.check-wallet.title': 'Kiểm tra ví trước khi mua sắm',
    'guide.uc.check-wallet.step.1': 'Trước khi vào siêu thị hoặc mua online, mở tab Kế hoạch.',
    'guide.uc.check-wallet.step.2': 'Bấm bộ lọc "Money Available" để xem các danh mục đang có tiền (màu xanh).',
    'guide.uc.check-wallet.step.3': 'Chỉ chi tiêu trong giới hạn số dư xanh của danh mục tương ứng.',
    'guide.uc.check-wallet.example':
      'Trước khi đi siêu thị, chị Lan mở app: "Ăn uống" còn 850k, "Đồ dùng gia đình" còn 200k. Chị biết mình có tổng cộng 1.050.000₫ để mua sắm mà không phá vỡ kế hoạch.',
    'guide.uc.check-wallet.tip.1': 'Thói quen kiểm tra này chỉ mất 10 giây nhưng ngăn được hàng triệu đồng chi tiêu ngoài kế hoạch mỗi tháng.',

    // ── snooze-target (4 steps, 1 tip) ───────────────────────────────────────
    'guide.uc.snooze-target.title': 'Tạm hoãn Target — Bỏ qua mục tiêu tháng này',
    'guide.uc.snooze-target.step.1': 'Tìm danh mục có Target bạn muốn tạm bỏ qua tháng này (ví dụ: Quỹ du lịch khi bận).',
    'guide.uc.snooze-target.step.2': 'Bấm vào cột Target của danh mục đó để mở cửa sổ chỉnh sửa Target.',
    'guide.uc.snooze-target.step.3': 'Bấm nút "Tạm hoãn" (Snooze) — danh mục sẽ chuyển sang màu xám và không còn hiện trong bộ lọc "Underfunded".',
    'guide.uc.snooze-target.step.4': 'Tháng sau hoặc khi sẵn sàng, bấm lại Target → "Bỏ tạm hoãn" để Target hoạt động trở lại.',
    'guide.uc.snooze-target.example':
      'Tháng này bận việc, anh Nam không muốn phân bổ tiền cho "Quỹ du lịch 5tr". Ông Snooze danh mục đó — RTA không bị "đòi" 5tr nữa, và bộ lọc Underfunded cũng không còn báo đỏ cho danh mục này.',
    'guide.uc.snooze-target.tip.1': 'Snooze giúp bạn linh hoạt mà không cần xóa Target — mục tiêu vẫn được lưu nguyên vẹn khi bạn quay lại.',

    // ── move-money (4 steps, 1 tip) ───────────────────────────────────────────
    'guide.uc.move-money.title': 'Di chuyển tiền — Tái phân bổ giữa các danh mục',
    'guide.uc.move-money.step.1': 'Trong tab Kế hoạch, bấm vào số dư (cột "Khả dụng") của danh mục có tiền dư muốn lấy.',
    'guide.uc.move-money.step.2': 'Cửa sổ "Di chuyển tiền" mở ra, hiển thị danh mục nguồn và số dư hiện tại.',
    'guide.uc.move-money.step.3': 'Chọn danh mục đích từ danh sách thả xuống, rồi nhập số tiền cần chuyển.',
    'guide.uc.move-money.step.4': 'Bấm "Xác nhận" — số dư nguồn giảm, số dư đích tăng tương ứng.',
    'guide.uc.move-money.example':
      '"Giải trí" còn 1.200.000₫ nhưng "Ăn uống" đang âm -300k. Mở Di chuyển tiền, nguồn: Giải trí, đích: Ăn uống, số tiền: 300.000₫. Sau xác nhận, Giải trí còn 900k, Ăn uống về 0.',
    'guide.uc.move-money.tip.1': 'Di chuyển tiền không làm thay đổi tổng ngân sách — chỉ là phân phối lại giữa các "hũ".',

    // ── invite-member (4 steps, 2 tips) ──────────────────────────────────────
    'guide.uc.invite-member.title': 'Mời thành viên — Chia sẻ ngân sách gia đình',
    'guide.uc.invite-member.step.1': 'Bấm vào menu người dùng (góc trên phải) và chọn "Mời thành viên".',
    'guide.uc.invite-member.step.2': 'Hệ thống tự động tạo mã mời 6 chữ số — bấm để sao chép mã.',
    'guide.uc.invite-member.step.3': 'Gửi mã cho người muốn mời. Họ đăng ký WNAP, chọn "Tham gia ngân sách" và nhập mã.',
    'guide.uc.invite-member.step.4': 'Sau khi tham gia, cả hai cùng thấy và chỉnh sửa ngân sách trong thời gian thực.',
    'guide.uc.invite-member.example':
      'Anh Đức bấm "Mời thành viên", nhận mã 482-917, nhắn cho vợ qua Zalo. Chị nhập mã khi đăng ký lần đầu, vào app và thấy ngay toàn bộ kế hoạch tháng mà anh đã thiết lập.',
    'guide.uc.invite-member.tip.1': 'Mã mời hết hạn sau khi dùng — nếu cần mời thêm người, bấm "Tạo mã mới" trong cùng hộp thoại.',
    'guide.uc.invite-member.tip.2': 'Mọi thành viên đều có quyền xem và chỉnh sửa — hãy chỉ mời người bạn tin tưởng.',

    // ── filter-cards (5 steps, 2 tips) ───────────────────────────────────────
    'guide.uc.filter-cards.title': 'Bộ lọc — Tập trung vào danh mục cần xử lý',
    'guide.uc.filter-cards.step.1': 'Trong tab Kế hoạch, nhìn hàng thẻ lọc ngay phía trên bảng danh mục.',
    'guide.uc.filter-cards.step.2': 'Bấm thẻ "Overspent" (đỏ) để chỉ hiển thị các danh mục đang âm — cần bổ sung tiền ngay.',
    'guide.uc.filter-cards.step.3': 'Bấm thẻ "Underfunded" (vàng) để xem các danh mục chưa đủ so với Target tháng này.',
    'guide.uc.filter-cards.step.4': 'Bấm thẻ "Overfunded" để tìm các danh mục có tiền dư — có thể di chuyển sang nơi cần hơn.',
    'guide.uc.filter-cards.step.5': 'Bấm lại thẻ đang chọn để tắt bộ lọc và xem toàn bộ danh mục trở lại.',
    'guide.uc.filter-cards.example':
      'Đầu tháng, anh Bình bấm "Underfunded" — thấy 5 danh mục chưa đủ tiền. Ông bấm "Overfunded" — thấy "Giải trí" dư 600k. Ông di chuyển 600k từ Giải trí chia đều cho 5 danh mục thiếu. Xong, bộ lọc Underfunded báo 0.',
    'guide.uc.filter-cards.tip.1': 'Bộ lọc "Money Available" giúp bạn thấy ngay đâu còn tiền để chi tiêu trước khi mua sắm.',
    'guide.uc.filter-cards.tip.2': 'Thẻ "Snoozed" cho thấy những danh mục đang tạm hoãn Target — nhớ bật lại khi cần.',
  },
  en: {
    'guide.modal.title': 'WNAP User Guide',
    'guide.sidebar.overview': '🗺️ Overview',
    'guide.sidebar.extras': 'Extra features',
    'guide.phase.setup': 'Phase 1: Setup',
    'guide.phase.assign': 'Phase 2: Assigning',
    'guide.phase.daily': 'Phase 3: Daily activity',
    'guide.phase.maint': 'Phase 4: Maintenance',
    'guide.phase.family': 'Phase 5: Family sync',
    'guide.section.steps': 'Steps',
    'guide.section.example': 'Example',
    'guide.section.tips': '💡 Tips',

    // ── design-categories (5 steps, 2 tips) ──────────────────────────────────
    'guide.uc.design-categories.title': 'Design your categories — Build your family "money jars"',
    'guide.uc.design-categories.step.1': 'Open the Plan tab and click "Add group" to create your first category group.',
    'guide.uc.design-categories.step.2': 'Create a "Fixed Bills" group and add categories: Rent, Utilities, Internet, Insurance.',
    'guide.uc.design-categories.step.3': 'Create a "Daily Needs" group: Groceries, Transport, Baby supplies.',
    'guide.uc.design-categories.step.4': 'Create a "True Expenses" group: Car repairs, Medical, Gifts (large but infrequent costs).',
    'guide.uc.design-categories.step.5': 'Create a "Personal / Fun" group: individual spending money for each partner.',
    'guide.uc.design-categories.example':
      'The Nguyen family earns 30M/month. They create 4 groups: Fixed Bills (12M), Daily Needs (8M), True Expenses (5M), Personal (5M). Every single dong has a clear destination.',
    'guide.uc.design-categories.tip.1': 'Start simple with 10–15 categories — you can always add more as you get comfortable.',
    'guide.uc.design-categories.tip.2': 'Give each partner their own "personal spending" category to eliminate arguments over individual purchases.',

    // ── connect-accounts (4 steps, 2 tips) ───────────────────────────────────
    'guide.uc.connect-accounts.title': 'Connect accounts — Put all your money in one place',
    'guide.uc.connect-accounts.step.1': 'Open the settings menu and choose "Add account".',
    'guide.uc.connect-accounts.step.2': 'Add your bank accounts, e-wallets (MoMo, ZaloPay), and cash.',
    'guide.uc.connect-accounts.step.3': 'Add credit cards if you have them — WNAP will automatically reserve money from your spending categories to ensure you can always pay the balance.',
    'guide.uc.connect-accounts.step.4': 'Verify that each account\'s starting balance matches the real balance.',
    'guide.uc.connect-accounts.example':
      'Lan has a Vietcombank account (15M), MoMo wallet (500k), cash (1M), and a Techcombank credit card (3M owed). After adding all accounts, "Ready to Assign" shows 13,500,000₫ — exactly what she truly has available.',
    'guide.uc.connect-accounts.tip.1': 'Always add cash in your wallet — money outside the bank still needs a job.',
    'guide.uc.connect-accounts.tip.2': 'For credit cards, WNAP auto-creates a payment category so you never forget to pay the balance.',

    // ── payday-assign (the proof-of-pattern case) ─────────────────────────────
    'guide.uc.payday-assign.title': 'Payday — Give every dollar a job (Rule 1)',
    'guide.uc.payday-assign.step.1': 'Open the Plan tab',
    'guide.uc.payday-assign.step.2': 'Check that Ready to Assign (RTA) > 0',
    'guide.uc.payday-assign.step.3': 'Click "+ Assign"',
    'guide.uc.payday-assign.step.4': 'Pick a category and enter an amount',
    'guide.uc.payday-assign.step.5': 'Repeat until RTA reaches 0',
    'guide.uc.payday-assign.example':
      'Salary of 20M arrives. RTA shows 20,000,000₫. Assign 5M to Rent, 3M to Food, 2M to Transport… until RTA reaches 0.',
    'guide.uc.payday-assign.tip.1': 'Start with mandatory Bills, then Needs, then Wants.',
    'guide.uc.payday-assign.tip.2': 'If stuck, use Auto-Assign → Underfunded to allocate automatically based on Targets.',

    // ── auto-assign (4 steps, 2 tips) ────────────────────────────────────────
    'guide.uc.auto-assign.title': 'Auto-Assign — Let WNAP fill your plan automatically',
    'guide.uc.auto-assign.step.1': 'After payday, open the Plan tab and click "+ Assign" to open the Auto-Assign panel on the right.',
    'guide.uc.auto-assign.step.2': 'Pick the right strategy: "Underfunded" for bills and savings targets, "Spent Last Month" for variable spending like groceries.',
    'guide.uc.auto-assign.step.3': 'Click the strategy button and WNAP fills the matching categories automatically.',
    'guide.uc.auto-assign.step.4': 'Review and manually adjust any special categories, then bring RTA to zero.',
    'guide.uc.auto-assign.example':
      'This month\'s salary is 22M. Click "Underfunded" → WNAP fills 7M for Rent, 800k for Internet, 1.2M for Insurance. Click "Spent Last Month" → Groceries 3.5M, Petrol 600k. RTA still has 9M left to assign freely.',
    'guide.uc.auto-assign.tip.1': 'Use "Average Spent" for seasonal bills like electricity — no more summer surprises.',
    'guide.uc.auto-assign.tip.2': '"Reset Available" at month-end sweeps leftover money back to RTA for debt or investing.',

    // ── record-transaction (5 steps, 2 tips) ─────────────────────────────────
    'guide.uc.record-transaction.title': 'Record a transaction — Log it the moment you spend',
    'guide.uc.record-transaction.step.1': 'Open the Ledger tab immediately after paying.',
    'guide.uc.record-transaction.step.2': 'Tap "+ Transaction" and enter the date, amount, and category.',
    'guide.uc.record-transaction.step.3': 'Add a short note if useful (e.g. "Vinmart — weekly groceries").',
    'guide.uc.record-transaction.step.4': 'Choose the correct account (cash, bank, or credit card).',
    'guide.uc.record-transaction.step.5': 'Confirm to save — the category\'s "Available" balance drops immediately.',
    'guide.uc.record-transaction.example':
      'Tuan just paid 150,000₫ for petrol in cash. He opens WNAP, logs: today\'s date, 150,000₫, category "Transport", account "Cash". Transport drops from 800k to 650k instantly.',
    'guide.uc.record-transaction.tip.1': 'Log it at the checkout counter — waiting until you get home means forgotten transactions and lost control.',
    'guide.uc.record-transaction.tip.2': 'Uncleared transactions show in grey but are still counted in your real balance.',

    // ── overspend-roll (4 steps, 2 tips) ─────────────────────────────────────
    'guide.uc.overspend-roll.title': 'Overspending — Roll With The Punches (Rule 3)',
    'guide.uc.overspend-roll.step.1': 'When a category shows red (negative balance), click on the red number.',
    'guide.uc.overspend-roll.step.2': 'Use the "Overspent" filter card to instantly find all negative categories.',
    'guide.uc.overspend-roll.step.3': 'Click "Move Money" and choose an overfunded (green) category to pull from.',
    'guide.uc.overspend-roll.step.4': 'Confirm the transfer — the red category returns to zero or green, and your plan is balanced again.',
    'guide.uc.overspend-roll.example':
      'Mai spent 500k at a restaurant but "Dining Out" only had 200k left — it shows red at -300k. She clicks Move Money, pulls 300k from "Entertainment" (which has 800k), and covers it. Both categories are green again.',
    'guide.uc.overspend-roll.tip.1': 'Don\'t punish yourself for overspending — adjust, cover it, and keep going.',
    'guide.uc.overspend-roll.tip.2': 'If the same category goes red every month, that\'s a signal to increase its budget permanently.',

    // ── reconcile (5 steps, 2 tips) ───────────────────────────────────────────
    'guide.uc.reconcile.title': 'Reconcile — Match your records to the bank',
    'guide.uc.reconcile.step.1': 'Open your banking app and note the current real balance.',
    'guide.uc.reconcile.step.2': 'In the Ledger tab, click the "Reconcile" button in the account section.',
    'guide.uc.reconcile.step.3': 'Enter the bank\'s balance in the "Actual balance" field.',
    'guide.uc.reconcile.step.4': 'Check ✓ each transaction that appears in your bank statement (grey turns green).',
    'guide.uc.reconcile.step.5': 'When Cleared balance equals the bank balance, click "Confirm reconciliation" to finish.',
    'guide.uc.reconcile.example':
      'Bank shows 8,500,000₫. WNAP\'s Cleared Balance is 8,200,000₫ — a 300k gap. Turns out one petrol transaction wasn\'t checked. After ticking it, both numbers match and reconciliation is complete.',
    'guide.uc.reconcile.tip.1': 'Reconcile every 2–3 days to catch entry errors early — much easier than fixing a month of mistakes.',
    'guide.uc.reconcile.tip.2': 'After reconciling, WNAP locks those transactions so you can fully trust your numbers.',

    // ── use-together (4 steps, 2 tips) ───────────────────────────────────────
    'guide.uc.use-together.title': 'Budget together — Sync one plan across two phones',
    'guide.uc.use-together.step.1': 'The budget owner opens the menu → Invite member and gets a 6-digit code.',
    'guide.uc.use-together.step.2': 'Share the code with your partner via message or in person.',
    'guide.uc.use-together.step.3': 'Your partner signs in to WNAP, selects "Join a budget", and enters the code.',
    'guide.uc.use-together.step.4': 'From this point on, both of you see the same Plan tab — any transaction either person logs updates in real time for the other.',
    'guide.uc.use-together.example':
      'Hung generates the invite code and sends it to his wife. Lan enters the code on first sign-in and immediately sees the full monthly plan Hung already set up. When Hung logs 200k for petrol, Lan sees "Transport" drop on her own screen.',
    'guide.uc.use-together.tip.1': 'The invite code is single-use — generate a new one if you need to add another person.',
    'guide.uc.use-together.tip.2': 'A quick 5-minute weekly budget check-in keeps both partners aligned on financial goals.',

    // ── check-wallet (3 steps, 1 tip) ─────────────────────────────────────────
    'guide.uc.check-wallet.title': 'Check your wallet — Know your limit before you shop',
    'guide.uc.check-wallet.step.1': 'Before heading to the store or shopping online, open the Plan tab.',
    'guide.uc.check-wallet.step.2': 'Tap the "Money Available" filter to see only categories with money (shown in green).',
    'guide.uc.check-wallet.step.3': 'Spend only within the green balance of the relevant category.',
    'guide.uc.check-wallet.example':
      'Before grocery shopping, Lan checks the app: "Groceries" has 850k, "Household" has 200k. She knows her total shopping budget is 1,050,000₫ — no guessing, no guilt.',
    'guide.uc.check-wallet.tip.1': 'This 10-second habit can prevent millions of unplanned spending every single month.',

    // ── snooze-target (4 steps, 1 tip) ───────────────────────────────────────
    'guide.uc.snooze-target.title': 'Snooze a target — Skip this month without deleting it',
    'guide.uc.snooze-target.step.1': 'Find the category with a Target you want to skip this month (e.g. Travel Fund when you\'re too busy).',
    'guide.uc.snooze-target.step.2': 'Click the Target column for that category to open the Target editor.',
    'guide.uc.snooze-target.step.3': 'Click "Snooze" — the category turns grey and disappears from the "Underfunded" filter.',
    'guide.uc.snooze-target.step.4': 'Next month (or whenever you\'re ready), open the Target editor again and click "Unsnooze" to reactivate.',
    'guide.uc.snooze-target.example':
      'Nam is too busy this month to fund his 5M Travel target. He snoozes it — RTA stops demanding that 5M, and the Underfunded filter no longer shows it as a problem.',
    'guide.uc.snooze-target.tip.1': 'Snooze keeps your target intact — the goal is preserved exactly as set, ready to resume whenever you like.',

    // ── move-money (4 steps, 1 tip) ───────────────────────────────────────────
    'guide.uc.move-money.title': 'Move money — Redistribute between categories',
    'guide.uc.move-money.step.1': 'In the Plan tab, click the balance (Available column) of the category you want to pull money from.',
    'guide.uc.move-money.step.2': 'The "Move Money" dialog opens, showing the source category and its current balance.',
    'guide.uc.move-money.step.3': 'Select the destination category from the dropdown, then enter the amount to transfer.',
    'guide.uc.move-money.step.4': 'Click "Confirm" — the source balance decreases and the destination balance increases by the same amount.',
    'guide.uc.move-money.example':
      '"Entertainment" has 1,200,000₫ but "Groceries" is at -300k. Open Move Money, source: Entertainment, destination: Groceries, amount: 300,000₫. After confirming, Entertainment sits at 900k and Groceries is back to zero.',
    'guide.uc.move-money.tip.1': 'Moving money never changes your total budget — it only reshuffles money between jars.',

    // ── invite-member (4 steps, 2 tips) ──────────────────────────────────────
    'guide.uc.invite-member.title': 'Invite a member — Share the family budget',
    'guide.uc.invite-member.step.1': 'Click the user menu (top-right corner) and select "Invite member".',
    'guide.uc.invite-member.step.2': 'The system auto-generates a 6-digit invite code — click to copy it.',
    'guide.uc.invite-member.step.3': 'Send the code to the person you want to invite. They sign up for WNAP, choose "Join a budget", and enter the code.',
    'guide.uc.invite-member.step.4': 'Once they join, both of you can view and edit the budget in real time.',
    'guide.uc.invite-member.example':
      'Duc clicks "Invite member", receives code 482-917, and sends it to his wife on Zalo. She enters the code on first sign-up, opens the app, and immediately sees the full monthly plan Duc already built.',
    'guide.uc.invite-member.tip.1': 'The code expires after use — click "Generate new code" in the same dialog if you need to invite someone else.',
    'guide.uc.invite-member.tip.2': 'All members have full read and edit access — only invite people you trust.',

    // ── filter-cards (5 steps, 2 tips) ───────────────────────────────────────
    'guide.uc.filter-cards.title': 'Filter cards — Focus on what needs attention',
    'guide.uc.filter-cards.step.1': 'In the Plan tab, look at the row of filter cards just above the category table.',
    'guide.uc.filter-cards.step.2': 'Click "Overspent" (red) to show only categories with a negative balance — they need funding now.',
    'guide.uc.filter-cards.step.3': 'Click "Underfunded" (yellow) to see categories that haven\'t yet reached their Target this month.',
    'guide.uc.filter-cards.step.4': 'Click "Overfunded" to find categories with surplus money you could move elsewhere.',
    'guide.uc.filter-cards.step.5': 'Click the active filter card again to turn it off and show all categories.',
    'guide.uc.filter-cards.example':
      'At the start of the month, Binh clicks "Underfunded" — 5 categories need more money. He clicks "Overfunded" — Entertainment has 600k to spare. He moves that 600k evenly across the 5 short categories. The Underfunded filter now shows 0.',
    'guide.uc.filter-cards.tip.1': 'The "Money Available" filter is perfect for a quick pre-shopping check — see at a glance where you still have room.',
    'guide.uc.filter-cards.tip.2': 'The "Snoozed" card shows all paused targets — remember to unsnooze them when you\'re ready to fund them again.',
  },
} as const;

export type GuideTKey = keyof typeof guideDict['vi'];
