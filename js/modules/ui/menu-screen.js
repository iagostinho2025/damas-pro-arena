export function wireMenuScreen(game) {
  const btnStart = document.getElementById('btn-start-game');
  const btnBackHome = document.getElementById('btn-back-home');

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      game.showGame();
    });
  }

  if (btnBackHome) {
    btnBackHome.addEventListener('click', () => {
      game.showHome();
    });
  }
}
