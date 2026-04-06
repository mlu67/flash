import { useState, useEffect } from 'react';
import socket, { getPlayerId, saveSession, clearSession, getSavedSession } from './socket';
import HomeScreen from './screens/HomeScreen';
import CreateGameScreen from './screens/CreateGameScreen';
import JoinGameScreen from './screens/JoinGameScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import ResultsScreen from './screens/ResultsScreen';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [firstQuestion, setFirstQuestion] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    socket.on('room-created', ({ roomCode }) => {
      setRoomCode(roomCode);
      setIsHost(true);
      setScreen('lobby');
    });

    socket.on('player-joined', ({ players }) => {
      setPlayers(players);
    });

    // Buffer the first new-question that arrives before GameScreen mounts
    socket.on('new-question', (q) => {
      setFirstQuestion(q);
    });

    socket.on('game-started', ({ totalQuestions }) => {
      setTotalQuestions(totalQuestions);
      setScreen('game');
    });

    socket.on('game-over', ({ leaderboard }) => {
      setPlayers(leaderboard);
      setScreen('results');
    });

    socket.on('game-ended', () => {
      setRoomCode(null);
      setPlayers([]);
      setIsHost(false);
      clearSession();
      setScreen('home');
    });

    socket.on('rejoin', ({ status, players, totalQuestions: total, isHost: host, roomCode: code, currentQuestion }) => {
      if (code) setRoomCode(code);
      setPlayers(players);
      setTotalQuestions(total);
      setIsHost(host);
      if (status === 'playing' && currentQuestion) {
        setFirstQuestion(currentQuestion);
      }
      if (status === 'lobby') setScreen('lobby');
      else if (status === 'playing') setScreen('game');
      else if (status === 'results') setScreen('results');
    });

    socket.on('connect', () => {
      setConnectionError(null);
    });

    socket.on('connect_error', (err) => {
      if (err.message === 'Server is full, please try again later') {
        setConnectionError(err.message);
      }
    });

    socket.on('error', ({ message }) => {
      // If rejoin failed (room gone), clear session and stay on home
      clearSession();
      alert(message);
    });

    // Auto-rejoin saved session on page load
    const session = getSavedSession();
    if (session) {
      socket.emit('join-room', { roomCode: session.roomCode, playerName: session.playerName });
    }

    return () => {
      socket.off('room-created');
      socket.off('player-joined');
      socket.off('new-question');
      socket.off('game-started');
      socket.off('game-over');
      socket.off('game-ended');
      socket.off('rejoin');
      socket.off('connect');
      socket.off('connect_error');
      socket.off('error');
    };
  }, []);

  function handleJoinedRoom(code) {
    setRoomCode(code);
    setIsHost(false);
    setScreen('lobby');
  }

  const screens = {
    home: <HomeScreen onCreateGame={() => setScreen('create')} onJoinGame={() => setScreen('join')} />,
    create: <CreateGameScreen onBack={() => setScreen('home')} />,
    join: <JoinGameScreen onBack={() => setScreen('home')} onJoined={handleJoinedRoom} />,
    lobby: <LobbyScreen roomCode={roomCode} players={players} isHost={isHost} />,
    game: <GameScreen roomCode={roomCode} totalQuestions={totalQuestions} firstQuestion={firstQuestion} onQuestionConsumed={() => setFirstQuestion(null)} isHost={isHost} onExit={() => { clearSession(); setScreen('home'); }} />,
    results: <ResultsScreen roomCode={roomCode} players={players} isHost={isHost} />,
  };

  if (connectionError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', padding: '1rem' }}>
        <div>
          <h2>Server is full</h2>
          <p>Too many players right now. Please try again in a few minutes.</p>
        </div>
      </div>
    );
  }

  return <div>{screens[screen]}</div>;
}
