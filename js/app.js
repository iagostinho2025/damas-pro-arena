import { CheckersEngine, cloneBoard, detectWinner, GAME_RESULT } from './engine.js';
import { BoardUI } from './modules/ui/board-ui.js';
import { AI_DIFFICULTY, chooseAIMove } from './modules/ai/minimax-ai.js';
import { ScreenRouter } from './modules/core/screen-router.js';
import { createStorageService } from './modules/core/storage.js';
import { EventBus } from './modules/core/event-bus.js';
import { TurnFlow } from './modules/core/turn-flow.js';
import { SyncCoordinator } from './modules/core/sync-coordinator.js';
import { GAME_EVENTS } from './modules/core/game-events.js';
import { createAudioFeedback } from './modules/feedback/audio-feedback.js';
import { pulseClass, vibrate } from './modules/feedback/haptics-feedback.js';

const DIFFICULTIES_PT = ['Facil', 'Medio', 'Dificil'];

const appShell = document.querySelector('.app-shell');
const screenMenu = document.getElementById('screen-menu');
const screenPlay = document.getElementById('screen-play');
const screenVsAi = document.getElementById('screen-vs-ai');
const screenSettings = document.getElementById('screen-settings');
const screenStats = document.getElementById('screen-stats');
const screenRules = document.getElementById('screen-rules');
const screenDifficulty = document.getElementById('screen-difficulty');
const screenGame = document.getElementById('screen-game');

const router = new ScreenRouter(appShell, {
  menu: screenMenu,
  play: screenPlay,
  vsai: screenVsAi,
  settings: screenSettings,
  stats: screenStats,
  rules: screenRules,
  difficulty: screenDifficulty,
  game: screenGame
}, { activeClass: 'active' });

const btnPlay = document.getElementById('btn-play');
const btnResume = document.getElementById('btn-resume');
const playProfileNameEl = document.getElementById('play-profile-name');
const playProfileLevelEl = document.getElementById('play-profile-level');
const playProfileRankEl = document.getElementById('play-profile-rank');
const profileRankEl = document.getElementById('profile-rank');
const profileLevelEl = document.getElementById('profile-level');
const profileWinsEl = document.getElementById('profile-wins');
const profileLossesEl = document.getElementById('profile-losses');
const profileBarFillEl = document.getElementById('profile-bar-fill');
const profilePointsEl = document.getElementById('profile-points');
const btnBackMenu = document.getElementById('btn-back-menu');
const btnRules = document.getElementById('btn-rules');
const btnDifficulty = document.getElementById('btn-difficulty');
const tournamentTimerEl = document.getElementById('tournament-timer');
const navItems = [...document.querySelectorAll('.nav-item')];

const btnVsAiDifficulty = document.getElementById('btn-vsai-difficulty');
const btnVsAiStart = document.getElementById('btn-vsai-start');
const btnVsAiBack = document.getElementById('btn-vsai-back');
const btnPlayCpu = document.getElementById('btn-play-cpu');
const btnPlayOnline = document.getElementById('btn-play-online');
const btnPlayTournament = document.getElementById('btn-play-tournament');
const btnPlayFriends = document.getElementById('btn-play-friends');
const btnPlayBack = document.getElementById('btn-play-back');

const settingsForceCaptureEl = document.getElementById('settings-force-capture');
const btnSettingsBack = document.getElementById('btn-settings-back');
const btnStatsBack = document.getElementById('btn-stats-back');
const btnRulesBack = document.getElementById('btn-rules-back');
const btnDifficultyBack = document.getElementById('btn-difficulty-back');
const btnRuleBrazilian = document.getElementById('btn-rule-brazilian');
const btnRuleAmerican = document.getElementById('btn-rule-american');
const btnDifficultyEasy = document.getElementById('btn-difficulty-easy');
const btnDifficultyMedium = document.getElementById('btn-difficulty-medium');
const btnDifficultyHard = document.getElementById('btn-difficulty-hard');

