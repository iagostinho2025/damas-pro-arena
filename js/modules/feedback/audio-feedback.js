export function createAudioFeedback() {
  const sfx = {
    menuClick: './assets/sounds/click.mp3',
    back: './assets/sounds/back.mp3',
    move: './assets/sounds/drag.mp3',
    capture: './assets/sounds/drop.mp3'
  };

  const preloadCache = new Map();
  let unlocked = false;

  function resolvePath(path) {
    try {
      return new URL(path, window.location.href).toString();
    } catch {
      return path;
    }
  }

  function preload(path) {
    if (typeof Audio === 'undefined') return;
    const src = resolvePath(path);
    if (preloadCache.has(src)) return;

    const a = new Audio(src);
    a.preload = 'auto';
    a.load();
    preloadCache.set(src, a);
  }

  function play(path, { volume = 1, playbackRate = 1 } = {}) {
    if (typeof Audio === 'undefined') return false;

    const src = resolvePath(path);
    const sound = new Audio(src);
    sound.preload = 'auto';
    sound.volume = volume;
    sound.playbackRate = playbackRate;

    const p = sound.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        console.warn('[audio] play failed:', src, err?.name || err);
      });
    }

    return true;
  }

  return {
    unlock() {
      unlocked = true;
      Object.values(sfx).forEach(preload);
    },

    playMenuClick() {
      if (!unlocked) return;
      play(sfx.menuClick, { volume: 0.62 });
    },

    playBack() {
      if (!unlocked) return;
      play(sfx.back, { volume: 0.68 });
    },

    startMenuAmbience() {
      // intentionally disabled for stability
    },

    stopMenuAmbience() {
      // intentionally disabled for stability
    },

    playMove() {
      if (!unlocked) return;
      play(sfx.move, { volume: 0.72 });
    },

    playCapture() {
      if (!unlocked) return;
      play(sfx.capture, { volume: 0.82 });
    },

    playVictory() {
      if (!unlocked) return;
      play(sfx.capture, { volume: 0.8, playbackRate: 1.08 });
    },

    playDefeat() {
      if (!unlocked) return;
      play(sfx.back, { volume: 0.74, playbackRate: 0.92 });
    }
  };
}
