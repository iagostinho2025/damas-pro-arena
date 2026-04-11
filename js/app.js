import { CheckersEngine, cloneBoard, detectWinner, GAME_RESULT } from './engine.js';
import { BoardUI } from './modules/ui/board-ui.js';
import { AI_DIFFICULTY, chooseAIMove } from './modules/ai/minimax-ai.js';
import { ScreenRouter } from './modules/core/screen-router.js';
import { createStorageService } from './modules/core/storage.js';
import { EventBus } from './modules/core/event-bus.js';
import { TurnFlow } from './modules/core/turn-flow.js';
import { SyncCoordinator } from './modules/core/sync-coordinator.js';
import { GAME_EVENTS } from './modules/core/game-events.js';
import {
  DIFFICULTIES_PT,
  getAiDifficultyKey,
  getAiMatchSetup,
  inferCaptureCell,
  hasResumableMatch,
  fmt2,
  getNextTournamentDate
} from './modules/core/match-utils.js';
import { createAiTurnController } from './modules/core/ai-turn-controller.js';
import { registerMenuClickSound, registerPlayCarouselSound } from './modules/ui/interaction-bindings.js';
import { registerAppEventBindings } from './modules/ui/app-event-bindings.js';
import { createAudioFeedback } from './modules/feedback/audio-feedback.js';
import { pulseClass, vibrate } from './modules/feedback/haptics-feedback.js';

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

const btnVsAiStart = document.getElementById('btn-vsai-start');
const btnVsAiBack = document.getElementById('btn-vsai-back');
const btnVsAiDifficultyEasy = document.getElementById('btn-vsai-difficulty-easy');
const btnVsAiDifficultyMedium = document.getElementById('btn-vsai-difficulty-medium');
const btnVsAiDifficultyHard = document.getElementById('btn-vsai-difficulty-hard');
const btnVsAiDifficultyExpert = document.getElementById('btn-vsai-difficulty-expert');
const btnVsAiStarterPlayer = document.getElementById('btn-vsai-starter-player');
const btnVsAiStarterRandom = document.getElementById('btn-vsai-starter-random');
const btnVsAiStarterCpu = document.getElementById('btn-vsai-starter-cpu');
const btnVsAiRuleBrazilian = document.getElementById('btn-vsai-rule-brazilian');
const btnVsAiRuleAmerican = document.getElementById('btn-vsai-rule-american');
const btnVsAiColorLight = document.getElementById('btn-vsai-color-light');
const btnVsAiColorDark = document.getElementById('btn-vsai-color-dark');
const btnPlayCpu = document.getElementById('btn-play-cpu');
const btnPlayOnline = document.getElementById('btn-play-online');
const btnPlayTournament = document.getElementById('btn-play-tournament');
const btnPlayFriends = document.getElementById('btn-play-friends');
const btnPlayBack = document.getElementById('btn-play-back');
const playModesEl = document.querySelector('.play-modes');

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
const btnDifficultyExpert = document.getElementById('btn-difficulty-expert');

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
const gamePlayerCardEl = document.getElementById('game-player-card');
const gameOpponentCardEl = document.getElementById('game-opponent-card');
const gamePlayerNameEl = document.getElementById('game-player-name');
const gamePlayerSideEl = document.getElementById('game-player-side');
const gameOpponentNameEl = document.getElementById('game-opponent-name');
const gameOpponentSideEl = document.getElementById('game-opponent-side');
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
let fxTimer = null;
let audioUnlocked = false;
let aiTurnController = null;
let newMatchConfirmPending = false;
let newMatchConfirmTimer = null;
const PLAYER_NAME = localStorage.getItem('dpa_player_name') || 'Jogador';

engine.setRuleSet(menuPrefs.ruleSet);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocalDev) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => {
          if (!('caches' in window)) return null;
          return caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
        })
        .catch(() => {});
      return;
    }

    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

