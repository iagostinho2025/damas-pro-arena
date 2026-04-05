export const BOARD_SIZE = 8;
export const COLORS = Object.freeze({ WHITE: 'white', BLACK: 'black' });
export const RULESETS = Object.freeze({
  BRAZILIAN: 'Brasileiro',
  AMERICAN: 'Americano'
});
export const GAME_RESULT = Object.freeze({
  DRAW: 'draw'
});

function normalizeRuleSet(ruleSet) {
  const raw = String(ruleSet || '').trim();
  if (!raw) return RULESETS.BRAZILIAN;

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('americano') || normalized.includes('english')) {
    return RULESETS.AMERICAN;
  }

  if (normalized.includes('brasileiro') || normalized.includes('brazil')) {
    return RULESETS.BRAZILIAN;
  }

  return RULESETS.BRAZILIAN;
}

function normalizeDrawConfig(drawConfig) {
  const cfg = drawConfig || {};
  const repetitionCount = Number.isFinite(cfg.repetitionCount) ? Math.max(2, Math.floor(cfg.repetitionCount)) : 3;
  const inactivityMoves = Number.isFinite(cfg.inactivityMoves) ? Math.max(1, Math.floor(cfg.inactivityMoves)) : 40;
  return { repetitionCount, inactivityMoves };
}

function pieceCode(piece) {
  if (!piece) return '_';
  if (piece.color === COLORS.WHITE) return piece.king ? 'W' : 'w';
  return piece.king ? 'B' : 'b';
}

function buildPositionKey(board, turn, { ruleSet, mustContinueFrom } = {}) {
  const boardKey = board
    .map((row) => row.map(pieceCode).join(''))
    .join('/');
  const chainKey = mustContinueFrom ? `${mustContinueFrom[0]}:${mustContinueFrom[1]}` : '-';
  return `${boardKey}|${turn}|${normalizeRuleSet(ruleSet)}|${chainKey}`;
}

export function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function getOpponent(color) {
  return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

export function createInitialBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isDarkSquare = (row + col) % 2 === 1;
      if (!isDarkSquare) continue;

      if (row <= 2) board[row][col] = { color: COLORS.BLACK, king: false };
      if (row >= 5) board[row][col] = { color: COLORS.WHITE, king: false };
    }
  }

  return board;
}

