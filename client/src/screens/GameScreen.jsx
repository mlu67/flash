import { useState, useEffect } from 'react';
import socket, { getPlayerId } from '../socket';
import ArticleButton from '../components/ArticleButton';
import Timer from '../components/Timer';
import Scoreboard from '../components/Scoreboard';

export default function GameScreen({ roomCode, totalQuestions }) {
  const [question, setQuestion] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [result, setResult] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [players, setPlayers] = useState([]);
  const [answeredPlayers, setAnsweredPlayers] = useState(new Set());

  useEffect(() => {
    socket.on('new-question', (q) => {
      setQuestion(q);
      setSelectedArticle(null);
      setResult(null);
      setTimerRunning(true);
      setAnsweredPlayers(new Set());
    });

    socket.on('player-answered', ({ playerId }) => {
      setAnsweredPlayers(prev => new Set([...prev, playerId]));
    });

    socket.on('question-result', (res) => {
      setResult(res);
      setTimerRunning(false);
      setPlayers(res.players);
    });

    return () => {
      socket.off('new-question');
      socket.off('player-answered');
      socket.off('question-result');
    };
  }, []);

  function handleAnswer(article) {
    if (selectedArticle || result) return;
    setSelectedArticle(article);
    socket.emit('submit-answer', { roomCode, article });
  }

  function getButtonResult(article) {
    if (!result) return null;
    const correct = result.correctArticle;

    if (selectedArticle === article && article === correct) return 'correct';
    if (selectedArticle === article && article !== correct) return 'wrong';
    if (!selectedArticle && article === correct) return 'correct-highlight';
    if (selectedArticle && selectedArticle !== article && article === correct) return 'correct-highlight';
    if (!selectedArticle && article !== correct) return 'timeout';
    return null;
  }

  if (!question) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p>Waiting for first question...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>
          {question.questionIndex + 1} / {totalQuestions}
        </span>
        <Timer duration={10} running={timerRunning} />
        <span style={{
          fontSize: '0.8rem',
          color: 'var(--color-text-light)',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
        }}>
          {question.category}
        </span>
      </div>

      <h1 style={{ fontSize: '3rem', margin: '24px 0', color: 'var(--color-text)' }}>
        {question.noun}
      </h1>

      {result && selectedArticle === result.correctArticle && (
        <div style={{ color: 'var(--color-correct)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '12px' }}>
          +1
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {['der', 'die', 'das'].map(article => (
          <ArticleButton
            key={article}
            article={article}
            onClick={handleAnswer}
            disabled={!!selectedArticle || !!result}
            result={getButtonResult(article)}
          />
        ))}
      </div>

      <Scoreboard players={players} currentPlayerId={getPlayerId()} />
    </div>
  );
}
