export function createAiTurnController({
  engine,
  turnFlow,
  chooseAIMove,
  detectWinner,
  GAME_RESULT,
  getMenuPrefs,
  getCurrentMatch,
  getDifficultyKey,
  clearSelection,
  renderAll,
  renderStatus,
  applyMoveEffects,
  countMoveForMatch,
  triggerMoveFeedback,
  emitTurnChanged,
  emitMoveCommitted,
  persistLastGame
}) {
  let aiTimer = null;

  function isAiTurn() {
    return turnFlow.isAITurn(engine.turn) && !engine.winner;
  }

  function clearAiTimer() {
    if (!aiTimer) return;
    clearTimeout(aiTimer);
    aiTimer = null;
  }

  function scheduleAiMove() {
    clearAiTimer();
    if (!isAiTurn()) return;

    renderStatus();

    aiTimer = setTimeout(() => {
      const runAiStep = () => {
        aiTimer = null;
        if (!isAiTurn()) return;

        const menuPrefs = getMenuPrefs();
        const currentMatch = getCurrentMatch();
        const move = chooseAIMove(engine, {
          color: currentMatch?.aiColor || 'black',
          difficulty: getDifficultyKey(menuPrefs)
        });

        if (!move) {
          engine.winner = detectWinner(engine.board, engine.turn, {
            forceCapture: engine.forceCapture,
            ruleSet: engine.ruleSet
          }) || 'white';
          if (engine.winner === GAME_RESULT.DRAW) engine.drawReason = 'blocked';
          clearSelection();
          renderAll();
          emitTurnChanged();
          persistLastGame();
          return;
        }

        const moveResult = engine.tryMove(move.from, move.to);
        if (!moveResult.ok) {
          clearSelection();
          renderAll();
          persistLastGame();
          return;
        }

        applyMoveEffects(move);
        countMoveForMatch(move);
        triggerMoveFeedback(move, { actor: 'ai' });
        emitMoveCommitted({
          actor: 'ai',
          move,
          turnAfter: engine.turn,
          chainCapture: !!moveResult.chainCapture
        });

        clearSelection();
        renderAll();
        persistLastGame();

        if (moveResult.chainCapture && isAiTurn() && !engine.winner) {
          aiTimer = setTimeout(runAiStep, 340);
          return;
        }

        emitTurnChanged();
      };

      runAiStep();
    }, 320);
  }

  return {
    isAiTurn,
    clearAiTimer,
    scheduleAiMove
  };
}
