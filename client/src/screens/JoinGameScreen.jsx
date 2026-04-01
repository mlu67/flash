import { useState } from 'react';
import socket, { saveSession } from '../socket';

export default function JoinGameScreen({ onBack, onJoined }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  function handleJoin() {
    if (!playerName.trim() || !roomCode.trim()) return;
    const code = roomCode.trim().toUpperCase();
    const name = playerName.trim();
    socket.emit('join-room', { roomCode: code, playerName: name });
    saveSession(code, name);
    onJoined(code);
  }

  return (
    <div className="card">
      <button
        onClick={onBack}
        style={{ background: 'none', color: 'var(--color-text-light)', padding: '0', marginBottom: '16px', fontSize: '0.9rem' }}
      >
        &larr; Back
      </button>
      <h2 style={{ marginBottom: '24px', color: 'var(--color-primary)' }}>Join Game</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Your Name</label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Room Code</label>
          <input
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. A3F7K2"
            maxLength={6}
            style={{ textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 700, fontSize: '1.3rem', textAlign: 'center' }}
          />
        </div>
        <button className="btn-primary" onClick={handleJoin} disabled={!playerName.trim() || roomCode.length < 6}>
          Join
        </button>
      </div>
    </div>
  );
}
