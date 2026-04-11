export function registerAppEventBindings({
  elements,
  actions
}) {
  const {
    btnPlay,
    btnResume,
    btnVsAiStart,
    btnVsAiBack,
    btnPlayCpu,
    btnPlayOnline,
    btnPlayTournament,
    btnPlayFriends,
    btnPlayBack,
    btnVsAiDifficultyEasy,
    btnVsAiDifficultyMedium,
    btnVsAiDifficultyHard,
    btnVsAiDifficultyExpert,
    btnVsAiStarterPlayer,
    btnVsAiStarterRandom,
    btnVsAiStarterCpu,
    btnVsAiRuleBrazilian,
    btnVsAiRuleAmerican,
    btnVsAiColorLight,
    btnVsAiColorDark,
    btnBackMenu,
    btnRules,
    btnDifficulty,
    navItems,
    btnSettingsBack,
    btnStatsBack,
    btnRulesBack,
    btnDifficultyBack,
    btnRuleBrazilian,
    btnRuleAmerican,
    btnDifficultyEasy,
    btnDifficultyMedium,
    btnDifficultyHard,
    btnDifficultyExpert,
    settingsForceCaptureEl,
    btnNew,
    btnUndo,
    forceCaptureEl
  } = elements;

  btnPlay?.addEventListener('click', actions.onOpenVsAi);
  btnResume?.addEventListener('click', actions.onResumeMatch);
  btnVsAiStart?.addEventListener('click', actions.onStartVsAiMatch);
  btnVsAiBack?.addEventListener('click', actions.onBackToMenu);
  btnPlayCpu?.addEventListener('click', actions.onOpenVsAi);
  btnPlayOnline?.addEventListener('click', actions.onShowOnlineSoon);
  btnPlayTournament?.addEventListener('click', actions.onShowTournamentSoon);
  btnPlayFriends?.addEventListener('click', actions.onShowFriendsSoon);
  btnPlayBack?.addEventListener('click', actions.onBackToMenu);

  btnVsAiDifficultyEasy?.addEventListener('click', () => actions.onSetDifficulty('Facil'));
  btnVsAiDifficultyMedium?.addEventListener('click', () => actions.onSetDifficulty('Medio'));
  btnVsAiDifficultyHard?.addEventListener('click', () => actions.onSetDifficulty('Dificil'));
  btnVsAiDifficultyExpert?.addEventListener('click', () => actions.onSetDifficulty('Expert'));
  btnVsAiStarterPlayer?.addEventListener('click', () => actions.onSetAiStarter('player'));
  btnVsAiStarterRandom?.addEventListener('click', () => actions.onSetAiStarter('random'));
  btnVsAiStarterCpu?.addEventListener('click', () => actions.onSetAiStarter('cpu'));
  btnVsAiRuleBrazilian?.addEventListener('click', () => actions.onSetRuleSet('Brasileiro'));
  btnVsAiRuleAmerican?.addEventListener('click', () => actions.onSetRuleSet('Americano'));
  btnVsAiColorLight?.addEventListener('click', () => actions.onSetPlayerColor('white'));
  btnVsAiColorDark?.addEventListener('click', () => actions.onSetPlayerColor('black'));

  btnBackMenu?.addEventListener('click', actions.onGameBackToMenu);
  btnRules?.addEventListener('click', actions.onShowFriendsSoon);
  btnDifficulty?.addEventListener('click', actions.onShowTournamentSoon);

  navItems?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.index);
      const dockShell = btn.closest('.dock-shell');
      if (dockShell && Number.isFinite(index)) {
        dockShell.style.setProperty('--active-index', String(index));
        navItems.forEach((item, i) => item.classList.toggle('active', i === index));
      }

      const section = btn.dataset.nav;

      if (section === 'home') {
        actions.onBackToMenu();
        return;
      }

      if (section === 'settings') {
        actions.onShowSettings();
        return;
      }

      if (section === 'pvp') {
        actions.onTogglePvpMode();
        return;
      }

      if (section === 'stats') {
        actions.onShowStats();
        return;
      }

      actions.onShowSectionInConstruction();
    });
  });

  btnSettingsBack?.addEventListener('click', actions.onBackToMenu);
  btnStatsBack?.addEventListener('click', actions.onBackToMenu);
  btnRulesBack?.addEventListener('click', actions.onBackToMenu);
  btnDifficultyBack?.addEventListener('click', actions.onBackToMenu);

  btnRuleBrazilian?.addEventListener('click', () => actions.onSetRuleSet('Brasileiro'));
  btnRuleAmerican?.addEventListener('click', () => actions.onSetRuleSet('Americano'));
  btnDifficultyEasy?.addEventListener('click', () => actions.onSetDifficulty('Facil'));
  btnDifficultyMedium?.addEventListener('click', () => actions.onSetDifficulty('Medio'));
  btnDifficultyHard?.addEventListener('click', () => actions.onSetDifficulty('Dificil'));
  btnDifficultyExpert?.addEventListener('click', () => actions.onSetDifficulty('Expert'));

  settingsForceCaptureEl?.addEventListener('change', actions.onSettingsForceCaptureChange);
  btnNew?.addEventListener('click', actions.onNewMatch);
  btnUndo?.addEventListener('click', actions.onUndo);
  forceCaptureEl?.addEventListener('change', actions.onGameForceCaptureChange);
}
