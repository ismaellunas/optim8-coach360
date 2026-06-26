import { C, ff, I } from '../ui/index.js';

export default function TabBar({ tabs, tab, setTab }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        background: 'rgba(12,12,16,.92)',
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${C.ln}`,
        display: 'flex',
        padding: '6px 4px 28px',
        zIndex: 100,
      }}
      className="tab-bar"
    >
      {tabs.map((t, i) => (
        <button
          key={i}
          onClick={() => setTab(i)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '8px 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            minHeight: 48,
          }}
        >
          {tab === i && (
            <div style={{ position: 'absolute', top: 0, width: 28, height: 3, borderRadius: 2, background: C.br }} />
          )}
          <I n={t.i} s={22} c={tab === i ? C.br : C.dim} />
          <span style={{ fontSize: 10, color: tab === i ? C.br : C.dim, fontWeight: tab === i ? 700 : 500, fontFamily: ff }}>
            {t.l}
          </span>
          {t.l === 'Chat' && (
            <div
              style={{
                position: 'absolute',
                top: 4,
                right: '50%',
                marginRight: -15,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: C.br,
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
