export interface RawActionLog {
  id: number;
  user_id: string | null;
  entity_ref: { category_id: string; month: string } | null;
  old_value: number | null;
  new_value: number | null;
  created_at: string;
}

export interface BudgetMember { user_id: string; display_name: string; }

export interface ActionLogEntry {
  id: number;
  userName: string;
  categoryId: string;
  month: string;
  oldValue: number | null;
  newValue: number;
  at: string;
}

/** Map dòng action_log + danh sách thành viên → entry đã có tên người. */
export function mapActionLog(rows: RawActionLog[], members: BudgetMember[]): ActionLogEntry[] {
  const nameById = new Map(members.map((m) => [m.user_id, m.display_name]));
  return rows.map((r) => ({
    id: r.id,
    userName: r.user_id ? nameById.get(r.user_id) ?? '(?)' : '(?)',
    categoryId: r.entity_ref?.category_id ?? '',
    month: r.entity_ref?.month ?? '',
    oldValue: r.old_value,
    newValue: r.new_value ?? 0,
    at: r.created_at,
  }));
}
