import { ScreenRouter } from './modules/core/screen-router.js';
import { wireHomeScreen } from './modules/ui/home-screen.js';
import { wireMenuScreen } from './modules/ui/menu-screen.js';
import { wireGameScreen } from './modules/ui/game-screen.js';

export class Game {
  constructor() {
    this.appEl = document.getElementById('app');
    this.screenHome = document.getElementById('screen-home');
    this.screenMenu = document.getElementById('screen-menu');
    this.screenGame = document.getElementById('screen-game');

    this.router = new ScreenRouter(this.appEl, {
      home: this.screenHome,
      menu: this.screenMenu,
      game: this.screenGame
    });
  }

  init() {
    wireHomeScreen(this);
    wireMenuScreen(this);
    wireGameScreen(this);
    this.showHome();
  }

  showHome() {
    this.router.show('home');
  }

  showMenu() {
    this.router.show('menu');
  }

  showGame() {
    this.router.show('game');
  }
}
