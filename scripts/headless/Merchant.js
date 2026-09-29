(async function () {
  const syncedAccountCode = "adventureland/headless/AccountCodeMap.js";
  // Headless fallback is the merchant Lite set: engine, persistence and
  // CaracAL+ publishing only. Full-mode windows are intentionally omitted.
  const modules = [
    "adventureland/codes/Shared.1.js",
    "adventureland/codes/SafeCraft.2.js",
    "adventureland/codes/MerchantConfig.80.js",
    "adventureland/codes/LootPolicy.10.js",
    "adventureland/codes/MerchantCore.61.js",
    "adventureland/codes/MerchantBanking.63.js",
    "adventureland/codes/MerchantMove.11.js",
    "adventureland/codes/MerchantMluck.57.js",
    "adventureland/codes/MerchantCraftLedger.58.js",
    "adventureland/codes/MerchantProduction.60.js",
    "adventureland/codes/MerchantOps.12.js",
    "adventureland/codes/MerchantCraft.13.js",
    "adventureland/codes/MerchantCourierRequests.65.js",
    "adventureland/codes/MerchantCourier.14.js",
    "adventureland/codes/MerchantGather.15.js",
    "adventureland/codes/MerchantServices.83.js",
    "adventureland/codes/MerchantPontyServerCycle.29.js",
    "adventureland/codes/MerchantEvents.16.js",
    "adventureland/codes/MerchantTrioRuntime.67.js",
    "adventureland/codes/RogueConfig.85.js",
    "adventureland/codes/MerchantRogueCourier.91.js",
    "adventureland/codes/TrioRuntime.17.js",
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
      console.warn("CaracAL+ account CODE map unavailable; using bundled Merchant modules", accountCodeError);
    }
    await parent.caracAL.load_scripts(modules);
    if (typeof game_log === "function") {
      game_log("CaracAL+ Merchant modules loaded", "green");
    }
  } catch (error) {
    console.error("CaracAL+ Merchant module load failed", error);
    throw error;
  }
})();
