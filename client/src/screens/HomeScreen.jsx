export default function HomeScreen({ onCreateGame, onJoinGame }) {
  return (
    <div className="card" style={{ textAlign: 'center', overflow: 'hidden' }}>
      <div style={{ fontSize: '3rem', marginBottom: '4px' }}>
        <span style={{ color: 'var(--color-der)', fontWeight: 800 }}>Der </span>
        <span style={{ color: 'var(--color-die)', fontWeight: 800 }}>Die </span>
        <span style={{ color: 'var(--color-das)', fontWeight: 800 }}>Das</span>
      </div>
      <p style={{ color: 'var(--color-text-light)', marginBottom: '12px', fontSize: '1.1rem' }}>
        Master German noun articles!
      </p>
      <div style={{ fontSize: '2.5rem', marginBottom: '24px' }}>
        &#x1F1E9;&#x1F1EA;
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button className="btn-primary" onClick={onCreateGame} style={{ fontSize: '1.2rem', padding: '18px 28px' }}>
          Create Game
        </button>
        <button
          onClick={onJoinGame}
          style={{ background: 'var(--color-der)', color: 'white', fontSize: '1.2rem', padding: '18px 28px' }}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}
