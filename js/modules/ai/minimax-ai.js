import {
  CheckersEngine,
  COLORS,
  cloneBoard,
  getAllMovesForColor,
  getPieceCaptureMoves
} from '../../engine.js';

export const AI_DIFFICULTY = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert'
});

const PRESETS = Object.freeze({
  [AI_DIFFICULTY.EASY]: {
    maxDepth: 2,
    topRandomChoices: 3,
    thinkTimeMs: 140,
    qDepth: 0,
    randomJitter: 26
  },
  [AI_DIFFICULTY.MEDIUM]: {
    maxDepth: 4,
    topRandomChoices: 2,
    thinkTimeMs: 280,
    qDepth: 1,
    randomJitter: 10
  },
  [AI_DIFFICULTY.HARD]: {
    maxDepth: 6,
    topRandomChoices: 1,
    thinkTimeMs: 650,
    qDepth: 2,
    randomJitter: 0
  },
  [AI_DIFFICULTY.EXPERT]: {
    maxDepth: 8,
    topRandomChoices: 1,
    thinkTimeMs: 1300,
    qDepth: 3,
    randomJitter: 0
  }
});

const SCORE_WIN = 1000000;

const WEIGHTS = Object.freeze({
  MAN: 100,
  KING: 255,
  MOBILITY: 4,
  CAPTURE_AVAILABLE: 12,
  CENTER_MAN: 7,
  CENTER_KING: 12,
  BACK_ROW_GUARD: 6,
  ADVANCE_MAN: 5,
  PROMOTION_THREAT: 24,
  VULNERABLE_MAN: 20,
  VULNERABLE_KING: 34,
  PROTECTED_MAN: 7,
  PROTECTED_KING: 10
});

function getPreset(difficulty) {
  return PRESETS[difficulty] || PRESETS[AI_DIFFICULTY.MEDIUM];
}

function oppositeColor(color) {
  return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
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
      to: [...mv.to],
      capture: mv.capture ? [...mv.capture] : null
    }));
  }

  const legal = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = sim.board[row][col];
      if (!piece || piece.color !== sim.turn) continue;

      const moves = sim.getAllowedMovesFrom(row, col);
      for (const mv of moves) {
        legal.push({
          from: [row, col],
          to: [...mv.to],
          capture: mv.capture ? [...mv.capture] : null
        });
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

function materialForColor(material, color) {
  if (color === COLORS.WHITE) {
    return material.whiteMen * WEIGHTS.MAN + material.whiteKings * WEIGHTS.KING;
  }
  return material.blackMen * WEIGHTS.MAN + material.blackKings * WEIGHTS.KING;
}

function isCenterSquare(row, col) {
  return row >= 2 && row <= 5 && col >= 2 && col <= 5;
}

function advancementBonus(piece, row) {
  if (piece.king) return 0;
  // Engine atual: WHITE promove no row 0, BLACK promove no row 7.
  const progress = piece.color === COLORS.WHITE ? (7 - row) : row;
  return progress * WEIGHTS.ADVANCE_MAN;
}

function promotionThreatBonus(piece, row) {
  if (piece.king) return 0;
  if (piece.color === COLORS.WHITE && row <= 1) return WEIGHTS.PROMOTION_THREAT;
  if (piece.color === COLORS.BLACK && row >= 6) return WEIGHTS.PROMOTION_THREAT;
  return 0;
}

function backRowGuardBonus(piece, row) {
  if (piece.king) return 0;
  if (piece.color === COLORS.WHITE && row === 7) return WEIGHTS.BACK_ROW_GUARD;
  if (piece.color === COLORS.BLACK && row === 0) return WEIGHTS.BACK_ROW_GUARD;
  return 0;
}

function piecePositionalScore(piece, row, col) {
  let score = 0;
  if (piece.king) {
    if (isCenterSquare(row, col)) score += WEIGHTS.CENTER_KING;
  } else {
    if (isCenterSquare(row, col)) score += WEIGHTS.CENTER_MAN;
    score += advancementBonus(piece, row);
    score += promotionThreatBonus(piece, row);
    score += backRowGuardBonus(piece, row);
  }
  return score;
}

function isProtectedByFriendly(board, row, col, color) {
  const supportRows = color === COLORS.WHITE ? [row + 1] : [row - 1];
  for (const r of supportRows) {
    if (r < 0 || r > 7) continue;
    for (const c of [col - 1, col + 1]) {
      if (c < 0 || c > 7) continue;
      const p = board[r][c];
      if (p && p.color === color) return true;
    }
  }
  return false;
}

function buildCaptureThreatMap(board, attackerColor, ruleSet) {
  const attacked = new Map();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== attackerColor) continue;
      const captures = getPieceCaptureMoves(board, row, col, { ruleSet });
      for (const mv of captures) {
        if (!mv.capture) continue;
        const key = `${mv.capture[0]}:${mv.capture[1]}`;
        attacked.set(key, (attacked.get(key) || 0) + 1);
      }
    }
  }
  return attacked;
}

