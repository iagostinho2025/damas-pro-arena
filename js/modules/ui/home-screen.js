export function wireHomeScreen(game) {
  const btnEnterMenu = document.getElementById('btn-enter-menu');
  const btnQuickGame = document.getElementById('btn-home-quick-game');

  if (btnEnterMenu) {
    btnEnterMenu.addEventListener('click', () => {
      game.showMenu();
    });
  }

  if (btnQuickGame) {
    btnQuickGame.addEventListener('click', () => {
      game.showGame();
    });
  }
}
