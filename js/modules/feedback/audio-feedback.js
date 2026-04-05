export function createAudioFeedback() {
  let ctx = null;
  let ambienceNodes = null;
  const sfx = {
    menuClick: './assets/sounds/click.mp3',
    back: './assets/sounds/back.mp3',
    move: './assets/sounds/drag.mp3',
    capture: './assets/sounds/drop.mp3'
  };
  const audioCache = new Map();

  function ensureCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function getAudio(path) {
    if (typeof Audio === 'undefined') return null;
    if (!audioCache.has(path)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audioCache.set(path, audio);
    }
    return audioCache.get(path);
  }

  function playSfx(path, { volume = 1 } = {}) {
    const base = getAudio(path);
    if (!base) return false;
    const sound = base.cloneNode();
    sound.volume = volume;
    sound.play().catch(() => {});
    return true;
  }

  function tone({ freq = 440, duration = 0.08, type = 'sine', gain = 0.04, attack = 0.005, release = 0.04 }) {
    const ac = ensureCtx();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const env = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gain, now + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);

    osc.connect(env);
    env.connect(ac.destination);

    osc.start(now);
    osc.stop(now + duration + release + 0.01);
  }

  function sequence(notes) {
    let delay = 0;
    notes.forEach((n) => {
      setTimeout(() => tone(n), delay);
      delay += Math.floor((n.duration || 0.08) * 1000 * 0.75);
    });
  }

  function stopAmbienceNow() {
    if (!ambienceNodes) return;
    const { drones, gain } = ambienceNodes;

    try {
      const now = ctx?.currentTime || 0;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.0001, now, 0.12);

      drones.forEach((osc) => {
        try {
          osc.stop(now + 0.35);
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }

    ambienceNodes = null;
  }

  return {
    unlock() {
      ensureCtx();
      Object.values(sfx).forEach((path) => {
        const sound = getAudio(path);
        sound?.load();
      });
    },

    playMenuClick() {
      if (playSfx(sfx.menuClick, { volume: 0.55 })) return;
      tone({ freq: 560, duration: 0.04, type: 'triangle', gain: 0.018, attack: 0.002, release: 0.03 });
    },

    playBack() {
      if (playSfx(sfx.back, { volume: 0.6 })) return;
      tone({ freq: 360, duration: 0.05, type: 'triangle', gain: 0.02, attack: 0.002, release: 0.03 });
    },

    startMenuAmbience() {
      const ac = ensureCtx();
      if (!ac || ambienceNodes) return;

      const gain = ac.createGain();
      gain.gain.value = 0.0001;
      gain.connect(ac.destination);

      const droneA = ac.createOscillator();
      const droneB = ac.createOscillator();
      droneA.type = 'sine';
      droneB.type = 'triangle';
      droneA.frequency.setValueAtTime(92, ac.currentTime);
      droneB.frequency.setValueAtTime(138, ac.currentTime);
      droneA.connect(gain);
      droneB.connect(gain);
      droneA.start();
      droneB.start();

      gain.gain.linearRampToValueAtTime(0.0045, ac.currentTime + 0.9);
      ambienceNodes = { drones: [droneA, droneB], gain };
    },

    stopMenuAmbience() {
      stopAmbienceNow();
    },

    playMove() {
      if (playSfx(sfx.move, { volume: 0.65 })) return;
      tone({ freq: 420, duration: 0.055, type: 'triangle', gain: 0.03 });
    },

    playCapture() {
      if (playSfx(sfx.capture, { volume: 0.75 })) return;
      sequence([
        { freq: 300, duration: 0.05, type: 'square', gain: 0.04 },
        { freq: 220, duration: 0.07, type: 'square', gain: 0.045 }
      ]);
    },

    playVictory() {
      sequence([
        { freq: 523, duration: 0.08, type: 'triangle', gain: 0.045 },
        { freq: 659, duration: 0.08, type: 'triangle', gain: 0.045 },
        { freq: 784, duration: 0.12, type: 'triangle', gain: 0.05 }
      ]);
    },

    playDefeat() {
      sequence([
        { freq: 330, duration: 0.08, type: 'sawtooth', gain: 0.038 },
        { freq: 262, duration: 0.1, type: 'sawtooth', gain: 0.038 },
        { freq: 196, duration: 0.13, type: 'sawtooth', gain: 0.04 }
      ]);
    }
  };
}