const statsRankEl = document.getElementById('stats-rank');
const statsLevelEl = document.getElementById('stats-level');
const statsPlayerWinsEl = document.getElementById('stats-player-wins');
const statsPlayerLossesEl = document.getElementById('stats-player-losses');
const statsRankPointsEl = document.getElementById('stats-rank-points');
const statsGamesPlayedEl = document.getElementById('stats-games-played');
const statsGamesAiEl = document.getElementById('stats-games-ai');
const statsGamesPvPEl = document.getElementById('stats-games-pvp');
const statsWhiteWinsEl = document.getElementById('stats-white-wins');
const statsBlackWinsEl = document.getElementById('stats-black-wins');
const statsTotalMovesEl = document.getElementById('stats-total-moves');
const statsTotalCapturesEl = document.getElementById('stats-total-captures');

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const btnNew = document.getElementById('btn-new');
const btnUndo = document.getElementById('btn-undo');
const forceCaptureEl = document.getElementById('force-capture');

const engine = new CheckersEngine({ forceCapture: true });
const boardUI = new BoardUI(boardEl, onBoardCellClick);
const storage = createStorageService();
const audioFeedback = createAudioFeedback();
const eventBus = new EventBus();
const turnFlow = new TurnFlow({ mode: 'ai', localColor: 'white' });
const syncCoordinator = new SyncCoordinator({ eventBus });

let highlightedMoves = [];
let boardEffects = null;
let menuPrefs = storage.getSettings();
let globalStats = storage.getStats();
let playerProgress = storage.getProgress();
let lastGame = storage.getLastGame();
let currentMatch = null;
let matchFinalized = false;
let tournamentInterval = null;
let aiTimer = null;
let fxTimer = null;
let audioUnlocked = false;
const PLAYER_NAME = localStorage.getItem('dpa_player_name') || 'Jogador';

engine.setRuleSet(menuPrefs.ruleSet);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

function showScreen(name) {
  router.show(name);
  if (name === 'play') {
    triggerPlayIntro();
    if (audioUnlocked) audioFeedback.startMenuAmbience();
  } else {
    audioFeedback.stopMenuAmbience();
  }

  eventBus.emit(GAME_EVENTS.SCREEN_CHANGED, { screen: name });
}

function triggerPlayIntro() {
  if (!screenPlay) return;
  screenPlay.classList.remove('play-intro-run');
  void screenPlay.offsetWidth;
  screenPlay.classList.add('play-intro-run');
}

function setupPlayIntroStagger() {
  if (!screenPlay) return;
  const staggerItems = [
    ...screenPlay.querySelectorAll('.play-profile, .play-modes .play-tile, .panel-actions > *')
  ];
  staggerItems.forEach((el, i) => {
    el.style.setProperty('--play-stagger', String(i + 1));
  });
}

function emitGameEvent(eventType, payload = {}, { sync = true } = {}) {
  eventBus.emit(eventType, payload);
  if (sync) syncCoordinator.pushOutbound(eventType, payload);
}

function getAiDifficultyKey() {
  if (menuPrefs.difficulty === 'Facil') return AI_DIFFICULTY.EASY;
  if (menuPrefs.difficulty === 'Dificil') return AI_DIFFICULTY.HARD;
  return AI_DIFFICULTY.MEDIUM;
}

function isAiTurn() {
  return turnFlow.isAITurn(engine.turn) && !engine.winner;
}

function clearSelection() {
  engine.selected = null;
  highlightedMoves = [];
}

function inferCaptureCell(move) {
  const dr = move.to[0] - move.from[0];
  const dc = move.to[1] - move.from[1];
  if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return null;
  return [move.from[0] + dr / 2, move.from[1] + dc / 2];
}

function applyMoveEffects(move) {
  const capture = move.capture || inferCaptureCell(move);
  boardEffects = {
    from: [...move.from],
    to: [...move.to],
    capture: capture ? [...capture] : null
  };

  if (fxTimer) clearTimeout(fxTimer);
  fxTimer = setTimeout(() => {
    boardEffects = null;
    fxTimer = null;
    renderBoard();
  }, 320);
}

function countMoveForMatch(move) {
  if (!currentMatch) return;
  currentMatch.moves += 1;
  if (move.capture || inferCaptureCell(move)) currentMatch.captures += 1;
}

function triggerMoveFeedback(move, { actor = 'local' } = {}) {
  const isCapture = !!(move.capture || inferCaptureCell(move));
  const isLocalActor = actor === 'local';

  if (isCapture) {
    audioFeedback.playCapture();
    if (isLocalActor) vibrate(14);
  } else {
    audioFeedback.playMove();
    if (isLocalActor) vibrate(8);
  }
}

function createEngineSnapshot() {
  return engine.snapshot();
}

function applyEngineSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.board) || snapshot.board.length !== 8) return false;

  engine.board = cloneBoard(snapshot.board);
  engine.turn = snapshot.turn === 'black' ? 'black' : 'white';
  engine.selected = snapshot.selected ? [...snapshot.selected] : null;
  engine.mustContinueFrom = snapshot.mustContinueFrom ? [...snapshot.mustContinueFrom] : null;
  engine.winner = snapshot.winner || null;
  engine.setRuleSet(snapshot.ruleSet || menuPrefs.ruleSet);
  engine.drawReason = snapshot.drawReason || null;
  engine.nonProgressMoves = Number.isFinite(snapshot.nonProgressMoves) ? snapshot.nonProgressMoves : 0;
  engine.positionCounts = snapshot.positionCounts ? { ...snapshot.positionCounts } : {};
  if (!engine.winner && Object.keys(engine.positionCounts).length === 0) {
    engine.trackCurrentPosition();
  }
  if (snapshot.drawConfig) engine.setDrawConfig(snapshot.drawConfig);
  engine.setForceCapture(!!snapshot.forceCapture);
  return true;
}

function persistLastGame() {
  const payload = {
    savedAt: Date.now(),
    menuPrefs,
    engine: createEngineSnapshot(),
    currentMatch,
    matchFinalized
  };

  storage.saveLastGame(payload);
  lastGame = payload;
  refreshResumeButton();
}

function finalizeMatchIfNeeded() {
  if (!engine.winner || matchFinalized) return;

  matchFinalized = true;

  globalStats = storage.recordMatch({
    winner: engine.winner,
    mode: menuPrefs.mode,
    playerColor: currentMatch?.playerColor || 'white',
    moves: currentMatch?.moves || 0,
    captures: currentMatch?.captures || 0
  });

  refreshProgressCard();
  const playerWon = engine.winner === (currentMatch?.playerColor || 'white');
  if (playerWon) {
    audioFeedback.playVictory();
    vibrate([40, 50, 60]);
    pulseClass(appShell, 'fx-outcome-win', 700);
  } else {
    audioFeedback.playDefeat();
    vibrate([120, 60, 120]);
    pulseClass(appShell, 'fx-outcome-lose', 700);
  }

  emitGameEvent(GAME_EVENTS.MATCH_FINISHED, {
    winner: engine.winner,
    mode: menuPrefs.mode,
    moves: currentMatch?.moves || 0,
    captures: currentMatch?.captures || 0
  });

  persistLastGame();
}

function renderStatus() {
  finalizeMatchIfNeeded();

  const turnLabel = engine.turn === 'white' ? 'Brancas' : 'Pretas';

  if (engine.winner) {
    if (engine.winner === GAME_RESULT.DRAW) {
      if (engine.drawReason === 'repetition') {
        statusEl.textContent = 'Empate: repeticao de posicao (3x).';
        return;
      }
      if (engine.drawReason === 'inactivity') {
        statusEl.textContent = 'Empate: 40 jogadas sem captura/promocao.';
        return;
      }
      statusEl.textContent = 'Empate: sem movimentos para os dois lados.';
      return;
    }

    const winnerText = engine.winner === 'white' ? 'Brancas' : 'Pretas';
    statusEl.textContent = `Fim de jogo: ${winnerText} venceram.`;
    return;
  }

  if (engine.mustContinueFrom) {
    statusEl.textContent = `${turnLabel}: captura em sequencia obrigatoria.`;
    return;
  }

  if (isAiTurn()) {
    statusEl.textContent = `IA (${menuPrefs.difficulty}) pensando...`;
    return;
  }

  statusEl.textContent = `Vez das ${turnLabel}.`;
}

function renderBoard() {
  boardUI.render({
    board: engine.board,
    selected: engine.selected,
    highlightedMoves,
    effects: boardEffects
  });
}

function renderAll() {
  renderBoard();
  renderStatus();
}

function selectPiece(row, col) {
  const piece = engine.board[row][col];
  if (!piece || piece.color !== engine.turn) return;

  const allowed = engine.getAllowedMovesFrom(row, col);
  if (allowed.length === 0) return;

  engine.selected = [row, col];
  highlightedMoves = allowed;
  renderAll();
}