function getForwardDirections(color) {
  return color === COLORS.WHITE ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

function getMoveDirections(piece) {
  if (piece.king) return [[1, -1], [1, 1], [-1, -1], [-1, 1]];
  return getForwardDirections(piece.color);
}

function getCaptureDirections(piece, { ruleSet = RULESETS.BRAZILIAN } = {}) {
  if (piece.king) return [[1, -1], [1, 1], [-1, -1], [-1, 1]];
  if (normalizeRuleSet(ruleSet) === RULESETS.AMERICAN) {
    return getForwardDirections(piece.color);
  }
  return [[1, -1], [1, 1], [-1, -1], [-1, 1]];
}

export function maybePromote(piece, row) {
  if (piece.king) return false;
  if (piece.color === COLORS.WHITE && row === 0) {
    piece.king = true;
    return true;
  }
  if (piece.color === COLORS.BLACK && row === BOARD_SIZE - 1) {
    piece.king = true;
    return true;
  }
  return false;
}

export function getPieceSimpleMoves(board, row, col, { ruleSet = RULESETS.BRAZILIAN } = {}) {
  const piece = board[row]?.[col];
  if (!piece) return [];

  const activeRuleSet = normalizeRuleSet(ruleSet);
  if (piece.king && activeRuleSet === RULESETS.BRAZILIAN) {
    const moves = [];
    for (const [dr, dc] of getMoveDirections(piece)) {
      let step = 1;
      while (true) {
        const toRow = row + dr * step;
        const toCol = col + dc * step;
        if (!isInsideBoard(toRow, toCol)) break;
        if (board[toRow][toCol]) break;

        moves.push({ from: [row, col], to: [toRow, toCol], capture: null });
        step += 1;
      }
    }
    return moves;
  }

  const moves = [];
  for (const [dr, dc] of getMoveDirections(piece)) {
    const toRow = row + dr;
    const toCol = col + dc;
    if (isInsideBoard(toRow, toCol) && !board[toRow][toCol]) {
      moves.push({ from: [row, col], to: [toRow, toCol], capture: null });
    }
  }

  return moves;
}

export function getPieceCaptureMoves(board, row, col, { ruleSet = RULESETS.BRAZILIAN } = {}) {
  const piece = board[row]?.[col];
  if (!piece) return [];

  const activeRuleSet = normalizeRuleSet(ruleSet);
  if (piece.king && activeRuleSet === RULESETS.BRAZILIAN) {
    const captures = [];

    for (const [dr, dc] of getCaptureDirections(piece, { ruleSet: activeRuleSet })) {
      let step = 1;
      let captured = null;

      while (true) {
        const r = row + dr * step;
        const c = col + dc * step;
        if (!isInsideBoard(r, c)) break;

        const target = board[r][c];

        if (!captured) {
          if (!target) {
            step += 1;
            continue;
          }

          if (target.color === piece.color) break;

          captured = [r, c];
          step += 1;
          continue;
        }

        if (target) break;

        captures.push({
          from: [row, col],
          to: [r, c],
          capture: [...captured]
        });
        step += 1;
      }
    }

    return captures;
  }

  const captures = [];

  for (const [dr, dc] of getCaptureDirections(piece, { ruleSet: activeRuleSet })) {
    const midRow = row + dr;
    const midCol = col + dc;
    const landRow = row + dr * 2;
    const landCol = col + dc * 2;

    if (!isInsideBoard(midRow, midCol) || !isInsideBoard(landRow, landCol)) continue;

    const midPiece = board[midRow][midCol];
    const landingPiece = board[landRow][landCol];

    if (midPiece && midPiece.color !== piece.color && !landingPiece) {
      captures.push({
        from: [row, col],
        to: [landRow, landCol],
        capture: [midRow, midCol]
      });
    }
  }

  return captures;
}

function getCaptureSpan(board, move, { ruleSet = RULESETS.BRAZILIAN } = {}) {
  if (!move?.capture) return 0;

  const simulation = cloneBoard(board);
  const result = applyMoveOnBoard(simulation, move);
  if (!result.wasCapture) return 0;
  if (result.promoted) return 1;

  const [toRow, toCol] = move.to;
  const nextCaptures = getPieceCaptureMoves(simulation, toRow, toCol, { ruleSet });
  if (nextCaptures.length === 0) return 1;

  let bestNext = 0;
  for (const next of nextCaptures) {
    const branch = getCaptureSpan(simulation, next, { ruleSet });
    if (branch > bestNext) bestNext = branch;
  }

  return 1 + bestNext;
}

function filterMaxCaptureMoves(board, moves, { ruleSet = RULESETS.BRAZILIAN } = {}) {
  if (moves.length === 0) return moves;
  if (normalizeRuleSet(ruleSet) !== RULESETS.BRAZILIAN) return moves;

  const scored = moves.map((move) => ({ move, span: getCaptureSpan(board, move, { ruleSet }) }));
  const maxSpan = Math.max(...scored.map((item) => item.span));
  return scored.filter((item) => item.span === maxSpan).map((item) => item.move);
}

export function getAllMovesForColor(board, color, {
  forceCapture = true,
  ruleSet = RULESETS.BRAZILIAN
} = {}) {
  const activeRuleSet = normalizeRuleSet(ruleSet);
  const regular = [];
  const captures = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;

      regular.push(...getPieceSimpleMoves(board, row, col, { ruleSet: activeRuleSet }));
      captures.push(...getPieceCaptureMoves(board, row, col, { ruleSet: activeRuleSet }));
    }
  }

  if (forceCapture && captures.length > 0) {
    return filterMaxCaptureMoves(board, captures, { ruleSet: activeRuleSet });
  }

  return [...captures, ...regular];
}

