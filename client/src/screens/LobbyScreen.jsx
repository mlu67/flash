import socket from '../socket';

const playerColors = ['#2196f3', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#ff5722', '#3f51b5'];

export default function LobbyScreen({ roomCode, players, isHost }) {
  function handleStart() {
    socket.emit('start-game', { roomCode });
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode);
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--color-primary)', marginBottom: '8px', fontSize: '1.6rem' }}>Game Lobby</h2>
      <div
        onClick={handleCopyCode}
        style={{
          fontSize: '2.2rem',
          fontWeight: 800,
          letterSpacing: '8px',
          background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)',
          borderRadius: 'var(--radius-sm)',
          padding: '20px',
          cursor: 'pointer',
          marginBottom: '8px',
          border: '3px dashed var(--color-primary)',
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
          {players.map((p, i) => (
            <div
              key={p.id}
              className="player-slide"
              style={{
                background: `${playerColors[i % playerColors.length]}15`,
                borderLeft: `4px solid ${playerColors[i % playerColors.length]}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                fontWeight: 700,
                fontSize: '1.05rem',
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {p.name} {p.id === players[0]?.id ? '(Host)' : ''}
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button className="btn-primary" onClick={handleStart} style={{ width: '100%', fontSize: '1.2rem', padding: '18px' }}>
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
