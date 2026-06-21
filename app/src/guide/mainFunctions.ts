export type MmLang = 'vi' | 'en';

const VI = `mindmap
  root((📊 WNAP))
    🎯 Lập kế hoạch
      Danh mục & Nhóm
      Sẵn sàng phân bổ
      Mục tiêu
        Để dành
        Đắp đầy
        Có đủ trước hạn
      Auto-Assign
      Move Money
      Snooze
      Bộ lọc trạng thái
    📓 Sổ giao dịch
      Tài khoản
      Giao dịch
        Chi tiêu
        Thu nhập
        Chuyển khoản
      Đối soát
    👨‍👩‍👧 Gia đình
      Mời thành viên
      Cùng quản lý ngân sách`;

const EN = `mindmap
  root((📊 WNAP))
    🎯 Plan
      Categories & Groups
      Ready to Assign
      Targets
        Set aside
        Refill
        Have balance by date
      Auto-Assign
      Move Money
      Snooze
      Status filters
    📓 Ledger
      Accounts
      Transactions
        Outflow
        Inflow
        Transfer
      Reconcile
    👨‍👩‍👧 Family
      Invite member
      Shared budget`;

export function buildMindmapSource(lang: MmLang): string {
  return lang === 'en' ? EN : VI;
}

// Maps a leaf label (in either lang) to the use case id it should navigate to.
// Leaves without a matching case (e.g. "Ready to Assign") are intentionally absent.
export const LEAF_TO_USECASE: Readonly<Record<string, string>> = {
  // vi labels
  'Danh mục & Nhóm': 'design-categories',
  'Tài khoản': 'connect-accounts',
  'Auto-Assign': 'auto-assign',
  'Move Money': 'move-money',
  'Snooze': 'snooze-target',
  'Bộ lọc trạng thái': 'filter-cards',
  'Đối soát': 'reconcile',
  'Mời thành viên': 'invite-member',
  'Cùng quản lý ngân sách': 'use-together',
  // en labels
  'Categories & Groups': 'design-categories',
  'Accounts': 'connect-accounts',
  'Status filters': 'filter-cards',
  'Reconcile': 'reconcile',
  'Invite member': 'invite-member',
  'Shared budget': 'use-together',
};
