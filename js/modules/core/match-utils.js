export const DIFFICULTIES_PT = Object.freeze(['Facil', 'Medio', 'Dificil', 'Expert']);
export const AI_STARTER_OPTIONS = Object.freeze(['player', 'random', 'cpu']);

export function getAiDifficultyKey(difficulty, AI_DIFFICULTY) {
  if (difficulty === 'Facil') return AI_DIFFICULTY.EASY;
  if (difficulty === 'Expert') return AI_DIFFICULTY.EXPERT;
  if (difficulty === 'Dificil') return AI_DIFFICULTY.HARD;
  return AI_DIFFICULTY.MEDIUM;
}

export function pickAiStarterResolved(aiStarter) {
  if (!AI_STARTER_OPTIONS.includes(aiStarter)) return 'player';
  if (aiStarter === 'random') {
    return Math.random() < 0.5 ? 'player' : 'cpu';
  }
  return aiStarter;
}

export function getAiMatchSetup({ playerColor, aiStarter }) {
  const resolvedPlayerColor = playerColor === 'black' ? 'black' : 'white';
  const aiColor = resolvedPlayerColor === 'white' ? 'black' : 'white';
  const starterResolved = pickAiStarterResolved(aiStarter);
  if (starterResolved === 'cpu') {
    return {
      starterResolved,
      playerColor: resolvedPlayerColor,
      aiColor,
      startTurn: aiColor
    };
  }

  return {
    starterResolved,
    playerColor: resolvedPlayerColor,
    aiColor,
    startTurn: resolvedPlayerColor
  };
}

export function inferCaptureCell(move) {
  const dr = move.to[0] - move.from[0];
  const dc = move.to[1] - move.from[1];
  if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return null;
  return [move.from[0] + dr / 2, move.from[1] + dc / 2];
}

export function hasResumableMatch(lastGame) {
  if (!lastGame || !lastGame.engine) return false;
  if (!Array.isArray(lastGame.engine.board) || lastGame.engine.board.length !== 8) return false;
  if (lastGame.matchFinalized || lastGame.engine.winner) return false;
  return true;
}

export function fmt2(n) {
  return String(n).padStart(2, '0');
}

export function getNextTournamentDate() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(21, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}