function showScreen(name) {
  router.show(name);
  if (name === 'vsai') {
    refreshVsAiScreen();
  }
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

function isAiTurn() {
  if (aiTurnController) return aiTurnController.isAiTurn();
  return turnFlow.isAITurn(engine.turn) && !engine.winner;
}

function emitTurnChanged() {
  emitGameEvent(GAME_EVENTS.TURN_CHANGED, {
    turn: engine.turn,
    actor: turnFlow.getActorForTurn(engine.turn)
  });
}

function clearSelection() {
  engine.selected = null;
  highlightedMoves = [];
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
  refreshGameHud();

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

function refreshGameHud() {
  if (!gamePlayerNameEl || !gameOpponentNameEl || !gamePlayerSideEl || !gameOpponentSideEl) return;

  const localColor = currentMatch?.playerColor || (menuPrefs.playerColor === 'black' ? 'black' : 'white');
  const opponentColor = localColor === 'white' ? 'black' : 'white';
  const opponentName = menuPrefs.mode === 'ai' ? `CPU ${menuPrefs.difficulty}` : 'Jogador 2';

  gamePlayerNameEl.textContent = PLAYER_NAME;
  gameOpponentNameEl.textContent = opponentName;
  gamePlayerSideEl.textContent = localColor === 'white' ? 'Brancas' : 'Pretas';
  gameOpponentSideEl.textContent = opponentColor === 'white' ? 'Brancas' : 'Pretas';

  if (gamePlayerCardEl) gamePlayerCardEl.classList.toggle('is-active', engine.turn === localColor && !engine.winner);
  if (gameOpponentCardEl) gameOpponentCardEl.classList.toggle('is-active', engine.turn === opponentColor && !engine.winner);
}

function renderBoard() {
  boardUI.render({
    board: engine.board,
    selected: engine.selected,
    highlightedMoves,
    effects: boardEffects,
    orientation: currentMatch?.playerColor || 'white'
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
      emitTurnChanged();
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
  aiTurnController?.clearAiTimer();
}

function scheduleAiMove() {
  aiTurnController?.scheduleAiMove();
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
  if (forceCaptureEl) forceCaptureEl.checked = !!menuPrefs.forceCapture;
  if (settingsForceCaptureEl) settingsForceCaptureEl.checked = !!menuPrefs.forceCapture;
}

function refreshResumeButton() {
  if (!btnResume) return;
  const canResume = hasResumableMatch(lastGame);
  btnResume.disabled = !canResume;
  btnResume.setAttribute('aria-disabled', canResume ? 'false' : 'true');
  btnResume.setAttribute('aria-label', canResume ? 'Continuar partida' : 'Nenhuma partida para continuar');
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
  btnResume.setAttribute('aria-label', 'Continuar partida');
  btnRules.setAttribute('aria-label', 'Jogar com amigos');
  btnDifficulty.setAttribute('aria-label', 'Jogar torneio');
  btnPlay.setAttribute('aria-label', 'Jogar vs CPU');
}

function refreshRulesScreen() {
  btnRuleBrazilian?.classList.toggle('active', menuPrefs.ruleSet === 'Brasileiro');
  btnRuleAmerican?.classList.toggle('active', menuPrefs.ruleSet === 'Americano');
}

function refreshDifficultyScreen() {
  btnDifficultyEasy?.classList.toggle('active', menuPrefs.difficulty === 'Facil');
  btnDifficultyMedium?.classList.toggle('active', menuPrefs.difficulty === 'Medio');
  btnDifficultyHard?.classList.toggle('active', menuPrefs.difficulty === 'Dificil');
  btnDifficultyExpert?.classList.toggle('active', menuPrefs.difficulty === 'Expert');
}

function refreshVsAiScreen() {
  btnVsAiDifficultyEasy?.classList.toggle('active', menuPrefs.difficulty === 'Facil');
  btnVsAiDifficultyMedium?.classList.toggle('active', menuPrefs.difficulty === 'Medio');
  btnVsAiDifficultyHard?.classList.toggle('active', menuPrefs.difficulty === 'Dificil');
  btnVsAiDifficultyExpert?.classList.toggle('active', menuPrefs.difficulty === 'Expert');
  btnVsAiStarterPlayer?.classList.toggle('active', menuPrefs.aiStarter === 'player');
  btnVsAiStarterRandom?.classList.toggle('active', menuPrefs.aiStarter === 'random');
  btnVsAiStarterCpu?.classList.toggle('active', menuPrefs.aiStarter === 'cpu');
  btnVsAiRuleBrazilian?.classList.toggle('active', menuPrefs.ruleSet === 'Brasileiro');
  btnVsAiRuleAmerican?.classList.toggle('active', menuPrefs.ruleSet === 'Americano');
  btnVsAiColorLight?.classList.toggle('active', menuPrefs.playerColor !== 'black');
  btnVsAiColorDark?.classList.toggle('active', menuPrefs.playerColor === 'black');
}

function startMatch({ resume = false } = {}) {
  resetNewMatchConfirm();
  clearAiTimer();
  if (fxTimer) {
    clearTimeout(fxTimer);
    fxTimer = null;
  }

  boardEffects = null;

  if (resume && lastGame && applyEngineSnapshot(lastGame.engine)) {
    menuPrefs = { ...menuPrefs, ...(lastGame.menuPrefs || {}) };
    currentMatch = lastGame.currentMatch || {
      moves: 0,
      captures: 0,
      playerColor: 'white',
      aiColor: 'black',
      starterResolved: 'player',
      startedAt: Date.now()
    };
    if (!currentMatch.playerColor) currentMatch.playerColor = 'white';
    if (!currentMatch.aiColor) currentMatch.aiColor = currentMatch.playerColor === 'white' ? 'black' : 'white';
    matchFinalized = !!lastGame.matchFinalized;
    emitGameEvent(GAME_EVENTS.MATCH_RESTORED, {
      mode: menuPrefs.mode,
      turn: engine.turn
    });
  } else {
    engine.reset();
    engine.setForceCapture(!!menuPrefs.forceCapture);
    engine.setRuleSet(menuPrefs.ruleSet);
    const matchSetup = menuPrefs.mode === 'ai'
      ? getAiMatchSetup(menuPrefs)
      : { playerColor: 'white', aiColor: 'black', starterResolved: 'player', startTurn: 'white' };
    engine.turn = matchSetup.startTurn;
    engine.rebuildPositionHistory();
    currentMatch = {
      moves: 0,
      captures: 0,
      playerColor: matchSetup.playerColor,
      aiColor: matchSetup.aiColor,
      starterResolved: matchSetup.starterResolved,
      startedAt: Date.now()
    };
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
  emitTurnChanged();
  persistLastGame();
  scheduleAiMove();
}

function setMenuDifficulty(nextDifficulty) {
  if (!DIFFICULTIES_PT.includes(nextDifficulty) || menuPrefs.difficulty === nextDifficulty) return;
  menuPrefs.difficulty = nextDifficulty;
  refreshMenuButtons();
  refreshDifficultyScreen();
  refreshVsAiScreen();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'difficulty', value: menuPrefs.difficulty });
  persistLastGame();
}

function setMenuRuleSet(nextRuleSet) {
  if (!['Brasileiro', 'Americano'].includes(nextRuleSet) || menuPrefs.ruleSet === nextRuleSet) return;
  menuPrefs.ruleSet = nextRuleSet;
  engine.setRuleSet(menuPrefs.ruleSet);
  refreshMenuButtons();
  refreshRulesScreen();
  refreshVsAiScreen();
  clearSelection();
  renderAll();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'ruleSet', value: menuPrefs.ruleSet });
  persistLastGame();
}

function setAiStarter(nextStarter) {
  if (!['player', 'random', 'cpu'].includes(nextStarter) || menuPrefs.aiStarter === nextStarter) return;
  menuPrefs.aiStarter = nextStarter;
  refreshVsAiScreen();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'aiStarter', value: menuPrefs.aiStarter });
  persistLastGame();
}

