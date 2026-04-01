import { useEffect, useState } from 'react';
import socket from '../socket';
import Leaderboard from '../components/Leaderboard';

const CONFETTI_COLORS = ['#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#ffeb3b'];

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 1.5 + Math.random() * 1.5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
    }))
  );

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            background: p.color,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

export default function ResultsScreen({ roomCode, players, isHost }) {
  function handlePlayAgain() {
    socket.emit('play-again', { roomCode });
  }

  function handleEndGame() {
    socket.emit('end-game', { roomCode });
  }

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <Confetti />
      <h2 style={{ textAlign: 'center', color: 'var(--color-primary)', marginBottom: '8px', fontSize: '2rem' }}>
        Results
      </h2>
      <div style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '20px' }}>
        &#x1F389;
      </div>

      <Leaderboard players={players} />

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        {isHost ? (
          <>
            <button
              className="btn-primary"
              onClick={handlePlayAgain}
              style={{ flex: 1, fontSize: '1.1rem' }}
            >
              Play Again
            </button>
            <button
              onClick={handleEndGame}
              style={{ flex: 1, background: '#e5e7eb', color: 'var(--color-text)', fontSize: '1.1rem' }}
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