function countCaptureMoves(board, color, ruleSet) {
  let total = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;
      total += getPieceCaptureMoves(board, row, col, { ruleSet }).length;
    }
  }
  return total;
}

function positionalScoreForColor(board, color, ruleSet) {
  let score = 0;
  const enemyColor = oppositeColor(color);
  const enemyThreatMap = buildCaptureThreatMap(board, enemyColor, ruleSet);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;

      score += piecePositionalScore(piece, row, col);

      const key = `${row}:${col}`;
      if (enemyThreatMap.has(key)) {
        score -= piece.king ? WEIGHTS.VULNERABLE_KING : WEIGHTS.VULNERABLE_MAN;
      }

      if (isProtectedByFriendly(board, row, col, color)) {
        score += piece.king ? WEIGHTS.PROTECTED_KING : WEIGHTS.PROTECTED_MAN;
      }
    }
  }

  const myMobility = getAllMovesForColor(board, color, {
    forceCapture: false,
    ruleSet
  }).length;
  const myCaptures = countCaptureMoves(board, color, ruleSet);

  score += myMobility * WEIGHTS.MOBILITY;
  score += myCaptures * WEIGHTS.CAPTURE_AVAILABLE;
  return score;
}

function evaluateState(state, aiColor) {
  if (state.winner) {
    if (state.winner === 'draw') return 0;
    return state.winner === aiColor ? SCORE_WIN : -SCORE_WIN;
  }

  const material = countMaterial(state.board);
  const enemyColor = oppositeColor(aiColor);

  const myMaterial = materialForColor(material, aiColor);
  const oppMaterial = materialForColor(material, enemyColor);

  const myPositional = positionalScoreForColor(state.board, aiColor, state.ruleSet);
  const oppPositional = positionalScoreForColor(state.board, enemyColor, state.ruleSet);

  return (myMaterial - oppMaterial) + (myPositional - oppPositional);
}

function tacticalMoveBonus(state, nextState, move, aiColor, difficulty) {
  if (!nextState) return 0;

  const before = countMaterial(state.board);
  const after = countMaterial(nextState.board);

  const myBefore = materialForColor(before, aiColor);
  const myAfter = materialForColor(after, aiColor);
  const oppColor = oppositeColor(aiColor);
  const oppBefore = materialForColor(before, oppColor);
  const oppAfter = materialForColor(after, oppColor);

  const materialSwing = (myAfter - myBefore) + (oppBefore - oppAfter);
  const isCapture = !!move.capture;
  const keptTurnByChain = nextState.turn === state.turn;

  if (difficulty === AI_DIFFICULTY.EXPERT) {
    return materialSwing + (isCapture ? 18 : 0) + (keptTurnByChain ? 12 : 0);
  }

  if (difficulty === AI_DIFFICULTY.HARD) {
    return materialSwing + (isCapture ? 14 : 0) + (keptTurnByChain ? 8 : 0);
  }

  if (difficulty === AI_DIFFICULTY.MEDIUM) {
    return materialSwing + (isCapture ? 8 : 0);
  }

  return materialSwing;
}

