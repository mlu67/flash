import { useState, useEffect } from 'react';
import socket, { getPlayerId } from './socket';
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

  useEffect(() => {
    socket.on('room-created', ({ roomCode }) => {
      setRoomCode(roomCode);
      setIsHost(true);
      setScreen('lobby');
    });

    socket.on('player-joined', ({ players }) => {
      setPlayers(players);
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
      setScreen('home');
    });

    socket.on('rejoin', ({ status, players, totalQuestions: total, isHost: host }) => {
      setPlayers(players);
      setTotalQuestions(total);
      setIsHost(host);
      if (status === 'playing') setScreen('game');
      else if (status === 'results') setScreen('results');
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('room-created');
      socket.off('player-joined');
      socket.off('game-started');
      socket.off('game-over');
      socket.off('game-ended');
      socket.off('rejoin');
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
    game: <GameScreen roomCode={roomCode} totalQuestions={totalQuestions} />,
    results: <ResultsScreen roomCode={roomCode} players={players} isHost={isHost} />,
  };

  return <div>{screens[screen]}</div>;
}
