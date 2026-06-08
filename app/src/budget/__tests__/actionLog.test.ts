import { expect, test } from 'vitest';
import { mapActionLog } from '../actionLog';

const members = [
  { user_id: 'u1', display_name: 'Chồng' },
  { user_id: 'u2', display_name: 'Vợ' },
];

test('map raw → entry, resolve tên người', () => {
  const rows = [
    { id: 2, user_id: 'u2', entity_ref: { category_id: 'c1', month: '2026-06' }, old_value: 100, new_value: 300, created_at: '2026-06-09T10:00:00Z' },
    { id: 1, user_id: 'u1', entity_ref: { category_id: 'c2', month: '2026-06' }, old_value: null, new_value: 500, created_at: '2026-06-09T09:00:00Z' },
  ];
  expect(mapActionLog(rows, members)).toEqual([
    { id: 2, userName: 'Vợ', categoryId: 'c1', month: '2026-06', oldValue: 100, newValue: 300, at: '2026-06-09T10:00:00Z' },
    { id: 1, userName: 'Chồng', categoryId: 'c2', month: '2026-06', oldValue: null, newValue: 500, at: '2026-06-09T09:00:00Z' },
  ]);
});

test('user lạ / null → (?)', () => {
  const rows = [
    { id: 3, user_id: 'ghost', entity_ref: { category_id: 'c1', month: '2026-06' }, old_value: 0, new_value: 50, created_at: 't' },
    { id: 4, user_id: null, entity_ref: { category_id: 'c1', month: '2026-06' }, old_value: 0, new_value: 50, created_at: 't' },
  ];
  expect(mapActionLog(rows, members).map((e) => e.userName)).toEqual(['(?)', '(?)']);
});

test('entity_ref null → categoryId rỗng, newValue null → 0', () => {
  const rows = [{ id: 5, user_id: 'u1', entity_ref: null, old_value: null, new_value: null, created_at: 't' }];
  expect(mapActionLog(rows, members)[0]).toMatchObject({ categoryId: '', month: '', newValue: 0 });
});
