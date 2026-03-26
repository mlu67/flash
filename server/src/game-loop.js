import { getWordsByCategory } from './words.js';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function startGame(room) {
  const words = getWordsByCategory(room.settings.category);
  const shuffled = shuffle(words);
  room.questions = shuffled.slice(0, room.settings.questionCount);
  room.currentQuestionIndex = 0;
  room.status = 'playing';
  room.playersAnswered = new Set();
  room.players.forEach(p => {
    p.score = 0;
    p.answers = [];
  });
  room.lastActivity = Date.now();
}

export function submitAnswer(room, playerId, article) {
  if (room.playersAnswered.has(playerId)) return null;
  const question = room.questions[room.currentQuestionIndex];
  const correct = article === question.article;
  const player = room.players.find(p => p.id === playerId);
  if (!player) return null;
  if (correct) player.score += 1;
  player.answers.push({
    noun: question.noun,
    selected: article,
    correct,
    timedOut: false,
  });
  room.playersAnswered.add(playerId);
  room.lastActivity = Date.now();
  return { correct, correctArticle: question.article };
}

export function markTimedOut(room) {
  const question = room.questions[room.currentQuestionIndex];
  room.players.forEach(p => {
    if (p.connected && !room.playersAnswered.has(p.id)) {
      p.answers.push({
        noun: question.noun,
        selected: null,
        correct: false,
        timedOut: true,
      });
    }
  });
}

export function checkQuestionComplete(room) {
  const connectedNotAnswered = room.players.filter(
    p => p.connected && !room.playersAnswered.has(p.id)
  );
  return connectedNotAnswered.length === 0;
}

export function advanceQuestion(room) {
  room.currentQuestionIndex += 1;
  room.playersAnswered = new Set();
  return room.currentQuestionIndex < room.questions.length;
}

export function getCurrentQuestion(room) {
  const q = room.questions[room.currentQuestionIndex];
  return {
    questionIndex: room.currentQuestionIndex,
    noun: q.noun,
    category: q.category,
  };
}

export function getQuestionResult(room) {
  const q = room.questions[room.currentQuestionIndex];
  return {
    correctArticle: q.article,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
    })),
  };
}

export function getLeaderboard(room) {
  return room.players
    .map(p => {
      const total = p.answers.length;
      const correctCount = p.answers.filter(a => a.correct).length;
      const timeouts = p.answers.filter(a => a.timedOut).length;
      return {
        id: p.id,
        name: p.name,
        score: p.score,
        accuracy: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        correct: correctCount,
        total,
        timeouts,
      };
    })
    .sort((a, b) => b.score - a.score);
}
