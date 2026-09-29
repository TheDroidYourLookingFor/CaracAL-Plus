(async function () {
  const syncedAccountCode = "adventureland/headless/AccountCodeMap.js";
  const modules = [
    "adventureland/codes/Shared.1.js",
    "adventureland/codes/SafeCraft.2.js",
    "adventureland/codes/RogueConfig.85.js",
    "adventureland/codes/RogueRange.96.js",
    "adventureland/codes/TrioBase.47.js",
    "adventureland/codes/TrioConfig.48.js",
    "adventureland/codes/TrioRogueMember.94.js",
    "adventureland/codes/TrioState.50.js",
    "adventureland/codes/TrioTeamState.52.js",
    "adventureland/codes/TrioServerSwitch.53.js",
    "adventureland/codes/TrioRoleCombat.56.js",
    "adventureland/codes/Combat.3.js",
    "adventureland/codes/TrioMonsterChoice.72.js",
    "adventureland/codes/MonsterSelect.4.js",
    "adventureland/codes/TrioTravel.75.js",
    "adventureland/codes/TrioMovement.5.js",
    "adventureland/codes/FarmMetrics.6.js",
    "adventureland/codes/TrioMaintenance.69.js",
    "adventureland/codes/TrioCourierService.71.js",
    "adventureland/codes/CourierClient.7.js",
    "adventureland/codes/MonsterHuntCore.76.js",
    "adventureland/codes/MonsterHuntPlan.77.js",
    "adventureland/codes/MonsterHunt.9.js",
    "adventureland/codes/CaracALPublisher.98.js",
  ];

  try {
    try {
      await parent.caracAL.load_scripts([syncedAccountCode]);
      if (typeof game_log === "function") {
        game_log("CaracAL+ account CODE loaded", "green");
      }
      return;
    } catch (accountCodeError) {
      if (parent.__ADVENTURELAND_ACCOUNT_CODE_MAP_FOUND) throw accountCodeError;
      console.warn("CaracAL+ account CODE map unavailable; using bundled Trio modules", accountCodeError);
    }
    await parent.caracAL.load_scripts(modules);
    if (typeof game_log === "function") {
      game_log("CaracAL+ Trio modules loaded", "green");
    }
    // Keep a process-visible marker for headless supervisors and local smoke
    // tests; game_log is intentionally UI-only in the browser client.
    console.log("CaracAL+ Trio modules loaded");
  } catch (error) {
    console.error("CaracAL+ Trio module load failed", error);
    throw error;
  }
})();
