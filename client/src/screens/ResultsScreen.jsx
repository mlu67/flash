import socket from '../socket';
import Leaderboard from '../components/Leaderboard';

export default function ResultsScreen({ roomCode, players, isHost }) {
  function handlePlayAgain() {
    socket.emit('play-again', { roomCode });
  }

  function handleEndGame() {
    socket.emit('end-game', { roomCode });
  }

  return (
    <div className="card">
      <h2 style={{ textAlign: 'center', color: 'var(--color-primary)', marginBottom: '24px' }}>
        Results
      </h2>

      <Leaderboard players={players} />

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        {isHost ? (
          <>
            <button
              className="btn-primary"
              onClick={handlePlayAgain}
              style={{ flex: 1 }}
            >
              Play Again
            </button>
            <button
              onClick={handleEndGame}
              style={{ flex: 1, background: '#e5e7eb', color: 'var(--color-text)' }}
            >
              End Game
            </button>
          </>
        ) : (
          <p style={{ textAlign: 'center', width: '100%', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
            Waiting for host...
          </p>
        )}
      </div>
    </div>
  );
}