function onBoardCellClick(row, col) {
  if (!turnFlow.canLocalAct(engine.turn) || engine.winner) return;

  if (engine.selected) {
    const chosenMove = highlightedMoves.find((mv) => mv.to[0] === row && mv.to[1] === col) || null;
    const moveResult = engine.tryMove(engine.selected, [row, col]);

    if (moveResult.ok) {
      if (chosenMove) {
        applyMoveEffects(chosenMove);
        countMoveForMatch(chosenMove);
        triggerMoveFeedback(chosenMove, { actor: 'local' });
        emitGameEvent(GAME_EVENTS.MOVE_COMMITTED, {
          actor: 'local',
          move: chosenMove,
          turnAfter: engine.turn,
          chainCapture: !!moveResult.chainCapture
        });
      }

      if (moveResult.chainCapture) {
        const [nr, nc] = moveResult.movedTo;
        engine.selected = [nr, nc];
        highlightedMoves = engine.getAllowedMovesFrom(nr, nc);
      } else {
        clearSelection();
      }

      renderAll();
      emitGameEvent(GAME_EVENTS.TURN_CHANGED, {
        turn: engine.turn,
        actor: turnFlow.getActorForTurn(engine.turn)
      });
      persistLastGame();
      scheduleAiMove();
      return;
    }

    const targetPiece = engine.board[row][col];
    if (targetPiece && targetPiece.color === engine.turn) {
      selectPiece(row, col);
      return;
    }

    clearSelection();
    renderAll();
    return;
  }

  selectPiece(row, col);
}

function clearAiTimer() {
  if (!aiTimer) return;
  clearTimeout(aiTimer);
  aiTimer = null;
}

function scheduleAiMove() {
  clearAiTimer();
  if (!isAiTurn()) return;

  renderStatus();

  aiTimer = setTimeout(() => {
    const runAiStep = () => {
      aiTimer = null;
      if (!isAiTurn()) return;

      const move = chooseAIMove(engine, {
        color: 'black',
        difficulty: getAiDifficultyKey()
      });

      if (!move) {
        engine.winner = detectWinner(engine.board, engine.turn, {
          forceCapture: engine.forceCapture,
          ruleSet: engine.ruleSet
        }) || 'white';
        if (engine.winner === GAME_RESULT.DRAW) engine.drawReason = 'blocked';
        clearSelection();
        renderAll();
        emitGameEvent(GAME_EVENTS.TURN_CHANGED, {
          turn: engine.turn,
          actor: turnFlow.getActorForTurn(engine.turn)
        });
        persistLastGame();
        return;
      }

      const moveResult = engine.tryMove(move.from, move.to);
      if (!moveResult.ok) {
        clearSelection();
        renderAll();
        persistLastGame();
        return;
      }

      applyMoveEffects(move);
      countMoveForMatch(move);
      triggerMoveFeedback(move, { actor: 'ai' });
      emitGameEvent(GAME_EVENTS.MOVE_COMMITTED, {
        actor: 'ai',
        move,
        turnAfter: engine.turn,
        chainCapture: !!moveResult.chainCapture
      });

      clearSelection();
      renderAll();
      persistLastGame();

      if (moveResult.chainCapture && isAiTurn() && !engine.winner) {
        aiTimer = setTimeout(runAiStep, 340);
        return;
      }

      emitGameEvent(GAME_EVENTS.TURN_CHANGED, {
        turn: engine.turn,
        actor: turnFlow.getActorForTurn(engine.turn)
      });
    };

    runAiStep();
  }, 320);
}

function fmt2(n) {
  return String(n).padStart(2, '0');
}

