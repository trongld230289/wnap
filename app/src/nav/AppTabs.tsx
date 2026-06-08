export type AppTab = 'plan' | 'ledger';

export function AppTabs({ tab, onChange }: { tab: AppTab; onChange: (t: AppTab) => void }) {
  const item = (id: AppTab, label: string) => (
    <button
      onClick={() => onChange(id)}
      style={{
        padding: '8px 16px', border: 0, background: 'none', cursor: 'pointer',
        color: tab === id ? '#1f9d55' : '#888',
        fontWeight: tab === id ? 700 : 400,
        borderBottom: tab === id ? '2px solid #1f9d55' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e3e3e6', maxWidth: 980, margin: '8px auto 0', fontFamily: 'sans-serif' }}>
      {item('plan', 'Kế hoạch')}
      {item('ledger', 'Sổ giao dịch')}
    </div>
  );
}
