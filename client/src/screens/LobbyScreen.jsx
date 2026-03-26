import socket from '../socket';

export default function LobbyScreen({ roomCode, players, isHost }) {
  function handleStart() {
    socket.emit('start-game', { roomCode });
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode);
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>Game Lobby</h2>
      <div
        onClick={handleCopyCode}
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '6px',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          cursor: 'pointer',
          marginBottom: '8px',
        }}
        title="Click to copy"
      >
        {roomCode}
      </div>
      <p style={{ color: 'var(--color-text-light)', marginBottom: '24px', fontSize: '0.85rem' }}>
        Tap code to copy &middot; Share with friends to join
      </p>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '12px' }}>Players ({players.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {players.map(p => (
            <div
              key={p.id}
              style={{
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 16px',
                fontWeight: 600,
              }}
            >
              {p.name} {p.id === players[0]?.id ? '(Host)' : ''}
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button className="btn-primary" onClick={handleStart} style={{ width: '100%' }}>
          Start Game
        </button>
      ) : (
        <p style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>
          Waiting for host to start...
        </p>
      )}
    </div>
  );
}