function getNextTournamentDate() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(21, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

function updateTournamentTimer() {
  if (!tournamentTimerEl) return;

  const target = getNextTournamentDate();
  const now = Date.now();
  const diff = Math.max(0, target.getTime() - now);
  const totalSec = Math.floor(diff / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  tournamentTimerEl.textContent = `${fmt2(hh)}:${fmt2(mm)}:${fmt2(ss)}`;
}

function startTournamentClock() {
  if (!tournamentTimerEl) return;

  if (tournamentInterval) clearInterval(tournamentInterval);
  updateTournamentTimer();
  tournamentInterval = setInterval(updateTournamentTimer, 1000);
}

function saveSettings() {
  storage.saveSettings(menuPrefs);
}

function syncForceCaptureInputs() {
  forceCaptureEl.checked = !!menuPrefs.forceCapture;
  settingsForceCaptureEl.checked = !!menuPrefs.forceCapture;
}

function refreshResumeButton() {
  const hasResume = !!(lastGame && lastGame.engine && Array.isArray(lastGame.engine.board));
  btnResume.style.display = hasResume ? '' : 'none';
}

function refreshProgressCard() {
  playerProgress = storage.getProgress();

  if (playProfileNameEl) playProfileNameEl.textContent = PLAYER_NAME;
  if (playProfileLevelEl) playProfileLevelEl.textContent = `Nível ${playerProgress.level}`;
  if (playProfileRankEl) playProfileRankEl.textContent = playerProgress.rankName;

  if (!profileRankEl || !profileLevelEl || !profileWinsEl || !profileLossesEl || !profileBarFillEl || !profilePointsEl) {
    return;
  }

  profileRankEl.textContent = playerProgress.rankName;
  profileLevelEl.textContent = `Nível ${playerProgress.level}`;
  profileWinsEl.textContent = `Vitórias: ${playerProgress.wins}`;
  profileLossesEl.textContent = `Derrotas: ${playerProgress.losses}`;
  profileBarFillEl.style.width = `${playerProgress.levelProgressPct}%`;
  profilePointsEl.textContent = `${playerProgress.pointsIntoLevel} / ${playerProgress.pointsToNextLevel} pontos`;
}

function refreshStatsScreen() {
  globalStats = storage.getStats();
  playerProgress = storage.getProgress();

  if (statsRankEl) statsRankEl.textContent = playerProgress.rankName;
  if (statsLevelEl) statsLevelEl.textContent = `Nível ${playerProgress.level}`;
  if (statsPlayerWinsEl) statsPlayerWinsEl.textContent = String(playerProgress.wins);
  if (statsPlayerLossesEl) statsPlayerLossesEl.textContent = String(playerProgress.losses);
  if (statsRankPointsEl) statsRankPointsEl.textContent = String(playerProgress.rankPoints);

  if (statsGamesPlayedEl) statsGamesPlayedEl.textContent = String(globalStats.gamesPlayed);
  if (statsGamesAiEl) statsGamesAiEl.textContent = String(globalStats.gamesVsAi);
  if (statsGamesPvPEl) statsGamesPvPEl.textContent = String(globalStats.gamesPvP);
  if (statsWhiteWinsEl) statsWhiteWinsEl.textContent = String(globalStats.whiteWins);
  if (statsBlackWinsEl) statsBlackWinsEl.textContent = String(globalStats.blackWins);
  if (statsTotalMovesEl) statsTotalMovesEl.textContent = String(globalStats.totalMoves);
  if (statsTotalCapturesEl) statsTotalCapturesEl.textContent = String(globalStats.totalCaptures);
}

function refreshMenuButtons() {
  btnRules.setAttribute('aria-label', `Regras: ${menuPrefs.ruleSet}`);
  btnDifficulty.setAttribute('aria-label', `Dificuldade: ${menuPrefs.difficulty}`);
  btnVsAiDifficulty.textContent = `Dificuldade: ${menuPrefs.difficulty}`;
  btnPlay.setAttribute('aria-label', 'Jogar');
}

function refreshRulesScreen() {
  btnRuleBrazilian?.classList.toggle('active', menuPrefs.ruleSet === 'Brasileiro');
  btnRuleAmerican?.classList.toggle('active', menuPrefs.ruleSet === 'Americano');
}

function refreshDifficultyScreen() {
  btnDifficultyEasy?.classList.toggle('active', menuPrefs.difficulty === 'Facil');
  btnDifficultyMedium?.classList.toggle('active', menuPrefs.difficulty === 'Medio');
  btnDifficultyHard?.classList.toggle('active', menuPrefs.difficulty === 'Dificil');
}

function startMatch({ resume = false } = {}) {
  clearAiTimer();
  if (fxTimer) {
    clearTimeout(fxTimer);
    fxTimer = null;
  }

  boardEffects = null;

  if (resume && lastGame && applyEngineSnapshot(lastGame.engine)) {
    menuPrefs = { ...menuPrefs, ...(lastGame.menuPrefs || {}) };
    currentMatch = lastGame.currentMatch || { moves: 0, captures: 0, playerColor: 'white', startedAt: Date.now() };
    if (!currentMatch.playerColor) currentMatch.playerColor = 'white';
    matchFinalized = !!lastGame.matchFinalized;
    emitGameEvent(GAME_EVENTS.MATCH_RESTORED, {
      mode: menuPrefs.mode,
      turn: engine.turn
    });
  } else {
    engine.reset();
    engine.setForceCapture(!!menuPrefs.forceCapture);
    engine.setRuleSet(menuPrefs.ruleSet);
    currentMatch = { moves: 0, captures: 0, playerColor: 'white', startedAt: Date.now() };
    matchFinalized = false;
    emitGameEvent(GAME_EVENTS.MATCH_STARTED, {
      mode: menuPrefs.mode,
      turn: engine.turn
    });
  }

  turnFlow.configure({ mode: menuPrefs.mode, localColor: currentMatch?.playerColor || 'white' });
  clearSelection();
  syncForceCaptureInputs();
  refreshMenuButtons();
  renderAll();
  showScreen('game');
  emitGameEvent(GAME_EVENTS.TURN_CHANGED, {
    turn: engine.turn,
    actor: turnFlow.getActorForTurn(engine.turn)
  });
  persistLastGame();
  scheduleAiMove();
}

btnPlay.addEventListener('click', () => {
  showScreen('play');
});

btnResume.addEventListener('click', () => {
  startMatch({ resume: true });
});

btnVsAiStart.addEventListener('click', () => {
  menuPrefs.mode = 'ai';
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'mode', value: menuPrefs.mode });
  startMatch();
});

