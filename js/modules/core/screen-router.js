export class ScreenRouter {
  constructor(appEl, screensMap, options = {}) {
    this.appEl = appEl;
    this.screensMap = screensMap;
    this.activeClass = options.activeClass || 'active';
  }

  show(key) {
    const target = this.screensMap[key];
    if (!target) return;

    Object.values(this.screensMap).forEach((el) => {
      if (!el) return;
      el.classList.remove(this.activeClass);
    });

    target.classList.add(this.activeClass);

    if (this.appEl) {
      this.appEl.dataset.screen = key;
    }
  }
}
