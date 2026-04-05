export class TurnFlow {
  constructor({ mode = 'ai', localColor = 'white' } = {}) {
    this.mode = mode;
    this.localColor = localColor;
  }

  configure({ mode, localColor } = {}) {
    if (mode) this.mode = mode;
    if (localColor) this.localColor = localColor;
  }

  getActorForTurn(turnColor) {
    if (this.mode === 'pvp') return 'local';
    if (this.mode === 'ai') return turnColor === this.localColor ? 'local' : 'ai';
    if (this.mode === 'online') return turnColor === this.localColor ? 'local' : 'remote';
    return 'local';
  }

  canLocalAct(turnColor) {
    return this.getActorForTurn(turnColor) === 'local';
  }

  isAITurn(turnColor) {
    return this.getActorForTurn(turnColor) === 'ai';
  }

  isRemoteTurn(turnColor) {
    return this.getActorForTurn(turnColor) === 'remote';
  }
}
