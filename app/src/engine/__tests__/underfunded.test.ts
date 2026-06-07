import { expect, test } from 'vitest';
import { proposeUnderfunded } from '../autoAssign';
import type { PlanRow, Target } from '../types';

function row(p: Partial<PlanRow> & { categoryId: string }): PlanRow {
  return {
    kind: 'other', startBalance: 0, assigned: 0, activity: 0,
    available: 0, target: null, needed: 0, snoozed: false, ...p,
  };
}
const bill = (categoryId: string, amount: number, dueDay: number): Target =>
  ({ categoryId, strategy: 'set_aside', amount, cadence: 'monthly', dueDay });
const monthly = (categoryId: string, amount: number): Target =>
  ({ categoryId, strategy: 'set_aside', amount, cadence: 'monthly' });

// Scenario "Partial Fill" từ spec module-A-smart-addOn §2: RTA 500, tổng cần 1000
function scenarioRows(): PlanRow[] {
  return [
    row({ categoryId: 'tv', kind: 'other', available: -50, activity: -50 }), // Red
    row({ categoryId: 'rent', kind: 'bill', target: bill('rent', 400, 1), needed: 400 }),
    row({ categoryId: 'internet', kind: 'bill', target: bill('internet', 150, 15), needed: 150 }),
    row({ categoryId: 'groceries', kind: 'need', target: monthly('groceries', 300), needed: 300 }),
    row({ categoryId: 'saving', kind: 'saving', target: monthly('saving', 100), needed: 100 }),
  ];
}

test('partial fill theo đúng priority stack, dừng khi hết RTA', () => {
  const out = proposeUnderfunded(scenarioRows(), 500);
  // ① Red tv: cover 50 (newAssigned 0 + 50)  → còn 450
  // ② rent (bill, due 1): 400                 → còn 50
  // ③ internet (bill, due 15): 50/150 partial → còn 0
  // groceries, saving: không được gì
  expect(out).toEqual([
    { categoryId: 'tv', newAssigned: 50 },
    { categoryId: 'rent', newAssigned: 400 },
    { categoryId: 'internet', newAssigned: 50 },
  ]);
});

test('RTA dư thì fill đủ tất cả', () => {
  const out = proposeUnderfunded(scenarioRows(), 2_000);
  expect(out).toEqual([
    { categoryId: 'tv', newAssigned: 50 },
    { categoryId: 'rent', newAssigned: 400 },
    { categoryId: 'internet', newAssigned: 150 },
    { categoryId: 'groceries', newAssigned: 300 },
    { categoryId: 'saving', newAssigned: 100 },
  ]);
});

test('RTA = 0 → không đề xuất gì', () => {
  expect(proposeUnderfunded(scenarioRows(), 0)).toEqual([]);
});

test('bill due sớm hơn được ưu tiên trong cùng kind', () => {
  const rows = [
    row({ categoryId: 'late', kind: 'bill', target: bill('late', 100, 25), needed: 100 }),
    row({ categoryId: 'early', kind: 'bill', target: bill('early', 100, 5), needed: 100 }),
  ];
  expect(proposeUnderfunded(rows, 100)).toEqual([{ categoryId: 'early', newAssigned: 100 }]);
});

test('category vừa red vừa có target: cover trước, toGo xếp theo kind', () => {
  const rows = [
    row({ categoryId: 'food', kind: 'need', available: -100, activity: -100,
          target: monthly('food', 200), needed: 200 }),
    row({ categoryId: 'rent', kind: 'bill', target: bill('rent', 300, 1), needed: 300 }),
  ];
  // RTA 450: cover food 100 → rent 300 → food toGo 50/200
  expect(proposeUnderfunded(rows, 450)).toEqual([
    { categoryId: 'food', newAssigned: 150 }, // 100 cover + 50 partial toGo
    { categoryId: 'rent', newAssigned: 300 },
  ]);
});

test('snoozed không được fill', () => {
  const rows = [
    row({ categoryId: 'vac', kind: 'saving', target: monthly('vac', 200), needed: 0, snoozed: true }),
  ];
  expect(proposeUnderfunded(rows, 500)).toEqual([]);
});

test('red lớn hơn RTA → cover một phần, vẫn đỏ', () => {
  const rows = [row({ categoryId: 'tv', kind: 'other', available: -500, activity: -500 })];
  expect(proposeUnderfunded(rows, 100)).toEqual([{ categoryId: 'tv', newAssigned: 100 }]);
});

test('RTA vừa khít tổng demand → fill đủ, không thừa', () => {
  const out = proposeUnderfunded(scenarioRows(), 1_000); // 50+400+150+300+100
  expect(out).toEqual([
    { categoryId: 'tv', newAssigned: 50 },
    { categoryId: 'rent', newAssigned: 400 },
    { categoryId: 'internet', newAssigned: 150 },
    { categoryId: 'groceries', newAssigned: 300 },
    { categoryId: 'saving', newAssigned: 100 },
  ]);
});

test('snoozed + red: vẫn được cover overspend, không fill toGo', () => {
  const rows = [
    row({ categoryId: 'vac', kind: 'saving', available: -80, activity: -80,
          target: monthly('vac', 200), needed: 0, snoozed: true }),
  ];
  expect(proposeUnderfunded(rows, 500)).toEqual([{ categoryId: 'vac', newAssigned: 80 }]);
});
