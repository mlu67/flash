export default function Scoreboard({ players, currentPlayerId }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      justifyContent: 'center',
      marginTop: '16px',
    }}>
      {sorted.map(p => (
        <div
          key={p.id}
          style={{
            background: p.id === currentPlayerId ? 'var(--color-primary)' : 'var(--color-bg)',
            color: p.id === currentPlayerId ? 'white' : 'var(--color-text)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        >
          {p.name}: {p.score}
        </div>
      ))}
    </div>
  );
}