function setPlayerColor(nextColor) {
  if (!['white', 'black'].includes(nextColor) || menuPrefs.playerColor === nextColor) return;
  menuPrefs.playerColor = nextColor;
  refreshVsAiScreen();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'playerColor', value: menuPrefs.playerColor });
  persistLastGame();
}

function showSoon(message) {
  alert(message);
}

function clearNewMatchConfirmTimer() {
  if (!newMatchConfirmTimer) return;
  clearTimeout(newMatchConfirmTimer);
  newMatchConfirmTimer = null;
}

function setNewMatchButtonState() {
  if (!btnNew) return;
  const label = btnNew.querySelector('span:last-child');
  btnNew.classList.toggle('confirm-pending', newMatchConfirmPending);
  if (label) {
    label.textContent = newMatchConfirmPending ? 'Confirmar reinício' : 'Nova partida';
  }
}

function resetNewMatchConfirm() {
  newMatchConfirmPending = false;
  clearNewMatchConfirmTimer();
  setNewMatchButtonState();
}

function requestNewMatchConfirmOrStart() {
  if (newMatchConfirmPending) {
    resetNewMatchConfirm();
    startMatch();
    return;
  }

  newMatchConfirmPending = true;
  setNewMatchButtonState();
  clearNewMatchConfirmTimer();
  newMatchConfirmTimer = setTimeout(() => {
    resetNewMatchConfirm();
  }, 2800);
}

