export function registerMenuClickSound({ audioFeedback, unlockAudioIfNeeded }) {
  const backIds = new Set([
    'btn-back-menu',
    'btn-vsai-back',
    'btn-play-back',
    'btn-settings-back',
    'btn-stats-back',
    'btn-rules-back',
    'btn-difficulty-back'
  ]);

  document.addEventListener('click', (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;

    const clickable = target.closest('button, input[type="checkbox"], label.toggle');
    if (!clickable) return;

    unlockAudioIfNeeded();

    if (clickable.classList.contains('cell') || clickable.closest('.board')) return;
    if (clickable instanceof HTMLButtonElement && backIds.has(clickable.id)) return;

    audioFeedback.playMenuClick();
  });
}

export function registerPlayCarouselSound({ playModesEl, audioFeedback }) {
  if (!playModesEl) return;

  const tiles = [...playModesEl.querySelectorAll('.play-tile')];
  if (tiles.length <= 1) return;

  let activeIndex = 0;
  let rafId = null;

  function getClosestIndex() {
    const modesRect = playModesEl.getBoundingClientRect();
    const centerX = modesRect.left + (modesRect.width / 2);
    let bestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    tiles.forEach((tile, idx) => {
      const rect = tile.getBoundingClientRect();
      const tileCenter = rect.left + (rect.width / 2);
      const dist = Math.abs(tileCenter - centerX);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = idx;
      }
    });

    return bestIndex;
  }

  function syncActive({ withSound = false } = {}) {
    const nextIndex = getClosestIndex();
    if (nextIndex !== activeIndex) {
      activeIndex = nextIndex;
      if (withSound) audioFeedback.playBack();
    }
  }

  requestAnimationFrame(() => syncActive({ withSound: false }));

  playModesEl.addEventListener('scroll', () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      syncActive({ withSound: true });
    });
  }, { passive: true });

  window.addEventListener('resize', () => {
    syncActive({ withSound: false });
  }, { passive: true });
}
