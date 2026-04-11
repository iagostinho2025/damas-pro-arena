import test from 'node:test';
import assert from 'node:assert/strict';
import { RULESETS } from '../engine.js';
import {
  getAiMatchSetup,
  hasResumableMatch,
  getAiDifficultyKey
} from '../modules/core/match-utils.js';

test('getAiMatchSetup resolves colors and starter for cpu start', () => {
  const setup = getAiMatchSetup({ playerColor: 'white', aiStarter: 'cpu' });
  assert.equal(setup.playerColor, 'white');
  assert.equal(setup.aiColor, 'black');
  assert.equal(setup.startTurn, 'black');
});

test('hasResumableMatch returns false for finalized or winner games', () => {
  const finalized = hasResumableMatch({
    matchFinalized: true,
    engine: { board: Array.from({ length: 8 }, () => Array(8).fill(null)), winner: null }
  });
  const withWinner = hasResumableMatch({
    matchFinalized: false,
    engine: { board: Array.from({ length: 8 }, () => Array(8).fill(null)), winner: 'white' }
  });

  assert.equal(finalized, false);
  assert.equal(withWinner, false);
});

test('hasResumableMatch returns true for valid in-progress snapshot', () => {
  const resumable = hasResumableMatch({
    matchFinalized: false,
    engine: { board: Array.from({ length: 8 }, () => Array(8).fill(null)), winner: null }
  });
  assert.equal(resumable, true);
});

test('getAiDifficultyKey maps labels correctly', () => {
  const AI_DIFFICULTY = Object.freeze({
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    EXPERT: 'expert'
  });

  assert.equal(getAiDifficultyKey('Facil', AI_DIFFICULTY), AI_DIFFICULTY.EASY);
  assert.equal(getAiDifficultyKey('Dificil', AI_DIFFICULTY), AI_DIFFICULTY.HARD);
  assert.equal(getAiDifficultyKey('Expert', AI_DIFFICULTY), AI_DIFFICULTY.EXPERT);
  assert.equal(getAiDifficultyKey(RULESETS.BRAZILIAN, AI_DIFFICULTY), AI_DIFFICULTY.MEDIUM);
});
