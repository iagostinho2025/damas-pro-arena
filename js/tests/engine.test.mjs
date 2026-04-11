import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_SIZE,
  COLORS,
  RULESETS,
  GAME_RESULT,
  createInitialBoard,
  getPieceCaptureMoves,
  maybePromote,
  CheckersEngine
} from '../engine.js';

function makeEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function countPieces(board, color) {
  let total = 0;
  for (const row of board) {
    for (const piece of row) {
      if (piece?.color === color) total += 1;
    }
  }
  return total;
}

test('createInitialBoard creates 12 white and 12 black pieces', () => {
  const board = createInitialBoard();
  assert.equal(countPieces(board, COLORS.WHITE), 12);
  assert.equal(countPieces(board, COLORS.BLACK), 12);
});

test('maybePromote promotes white at top row and black at bottom row', () => {
  const whitePiece = { color: COLORS.WHITE, king: false };
  const blackPiece = { color: COLORS.BLACK, king: false };

  assert.equal(maybePromote(whitePiece, 0), true);
  assert.equal(whitePiece.king, true);
  assert.equal(maybePromote(blackPiece, BOARD_SIZE - 1), true);
  assert.equal(blackPiece.king, true);
});

test('american rules forbid backward capture for men', () => {
  const board = makeEmptyBoard();
  board[3][2] = { color: COLORS.WHITE, king: false };
  board[4][3] = { color: COLORS.BLACK, king: false };

  const brCaptures = getPieceCaptureMoves(board, 3, 2, { ruleSet: RULESETS.BRAZILIAN });
  const usCaptures = getPieceCaptureMoves(board, 3, 2, { ruleSet: RULESETS.AMERICAN });

  assert.equal(brCaptures.length, 1);
  assert.equal(usCaptures.length, 0);
});

test('engine enforces chain capture after a capture', () => {
  const engine = new CheckersEngine({ forceCapture: true, ruleSet: RULESETS.BRAZILIAN });
  engine.board = makeEmptyBoard();
  engine.turn = COLORS.WHITE;
  engine.board[5][0] = { color: COLORS.WHITE, king: false };
  engine.board[4][1] = { color: COLORS.BLACK, king: false };
  engine.board[2][3] = { color: COLORS.BLACK, king: false };
  engine.rebuildPositionHistory();

  const firstMove = engine.tryMove([5, 0], [3, 2]);
  assert.equal(firstMove.ok, true);
  assert.equal(firstMove.chainCapture, true);
  assert.deepEqual(engine.mustContinueFrom, [3, 2]);

  const secondMove = engine.tryMove([3, 2], [1, 4]);
  assert.equal(secondMove.ok, true);
  assert.equal(secondMove.chainCapture, false);
  assert.equal(engine.turn, COLORS.BLACK);
});

test('engine marks draw by inactivity using drawConfig threshold', () => {
  const engine = new CheckersEngine({
    forceCapture: false,
    ruleSet: RULESETS.BRAZILIAN,
    drawConfig: { inactivityMoves: 2, repetitionCount: 99 }
  });
  engine.board = makeEmptyBoard();
  engine.turn = COLORS.WHITE;
  engine.board[5][0] = { color: COLORS.WHITE, king: false };
  engine.board[2][1] = { color: COLORS.BLACK, king: false };
  engine.rebuildPositionHistory();

  const move1 = engine.tryMove([5, 0], [4, 1]);
  assert.equal(move1.ok, true);
  assert.equal(engine.winner, null);

  const move2 = engine.tryMove([2, 1], [3, 0]);
  assert.equal(move2.ok, true);
  assert.equal(engine.winner, GAME_RESULT.DRAW);
  assert.equal(engine.drawReason, 'inactivity');
});
