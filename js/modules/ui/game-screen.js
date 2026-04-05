export function wireGameScreen(game) {
  const btnBackMenu = document.getElementById('btn-back-menu');
  const btnGameHome = document.getElementById('btn-game-home');

  if (btnBackMenu) {
    btnBackMenu.addEventListener('click', () => {
      game.showMenu();
    });
  }

  if (btnGameHome) {
    btnGameHome.addEventListener('click', () => {
      game.showHome();
    });
  }
}
