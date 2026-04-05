const CACHE_NAME = 'damas-pro-arena-v62';
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
  './js/modules/core/sync-coordinator.js',
  './js/modules/ai/minimax-ai.js',
  './js/modules/ui/board-ui.js',
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
  './assets/img/jogar_torneios.webp',
  './assets/img/menu_jogar.webp',
  './assets/img/menu_continuar.webp',
  './assets/img/menu_regras.webp',
  './assets/img/menu_dificuldade.webp',
  './assets/backgrounds/tela_inicial.webp',
  './assets/backgrounds/modos_de_jogo.webp',
  './assets/sounds/back.mp3',
  './assets/sounds/click.mp3',
  './assets/sounds/drag.mp3',
  './assets/sounds/drop.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
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

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    const response = await fetch(event.request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, response.clone());
    return response;
  })());
});