function backToMenu() {
  audioFeedback.playBack();
  showScreen('menu');
}

function togglePvpMode() {
  menuPrefs.mode = menuPrefs.mode === 'ai' ? 'pvp' : 'ai';
  turnFlow.configure({ mode: menuPrefs.mode, localColor: currentMatch?.playerColor || 'white' });
  refreshMenuButtons();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'mode', value: menuPrefs.mode });
  persistLastGame();
}

function applyForceCapture(enabled) {
  menuPrefs.forceCapture = !!enabled;
  if (settingsForceCaptureEl) settingsForceCaptureEl.checked = menuPrefs.forceCapture;
  if (forceCaptureEl) forceCaptureEl.checked = menuPrefs.forceCapture;
  engine.setForceCapture(menuPrefs.forceCapture);
  clearSelection();
  renderAll();
  saveSettings();
  emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'forceCapture', value: menuPrefs.forceCapture });
  persistLastGame();
}

aiTurnController = createAiTurnController({
  engine,
  turnFlow,
  chooseAIMove,
  detectWinner,
  GAME_RESULT,
  getMenuPrefs: () => menuPrefs,
  getCurrentMatch: () => currentMatch,
  getDifficultyKey: (prefs) => getAiDifficultyKey(prefs.difficulty, AI_DIFFICULTY),
  clearSelection,
  renderAll,
  renderStatus,
  applyMoveEffects,
  countMoveForMatch,
  triggerMoveFeedback,
  emitTurnChanged,
  emitMoveCommitted: (payload) => emitGameEvent(GAME_EVENTS.MOVE_COMMITTED, payload),
  persistLastGame
});