btnVsAiBack.addEventListener('click', () => {
  audioFeedback.playBack();
  showScreen('play');
});

btnPlayCpu.addEventListener('click', () => {
  showScreen('vsai');
});

btnPlayOnline.addEventListener('click', () => {
  alert('Modo online em breve.');
});

btnPlayTournament.addEventListener('click', () => {
  alert('Modo torneio em breve.');
});

btnPlayFriends.addEventListener('click', () => {
  alert('Modo jogar com amigos em breve.');
});

btnPlayBack.addEventListener('click', () => {
  audioFeedback.playBack();
  showScreen('menu');
});

btnVsAiDifficulty.addEventListener('click', () => {
  const index = DIFFICULTIES_PT.indexOf(menuPrefs.difficulty);
  menuPrefs.difficulty = DIFFICULTIES_PT[(index + 1) % DIFFICULTIES_PT.length];
  refreshMenuButtons();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'difficulty', value: menuPrefs.difficulty });
  persistLastGame();
});

btnBackMenu.addEventListener('click', () => {
  audioFeedback.playBack();
  clearAiTimer();
  showScreen('menu');
  persistLastGame();
});

btnRules.addEventListener('click', () => {
  refreshRulesScreen();
  showScreen('rules');
});

btnDifficulty.addEventListener('click', () => {
  refreshDifficultyScreen();
  showScreen('difficulty');
});

navItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.nav;

    if (section === 'settings') {
      showScreen('settings');
      return;
    }

    if (section === 'pvp') {
      menuPrefs.mode = menuPrefs.mode === 'ai' ? 'pvp' : 'ai';
      turnFlow.configure({ mode: menuPrefs.mode, localColor: currentMatch?.playerColor || 'white' });
      refreshMenuButtons();
      saveSettings();
      emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'mode', value: menuPrefs.mode });
      persistLastGame();
      return;
    }

    if (section === 'stats') {
      refreshStatsScreen();
      showScreen('stats');
      return;
    }

    alert('Sessao em construcao.');
  });
});

btnSettingsBack.addEventListener('click', () => {
  audioFeedback.playBack();
  showScreen('menu');
});

btnStatsBack.addEventListener('click', () => {
  audioFeedback.playBack();
  showScreen('menu');
});

btnRulesBack.addEventListener('click', () => {
  audioFeedback.playBack();
  showScreen('menu');
});

btnDifficultyBack.addEventListener('click', () => {
  audioFeedback.playBack();
  showScreen('menu');
});

btnRuleBrazilian.addEventListener('click', () => {
  if (menuPrefs.ruleSet === 'Brasileiro') return;
  menuPrefs.ruleSet = 'Brasileiro';
  engine.setRuleSet(menuPrefs.ruleSet);
  refreshMenuButtons();
  refreshRulesScreen();
  clearSelection();
  renderAll();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'ruleSet', value: menuPrefs.ruleSet });
  persistLastGame();
});

