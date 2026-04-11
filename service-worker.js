const CACHE_NAME = 'damas-pro-arena-v79';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/main.css',
  './js/app.js',
  './js/engine.js',
  './js/modules/core/screen-router.js',
  './js/modules/core/storage.js',
  './js/modules/core/event-bus.js',
  './js/modules/core/turn-flow.js',
  './js/modules/core/game-events.js',
  './js/modules/core/ai-turn-controller.js',
  './js/modules/core/match-utils.js',
  './js/modules/core/sync-coordinator.js',
  './js/modules/ai/minimax-ai.js',
  './js/modules/ui/board-ui.js',
  './js/modules/ui/interaction-bindings.js',
  './js/modules/ui/app-event-bindings.js',
  './js/modules/feedback/audio-feedback.js',
  './js/modules/feedback/haptics-feedback.js',
  './assets/img/piece-white.svg',
  './assets/img/piece-black.svg',
  './assets/img/piece-white-king.svg',
  './assets/img/piece-black-king.svg',
  './assets/img/piece_white.webp',
  './assets/img/piece_black.webp',
  './assets/img/piece_white_king.webp',
  './assets/img/piece_black_king.webp',
  './assets/img/logo.webp',
  './assets/img/jogar_vs_cpu.webp',
  './assets/img/jogar_online.webp',
  './assets/img/jogar_com_amigos.webp',
  './assets/img/jogar_torneio.webp',
  './assets/backgrounds/tela_inicial.webp',
  './assets/backgrounds/modos_de_jogo.webp',
  './assets/backgrounds/tela_jogar_vs_cpu.webp',
  './assets/sounds/back.mp3',
  './assets/sounds/click.mp3',
  './assets/sounds/drag.mp3',
  './assets/sounds/drop.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      APP_SHELL.map(async (url) => {
        try {
          await cache.add(url);
        } catch {
          // ignore individual cache failures to avoid aborting install
        }
      })
    );
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const isNavigation = event.request.mode === 'navigate';
    const cached = await caches.match(event.request, { ignoreSearch: false });
    if (cached && !isNavigation) return cached;

    try {
      const response = await fetch(event.request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      if (cached) return cached;
      if (isNavigation) {
        const offlineShell = await caches.match('./index.html');
        if (offlineShell) return offlineShell;
      }
      throw new Error('Network request failed and no cache was available.');
    }
  })());
});