registerAppEventBindings({
  elements: {
    btnPlay,
    btnResume,
    btnVsAiStart,
    btnVsAiBack,
    btnPlayCpu,
    btnPlayOnline,
    btnPlayTournament,
    btnPlayFriends,
    btnPlayBack,
    btnVsAiDifficultyEasy,
    btnVsAiDifficultyMedium,
    btnVsAiDifficultyHard,
    btnVsAiDifficultyExpert,
    btnVsAiStarterPlayer,
    btnVsAiStarterRandom,
    btnVsAiStarterCpu,
    btnVsAiRuleBrazilian,
    btnVsAiRuleAmerican,
    btnVsAiColorLight,
    btnVsAiColorDark,
    btnBackMenu,
    btnRules,
    btnDifficulty,
    navItems,
    btnSettingsBack,
    btnStatsBack,
    btnRulesBack,
    btnDifficultyBack,
    btnRuleBrazilian,
    btnRuleAmerican,
    btnDifficultyEasy,
    btnDifficultyMedium,
    btnDifficultyHard,
    btnDifficultyExpert,
    settingsForceCaptureEl,
    btnNew,
    btnUndo,
    forceCaptureEl
  },
  actions: {
    onOpenVsAi: () => {
      refreshVsAiScreen();
      showScreen('vsai');
    },
    onResumeMatch: () => {
      if (!hasResumableMatch(lastGame)) {
        alert('Nenhuma partida disponível para continuar.');
        return;
      }
      startMatch({ resume: true });
    },
    onStartVsAiMatch: () => {
      menuPrefs.mode = 'ai';
      saveSettings();
      emitGameEvent(GAME_EVENTS.SETTINGS_CHANGED, { key: 'mode', value: menuPrefs.mode });
      startMatch();
    },
    onBackToMenu: backToMenu,
    onShowOnlineSoon: () => showSoon('Modo online em breve.'),
    onShowTournamentSoon: () => showSoon('Modo torneio em breve.'),
    onShowFriendsSoon: () => showSoon('Modo jogar com amigos em breve.'),
    onSetDifficulty: setMenuDifficulty,
    onSetAiStarter: setAiStarter,
    onSetRuleSet: setMenuRuleSet,
    onSetPlayerColor: setPlayerColor,
    onGameBackToMenu: () => {
      resetNewMatchConfirm();
      audioFeedback.playBack();
      clearAiTimer();
      showScreen('menu');
      persistLastGame();
    },
    onShowSettings: () => showScreen('settings'),
    onTogglePvpMode: togglePvpMode,
    onShowStats: () => {
      refreshStatsScreen();
      showScreen('stats');
    },
    onShowSectionInConstruction: () => showSoon('Sessao em construcao.'),
    onSettingsForceCaptureChange: () => applyForceCapture(settingsForceCaptureEl?.checked),
    onNewMatch: requestNewMatchConfirmOrStart,
    onUndo: () => {
      if (isAiTurn()) return;
      if (engine.undo()) {
        clearSelection();
        renderAll();
        persistLastGame();
      }
    },
    onGameForceCaptureChange: () => applyForceCapture(forceCaptureEl?.checked)
  }
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

function unlockAudioIfNeeded() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audioFeedback.unlock();
  if (appShell?.dataset.screen === 'play') {
    audioFeedback.startMenuAmbience();
  }

  window.removeEventListener('pointerdown', unlockAudioIfNeeded);
  window.removeEventListener('touchstart', unlockAudioIfNeeded);
  window.removeEventListener('click', unlockAudioIfNeeded);
  window.removeEventListener('keydown', unlockAudioIfNeeded);
}

window.addEventListener('pointerdown', unlockAudioIfNeeded, { capture: true, passive: true });
window.addEventListener('touchstart', unlockAudioIfNeeded, { capture: true, passive: true });
window.addEventListener('click', unlockAudioIfNeeded, { capture: true, passive: true });
window.addEventListener('keydown', unlockAudioIfNeeded, { capture: true, passive: true });

boardUI.mount();
setupPlayIntroStagger();
registerMenuClickSound({ audioFeedback, unlockAudioIfNeeded });
registerPlayCarouselSound({ playModesEl, audioFeedback });
refreshMenuButtons();
refreshRulesScreen();
refreshDifficultyScreen();
refreshVsAiScreen();
refreshProgressCard();
refreshStatsScreen();
startTournamentClock();
syncForceCaptureInputs();
refreshResumeButton();
renderAll();
showScreen('menu');







