const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

export default function Leaderboard({ players }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {players.map((p, i) => (
        <div
          key={p.id}
          style={{
            background: i === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'var(--color-bg)',
            color: i === 0 ? 'white' : 'var(--color-text)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: i === 0 ? 800 : 600,
            fontSize: i === 0 ? '1.1rem' : '1rem',
          }}
        >
          <div>
            <span style={{ marginRight: '8px' }}>{medals[i] || `#${i + 1}`}</span>
            {p.name}
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{p.score} pts</div>
            <div style={{ opacity: 0.8 }}>
              {p.accuracy}% acc &middot; {p.timeouts} timeouts
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