function moveOrderingScore(state, nextState, move, aiColor, difficulty) {
  if (!nextState) return -Infinity;
  const tactical = tacticalMoveBonus(state, nextState, move, aiColor, difficulty);
  const strategic = evaluateState(nextState, aiColor);
  return tactical * 4 + strategic * 0.15;
}

function quiescence(state, alpha, beta, aiColor, deadlineAt, qDepthLeft) {
  if (Date.now() >= deadlineAt || qDepthLeft <= 0) {
    return evaluateState(state, aiColor);
  }

  const standPat = evaluateState(state, aiColor);
  const maximizing = state.turn === aiColor;

  if (maximizing) {
    if (standPat >= beta) return standPat;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return standPat;
    if (standPat < beta) beta = standPat;
  }

  const captures = listLegalMoves(state).filter((mv) => !!mv.capture);
  if (captures.length === 0) return standPat;

  const ordered = captures
    .map((move) => {
      const next = applyMoveToState(state, move);
      if (!next) return null;
      return {
        move,
        next,
        order: moveOrderingScore(state, next, move, aiColor, AI_DIFFICULTY.EXPERT)
      };
    })
    .filter(Boolean)
    .sort((a, b) => maximizing ? b.order - a.order : a.order - b.order);

  if (maximizing) {
    let best = standPat;
    for (const item of ordered) {
      if (Date.now() >= deadlineAt) break;
      const score = quiescence(item.next, alpha, beta, aiColor, deadlineAt, qDepthLeft - 1);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  let best = standPat;
  for (const item of ordered) {
    if (Date.now() >= deadlineAt) break;
    const score = quiescence(item.next, alpha, beta, aiColor, deadlineAt, qDepthLeft - 1);
    if (score < best) best = score;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

function minimax(state, depth, alpha, beta, aiColor, deadlineAt, difficulty, qDepth) {
  if (Date.now() >= deadlineAt) {
    return { score: evaluateState(state, aiColor), move: null, completed: false };
  }

  const legal = listLegalMoves(state);
  if (state.winner || legal.length === 0) {
    if (!state.winner && legal.length === 0) {
      const terminalScore = state.turn === aiColor ? -SCORE_WIN : SCORE_WIN;
      return { score: terminalScore, move: null, completed: true };
    }
    return { score: evaluateState(state, aiColor), move: null, completed: true };
  }

  if (depth === 0) {
    return {
      score: quiescence(state, alpha, beta, aiColor, deadlineAt, qDepth),
      move: null,
      completed: true
    };
  }

  const maximizing = state.turn === aiColor;
  const legalExpanded = legal
    .map((move) => {
      const next = applyMoveToState(state, move);
      if (!next) return null;
      const orderScore = moveOrderingScore(state, next, move, aiColor, difficulty);
      return { move, next, orderScore };
    })
    .filter(Boolean)
    .sort((a, b) => maximizing ? b.orderScore - a.orderScore : a.orderScore - b.orderScore);

  if (legalExpanded.length === 0) {
    return { score: evaluateState(state, aiColor), move: null, completed: true };
  }

  let bestMove = null;
  let completed = true;

  if (maximizing) {
    let bestScore = -Infinity;

    for (const item of legalExpanded) {
      if (Date.now() >= deadlineAt) {
        completed = false;
        break;
      }

      const turnChanged = item.next.turn !== state.turn;
      const nextDepth = turnChanged ? depth - 1 : depth;
      const result = minimax(item.next, nextDepth, alpha, beta, aiColor, deadlineAt, difficulty, qDepth);

      if (!result.completed) completed = false;

      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = item.move;
      }

      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }

    if (!bestMove) {
      return { score: evaluateState(state, aiColor), move: null, completed };
    }

    return { score: bestScore, move: bestMove, completed };
  }

  let bestScore = Infinity;

  for (const item of legalExpanded) {
    if (Date.now() >= deadlineAt) {
      completed = false;
      break;
    }

    const turnChanged = item.next.turn !== state.turn;
    const nextDepth = turnChanged ? depth - 1 : depth;
    const result = minimax(item.next, nextDepth, alpha, beta, aiColor, deadlineAt, difficulty, qDepth);

    if (!result.completed) completed = false;

    if (result.score < bestScore) {
      bestScore = result.score;
      bestMove = item.move;
    }

    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }

  if (!bestMove) {
    return { score: evaluateState(state, aiColor), move: null, completed };
  }

  return { score: bestScore, move: bestMove, completed };
}

function scoreRootMoves(state, aiColor, difficulty, searchDepth, deadlineAt, qDepth) {
  const legal = listLegalMoves(state);
  if (legal.length === 0) return [];

  const maximizing = state.turn === aiColor;
  const candidates = legal
    .map((move) => {
      const next = applyMoveToState(state, move);
      if (!next) return null;
      return {
        move,
        next,
        orderScore: moveOrderingScore(state, next, move, aiColor, difficulty)
      };
    })
    .filter(Boolean)
    .sort((a, b) => maximizing ? b.orderScore - a.orderScore : a.orderScore - b.orderScore);

  const scored = [];
  for (const candidate of candidates) {
    if (Date.now() >= deadlineAt) break;

    const turnChanged = candidate.next.turn !== state.turn;
    const nextDepth = turnChanged ? searchDepth - 1 : searchDepth;

    const result = minimax(
      candidate.next,
      nextDepth,
      -Infinity,
      Infinity,
      aiColor,
      deadlineAt,
      difficulty,
      qDepth
    );

    scored.push({
      move: candidate.move,
      score: result.score,
      completed: result.completed
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}

function pickMoveWithDifficulty(state, aiColor, difficulty) {
  const legal = listLegalMoves(state);
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0];

  const preset = getPreset(difficulty);
  const deadlineAt = Date.now() + preset.thinkTimeMs;

  const fallback = legal
    .map((move) => {
      const next = applyMoveToState(state, move);
      if (!next) return null;
      return {
        move,
        score: moveOrderingScore(state, next, move, aiColor, difficulty)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((x) => ({ move: x.move, score: x.score }));

  let bestScored = fallback;

  for (let depth = 1; depth <= preset.maxDepth; depth++) {
    if (Date.now() >= deadlineAt) break;

    const scored = scoreRootMoves(state, aiColor, difficulty, depth, deadlineAt, preset.qDepth);
    if (scored.length === 0) break;

    bestScored = scored.map(({ move, score }) => ({ move, score }));
  }

  if (bestScored.length === 0) return legal[0];

  if (preset.randomJitter > 0) {
    bestScored = bestScored
      .map((item) => ({
        ...item,
        score: item.score + ((Math.random() * 2 - 1) * preset.randomJitter)
      }))
      .sort((a, b) => b.score - a.score);
  }

  const poolSize = Math.min(preset.topRandomChoices, bestScored.length);
  const pickIndex = poolSize === 1 ? 0 : Math.floor(Math.random() * poolSize);

  return bestScored[pickIndex].move;
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
  if (engine.winner) {
    return { ok: false, reason: 'game_over', moves: [] };
  }

  if (engine.turn !== color) {
    return { ok: false, reason: 'not_ai_turn', moves: [] };
  }

  const executedMoves = [];

  for (let i = 0; i < maxChainMoves; i++) {
    const move = chooseAIMove(engine, { color, difficulty });

    if (!move) {
      return {
        ok: executedMoves.length > 0,
        reason: 'no_legal_move',
        moves: executedMoves
      };
    }

    const result = engine.tryMove(move.from, move.to);

    if (!result.ok) {
      return {
        ok: executedMoves.length > 0,
        reason: 'invalid_move',
        moves: executedMoves
      };
    }

    executedMoves.push(move);

    if (!result.chainCapture || engine.turn !== color || engine.winner) {
      return {
        ok: true,
        reason: 'turn_finished',
        moves: executedMoves,
        winner: engine.winner
      };
    }
  }

  return {
    ok: true,
    reason: 'max_chain_guard',
    moves: executedMoves,
    winner: engine.winner
  };
}