btnRuleAmerican.addEventListener('click', () => {
  if (menuPrefs.ruleSet === 'Americano') return;
  menuPrefs.ruleSet = 'Americano';
  engine.setRuleSet(menuPrefs.ruleSet);
  refreshMenuButtons();
  refreshRulesScreen();
  clearSelection();
  renderAll();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'ruleSet', value: menuPrefs.ruleSet });
  persistLastGame();
});

btnDifficultyEasy.addEventListener('click', () => {
  if (menuPrefs.difficulty === 'Facil') return;
  menuPrefs.difficulty = 'Facil';
  refreshMenuButtons();
  refreshDifficultyScreen();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'difficulty', value: menuPrefs.difficulty });
  persistLastGame();
});

btnDifficultyMedium.addEventListener('click', () => {
  if (menuPrefs.difficulty === 'Medio') return;
  menuPrefs.difficulty = 'Medio';
  refreshMenuButtons();
  refreshDifficultyScreen();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'difficulty', value: menuPrefs.difficulty });
  persistLastGame();
});

btnDifficultyHard.addEventListener('click', () => {
  if (menuPrefs.difficulty === 'Dificil') return;
  menuPrefs.difficulty = 'Dificil';
  refreshMenuButtons();
  refreshDifficultyScreen();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'difficulty', value: menuPrefs.difficulty });
  persistLastGame();
});

function registerMenuClickSound() {
  const menuClickButtons = [
    btnPlay,
    btnResume,
    btnRules,
    btnDifficulty,
    btnPlayCpu,
    btnPlayOnline,
    btnPlayTournament,
    btnPlayFriends,
    btnVsAiDifficulty,
    btnVsAiStart,
    ...navItems
  ].filter(Boolean);

  const optionClickButtons = [
    btnRuleBrazilian,
    btnRuleAmerican,
    btnDifficultyEasy,
    btnDifficultyMedium,
    btnDifficultyHard
  ].filter(Boolean);

  menuClickButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      audioFeedback.playMenuClick();
    });
  });

  optionClickButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      audioFeedback.playMenuClick();
    });
  });
}

settingsForceCaptureEl.addEventListener('change', () => {
  audioFeedback.playMenuClick();
  menuPrefs.forceCapture = settingsForceCaptureEl.checked;
  forceCaptureEl.checked = settingsForceCaptureEl.checked;
  engine.setForceCapture(menuPrefs.forceCapture);
  clearSelection();
  renderAll();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'forceCapture', value: menuPrefs.forceCapture });
  persistLastGame();
});

btnNew.addEventListener('click', () => {
  audioFeedback.playMenuClick();
  startMatch();
});

btnUndo.addEventListener('click', () => {
  audioFeedback.playMenuClick();
  if (isAiTurn()) return;

  if (engine.undo()) {
    clearSelection();
    renderAll();
    persistLastGame();
  }
});

forceCaptureEl.addEventListener('change', () => {
  audioFeedback.playMenuClick();
  menuPrefs.forceCapture = forceCaptureEl.checked;
  settingsForceCaptureEl.checked = forceCaptureEl.checked;
  engine.setForceCapture(menuPrefs.forceCapture);
  clearSelection();
  renderAll();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'forceCapture', value: menuPrefs.forceCapture });
  persistLastGame();
});

eventBus.on(GAME_EVENTS.SYNC_INBOUND_EVENT, (_envelope) => {
  // Reserved for future online mode: reconcile inbound remote events here.
});

turnFlow.configure({ mode: menuPrefs.mode, localColor: 'white' });
syncCoordinator.connect().catch(() => {});
window.addEventListener('beforeunload', () => {
  audioFeedback.stopMenuAmbience();
  syncCoordinator.disconnect().catch(() => {});
});

window.addEventListener('pointerdown', () => {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audioFeedback.unlock();
  if (appShell?.dataset.screen === 'play') {
    audioFeedback.startMenuAmbience();
  }
}, { once: true });

boardUI.mount();
setupPlayIntroStagger();
registerMenuClickSound();
refreshMenuButtons();
refreshRulesScreen();
refreshDifficultyScreen();
refreshProgressCard();
refreshStatsScreen();
startTournamentClock();
syncForceCaptureInputs();
refreshResumeButton();
renderAll();
showScreen('menu');






