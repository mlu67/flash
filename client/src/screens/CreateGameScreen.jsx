import { useState, useEffect } from 'react';
import socket, { saveSession } from '../socket';

export default function CreateGameScreen({ onBack }) {
  const [playerName, setPlayerName] = useState('');
  const [category, setCategory] = useState('all');
  const [questionCount, setQuestionCount] = useState(10);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    socket.emit('get-categories', (cats) => {
      setCategories(cats);
    });
  }, []);

  function handleCreate() {
    if (!playerName.trim()) return;
    const name = playerName.trim();
    socket.emit('create-room', {
      playerName: name,
      category,
      questionCount,
    });
    // Save name so we can rejoin on refresh (roomCode saved after room-created)
    socket.once('room-created', ({ roomCode }) => {
      saveSession(roomCode, name);
    });
  }

  return (
    <div className="card">
      <button
        onClick={onBack}
        style={{ background: 'none', color: 'var(--color-text-light)', padding: '0', marginBottom: '16px', fontSize: '0.9rem' }}
      >
        &larr; Back
      </button>
      <h2 style={{ marginBottom: '24px', color: 'var(--color-primary)' }}>Create Game</h2>
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
          <label style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Questions</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[10, 20, 30].map(n => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                style={{
                  flex: 1,
                  background: questionCount === n ? 'var(--color-primary)' : '#e5e7eb',
                  color: questionCount === n ? 'white' : 'var(--color-text)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={handleCreate} disabled={!playerName.trim()}>
          Create Room
        </button>
      </div>
    </div>
  );
}
