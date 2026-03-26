export default function HomeScreen({ onCreateGame, onJoinGame }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--color-primary)' }}>
        Der Die Das
      </h1>
      <p style={{ color: 'var(--color-text-light)', marginBottom: '32px', fontSize: '1.1rem' }}>
        Master German noun articles!
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button className="btn-primary" onClick={onCreateGame}>
          Create Game
        </button>
        <button
          onClick={onJoinGame}
          style={{ background: 'var(--color-der)', color: 'white' }}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}