export function applyMoveOnBoard(board, move) {
  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;
  const piece = board[fromRow]?.[fromCol];

  if (!piece) {
    return { board, wasCapture: false, promoted: false };
  }

  board[fromRow][fromCol] = null;
  board[toRow][toCol] = piece;

  let wasCapture = false;
  if (move.capture) {
    const [capturedRow, capturedCol] = move.capture;
    board[capturedRow][capturedCol] = null;
    wasCapture = true;
  }

  const promoted = maybePromote(piece, toRow);
  return { board, wasCapture, promoted };
}

export function detectWinner(board, currentTurn, {
  forceCapture = true,
  ruleSet = RULESETS.BRAZILIAN
} = {}) {
  let whiteCount = 0;
  let blackCount = 0;

  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.color === COLORS.WHITE) whiteCount++;
      else blackCount++;
    }
  }

  if (whiteCount === 0) return COLORS.BLACK;
  if (blackCount === 0) return COLORS.WHITE;

  const currentMoves = getAllMovesForColor(board, currentTurn, { forceCapture, ruleSet });
  if (currentMoves.length === 0) {
    const opponent = getOpponent(currentTurn);
    const opponentMoves = getAllMovesForColor(board, opponent, { forceCapture, ruleSet });
    if (opponentMoves.length === 0) return GAME_RESULT.DRAW;
    return opponent;
  }

  return null;
}

export class CheckersEngine {
  constructor({ forceCapture = true, ruleSet = RULESETS.BRAZILIAN, drawConfig = {} } = {}) {
    this.forceCapture = !!forceCapture;
    this.ruleSet = normalizeRuleSet(ruleSet);
    this.drawConfig = normalizeDrawConfig(drawConfig);
    this.reset();
  }

  reset() {
    this.board = createInitialBoard();
    this.turn = COLORS.WHITE;
    this.selected = null;
    this.mustContinueFrom = null;
    this.history = [];
    this.winner = null;
    this.drawReason = null;
    this.nonProgressMoves = 0;
    this.positionCounts = {};
    this.trackCurrentPosition();
  }

  setForceCapture(enabled) {
    this.forceCapture = !!enabled;
  }

  setRuleSet(ruleSet) {
    this.ruleSet = normalizeRuleSet(ruleSet);
    this.rebuildPositionHistory();
  }

  setDrawConfig(drawConfig = {}) {
    this.drawConfig = normalizeDrawConfig(drawConfig);
  }

  rebuildPositionHistory() {
    this.positionCounts = {};
    this.trackCurrentPosition();
  }

  trackCurrentPosition() {
    const key = buildPositionKey(this.board, this.turn, {
      ruleSet: this.ruleSet,
      mustContinueFrom: this.mustContinueFrom
    });
    this.positionCounts[key] = (this.positionCounts[key] || 0) + 1;
    return this.positionCounts[key];
  }

  snapshot() {
    return {
      board: cloneBoard(this.board),
      turn: this.turn,
      selected: this.selected ? [...this.selected] : null,
      mustContinueFrom: this.mustContinueFrom ? [...this.mustContinueFrom] : null,
      winner: this.winner,
      forceCapture: this.forceCapture,
      ruleSet: this.ruleSet,
      drawReason: this.drawReason,
      nonProgressMoves: this.nonProgressMoves,
      positionCounts: { ...this.positionCounts },
      drawConfig: { ...this.drawConfig }
    };
  }

  saveHistory() {
    this.history.push(this.snapshot());
    if (this.history.length > 100) this.history.shift();
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) return false;

