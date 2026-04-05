import {
  CheckersEngine,
  COLORS,
  cloneBoard,
  getAllMovesForColor
} from '../../engine.js';

export const AI_DIFFICULTY = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
});

const PRESETS = Object.freeze({
  [AI_DIFFICULTY.EASY]: { depth: 2, topRandomChoices: 3 },
  [AI_DIFFICULTY.MEDIUM]: { depth: 4, topRandomChoices: 2 },
  [AI_DIFFICULTY.HARD]: { depth: 6, topRandomChoices: 1 }
});

function getPreset(difficulty) {
  return PRESETS[difficulty] || PRESETS[AI_DIFFICULTY.MEDIUM];
}

function toState(engine) {
  return {
    board: cloneBoard(engine.board),
    turn: engine.turn,
    selected: engine.selected ? [...engine.selected] : null,
    mustContinueFrom: engine.mustContinueFrom ? [...engine.mustContinueFrom] : null,
    winner: engine.winner,
    forceCapture: engine.forceCapture,
    ruleSet: engine.ruleSet
  };
}

function createSimulationFromState(state) {
  const sim = new CheckersEngine({
    forceCapture: state.forceCapture,
    ruleSet: state.ruleSet
  });
  sim.board = cloneBoard(state.board);
  sim.turn = state.turn;
  sim.selected = state.selected ? [...state.selected] : null;
  sim.mustContinueFrom = state.mustContinueFrom ? [...state.mustContinueFrom] : null;
  sim.winner = state.winner;
  sim.history = [];
  return sim;
}

function listLegalMoves(state) {
  const sim = createSimulationFromState(state);

  if (sim.mustContinueFrom) {
    const [row, col] = sim.mustContinueFrom;
    return sim.getAllowedMovesFrom(row, col).map((mv) => ({
      from: [row, col],
      to: [...mv.to]
    }));
  }

  const legal = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = sim.board[row][col];
      if (!piece || piece.color !== sim.turn) continue;

      const moves = sim.getAllowedMovesFrom(row, col);
      for (const mv of moves) {
        legal.push({ from: [row, col], to: [...mv.to] });
      }
    }
  }

  return legal;
}

function applyMoveToState(state, move) {
  const sim = createSimulationFromState(state);
  const result = sim.tryMove(move.from, move.to);
  if (!result.ok) return null;
  return toState(sim);
}

function countMaterial(board) {
  let whiteMen = 0;
  let whiteKings = 0;
  let blackMen = 0;
  let blackKings = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (!p) continue;

      if (p.color === COLORS.WHITE) {
        if (p.king) whiteKings++;
        else whiteMen++;
      } else {
        if (p.king) blackKings++;
        else blackMen++;
      }
    }
  }

  return { whiteMen, whiteKings, blackMen, blackKings };
}

function evaluateState(state, aiColor) {
  if (state.winner) {
    if (state.winner === 'draw') return 0;
    return state.winner === aiColor ? 100000 : -100000;
  }

  const material = countMaterial(state.board);
  const whiteScore = material.whiteMen * 100 + material.whiteKings * 180;
  const blackScore = material.blackMen * 100 + material.blackKings * 180;

  const mobilityState = {
    ...state,
    selected: null,
    mustContinueFrom: null
  };
  const opponentColor = aiColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

  const myMoves = getAllMovesForColor(mobilityState.board, aiColor, {
    forceCapture: state.forceCapture,
    ruleSet: state.ruleSet
  }).length;
  const oppMoves = getAllMovesForColor(mobilityState.board, opponentColor, {
    forceCapture: state.forceCapture,
    ruleSet: state.ruleSet
  }).length;

  const base = aiColor === COLORS.BLACK ? blackScore - whiteScore : whiteScore - blackScore;
  const mobility = (myMoves - oppMoves) * 5;

  return base + mobility;
}

function minimax(state, depth, alpha, beta, aiColor) {
  const legal = listLegalMoves(state);

  if (depth === 0 || state.winner || legal.length === 0) {
    return { score: evaluateState(state, aiColor), move: null };
  }

  const maximizing = state.turn === aiColor;
  let bestMove = null;

  if (maximizing) {
    let bestScore = -Infinity;

    for (const move of legal) {
      const next = applyMoveToState(state, move);
      if (!next) continue;

      const turnChanged = next.turn !== state.turn;
      const nextDepth = turnChanged ? depth - 1 : depth;
      const result = minimax(next, nextDepth, alpha, beta, aiColor);

      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }

    return { score: bestScore, move: bestMove };
  }

  let bestScore = Infinity;

  for (const move of legal) {
    const next = applyMoveToState(state, move);
    if (!next) continue;

    const turnChanged = next.turn !== state.turn;
    const nextDepth = turnChanged ? depth - 1 : depth;
    const result = minimax(next, nextDepth, alpha, beta, aiColor);

    if (result.score < bestScore) {
      bestScore = result.score;
      bestMove = move;
    }

    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }

  return { score: bestScore, move: bestMove };
}

function pickMoveWithDifficulty(state, aiColor, difficulty) {
  const legal = listLegalMoves(state);
  if (legal.length === 0) return null;

  const preset = getPreset(difficulty);
  const { depth, topRandomChoices } = preset;

  const scored = legal
    .map((move) => {
      const next = applyMoveToState(state, move);
      if (!next) return null;

      const turnChanged = next.turn !== state.turn;
      const startDepth = turnChanged ? depth - 1 : depth;
      const result = minimax(next, startDepth, -Infinity, Infinity, aiColor);

      return { move, score: result.score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return legal[0];

  const poolSize = Math.min(topRandomChoices, scored.length);
  const pickIndex = poolSize === 1 ? 0 : Math.floor(Math.random() * poolSize);
  return scored[pickIndex].move;
}

export function chooseAIMove(engine, {
  color = COLORS.BLACK,
  difficulty = AI_DIFFICULTY.MEDIUM
} = {}) {
  if (engine.winner) return null;
  if (engine.turn !== color) return null;

  const state = toState(engine);
  return pickMoveWithDifficulty(state, color, difficulty);
}

export function playAIAutomaticTurn(engine, {
  color = COLORS.BLACK,
  difficulty = AI_DIFFICULTY.MEDIUM,
  maxChainMoves = 12
} = {}) {
  if (engine.winner) return { ok: false, reason: 'game_over', moves: [] };
  if (engine.turn !== color) return { ok: false, reason: 'not_ai_turn', moves: [] };

  const executedMoves = [];

  for (let i = 0; i < maxChainMoves; i++) {
    const move = chooseAIMove(engine, { color, difficulty });
    if (!move) {
      return { ok: executedMoves.length > 0, reason: 'no_legal_move', moves: executedMoves };
    }

    const result = engine.tryMove(move.from, move.to);
    if (!result.ok) {
      return { ok: executedMoves.length > 0, reason: 'invalid_move', moves: executedMoves };
    }

    executedMoves.push(move);

    if (!result.chainCapture || engine.turn !== color || engine.winner) {
      return { ok: true, reason: 'turn_finished', moves: executedMoves, winner: engine.winner };
    }
  }

  return { ok: true, reason: 'max_chain_guard', moves: executedMoves, winner: engine.winner };
}
