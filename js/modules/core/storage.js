const KEYS = Object.freeze({
  settings: 'dpa_settings',
  stats: 'dpa_stats',
  lastGame: 'dpa_last_game'
});

const DEFAULT_SETTINGS = Object.freeze({
  ruleSet: 'Brasileiro',
  difficulty: 'Medio',
  aiStarter: 'player',
  playerColor: 'white',
  mode: 'ai',
  forceCapture: true
});

const DEFAULT_STATS = Object.freeze({
  gamesPlayed: 0,
  gamesVsAi: 0,
  gamesPvP: 0,
  whiteWins: 0,
  blackWins: 0,
  playerWins: 0,
  playerLosses: 0,
  totalMoves: 0,
  totalCaptures: 0,
  rankPoints: 0,
  lastPlayedAt: null
});

const RANKS = Object.freeze([
  { min: 0, name: 'Bronze I' },
  { min: 120, name: 'Bronze II' },
  { min: 260, name: 'Prata I' },
  { min: 440, name: 'Prata II' },
  { min: 680, name: 'Ouro I' },
  { min: 980, name: 'Ouro II' },
  { min: 1360, name: 'Platina' },
  { min: 1800, name: 'Diamante' }
]);

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function load(key, fallback) {
  try {
    return safeParse(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return value;
  }
  return value;
}

function normalizeSettings(value) {
  const v = value || {};
  const normalizedRuleSetRaw = String(v.ruleSet || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const normalizedRuleSet = normalizedRuleSetRaw.includes('americano') || normalizedRuleSetRaw.includes('english')
    ? 'Americano'
    : DEFAULT_SETTINGS.ruleSet;

  return {
    ruleSet: normalizedRuleSet,
    difficulty: ['Facil', 'Medio', 'Dificil', 'Expert'].includes(v.difficulty) ? v.difficulty : DEFAULT_SETTINGS.difficulty,
    aiStarter: ['player', 'random', 'cpu'].includes(v.aiStarter) ? v.aiStarter : DEFAULT_SETTINGS.aiStarter,
    playerColor: ['white', 'black'].includes(v.playerColor) ? v.playerColor : DEFAULT_SETTINGS.playerColor,
    mode: ['ai', 'pvp', 'online'].includes(v.mode) ? v.mode : DEFAULT_SETTINGS.mode,
    forceCapture: typeof v.forceCapture === 'boolean' ? v.forceCapture : DEFAULT_SETTINGS.forceCapture
  };
}

function normalizeStats(value) {
  const v = value || {};
  return {
    gamesPlayed: Number.isFinite(v.gamesPlayed) ? v.gamesPlayed : 0,
    gamesVsAi: Number.isFinite(v.gamesVsAi) ? v.gamesVsAi : 0,
    gamesPvP: Number.isFinite(v.gamesPvP) ? v.gamesPvP : 0,
    whiteWins: Number.isFinite(v.whiteWins) ? v.whiteWins : 0,
    blackWins: Number.isFinite(v.blackWins) ? v.blackWins : 0,
    playerWins: Number.isFinite(v.playerWins) ? v.playerWins : 0,
    playerLosses: Number.isFinite(v.playerLosses) ? v.playerLosses : 0,
    totalMoves: Number.isFinite(v.totalMoves) ? v.totalMoves : 0,
    totalCaptures: Number.isFinite(v.totalCaptures) ? v.totalCaptures : 0,
    rankPoints: Number.isFinite(v.rankPoints) ? v.rankPoints : 0,
    lastPlayedAt: v.lastPlayedAt || null
  };
}

function levelFromPoints(rankPoints) {
  const pts = Math.max(0, Number(rankPoints) || 0);
  const level = Math.floor(pts / 100) + 1;
  const intoLevel = pts % 100;
  const toNextLevel = 100;
  return {
    level,
    intoLevel,
    toNextLevel,
    progressPct: Math.floor((intoLevel / toNextLevel) * 100)
  };
}

function rankFromPoints(rankPoints) {
  const pts = Math.max(0, Number(rankPoints) || 0);
  let current = RANKS[0];

  for (const r of RANKS) {
    if (pts >= r.min) current = r;
    else break;
  }

  return current;
}

function buildProgress(stats) {
  const lvl = levelFromPoints(stats.rankPoints);
  const rank = rankFromPoints(stats.rankPoints);
  return {
    wins: stats.playerWins,
    losses: stats.playerLosses,
    rankPoints: stats.rankPoints,
    level: lvl.level,
    levelProgressPct: lvl.progressPct,
    pointsIntoLevel: lvl.intoLevel,
    pointsToNextLevel: lvl.toNextLevel,
    rankName: rank.name
  };
}

export function createStorageService() {
  return {
    getSettings() {
      const raw = load(KEYS.settings, DEFAULT_SETTINGS);
      return normalizeSettings(raw);
    },

    saveSettings(settings) {
      return save(KEYS.settings, normalizeSettings(settings));
    },

    getStats() {
      const raw = load(KEYS.stats, DEFAULT_STATS);
      return normalizeStats(raw);
    },

    saveStats(stats) {
      return save(KEYS.stats, normalizeStats(stats));
    },

    getProgress() {
      const stats = normalizeStats(load(KEYS.stats, DEFAULT_STATS));
      return buildProgress(stats);
    },

    recordMatch({ winner, mode, playerColor = 'white', moves = 0, captures = 0 } = {}) {
      const stats = normalizeStats(load(KEYS.stats, DEFAULT_STATS));

      stats.gamesPlayed += 1;
      if (mode === 'pvp') stats.gamesPvP += 1;
      else stats.gamesVsAi += 1;

      if (winner === 'white') stats.whiteWins += 1;
      else if (winner === 'black') stats.blackWins += 1;

      if (winner === playerColor) {
        stats.playerWins += 1;
        stats.rankPoints += 30;
      } else if (winner === 'white' || winner === 'black') {
        stats.playerLosses += 1;
        stats.rankPoints += 10;
      }

      stats.totalMoves += Math.max(0, Number(moves) || 0);
      stats.totalCaptures += Math.max(0, Number(captures) || 0);
      stats.lastPlayedAt = Date.now();

      return save(KEYS.stats, stats);
    },

    getLastGame() {
      return load(KEYS.lastGame, null);
    },

    saveLastGame(lastGame) {
      return save(KEYS.lastGame, lastGame || null);
    },

    clearLastGame() {
      try {
        localStorage.removeItem(KEYS.lastGame);
      } catch {
        // Ignore storage failures to keep app flow running.
      }
    }
  };
}