    this.board = cloneBoard(previous.board);
    this.turn = previous.turn;
    this.selected = previous.selected;
    this.mustContinueFrom = previous.mustContinueFrom;
    this.winner = previous.winner;
    this.forceCapture = !!previous.forceCapture;
    this.ruleSet = normalizeRuleSet(previous.ruleSet);
    this.drawReason = previous.drawReason || null;
    this.nonProgressMoves = Number.isFinite(previous.nonProgressMoves) ? previous.nonProgressMoves : 0;
    this.positionCounts = previous.positionCounts ? { ...previous.positionCounts } : {};
    this.drawConfig = normalizeDrawConfig(previous.drawConfig);
    return true;
  }

  getAllowedMovesFrom(row, col) {
    if (this.winner) return [];

    const piece = this.board[row]?.[col];
    if (!piece || piece.color !== this.turn) return [];

    if (this.mustContinueFrom && (this.mustContinueFrom[0] !== row || this.mustContinueFrom[1] !== col)) {
      return [];
    }

    const captures = getPieceCaptureMoves(this.board, row, col, { ruleSet: this.ruleSet });

    if (this.mustContinueFrom) {
      if (!this.forceCapture) {
        return [...captures, ...getPieceSimpleMoves(this.board, row, col, { ruleSet: this.ruleSet })];
      }
      return filterMaxCaptureMoves(this.board, captures, { ruleSet: this.ruleSet });
    }

    if (this.forceCapture) {
      const globalCaptures = getAllMovesForColor(this.board, this.turn, {
        forceCapture: true,
        ruleSet: this.ruleSet
      });

      const hasAnyCapture = globalCaptures.some((move) => !!move.capture);
      if (hasAnyCapture) {
        return globalCaptures.filter((move) => move.from[0] === row && move.from[1] === col);
      }
    }

    return [...captures, ...getPieceSimpleMoves(this.board, row, col, { ruleSet: this.ruleSet })];
  }

  tryMove(from, to) {
    if (this.winner) return { ok: false, reason: 'Partida finalizada.' };

    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;

    const allowedMoves = this.getAllowedMovesFrom(fromRow, fromCol);
    const chosen = allowedMoves.find((move) => move.to[0] === toRow && move.to[1] === toCol);

    if (!chosen) return { ok: false, reason: 'Movimento invalido.' };

    this.saveHistory();

    const result = applyMoveOnBoard(this.board, chosen);
    this.selected = [toRow, toCol];

    if (result.wasCapture) this.nonProgressMoves = 0;
    else if (result.promoted) this.nonProgressMoves = 0;
    else this.nonProgressMoves += 1;

    if (result.wasCapture) {
      const extraCaptures = getPieceCaptureMoves(this.board, toRow, toCol, { ruleSet: this.ruleSet });
      if (extraCaptures.length > 0 && !result.promoted) {
        this.mustContinueFrom = [toRow, toCol];
        return { ok: true, chainCapture: true, movedTo: [toRow, toCol] };
      }
    }

    this.mustContinueFrom = null;
    this.selected = null;
    this.turn = getOpponent(this.turn);

    if (this.nonProgressMoves >= this.drawConfig.inactivityMoves) {
      this.winner = GAME_RESULT.DRAW;
      this.drawReason = 'inactivity';
      return { ok: true, chainCapture: false, movedTo: [toRow, toCol], winner: this.winner };
    }

    const repeatCount = this.trackCurrentPosition();
    if (repeatCount >= this.drawConfig.repetitionCount) {
      this.winner = GAME_RESULT.DRAW;
      this.drawReason = 'repetition';
      return { ok: true, chainCapture: false, movedTo: [toRow, toCol], winner: this.winner };
    }

    this.winner = detectWinner(this.board, this.turn, {
      forceCapture: this.forceCapture,
      ruleSet: this.ruleSet
    });

    if (this.winner === GAME_RESULT.DRAW) {
      this.drawReason = 'blocked';
    } else if (this.winner) {
      this.drawReason = null;
    }

    return { ok: true, chainCapture: false, movedTo: [toRow, toCol], winner: this.winner };
  }
}

