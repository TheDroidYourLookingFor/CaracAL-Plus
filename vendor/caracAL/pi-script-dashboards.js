(() => {
  "use strict";

  // Project-owned, client-free views of the same records used by the player's
  // CODE. Script data comes from the Pi storage bridge, never this page's localStorage.
  const WINDOW_ID = "pi-script-dashboard-window";
  const WINDOW_CLASS = WINDOW_ID;
  const STORAGE_ENDPOINT = "/pi-storage/state";
  const SYNC_ENDPOINT = "/pi-storage/sync";
  const CLEAR_STORAGE_ENDPOINT = "/pi-storage/clear-all";
  const GAME_DATA_ENDPOINT = "/pi-game-data/trio";
  // These acquisition tables match the VPS game-data version; update with its cached data.js when that version changes.
  const CATALOG_ACQUISITION_DATA = {
  version: 17397,
  craft: {
    "djinncrown": {"items":[[80,"rimeglass"],[8,"lspores"],[2,"essenceoffrost"],[1,"helmet",0]],"cost":400000},
    "covemantle": {"items":[[120,"rimeglass"],[12,"spidersilk"],[4,"feather1"],[1,"cape",0]],"cost":400000},
    "stillwaterlens": {"items":[[240,"rimeglass"],[6,"gemfragment"],[8,"seashell"],[1,"orbofint",0]],"cost":800000},
    "sixcake": {"items":[[1,"slice_strawberry"],[1,"slice_citrus"],[1,"slice_honey"],[1,"slice_mint"],[1,"slice_blueberry"],[1,"slice_nightberry"]],"cost":100000,"quest":"anniversary_baker"},
    "candleward": {"items":[[1,"sixcake"],[1,"shield",0],[3,"bronzeingot"],[40,"leather"]],"cost":2000000,"quest":"anniversary_baker"},
    "guestbook": {"items":[[1,"sixcake"],[1,"wbook0",0],[1,"ink"],[2,"voidthread"],[30,"drapes"]],"cost":2000000,"quest":"anniversary_baker"},
    "paradequiver": {"items":[[1,"sixcake"],[1,"quiver",0],[6,"stormfeather"],[40,"leather"]],"cost":2000000,"quest":"anniversary_baker"},
    "homecominghelm": {"items":[[1,"sixcake"],[1,"helmet1",0],[2,"bronzeingot"],[20,"drapes"]],"cost":2000000,"quest":"anniversary_baker"},
    "homecomingcoat": {"items":[[1,"sixcake"],[1,"coat1",0],[3,"bronzeingot"],[60,"drapes"]],"cost":2000000,"quest":"anniversary_baker"},
    "homecomingcape": {"items":[[1,"sixcake"],[1,"cape",0],[4,"voidthread"],[80,"drapes"]],"cost":2000000,"quest":"anniversary_baker"},
    "reunionbow": {"items":[[2,"sixcake"],[1,"t2bow",0],[20,"stormfeather"],[4,"essenceofether"]],"cost":4000000,"quest":"anniversary_baker"},
    "keepsakependant": {"items":[[1,"sixcake"],[1,"hpamulet",0],[1,"bronzeingot"],[20,"drapes"]],"cost":1000000,"quest":"anniversary_baker"},
    "makeawishjar": {"items":[[1,"sixcake"]],"cost":250000,"quest":"anniversary_baker","output":{"name":"cxjar","data":"makeawish"}},
    "basketofeggs": {"items":[[1,"egg0"],[1,"egg1"],[1,"egg2"],[1,"egg3"],[1,"egg4"],[1,"egg5"],[1,"egg6"],[1,"egg7"],[1,"egg8"]],"cost":100},
    "xbox": {"items":[[1,"x0"],[1,"x1"],[1,"x2"],[1,"x3"],[1,"x4"],[1,"x5"],[1,"x6"],[1,"x7"],[1,"x8"]],"cost":1200},
    "carrotsword": {"items":[[1,"blade"],[1,"carrot"]],"cost":500},
    "wblade": {"items":[[1,"stick",9],[1,"blade",9],[800,"essenceoffrost"]],"cost":24000000},
    "rod": {"items":[[1,"staff"],[1,"spidersilk"]],"cost":100},
    "pickaxe": {"items":[[1,"staff"],[1,"spidersilk"],[1,"blade"]],"cost":100},
    "stealthcape": {"items":[[1,"bcape",7],[5,"shadowstone"],[200,"essenceofnature"],[1000,"cscale"]],"cost":2000000},
    "cake": {"items":[[10,"whiteegg"]],"cost":5},
    "bfangamulet": {"items":[[1,"bfang"],[5000,"bwing"]],"cost":4000000},
    "wingedboots": {"items":[[1,"shoes"],[20,"feather0"]],"cost":120000},
    "fierygloves": {"items":[[1,"gloves"],[20,"feather0"],[2,"essenceoffire"]],"cost":120000},
    "fclaw": {"items":[[1,"claw"],[2,"essenceoffrost"]],"cost":20000},
    "fsword": {"items":[[1,"blade"],[2,"essenceoffrost"]],"cost":20000},
    "froststaff": {"items":[[1,"staff"],[2,"essenceoffrost"]],"cost":20000},
    "snowflakes": {"items":[[1,"throwingstars"],[1,"essenceoffrost"]],"cost":20000},
    "frostbow": {"items":[[1,"bow"],[3,"essenceoffrost"]],"cost":40000},
    "firebow": {"items":[[1,"bow"],[1,"essenceoffire"]],"cost":20000},
    "fireblade": {"items":[[1,"blade"],[1,"essenceoffire"]],"cost":20000},
    "firestaff": {"items":[[1,"staff"],[1,"essenceoffire"]],"cost":20000},
    "firestars": {"items":[[1,"throwingstars"],[1,"essenceoffire"]],"cost":180000},
    "heartwood": {"items":[[1,"woodensword",8],[1,"nheart"]],"cost":120000000},
    "offeringx": {"items":[[10,"offering"],[1200,"essenceofnature"],[200,"essenceoflife"],[1,"essenceofgreed"]],"cost":32000000},
    "computer": {"items":[[1,"networkcard"],[8,"qubics"],[1,"platinumnugget"],[12,"goldnugget"],[100,"electronics"]],"cost":120000000},
    "supercomputer": {"items":[[1,"computer"],[1,"tracker"],[3,"qubics"],[2000,"electronics"]],"cost":4800000000},
    "dartgun": {"items":[[1,"blade",9],[12,"qubics"],[4,"platinumnugget"],[20,"goldnugget"]],"cost":32000000},
    "bronzeingot": {"items":[[16,"bronzenugget"]],"cost":360000},
    "goldingot": {"items":[[12,"goldnugget"]],"cost":3600000},
    "platinumingot": {"items":[[8,"platinumnugget"]],"cost":36000000},
    "candycanesword": {"items":[[1,"blade",7],[1,"candycane"]],"cost":480000},
    "merry": {"items":[[1,"bow"],[1,"candycane"],[1,"mistletoe"]],"cost":480000},
    "harpybow": {"items":[[1,"t2bow"],[100,"feather1"]],"cost":1640000},
    "gstaff": {"items":[[1,"staff",8],[1,"essenceofgreed"]],"cost":180000},
    "pouchbow": {"items":[[1,"bow"],[1,"smoke"]],"cost":180000},
    "ornamentstaff": {"items":[[1,"staff"],[1,"ornament"],[20,"confetti"]],"cost":120000},
    "charmer": {"items":[[1,"goldnugget"],[20,"gem1"],[1,"emptyheart"]],"cost":80000},
    "ctristone": {"items":[[1,"strring"],[1,"intring"],[1,"dexring"],[10,"vitscroll"]],"cost":20000},
    "cclaw": {"items":[[1,"claw"],[1,"crabclaw"]],"cost":24000},
    "slimestaff": {"items":[[1,"staff"],[10,"gslime"]],"cost":24000},
    "mushroomstaff": {"items":[[1,"staff"],[2,"smush"]],"cost":24000},
    "wcap": {"items":[[50,"beewings"],[3,"gslime"]],"cost":0,"quest":"mcollector"},
    "wgloves": {"items":[[60,"beewings"],[20,"spores"]],"cost":0,"quest":"mcollector"},
    "vowkeepergloves": {"items":[[60,"beewings"],[30,"spores"],[2,"crabclaw"]],"cost":0,"quest":"mcollector"},
    "wbreeches": {"items":[[10,"crabclaw"],[100,"spores"]],"cost":0,"quest":"mcollector"},
    "wattire": {"items":[[100,"gslime"],[200,"crabclaw"]],"cost":0,"quest":"mcollector"},
    "wshoes": {"items":[[5,"frogt"],[500,"beewings"],[100,"crabclaw"]],"cost":0,"quest":"mcollector"},
    "quiver": {"items":[[1,"ascale"],[200,"beewings"]],"cost":0,"quest":"mcollector"},
    "orbg": {"items":[[1,"ascale"],[1,"pleather"],[1,"cscale"],[1,"bfur"]],"cost":0,"quest":"mcollector"},
    "orba": {"items":[[1,"orboffire"],[1,"orboffrost"],[1,"orbofplague"],[1,"orbofresolve"]],"cost":0,"quest":"mcollector"},
    "armorring": {"items":[[1,"snakefang"],[1,"lotusf"],[1,"vitring",2]],"cost":0,"quest":"mcollector"},
    "resistancering": {"items":[[1,"ink"],[5,"ascale"],[1,"vitring",2]],"cost":0,"quest":"mcollector"},
    "lbelt": {"items":[[100,"bfur"],[1,"hpbelt",2]],"cost":0,"quest":"mcollector"},
    "stinger": {"items":[[12,"feather0"]],"cost":0,"quest":"mcollector"},
    "hbow": {"items":[[40,"dstones"],[2,"pleather"],[1,"feather0"]],"cost":0,"quest":"mcollector"},
    "snakeoil": {"items":[[40,"dstones"],[9000,"rattail"]],"cost":0,"quest":"witch"},
    "elixirfires": {"items":[[1,"cshell"],[2000,"hpot0"]],"cost":0,"quest":"witch"},
    "elixirfzres": {"items":[[50,"bfur"],[10,"mpot0"]],"cost":0,"quest":"witch"},
    "elixirpnres": {"items":[[500,"bwing"],[1,"hpot0"]],"cost":0,"quest":"witch"},
    "daggerofthedead": {"items":[[1,"mbones"],[1,"wand"]],"cost":24000},
    "spearofthedead": {"items":[[2,"mbones"],[1,"spear"]],"cost":24000},
    "staffofthedead": {"items":[[1,"mbones"],[1,"staff"]],"cost":120000},
    "bowofthedead": {"items":[[1,"mbones"],[1,"bow"]],"cost":120000},
    "swordofthedead": {"items":[[1,"mbones"],[1,"sword"]],"cost":24000},
    "bataxe": {"items":[[1,"cryptkey"],[1,"wbasher",7],[1,"essenceoflife"]],"cost":120000},
    "maceofthedead": {"items":[[1,"mbones"],[1,"wbasher"]],"cost":240000},
    "pmaceofthedead": {"items":[[1,"mbones"],[1,"pmace"]],"cost":24000},
    "weaver": {"items":[[1,"bow"],[30,"cocoon"]],"cost":75000},
    "cocoon": {"items":[[1000,"spidersilk"]],"cost":2500},
    "elixirint1": {"items":[[10,"elixirint0"]],"cost":1000},
    "elixirdex1": {"items":[[10,"elixirdex0"]],"cost":1000},
    "elixirvit1": {"items":[[10,"elixirvit0"]],"cost":1000},
    "elixirstr1": {"items":[[10,"elixirstr0"]],"cost":1000},
    "elixirint2": {"items":[[10,"elixirint1"]],"cost":2400},
    "elixirdex2": {"items":[[10,"elixirdex1"]],"cost":2400},
    "elixirvit2": {"items":[[10,"elixirvit1"]],"cost":2400},
    "elixirstr2": {"items":[[10,"elixirstr1"]],"cost":2400},
    "threadneedle": {"items":[[1,"blade",5],[20,"spidersilk"],[20,"ashleaf"]],"cost":120000},
    "brinefang": {"items":[[1,"blade",7],[120,"reefglass"],[1,"cshell"]],"cost":180000},
    "molehook": {"items":[[1,"pickaxe",5],[40,"gemfragment"],[2,"bronzenugget"]],"cost":90000},
    "cinderwand": {"items":[[1,"wand",7],[1,"embercore"],[6,"essenceoffire"],[40,"ashleaf"]],"cost":240000},
    "pollenbow": {"items":[[1,"bow",7],[60,"beewings"],[60,"ashleaf"],[10,"essenceofnature"]],"cost":90000},
    "rimeknuckles": {"items":[[1,"claw",7],[1,"frostcore"],[12,"bfur"],[4,"essenceoffrost"]],"cost":180000},
    "lanternshield": {"items":[[1,"shield",6],[1,"embercore"],[1,"bronzeingot"]],"cost":240000},
    "turtleshard": {"items":[[1,"wshield",6],[80,"reefglass"],[1,"cshell"]],"cost":100000},
    "ratkingbuckler": {"items":[[1,"wshield",4],[30,"rattail"],[20,"ashleaf"],[1,"bronzenugget"]],"cost":40000},
    "stormquiver": {"items":[[1,"alloyquiver",5],[80,"stormfeather"],[8,"essenceofether"]],"cost":500000},
    "thistlequiver": {"items":[[1,"quiver",5],[10,"pleather"],[40,"ashleaf"],[5,"essenceofnature"]],"cost":140000},
    "scribeorb": {"items":[[1,"wbook0",3],[12,"voidthread"],[50,"bwing"],[4,"essenceofether"]],"cost":280000},
    "mossheart": {"items":[[1,"wbook0",4],[2,"verdantcore"],[120,"ashleaf"],[80,"essenceofnature"]],"cost":800000},
    "emberseal": {"items":[[1,"strring",2],[1,"embercore"],[6,"essenceoffire"]],"cost":300000},
    "glacierseal": {"items":[[1,"intring",2],[1,"frostcore"],[6,"essenceoffrost"]],"cost":300000},
    "venomband": {"items":[[1,"dexring",2],[1,"verdantcore"],[12,"poison"],[4,"snakefang"]],"cost":240000},
    "saffronloop": {"items":[[1,"vitearring",2],[1,"goldnugget"],[100,"gemfragment"]],"cost":350000},
    "moonshardearring": {"items":[[1,"intearring",2],[8,"voidthread"],[40,"bwing"],[4,"essenceofether"]],"cost":240000},
    "cloverstud": {"items":[[1,"vitearring",2],[1,"verdantcore"],[40,"ashleaf"],[40,"spores"],[5,"gslime"]],"cost":280000},
    "anchorbelt": {"items":[[1,"hpbelt",2],[150,"reefglass"],[1,"cshell"]],"cost":260000},
    "windbelt": {"items":[[1,"dexbelt",2],[40,"stormfeather"],[4,"essenceofether"]],"cost":300000},
    "knifebelt": {"items":[[1,"dexbelt",2],[30,"spidersilk"],[8,"voidthread"],[20,"bwing"],[12,"poison"]],"cost":350000},
    "gloampendant": {"items":[[1,"dexamulet",2],[30,"voidthread"],[80,"bwing"],[6,"essenceofether"]],"cost":6400000},
    "worldrootcrook": {"items":[[1,"harbringer",8],[1,"sapstone"],[1,"platinumingot"],[3,"goldingot"],[4,"ijx"],[12,"ectoplasm"],[1,"bcandle"]],"cost":250000000},
    "emberhood": {"items":[[1,"mmhat",5],[1,"embercore"],[8,"essenceoffire"],[20,"ashleaf"]],"cost":400000},
    "bogcrown": {"items":[[1,"helmet",7],[1,"verdantcore"],[12,"poison"],[40,"ashleaf"]],"cost":220000},
    "ratworkcoat": {"items":[[1,"coat",5],[30,"rattail"],[40,"ashleaf"]],"cost":75000},
    "reefvest": {"items":[[1,"coat1",7],[200,"reefglass"],[2,"cshell"]],"cost":400000},
    "oathplate": {"items":[[1,"coat1"],[4,"pleather"],[2,"ascale"],[20,"spores"]],"cost":180000},
    "resolutesallet": {"items":[[1,"helmet1",0],[12,"dstones"],[4,"rfangs"]],"cost":240000},
    "silkgrips": {"items":[[1,"gloves",5],[30,"spidersilk"],[8,"voidthread"],[20,"bwing"]],"cost":120000},
    "thundergrips": {"items":[[1,"mrngloves",6],[80,"stormfeather"],[12,"essenceofether"]],"cost":800000},
    "bogwalkers": {"items":[[1,"shoes1",6],[1,"verdantcore"],[12,"poison"],[8,"snakefang"]],"cost":260000},
    "cinderboots": {"items":[[1,"shoes1",6],[1,"embercore"],[8,"essenceoffire"],[20,"ashleaf"]],"cost":280000},
    "rimeboots": {"items":[[1,"shoes1",6],[1,"frostcore"],[8,"essenceoffrost"],[12,"bfur"]],"cost":280000},
    "reedpants": {"items":[[1,"pants",6],[20,"frogt"],[4,"lotusf"],[40,"ashleaf"]],"cost":100000},
    "beastmantle": {"items":[[1,"cape",7],[2,"verdantcore"],[240,"leather"]],"cost":1200000},
    "starcloak": {"items":[[1,"cape",7],[40,"voidthread"],[40,"essenceofether"],[1,"platinumnugget"]],"cost":1800000},
    "cave_locktooth": {"cost":8000,"items":[[6,"cave_amber"],[1,"blade",0],[2,"reefglass"]]},
    "cave_counterweight": {"cost":12000,"items":[[8,"cave_amber"],[1,"wshield",0],[1,"dstones"]]},
    "cave_mothsteps": {"cost":12000,"items":[[6,"cave_amber"],[1,"shoes",0],[2,"beewings"]]},
    "cave_loaded_die": {"cost":16000,"items":[[10,"cave_amber"],[8,"seashell"],[2,"reefglass"]]},
    "cave_tunnelaxe": {"cost":12000,"items":[[8,"cave_amber"],[1,"blade",0],[1,"wbasher",0]]},
    "cave_reedscythe": {"cost":500,"items":[[1,"wbasher",0],[1,"blade",0],[1,"spidersilk"]]},
    "cave_deepaxe": {"cost":480000,"items":[[400,"cave_amber"],[1,"cave_tunnelaxe",0],[10,"gemfragment"],[20,"leather"]]},
    "cave_ambercoat": {"cost":360000,"items":[[300,"cave_amber"],[1,"coat",0],[30,"spidersilk"],[20,"cscale"]]},
  },
  drops: {
    "marketparcel": [[2697000,"scroll0",5],[1977800,"cscroll0",2],[1618200,"seashell",5],[1258600,"leather",2],[899000,"scroll1",1],[359600,"gem1",1],[134850,"cscroll1",1],[35960,"offeringp",1],[8990,"gem0",1],[2000,"duskweavehood",1],[2000,"caravanbrigandine",1],[2000,"mirrorsteelgauntlet",1],[2000,"ironheelboots",1],[2000,"tollkeeperspike",1]],
    "gold": {"base":0.64,"random":0.8,"x10":0.03125,"x50":0.0020833333333333333},
    "maps": {"global_static":[],"global":[[0.0006666666666666666,"anniversarygift"],[0.00002,"slice_strawberry"],[0.00002,"slice_citrus"],[0.00002,"slice_honey"],[0.00002,"slice_mint"],[0.00002,"slice_blueberry"],[0.00002,"slice_nightberry"]],"main":[[0.0007,"ringsj"],[0.0006,"hpamulet"],[0.0006,"hpbelt"],[0.00007,"gem0"],[0.0001,"wcap"],[0.0001,"wshoes"]],"winter_cave":[[0.0005,"open","statring"],[0.000001,"angelwings"]],"winterland":[[0.0001,"wattire"],[0.0005,"open","statring"]],"halloween":[[0.0001,"wgloves"],[0.0001,"wbreeches"],[0.0007,"open","statamulet"]],"spookytown":[[0.0001,"wbreeches"],[0.0007,"open","statbelt"]],"cave":[[0.0001,"wattire"],[0.0001,"wgloves"],[0.0004,"ringsj"],[0.0006,"hpamulet"],[0.0006,"hpbelt"],[0.00008,"gem0"],[0.0000016666666666666667,"cryptkey"]],"maintest":[[0.001,"ringsj"],[0.0007,"hpamulet"],[0.0007,"hpbelt"]],"arena":[[0.00008,"gem0"]],"mansion":[[0.0001,"wbreeches"],[0.00012,"lostearring"]]},
    "monsters_home_server": {"crabxx":[[1,"reefglass",3]],"rharpy":[[0.05,"feather1"],[0.2,"essenceoffrost"]],"phoenix":[[0.5,"stormfeather"],[0.005,"embercore"]],"icegolem":[[1,"essenceoffrost",2],[0.05,"frostcore"]],"dragold":[[1,"essenceoffire"],[0.005,"embercore"]],"franky":[[1,"bandages",10],[0.005,"ectoplasm"]],"mrgreen":[[0.01,"fallen"],[1,"candy0",7],[1,"candy1",14],[0.342857,"candy0",6],[0.342857,"candy1",12]],"mrpumpkin":[[0.01,"fallen"],[1,"candy0",6],[1,"candy1",12],[0.285714,"candy0",4],[0.285714,"candy1",8]]},
    "konami": [[6e-7,"powerglove"],[2e-9,"goldenpowerglove"]],
    "statamulet": [[1,"intamulet"],[1,"stramulet"],[1,"dexamulet"]],
    "statbelt": [[1,"intbelt"],[1,"strbelt"],[1,"dexbelt"]],
    "statring": [[1,"intring"],[1,"vitring"],[1,"dexring"],[1,"strring"]],
    "basicelixir": [[1,"elixirvit0"],[0.1,"elixirvit1"],[0.01,"elixirvit2"],[1,"elixirstr0"],[0.1,"elixirstr1"],[0.01,"elixirstr2"],[1,"elixirdex0"],[0.1,"elixirdex1"],[0.01,"elixirdex2"],[1,"elixirint0"],[0.1,"elixirint1"],[0.01,"elixirint2"]],
    "glitch": [[0.25,"test_orb"],[1,"stealthcape"],[1,"cape"],[1,"horsecape"],[0.25,"horsecapeg"],[0.25,"fcape"],[1,"ecape"],[1,"gcape"],[1,"angelwings"],[1,"tigercape"],[1,"bcape"],[1,"hpot0"],[1,"mpot0"],[1,"hpot1"],[1,"mpot1"],[1,"hpotx"],[1,"mpotx"],[0.25,"fury"],[1,"tigerhelmet"],[1,"rednose"],[1,"helmet"],[0.25,"cyber"],[1,"wcap"],[1,"xmashat"],[1,"ghatb"],[1,"ghatp"],[1,"helmet1"],[1,"mwhelmet"],[1,"mmhat"],[1,"mphat"],[1,"mrnhat"],[1,"mrhood"],[1,"mchat"],[1,"partyhat"],[1,"phelmet"],[0.25,"gphelmet"],[1,"bunnyears"],[1,"eears"],[0.25,"hhelmet"],[0.25,"xhelmet"],[0.25,"spikedhelmet"],[0.1,"luckyt"],[1,"tshirt0"],[1,"tshirt1"],[1,"tshirt2"],[1,"tshirt3"],[1,"tshirt4"],[1,"tshirt88"],[1,"tshirt6"],[1,"tshirt7"],[1,"tshirt8"],[1,"tshirt9"],[1,"coat"],[1,"wattire"],[1,"xmassweater"],[1,"sweaterhs"],[1,"coat1"],[1,"mwarmor"],[1,"mmarmor"],[1,"mparmor"],[1,"mrnarmor"],[1,"mrarmor"],[1,"mcarmor"],[0.25,"harmor"],[0.25,"cdragon"],[0.25,"oxhelmet"],[0.25,"xarmor"],[1,"mcape"],[0.25,"vattire"],[0.1,"warpvest"],[1,"pyjamas"],[1,"epyjamas"],[1,"pants"],[0.25,"fallen"],[1,"wbreeches"],[1,"xmaspants"],[1,"pants1"],[1,"mwpants"],[1,"mmpants"],[1,"mppants"],[1,"mrnpants"],[1,"mrpants"],[1,"mcpants"],[0.25,"starkillers"],[0.25,"hpants"],[0.25,"frankypants"],[0.25,"xpants"],[1,"shoes"],[1,"wshoes"],[1,"iceskates"],[1,"snowboots"],[1,"eslippers"],[1,"wingedboots"],[1,"xmasshoes"],[1,"shoes1"],[1,"mwboots"],[1,"mmshoes"],[1,"mpshoes"],[1,"mrnboots"],[1,"mrboots"],[1,"mcboots"],[0.25,"hboots"],[0.25,"xboots"],[1,"gloves"],[0.25,"vgloves"],[0.25,"vboots"],[0.25,"vcape"],[1,"fierygloves"],[1,"wgloves"],[1,"mittens"],[0.25,"supermittens"],[0.25,"powerglove"],[0.25,"goldenpowerglove"],[0.25,"handofmidas"],[1,"poker"],[1,"gloves1"],[0.25,"mpxgloves"],[1,"mwgloves"],[1,"mmgloves"],[1,"mpgloves"],[1,"mrngloves"],[1,"mrgloves"],[1,"mcgloves"],[0.25,"hgloves"],[0.25,"xgloves"],[1,"vowkeepergloves"],[1,"oathplate"],[1,"resolutesallet"],[1,"claw"],[1,"cclaw"],[1,"throwingstars"],[1,"snowflakes"],[1,"firestars"],[1,"fclaw"],[1,"pclaw"],[1,"stinger"],[1,"dagger"],[1,"daggerofthedead"],[0.25,"dragondagger"],[0.25,"hdagger"],[0.25,"dartgun"],[1,"rod"],[1,"pickaxe"],[1,"bow"],[1,"pouchbow"],[1,"weaver"],[1,"crossbow"],[1,"hbow"],[1,"merry"],[1,"cupid"],[1,"firebow"],[1,"frostbow"],[1,"t2bow"],[0.25,"harpybow"],[0.25,"t3bow"],[1,"bowofthedead"],[0.25,"gbow"],[1,"spear"],[1,"spearofthedead"],[0.25,"scythe"],[1,"blade"],[1,"sword"],[1,"swifty"],[1,"fsword"],[1,"rapier"],[1,"basher"],[1,"bataxe"],[1,"fireblade"],[1,"swordofthedead"],[1,"woodensword"],[0.25,"heartwood"],[1,"glolipop"],[1,"ololipop"],[1,"mace"],[1,"xmace"],[1,"wbasher"],[0.25,"hammer"],[0.25,"vhammer"],[0.25,"vstaff"],[0.25,"vdagger"],[0.25,"vsword"],[1,"maceofthedead"],[0.25,"pmaceofthedead"],[1,"carrotsword"],[1,"candycanesword"],[1,"pinkie"],[1,"wand"],[1,"broom"],[1,"staff"],[0.25,"gstaff"],[1,"sparkstaff"],[1,"slimestaff"],[1,"mushroomstaff"],[1,"firestaff"],[1,"ornamentstaff"],[1,"staffofthedead"],[1,"froststaff"],[1,"oozingterror"],[1,"harbringer"],[1,"pmace"],[0.25,"lmace"],[1,"concordmace"],[1,"shield"],[1,"tigershield"],[0.25,"dawnwardaegis"],[0.25,"xshield"],[0.25,"mshield"],[0.25,"exoarm"],[0.25,"lantern"],[1,"sshield"],[1,"wshield"],[1,"wbook0"],[1,"wbook1"],[1,"wbookhs"],[1,"quiver"],[1,"t2quiver"],[1,"alloyquiver"],[0.25,"amuletofm"],[0.25,"northstar"],[0.25,"bfangamulet"],[0.25,"mpxamulet"],[0.25,"suckerpunch"],[0.25,"vring"],[0.1,"trigger"],[0.1,"zapper"],[1,"goldring"],[1,"armorring"],[1,"resistancering"],[0.25,"ringofluck"],[0.25,"ringhs"],[1,"molesteeth"],[0.25,"mearring"],[1,"ctristone"],[1,"cdarktristone"],[1,"skullamulet"],[1,"spookyamulet"],[1,"hpamulet"],[0.25,"snring"],[0.25,"sanguine"],[1,"dexamulet"],[1,"stramulet"],[1,"intamulet"],[1,"t2stramulet"],[1,"t2intamulet"],[1,"t2dexamulet"],[1,"warmscarf"],[1,"hpbelt"],[0.25,"mpxbelt"],[1,"lbelt"],[1,"strbelt"],[1,"mbelt"],[1,"sbelt"],[1,"santasbelt"],[1,"dexbelt"],[1,"intbelt"],[1,"ringsj"],[0.25,"solitaire"],[1,"vitring"],[1,"strring"],[1,"intring"],[1,"dexring"],[1,"cring"],[1,"cearring"],[1,"intearring"],[1,"strearring"],[1,"dexearring"],[1,"dexearringx"],[1,"vitearring"],[1,"cscroll0"],[1,"cscroll1"],[1,"cscroll2"],[1,"cscroll3"],[1,"scroll0"],[1,"scroll1"],[1,"scroll2"],[1,"scroll3"],[1,"strscroll"],[1,"intscroll"],[1,"dexscroll"],[1,"vitscroll"],[1,"forscroll"],[1,"evasionscroll"],[1,"reflectionscroll"],[1,"goldscroll"],[1,"luckscroll"],[1,"xpscroll"],[1,"armorscroll"],[1,"resistancescroll"],[1,"speedscroll"],[1,"lifestealscroll"],[1,"manastealscroll"],[1,"rpiercingscroll"],[1,"apiercingscroll"],[1,"critscroll"],[1,"dreturnscroll"],[1,"frequencyscroll"],[1,"mpcostscroll"],[1,"outputscroll"],[1,"offering"],[1,"offeringp"],[1,"offeringx"],[1,"cosmo0"],[1,"cosmo1"],[1,"cosmo2"],[1,"cosmo3"],[1,"cosmo4"],[1,"cosmo5"],[1,"xptome"],[1,"licence"],[1,"xpbooster"],[1,"luckbooster"],[1,"goldbooster"],[1,"networkcard"],[1,"qubics"],[1,"gem0"],[1,"gem1"],[1,"gem2"],[1,"gem3"],[1,"candypop"],[1,"candy0"],[1,"candy1"],[1,"bugbountybox"],[1,"weaponbox"],[1,"armorbox"],[1,"mistletoe"],[1,"candycane"],[1,"gift0"],[1,"gift1"],[1,"redenvelope"],[1,"redenvelopev2"],[1,"redenvelopev3"],[1,"redenvelopev4"],[1,"greenenvelope"],[1,"brownenvelope"],[1,"essenceoffrost"],[1,"essenceoffire"],[1,"essenceofether"],[1,"essenceofnature"],[1,"essenceoflife"],[1,"essenceofgreed"],[1,"emptyjar"],[1,"bottleofxp"],[1,"nheart"],[1,"mysterybox"],[1,"troll"],[1,"brownegg"],[1,"whiteegg"],[1,"gslime"],[1,"crabclaw"],[1,"beewings"],[1,"pleather"],[1,"spores"],[1,"lotusf"],[1,"frogt"],[1,"snakefang"],[1,"rattail"],[1,"ascale"],[1,"ink"],[1,"ijx"],[1,"smush"],[1,"carrot"],[1,"bfur"],[1,"bandages"],[1,"cocoon"],[1,"tshell"],[1,"dstones"],[1,"bwing"],[1,"bfang"],[1,"sstinger"],[1,"svenom"],[1,"pstem"],[1,"watercore"],[1,"ectoplasm"],[1,"rfur"],[1,"cshell"],[1,"bcandle"],[1,"lspores"],[1,"trinkets"],[1,"rfangs"],[1,"btusk"],[1,"drapes"],[1,"stand0"],[1,"tracker"],[1,"computer"],[1,"supercomputer"],[1,"stick"],[1,"coal"],[1,"5bucks"],[1,"confetti"],[1,"firecrackers"],[1,"smoke"],[1,"snowball"],[1,"pvptoken"],[1,"funtoken"],[1,"monstertoken"],[1,"friendtoken"],[1,"emptyheart"],[1,"fieldgen0"],[1,"seashell"],[1,"leather"],[1,"gemfragment"],[1,"ornament"],[1,"lostearring"],[1,"stonekey"],[1,"cryptkey"],[1,"frozenkey"],[1,"tombkey"],[1,"spiderkey"],[1,"bkey"],[1,"ukey"],[1,"dkey"],[1,"x0"],[1,"x1"],[1,"x2"],[1,"x3"],[1,"x4"],[1,"x5"],[1,"x6"],[1,"x7"],[1,"x8"],[1,"xbox"],[1,"egg0"],[1,"egg1"],[1,"egg2"],[1,"egg3"],[1,"egg4"],[1,"egg5"],[1,"egg6"],[1,"egg7"],[1,"egg8"],[1,"goldenegg"],[1,"basketofeggs"],[1,"frozenstone"],[1,"orbg"],[1,"tigerstone"],[0.25,"vorb"],[1,"orbofvit"],[1,"orbofint"],[1,"orbofstr"],[1,"orbofdex"],[1,"orboffire"],[1,"orboffrost"],[1,"orbofplague"],[1,"orbofresolve"],[1,"orba"],[0.25,"orboftemporal"],[0.25,"orbofsc"],[1,"charmer"],[0.25,"rabbitsfoot"],[1,"talkingskull"],[1,"jacko"],[1,"ftrinket"],[1,"eggnog"],[1,"vblood"],[1,"gum"],[1,"hotchocolate"],[1,"pumpkinspice"],[1,"cake"],[1,"greenbomb"],[1,"swirlipop"],[1,"xshot"],[1,"espresso"],[1,"whiskey"],[1,"wine"],[1,"ale"],[1,"pico"],[1,"blue"],[1,"bunnyelixir"],[1,"elixirvit0"],[1,"elixirvit1"],[1,"elixirvit2"],[1,"elixirstr0"],[1,"elixirstr1"],[1,"elixirstr2"],[1,"elixirdex0"],[1,"elixirdex1"],[1,"elixirdex2"],[1,"elixirint0"],[1,"elixirint1"],[1,"elixirint2"],[1,"elixirluck"],[1,"elixirfires"],[1,"elixirfzres"],[1,"elixirpnres"],[1,"poison"],[1,"shadowstone"],[1,"mbones"],[1,"cscale"],[1,"snakeoil"],[1,"feather0"],[1,"feather1"],[1,"bronzeingot"],[1,"goldingot"],[1,"platinumingot"],[1,"bronzenugget"],[1,"goldnugget"],[1,"platinumnugget"],[1,"electronics"],[1,"spidersilk"],[1,"flute"],[1,"puppyer"],[1,"ashleaf"],[1,"reefglass"],[1,"stormfeather"],[1,"voidthread"],[1,"embercore"],[1,"frostcore"],[1,"verdantcore"],[5,"glitch",2]],
    "lglitch": [[0.1,"test_orb"],[0.1,"stealthcape"],[1,"cape"],[0.1,"horsecape"],[0.1,"horsecapeg"],[0.01,"fcape"],[1,"ecape"],[1,"gcape"],[0.1,"angelwings"],[0.1,"tigercape"],[0.1,"bcape"],[1,"hpot0"],[1,"mpot0"],[1,"hpot1"],[1,"mpot1"],[1,"hpotx"],[1,"mpotx"],[0.01,"fury"],[0.1,"tigerhelmet"],[1,"rednose"],[1,"helmet"],[0.1,"cyber"],[1,"wcap"],[1,"xmashat"],[0.1,"ghatb"],[0.1,"ghatp"],[1,"helmet1"],[0.1,"mwhelmet"],[0.1,"mmhat"],[0.1,"mphat"],[0.1,"mrnhat"],[0.1,"mrhood"],[0.1,"mchat"],[1,"partyhat"],[0.1,"phelmet"],[0.1,"gphelmet"],[1,"bunnyears"],[1,"eears"],[0.1,"hhelmet"],[0.1,"xhelmet"],[0.1,"spikedhelmet"],[0.01,"luckyt"],[1,"tshirt0"],[1,"tshirt1"],[1,"tshirt2"],[1,"tshirt3"],[1,"tshirt4"],[1,"tshirt88"],[1,"tshirt6"],[1,"tshirt7"],[1,"tshirt8"],[1,"tshirt9"],[1,"coat"],[1,"wattire"],[1,"xmassweater"],[0.1,"sweaterhs"],[1,"coat1"],[0.1,"mwarmor"],[0.1,"mmarmor"],[0.1,"mparmor"],[0.1,"mrnarmor"],[0.1,"mrarmor"],[0.1,"mcarmor"],[0.1,"harmor"],[0.01,"cdragon"],[0.01,"oxhelmet"],[0.1,"xarmor"],[0.1,"mcape"],[0.1,"vattire"],[0.01,"warpvest"],[0.1,"pyjamas"],[1,"epyjamas"],[1,"pants"],[0.01,"fallen"],[1,"wbreeches"],[1,"xmaspants"],[0.1,"pants1"],[0.1,"mwpants"],[0.1,"mmpants"],[0.1,"mppants"],[0.1,"mrnpants"],[0.1,"mrpants"],[0.1,"mcpants"],[0.01,"starkillers"],[0.1,"hpants"],[0.1,"frankypants"],[0.01,"xpants"],[1,"shoes"],[1,"wshoes"],[0.1,"iceskates"],[0.1,"snowboots"],[1,"eslippers"],[0.1,"wingedboots"],[1,"xmasshoes"],[0.1,"shoes1"],[0.1,"mwboots"],[0.1,"mmshoes"],[0.1,"mpshoes"],[0.1,"mrnboots"],[0.1,"mrboots"],[0.1,"mcboots"],[0.1,"hboots"],[0.01,"xboots"],[1,"gloves"],[0.1,"vgloves"],[0.1,"vboots"],[0.1,"vcape"],[0.1,"fierygloves"],[1,"wgloves"],[1,"mittens"],[0.1,"supermittens"],[0.1,"powerglove"],[0.01,"goldenpowerglove"],[0.1,"handofmidas"],[1,"poker"],[1,"gloves1"],[0.01,"mpxgloves"],[0.1,"mwgloves"],[0.1,"mmgloves"],[0.1,"mpgloves"],[0.1,"mrngloves"],[0.1,"mrgloves"],[0.1,"mcgloves"],[0.1,"hgloves"],[0.1,"xgloves"],[1,"vowkeepergloves"],[0.1,"oathplate"],[0.1,"resolutesallet"],[1,"claw"],[1,"cclaw"],[0.1,"throwingstars"],[0.1,"snowflakes"],[0.1,"firestars"],[0.1,"fclaw"],[0.1,"pclaw"],[1,"stinger"],[0.1,"dagger"],[0.1,"daggerofthedead"],[0.1,"dragondagger"],[0.1,"hdagger"],[0.01,"dartgun"],[1,"rod"],[1,"pickaxe"],[1,"bow"],[1,"pouchbow"],[1,"weaver"],[0.1,"crossbow"],[1,"hbow"],[0.1,"merry"],[0.1,"cupid"],[0.1,"firebow"],[0.1,"frostbow"],[0.1,"t2bow"],[0.1,"harpybow"],[0.1,"t3bow"],[0.1,"bowofthedead"],[0.1,"gbow"],[0.1,"spear"],[0.1,"spearofthedead"],[0.01,"scythe"],[1,"blade"],[1,"sword"],[1,"swifty"],[0.1,"fsword"],[0.1,"rapier"],[0.1,"basher"],[0.1,"bataxe"],[0.1,"fireblade"],[0.1,"swordofthedead"],[0.1,"woodensword"],[0.01,"heartwood"],[1,"glolipop"],[1,"ololipop"],[1,"mace"],[1,"xmace"],[1,"wbasher"],[0.1,"hammer"],[0.01,"vhammer"],[0.01,"vstaff"],[0.01,"vdagger"],[0.01,"vsword"],[0.1,"maceofthedead"],[0.1,"pmaceofthedead"],[0.1,"carrotsword"],[0.1,"candycanesword"],[0.1,"pinkie"],[1,"wand"],[1,"broom"],[1,"staff"],[0.1,"gstaff"],[0.1,"sparkstaff"],[1,"slimestaff"],[1,"mushroomstaff"],[0.1,"firestaff"],[0.1,"ornamentstaff"],[0.1,"staffofthedead"],[0.1,"froststaff"],[0.1,"oozingterror"],[0.1,"harbringer"],[0.1,"pmace"],[0.1,"lmace"],[0.1,"concordmace"],[1,"shield"],[0.1,"tigershield"],[0.1,"dawnwardaegis"],[0.1,"xshield"],[0.1,"mshield"],[0.01,"exoarm"],[0.1,"lantern"],[1,"sshield"],[1,"wshield"],[1,"wbook0"],[0.1,"wbook1"],[0.1,"wbookhs"],[1,"quiver"],[0.1,"t2quiver"],[0.1,"alloyquiver"],[0.01,"amuletofm"],[0.01,"northstar"],[0.01,"bfangamulet"],[0.01,"mpxamulet"],[0.1,"suckerpunch"],[0.1,"vring"],[0.01,"trigger"],[0.01,"zapper"],[0.01,"goldring"],[0.1,"armorring"],[0.1,"resistancering"],[0.01,"ringofluck"],[0.01,"ringhs"],[0.1,"molesteeth"],[0.01,"mearring"],[1,"ctristone"],[1,"cdarktristone"],[1,"skullamulet"],[0.1,"spookyamulet"],[1,"hpamulet"],[0.1,"snring"],[0.01,"sanguine"],[1,"dexamulet"],[1,"stramulet"],[1,"intamulet"],[0.1,"t2stramulet"],[0.1,"t2intamulet"],[0.1,"t2dexamulet"],[1,"warmscarf"],[1,"hpbelt"],[0.1,"mpxbelt"],[1,"lbelt"],[1,"strbelt"],[0.1,"mbelt"],[0.1,"sbelt"],[0.1,"santasbelt"],[1,"dexbelt"],[1,"intbelt"],[1,"ringsj"],[0.1,"solitaire"],[1,"vitring"],[1,"strring"],[1,"intring"],[1,"dexring"],[0.1,"cring"],[0.1,"cearring"],[1,"intearring"],[1,"strearring"],[1,"dexearring"],[1,"dexearringx"],[1,"vitearring"],[1,"cscroll0"],[0.1,"cscroll1"],[0.01,"cscroll2"],[0.01,"cscroll3"],[1,"scroll0"],[1,"scroll1"],[0.1,"scroll2"],[0.01,"scroll3"],[1,"strscroll"],[1,"intscroll"],[1,"dexscroll"],[1,"vitscroll"],[1,"forscroll"],[1,"evasionscroll"],[1,"reflectionscroll"],[1,"goldscroll"],[1,"luckscroll"],[1,"xpscroll"],[1,"armorscroll"],[1,"resistancescroll"],[1,"speedscroll"],[1,"lifestealscroll"],[1,"manastealscroll"],[1,"rpiercingscroll"],[1,"apiercingscroll"],[1,"critscroll"],[1,"dreturnscroll"],[1,"frequencyscroll"],[1,"mpcostscroll"],[1,"outputscroll"],[0.01,"offering"],[0.1,"offeringp"],[0.01,"offeringx"],[0.01,"cosmo0"],[0.01,"cosmo1"],[0.1,"cosmo2"],[0.01,"cosmo3"],[0.01,"cosmo4"],[0.01,"cosmo5"],[0.1,"xptome"],[0.01,"licence"],[0.01,"xpbooster"],[0.01,"luckbooster"],[0.01,"goldbooster"],[0.01,"networkcard"],[0.01,"qubics"],[0.1,"gem0"],[1,"gem1"],[0.1,"gem2"],[0.1,"gem3"],[1,"candypop"],[0.1,"candy0"],[1,"candy1"],[0.1,"bugbountybox"],[0.1,"weaponbox"],[0.1,"armorbox"],[1,"mistletoe"],[1,"candycane"],[1,"gift0"],[1,"gift1"],[1,"redenvelope"],[1,"redenvelopev2"],[1,"redenvelopev3"],[1,"redenvelopev4"],[1,"greenenvelope"],[1,"brownenvelope"],[1,"essenceoffrost"],[1,"essenceoffire"],[1,"essenceofether"],[1,"essenceofnature"],[1,"essenceoflife"],[0.01,"essenceofgreed"],[1,"emptyjar"],[0.01,"bottleofxp"],[0.01,"nheart"],[0.01,"mysterybox"],[1,"troll"],[1,"brownegg"],[1,"whiteegg"],[1,"gslime"],[1,"crabclaw"],[1,"beewings"],[1,"pleather"],[1,"spores"],[1,"lotusf"],[1,"frogt"],[1,"snakefang"],[1,"rattail"],[1,"ascale"],[1,"ink"],[0.1,"ijx"],[1,"smush"],[1,"carrot"],[1,"bfur"],[1,"bandages"],[1,"cocoon"],[1,"tshell"],[1,"dstones"],[1,"bwing"],[1,"bfang"],[1,"sstinger"],[1,"svenom"],[1,"pstem"],[0.1,"watercore"],[0.1,"ectoplasm"],[1,"rfur"],[1,"cshell"],[0.1,"bcandle"],[1,"lspores"],[0.1,"trinkets"],[1,"rfangs"],[1,"btusk"],[1,"drapes"],[1,"stand0"],[1,"tracker"],[0.01,"computer"],[0.01,"supercomputer"],[0.1,"stick"],[1,"coal"],[1,"5bucks"],[1,"confetti"],[1,"firecrackers"],[1,"smoke"],[1,"snowball"],[1,"pvptoken"],[1,"funtoken"],[1,"monstertoken"],[1,"friendtoken"],[1,"emptyheart"],[0.1,"fieldgen0"],[1,"seashell"],[1,"leather"],[1,"gemfragment"],[1,"ornament"],[0.1,"lostearring"],[1,"stonekey"],[1,"cryptkey"],[1,"frozenkey"],[1,"tombkey"],[1,"spiderkey"],[0.1,"bkey"],[0.01,"ukey"],[0.01,"dkey"],[1,"x0"],[1,"x1"],[1,"x2"],[1,"x3"],[1,"x4"],[1,"x5"],[1,"x6"],[1,"x7"],[1,"x8"],[0.1,"xbox"],[1,"egg0"],[1,"egg1"],[1,"egg2"],[1,"egg3"],[1,"egg4"],[1,"egg5"],[1,"egg6"],[1,"egg7"],[1,"egg8"],[0.1,"goldenegg"],[1,"basketofeggs"],[1,"frozenstone"],[0.1,"orbg"],[0.1,"tigerstone"],[0.01,"vorb"],[0.1,"orbofvit"],[0.1,"orbofint"],[0.1,"orbofstr"],[0.1,"orbofdex"],[0.1,"orboffire"],[0.1,"orboffrost"],[0.1,"orbofplague"],[0.1,"orbofresolve"],[0.1,"orba"],[0.1,"orboftemporal"],[0.1,"orbofsc"],[0.1,"charmer"],[0.1,"rabbitsfoot"],[0.1,"talkingskull"],[0.1,"jacko"],[0.1,"ftrinket"],[1,"eggnog"],[0.1,"vblood"],[1,"gum"],[1,"hotchocolate"],[1,"pumpkinspice"],[1,"cake"],[1,"greenbomb"],[1,"swirlipop"],[1,"xshot"],[1,"espresso"],[0.1,"whiskey"],[1,"wine"],[1,"ale"],[0.1,"pico"],[0.1,"blue"],[1,"bunnyelixir"],[1,"elixirvit0"],[1,"elixirvit1"],[0.1,"elixirvit2"],[1,"elixirstr0"],[1,"elixirstr1"],[0.1,"elixirstr2"],[1,"elixirdex0"],[1,"elixirdex1"],[0.1,"elixirdex2"],[1,"elixirint0"],[1,"elixirint1"],[0.1,"elixirint2"],[0.1,"elixirluck"],[0.1,"elixirfires"],[0.1,"elixirfzres"],[0.1,"elixirpnres"],[1,"poison"],[1,"shadowstone"],[1,"mbones"],[1,"cscale"],[1,"snakeoil"],[1,"feather0"],[1,"feather1"],[1,"bronzeingot"],[0.1,"goldingot"],[0.01,"platinumingot"],[1,"bronzenugget"],[0.1,"goldnugget"],[0.01,"platinumnugget"],[1,"electronics"],[1,"spidersilk"],[0.01,"flute"],[1,"puppyer"],[1,"ashleaf"],[1,"reefglass"],[1,"stormfeather"],[1,"voidthread"],[0.1,"embercore"],[0.1,"frostcore"],[0.1,"verdantcore"]],
    "gemfragment": [[0.5,"gem0"],[0.00001,"fury"],[1,"t2stramulet"],[1,"t2intamulet"],[1,"t2dexamulet"]],
    "seashell": [[0.000001,"vitscroll",10],[1,"open","basicelixir"],[0.00002,"fury"]],
    "leather": [[20,"cape"],[1,"bcape"],[0.5,"open","armorbox"]],
    "lostearring0": [[1,"open","armorbox"]],
    "lostearring1": [[1,"open","weaponbox"]],
    "lostearring2": [[1,"wbook1"],[0.25,"t2quiver"]],
    "lostearring3": [[0.5,"fury"],[5,"handofmidas"]],
    "lostearring4": [[1,"hhelmet"],[0.8,"harmor"],[1,"hpants"],[1.1,"hgloves"],[0.5,"hboots"],[0.1,"xhelmet"],[0.08,"xarmor"],[0.1,"xpants"],[0.11,"xgloves"],[0.05,"xboots"]],
    "mistletoe": [[0.12,"eggnog"],[1,"hotchocolate"],[1,"warmscarf"],[1,"snowball",10],[0.1,"santasbelt"],[1,"candycanesword"],[1,"ornamentstaff"],[0.8,"merry"],[0.05,"mshield"],[1,"rednose"],[1,"xmashat"],[1,"xmasshoes"],[0.8,"xmassweater"],[1,"xmaspants"],[0.8,"mittens"],[0.02,"angelwings"],[0.008,"supermittens"],[0.0001,"mearring"],[3.6,"open","gem0"]],
    "candycane": [[0.05,"open","xN"],[0.1,"eggnog"],[1,"hotchocolate"],[1,"warmscarf"],[1,"snowball",10],[0.1,"snowflakes"],[0.1,"santasbelt"],[1,"candycanesword"],[1,"ornamentstaff"],[0.8,"merry"],[0.05,"mshield"],[1,"rednose"],[1,"xmashat"],[1,"xmasshoes"],[1,"xmassweater"],[1,"xmaspants"],[1,"mittens"],[0.02,"angelwings"],[0.008,"supermittens"],[3.6,"open","gem0"],[0.00001,"northstar"],[0.01,"shells",200]],
    "5bucks": [[0.02,"5bucks",2],[1,"shells",800]],
    "ornament": [[0.1,"eggnog"],[1,"hotchocolate"],[1,"warmscarf"],[1,"snowball",10],[0.1,"santasbelt"],[1,"candycanesword"],[1,"ornamentstaff"],[0.05,"mshield"],[0.8,"merry"],[1,"rednose"],[1,"xmashat"],[1,"xmasshoes"],[0.8,"xmassweater"],[1,"xmaspants"],[0.8,"mittens"],[0.02,"angelwings"],[0.012,"supermittens"],[0.001,"orboftemporal"],[3.6,"open","gem0"]],
    "xbox": [[1,"open","armorx"],[1,"harbringer"],[1,"t2quiver"],[0.1,"orboftemporal"],[0.1,"exoarm"],[0.06,"fury"],[0.12,"starkillers"],[0.01,"northstar"]],
    "redenvelope": [[1000,"gold",500000],[1,"gold",100000000],[10,"cdragon"],[40,"puppyer"]],
    "redenvelopev2_shouldhavebeen": [[2000,"gold",50000],[1,"gold",10000000],[300,"firecrackers"],[0.1,"dragondagger"],[1,"cdragon"]],
    "redenvelopev2": [[2000,"gold",500000],[2,"gold",10000000],[3000,"firecrackers"],[1,"dragondagger"],[1,"cdragon"]],
    "redenvelopev3": [[2000,"gold",50000],[1,"gold",10000000],[300,"firecrackers"],[0.1,"dragondagger"],[1,"cdragon"]],
    "redenvelopev4": [[2000,"gold",50000],[1,"gold",10000000],[300,"firecrackers"],[0.1,"dragondagger"],[1,"cdragon"]],
    "greenenvelope": [[2000,"gold",50000],[1,"gold",10000000],[300,"firecrackers"],[0.1,"dragondagger",null,null,"lucky"],[0.3,"lmace",null,null,"lucky"],[1,"oxhelmet",null,null,"lucky"],[0.1,"cdragon",null,null,"lucky"],[0.1,"snakeoil"]],
    "brownenvelope": [[2000,"gold",50000],[1,"gold",10000000],[300,"firecrackers"],[0.1,"dragondagger",null,null,"lucky"],[0.3,"lmace",null,null,"lucky"],[1,"oxhelmet",null,null,"lucky"],[0.1,"cdragon",null,null,"lucky"],[0.1,"snakeoil"],[0.3,"horsecapeg"]],
    "eastereggs": [[1,"egg0"],[1,"egg1"],[1,"egg2"],[1,"egg3"],[1,"egg4"],[1,"egg5"],[1,"egg6"],[1,"egg7"],[1,"egg8"]],
    "xN": [[1,"x0"],[1,"x1"],[1,"x2"],[1,"x3"],[1,"x4"],[1,"x5"],[1,"x6"],[1,"x7"],[1,"x8"]],
    "goldenegg": [[100,"gold",1000000],[10,"gold",10000000],[1,"gold",100000000]],
    "basketofeggs": [[1,"bunnyelixir"],[1,"eears"],[1,"epyjamas"],[1,"ecape"],[1,"eslippers"],[0.5,"carrotsword"],[0.1,"bataxe"],[0.04,"pinkie"],[0.04,"oozingterror"],[0.04,"harbringer"],[0.001,"rabbitsfoot"]],
    "gift0": [[1,"ftrinket"],[1,"poker"],[0.5,"partyhat"],[0.008,"mysterybox"],[0.1,"cake"],[0.5,"open","armorx"],[0.18,"scroll3"]],
    "gift1": [[1,"open","thrash"],[0.4,"cake"],[0.2,"poker"],[1,"confetti"],[0.8,"partyhat"],[0.1,"gift0"],[0.1,"open","armorbox"],[0.05,"ftrinket"],[0.006,"scroll3"],[0.006,"mysterybox"],[0.002,"offering"],[0.0003,"luckbooster"]],
    "anniversary_equipment": [[15,"candleward"],[15,"paradequiver"],[14,"homecominghelm"],[14,"homecomingcoat"],[14,"homecomingcape"],[10,"guestbook"],[10,"reunionbow"],[8,"keepsakependant"]],
    "anniversarygift": [[608910,"gold",5000],[200000,"gold",20000],[190000,"open","anniversary_legacy"],[990,"open","anniversary_equipment"],[99,"cxjar",1,"makeawish"],[1,"cxjar",1,"ikissyou"]],
    "anniversary_kiss": [[1,"cxjar",1,"ikissyou"],[999,"empty"]],
    "sixcake_bonus": [[1,"anniversarygift",3],[0.00001,"cxjar",1,"ikissyou"]],
    "thrash": [[1,"coat"],[1,"shoes"],[1,"pants"],[1,"gloves"],[1,"helmet"],[1,"empty"]],
    "gem0": [[0.5,"weaponbox"],[1.5,"armorbox"],[0.5,"gold",100000],[1,"gold",200000],[1,"gold",200000],[1,"gold",400000],[0.5,"gold",800000],[0.1,"gold",1600000],[0.1,"gold",3200000],[0.05,"gold",6400000],[0.05,"offering"],[1,"scroll1",10],[0.5,"cscroll1",4],[0.001,"shells",200],[0.0001,"scroll3",1],[0.0001,"cscroll3",1]],
    "gem1_old": [[0.1,"weaponbox"],[0.3,"armorbox"],[0.1,"gem0"],[3,"gold",50000],[2,"gold",100000],[0.5,"gold",200000],[0.1,"gold",400000],[0.01,"gold",800000],[0.001,"gold",1600000],[0.001,"gold",3200000],[0.001,"offering"],[0.5,"scroll0",75],[0.5,"cscroll0",8],[0.2,"scroll1",2],[0.2,"cscroll1",1],[0.001,"shells",50]],
    "gem1": [[0.1,"weaponbox"],[0.3,"armorbox"],[0.001,"offering"],[0.001,"shells",50],[1,"open","thrash"],[0.012,"gemfragment"]],
    "candypop": [[1,"weaponbox"],[1,"armorbox"],[10,"gold",10000],[10,"hpot1",100],[10,"mpot1",100],[10,"scroll0",5],[5,"cscroll0",2],[1,"scroll1",1],[0.5,"cscroll1",1],[0.0001,"shells",50],[0.1,"emptyheart"],[1,"cupid"]],
    "candy0": [[0.008,"spookyamulet"],[1,"gold",480000],[0.0005,"cxjar",1,"hat410"],[0.001,"vblood"],[0.12,"lantern"],[0.1,"talkingskull"],[1,"jacko"],[0.1,"gphelmet"],[1,"throwingstars"],[2,"pumpkinspice"],[0.1,"candy0",5],[1,"open","weaponofthedead"],[0.008,"mysterybox"],[0.001,"gbow"],[0.0005,"starkillers"],[0.002,"swirlipop"],[0.002,"greenbomb"],[0.0005,"fury"],[0.1,"open","armorx"]],
    "candy1": [[0.8,"skullamulet"],[0.05,"broom"],[1,"gold",80000],[0.03,"lantern"],[0.8,"phelmet"],[4.5,"smoke"],[4.5,"pumpkinspice"],[0.4,"candy0"],[0.002,"swirlipop"],[0.002,"greenbomb"],[0.0001,"starkillers"],[0.0001,"fury"],[0.0012,"handofmidas"],[0.007,"harbringer"],[0.008,"oozingterror"],[0.001,"open","armorx"],[0.0001,"cxjar",1,"hairdo609"]],
    "candy0v2": [[0.12,"lantern"],[1,"gphelmet"],[1,"throwingstars"],[2,"pumpkinspice"],[0.1,"candy0v2",5],[1,"open","weaponofthedead"],[0.008,"mysterybox"],[0.002,"starkillers"],[0.002,"swirlipop"],[0.002,"greenbomb"],[0.001,"fury"],[0.1,"open","armorx"]],
    "candy1v2": [[0.03,"lantern"],[0.8,"phelmet"],[4.5,"smoke"],[4.5,"pumpkinspice"],[0.4,"candy0v2"],[0.002,"swirlipop"],[0.002,"greenbomb"],[0.0012,"starkillers"],[0.0012,"fury"],[0.0012,"handofmidas"],[0.004,"harbringer"],[0.001,"open","armorx"]],
    "candy0v3": [[1,"gold",480000],[0.001,"vblood"],[0.12,"lantern"],[0.1,"talkingskull"],[1,"jacko"],[0.1,"gphelmet"],[1,"throwingstars"],[2,"pumpkinspice"],[0.1,"candy0v3",5],[1,"open","weaponofthedead"],[0.008,"mysterybox"],[0.002,"starkillers"],[0.002,"swirlipop"],[0.002,"greenbomb"],[0.001,"fury"],[0.1,"open","armorx"]],
    "candy1v3": [[1,"gold",80000],[0.03,"lantern"],[0.8,"phelmet"],[4.5,"smoke"],[4.5,"pumpkinspice"],[0.4,"candy0v3"],[0.002,"swirlipop"],[0.002,"greenbomb"],[0.0012,"starkillers"],[0.0012,"fury"],[0.0012,"handofmidas"],[0.004,"harbringer"],[0.001,"open","armorx"]],
    "abtesting": [[1,"pvptoken"],[1,"pvptoken",2],[1,"pvptoken",3],[0.5,"pvptoken",4],[0.25,"pvptoken",5],[0.125,"pvptoken",6],[0.0675,"pvptoken",20],[0.0025,"fury"]],
    "abtesting_loser": [[1,"pvptoken"],[0.5,"empty"]],
    "weaponofthedead": [[1,"bowofthedead"],[1,"swordofthedead"],[1,"maceofthedead"],[1,"pmaceofthedead"],[1,"staffofthedead"],[1,"daggerofthedead"]],
    "bugbountybox": [[1,"glitch"]],
    "apologybox": [[1,"glitch"]],
    "f1": [[14,"coat1"],[22,"helmet1"],[20,"pants1"],[22,"gloves1"],[14,"shoes1"],[0.5,"open","lglitch"]],
    "m1": [[200,"gemfragment"],[1,"bronzenugget"],[0.5,"goldnugget"],[0.1,"platinumnugget"],[0.1,"cxjar",1,"hearts_single"]],
    "m2": [[100,"empty"],[10,"wbook0"],[0.1,"wbook1"]],
    "armorbox": [[14,"coat1"],[22,"helmet1"],[20,"pants1"],[1,"hhelmet"],[0.8,"harmor"],[1,"hpants"],[1.1,"hgloves"],[0.5,"hboots"],[22,"gloves1"],[0.1,"xhelmet"],[0.08,"xarmor"],[0.1,"xpants"],[0.11,"xgloves"],[0.05,"xboots"],[0.005,"fury"],[0.005,"starkillers"],[14,"shoes1"]],
    "armorx": [[1,"hhelmet"],[0.8,"harmor"],[1,"hpants"],[1.1,"hgloves"],[0.5,"hboots"],[0.1,"xhelmet"],[0.08,"xarmor"],[0.1,"xpants"],[0.11,"xgloves"],[0.05,"xboots"]],
    "mysterybox": [[70,"open","armorx"],[20,"scroll3"],[4,"cscroll3"],[1,"warpvest"],[1,"scroll4"]],
    "test": [[1,"armorbox"],[1,"open","lightmage"]],
    "lightmage": [[1,"hpot0"],[1,"mpot0"]],
    "weaponbox": [[1,"throwingstars"],[0.05,"harbringer"],[0.04,"oozingterror"],[1.4,"t2bow"],[1,"basher"],[1,"spear"],[1,"dagger"],[0.5,"pmace"],[1,"fireblade"],[0.8,"firestaff"],[0.8,"firebow"],[0.04,"t3bow"],[0.02,"hammer"],[0.1,"rapier"],[1,"sword"],[0.2,"crossbow"]],
    "jewellerybox": [[1,"hpamulet"],[1,"hpbelt"]],
    "quiver": [[1,"leather"],[0.5,"leather"]],
    "troll": [[100,"tshirt0"],[100,"tshirt1"],[100,"tshirt2"],[20,"tshirt3"],[10,"tshirt4"],[0.1,"tshirt88"],[1,"tshirt6"],[1,"tshirt7"],[0.8,"tshirt8"],[0.8,"tshirt9"],[0.0001,"luckyt"]],
    "skins": {"gold":[],"silver":["mwarrior_cool","mnwarrior"],"bronze":[],"normal":[]},
    "cosmo0": [[0.5,"cx","marmor10a"],[1,"cx","marmor10b"],[0.8333333333333334,"cx","marmor10c"],[1,"cx","marmor10g"],[1,"cx","marmor10h"],[1,"cx","marmor11a"],[0.5,"cx","marmor11b"],[1,"cx","marmor11c"],[0.5,"cx","marmor11d"],[0.5,"cx","marmor11e"],[1,"cx","marmor11f"],[1,"cx","marmor11g"],[1,"cx","marmor11h"],[0.5,"cx","marmor1b"],[0.5,"cx","marmor1c"],[1,"cx","marmor2a"],[1,"cx","marmor2b"],[0.2,"cx","marmor2e"],[0.5,"cx","marmor2f"],[1,"cx","marmor2g"],[0.1,"cx","marmor2h"],[1,"cx","marmor3a"],[1,"cx","marmor3b"],[1,"cx","marmor3c"],[1,"cx","marmor3d"],[1,"cx","marmor3g"],[1,"cx","marmor4c"],[1,"cx","marmor4d"],[0.3333333333333333,"cx","marmor4e"],[1,"cx","marmor4g"],[0.8333333333333334,"cx","marmor4h"],[0.1,"cx","marmor5b"],[1,"cx","marmor5c"],[1,"cx","marmor5f"],[1,"cx","marmor5g"],[1,"cx","marmor5h"],[0.3333333333333333,"cx","marmor5e"],[1,"cx","marmor6g"],[1,"cx","marmor6h"],[1,"cx","marmor7a"],[1,"cx","marmor7b"],[1,"cx","marmor7c"],[1,"cx","marmor7d"],[1,"cx","marmor7e"],[1,"cx","marmor7f"],[1,"cx","marmor7g"],[1,"cx","marmor7h"],[1,"cx","marmor8a"],[1,"cx","marmor8b"],[1,"cx","marmor8c"],[1,"cx","marmor8d"],[1,"cx","marmor8e"],[1,"cx","marmor8f"],[1,"cx","marmor8g"],[1,"cx","marmor8h"],[0.3333333333333333,"cx","marmor9a"],[0.2,"cx","marmor9b"],[1,"cx","marmor9c"],[1,"cx","marmor9d"],[0.1,"cx","marmor9e"],[0.1111111111111111,"cx","marmor9f"],[0.08333333333333333,"cx","marmor9g"],[0.3333333333333333,"cx","marmor9h"],[1,"cx","sarmor1a"],[1,"cx","sarmor1c"],[1,"cx","sarmor1d"],[1,"cx","sarmor1e"],[1,"cx","sarmor1f"],[1,"cx","sarmor1g"],[1,"cx","sarmor2a"],[1,"cx","sarmor2b"],[1,"cx","sarmor2c"],[0.03125,"cx","mbody1a"],[0.25,"cx","mbody1b"],[0.125,"cx","mbody1c"],[1,"cx","mbody1d"],[0.2,"cx","mbody1e"],[1,"cx","mbody1f"],[0.3333333333333333,"cx","mbody1g"],[1,"cx","mbody1h"],[1,"cx","mbody2a"],[1,"cx","mbody2d"],[1,"cx","mbody2e"],[0.05,"cx","mbody2f"],[0.08333333333333333,"cx","mbody3a"],[0.0625,"cx","mbody3b"],[0.020833333333333332,"cx","mbody3d"],[0.013888888888888888,"cx","mbody3e"],[0.8333333333333334,"cx","mbody4a"],[0.2,"cx","mbody4e"],[1,"cx","mbody4g"],[1,"cx","mbody4d"],[0.1,"cx","mbody4h"],[0.1,"cx","mbody5a"],[0.1,"cx","mbody5c"],[0.16666666666666666,"cx","mbody5d"],[0.1,"cx","mbody6a"],[1,"cx","sbody1d"],[1,"cx","sbody1e"],[0.08333333333333333,"cxbundle","pinkb"],[0.025,"cxbundle","blackw"]],
    "cosmo1": [[1,"cxbundle","headroundbrown"],[1,"cxbundle","headroundred"],[1,"cxbundle","headroundgold"],[1,"cxbundle","headroundgreen"],[1,"cxbundle","headroundblue"],[1,"cxbundle","headroundslate"],[1,"cxbundle","headroundpale"],[1,"cx","makeup130"],[1,"cxbundle","headsoftwarm"],[1,"cxbundle","headsoftbrown"],[1,"cxbundle","headsoftgold"],[1,"cxbundle","headsoftred"],[1,"cx","nfmakeup11"],[1,"cxbundle","headsoftbrightgreen"],[1,"cxbundle","headsoftmuted"],[1,"cxbundle","headbeards"],[1,"cxbundle","headaliens"],[1,"cxbundle","headorcs"],[1,"cxbundle","headfins"],[1,"cxbundle","headelves"],[1,"cxbundle","headmice"],[1,"cxbundle","headwolves"],[1,"cxbundle","headyetis"],[1,"cxbundle","headbones"],[1,"cx","makeup120"],[1,"cx","cyclops0"],[1,"cx","eyehead0"],[1,"cx","mimichead0"],[1,"cx","slimehead0"],[1,"cx","lanternhead0"],[1,"cx","lavaglasshead0"],[1,"cx","stormhead0"]],
    "cosmo2": [[1,"cx","hairdo100"],[1,"cx","hairdo101"],[1,"cx","hairdo102"],[1,"cx","hairdo103"],[1,"cx","hairdo104"],[1,"cx","hairdo105"],[1,"cx","hairdo106"],[1,"cx","hairdo107"],[1,"cx","hairdo108"],[1,"cx","hairdo109"],[1,"cx","hairdo110"],[1,"cx","hairdo111"],[1,"cx","hairdo112"],[1,"cx","hairdo113"],[1,"cx","hairdo114"],[1,"cx","hairdo115"],[1,"cx","hairdo116"],[1,"cx","hairdo117"],[1,"cx","hairdo118"],[1,"cx","hairdo119"],[1,"cx","hairdo120"],[1,"cx","hairdo121"],[1,"cx","hairdo123"],[1,"cx","hairdo124"],[1,"cx","hairdo200"],[1,"cx","hairdo201"],[1,"cx","hairdo202"],[1,"cx","hairdo204"],[1,"cx","hairdo205"],[1,"cx","hairdo206"],[1,"cx","hairdo207"],[1,"cx","hairdo208"],[1,"cx","hairdo209"],[1,"cx","hairdo210"],[1,"cx","hairdo211"],[1,"cx","hairdo212"],[1,"cx","hairdo213"],[1,"cx","hairdo214"],[1,"cx","hairdo215"],[1,"cx","hairdo216"],[1,"cx","hairdo217"],[1,"cx","hairdo218"],[1,"cx","hairdo219"],[1,"cx","hairdo220"],[1,"cx","hairdo221"],[1,"cx","hairdo222"],[1,"cx","hairdo223"],[1,"cx","hairdo224"],[1,"cx","hairdo300"],[1,"cx","hairdo301"],[1,"cx","hairdo302"],[1,"cx","hairdo303"],[1,"cx","hairdo304"],[1,"cx","hairdo305"],[1,"cx","hairdo306"],[1,"cx","hairdo307"],[1,"cx","hairdo308"],[1,"cx","hairdo309"],[1,"cx","hairdo310"],[1,"cx","hairdo311"],[1,"cx","hairdo312"],[1,"cx","hairdo313"],[1,"cx","hairdo314"],[1,"cx","hairdo315"],[1,"cx","hairdo316"],[1,"cx","hairdo317"],[1,"cx","hairdo318"],[1,"cx","hairdo319"],[1,"cx","hairdo320"],[1,"cx","hairdo321"],[1,"cx","hairdo322"],[1,"cx","hairdo323"],[1,"cx","hairdo324"],[1,"cx","hairdo400"],[1,"cx","hairdo401"],[1,"cx","hairdo402"],[1,"cx","hairdo403"],[1,"cx","hairdo405"],[1,"cx","hairdo406"],[1,"cx","hairdo407"],[1,"cx","hairdo408"],[1,"cx","hairdo409"],[1,"cx","hairdo410"],[1,"cx","hairdo411"],[1,"cx","hairdo412"],[1,"cx","hairdo413"],[1,"cx","hairdo414"],[1,"cx","hairdo415"],[1,"cx","hairdo416"],[1,"cx","hairdo417"],[1,"cx","hairdo418"],[1,"cx","hairdo419"],[1,"cx","hairdo420"],[1,"cx","hairdo421"],[1,"cx","hairdo422"],[1,"cx","hairdo423"],[1,"cx","hairdo424"],[1,"cx","hairdo500"],[1,"cx","hairdo501"],[1,"cx","hairdo502"],[1,"cx","hairdo503"],[1,"cx","hairdo504"],[1,"cx","hairdo505"],[1,"cx","hairdo506"],[1,"cx","hairdo507"],[1,"cx","hairdo508"],[1,"cx","hairdo509"],[1,"cx","hairdo510"],[1,"cx","hairdo511"],[1,"cx","hairdo512"],[1,"cx","hairdo513"],[1,"cx","hairdo514"],[1,"cx","hairdo515"],[1,"cx","hairdo516"],[1,"cx","hairdo517"],[1,"cx","hairdo518"],[1,"cx","hairdo519"],[1,"cx","hairdo520"],[1,"cx","hairdo521"],[1,"cx","hairdo600"],[1,"cx","hairdo601"],[1,"cx","hairdo602"],[1,"cx","hairdo603"],[1,"cx","hairdo604"],[1,"cx","hairdo605"],[0.5,"cx","hairdo122"],[0.3333333333333333,"cx","hairdo404"],[0.1,"cx","hairdo203"]],
    "cosmo3": [[1,"cx","hat101"],[1,"cx","hat103"],[1,"cx","hat104"],[1,"cx","hat105"],[1,"cx","hat107"],[1,"cx","hat108"],[1,"cx","hat109"],[1,"cx","hat110"],[1,"cx","hat111"],[1,"cx","hat112"],[1,"cx","hat200"],[1,"cx","hat201"],[1,"cx","hat202"],[1,"cx","hat203"],[1,"cx","hat204"],[1,"cx","hat205"],[1,"cx","hat206"],[1,"cx","hat207"],[1,"cx","hat208"],[1,"cx","hat209"],[1,"cx","hat210"],[1,"cx","hat211"],[1,"cx","hat212"],[1,"cx","hat213"],[1,"cx","hat214"],[1,"cx","hat215"],[1,"cx","hat216"],[1,"cx","hat217"],[1,"cx","hat218"],[1,"cx","hat219"],[1,"cx","hat220"],[1,"cx","hat221"],[1,"cx","hat222"],[1,"cx","hat223"],[1,"cx","hat224"],[1,"cx","hat300"],[1,"cx","hat301"],[1,"cx","hat302"],[1,"cx","hat303"],[1,"cx","hat304"],[1,"cx","hat305"],[1,"cx","hat306"],[1,"cx","hat307"],[1,"cx","hat308"],[1,"cx","hat311"],[1,"cx","hat312"],[1,"cx","hat313"],[1,"cx","hat314"],[1,"cx","hat315"],[1,"cx","hat316"],[1,"cx","hat317"],[1,"cx","hat319"],[1,"cx","hat320"],[1,"cx","hat321"],[1,"cx","hat322"],[1,"cx","hat323"],[1,"cx","hat401"],[1,"cx","hat402"],[1,"cx","hat403"],[1,"cx","hat404"],[1,"cx","hat406"],[1,"cx","hat407"],[0.5,"cx","hat106"],[0.3333333333333333,"cx","hat310"],[0.2,"cx","hat102"],[0.125,"cx","hat318"],[0.1,"cx","hat113"],[0.08333333333333333,"cx","hat309"],[0.08333333333333333,"cx","hat400"],[0.08333333333333333,"cx","hat405"]],
    "cosmo4": [[1,"open","cosmo4_face"],[1,"open","cosmo4_chin"],[1,"open","cosmo4_makeup"],[1,"open","cosmo4_back"],[1,"open","cosmo4_tail"]],
    "cosmo4_face": [[1,"cx","bwglasses"],[1,"cx","face100"],[1,"cx","face101"],[1,"cx","face102"],[1,"cx","face103"],[1,"cx","face104"],[1,"cx","face105"],[1,"cx","face106"],[1,"cx","face107"],[1,"cx","face108"],[1,"cx","face109"],[1,"cx","face110"],[1,"cx","tortoise_g"]],
    "cosmo4_chin": [[1,"cx","beard100"],[1,"cx","beard101"],[1,"cx","beard102"],[1,"cx","beard103"],[1,"cx","beard104"],[1,"cx","beard105"],[1,"cx","beard106"],[1,"cx","beard107"],[1,"cx","beard108"],[1,"cx","beard109"],[1,"cx","beard110"],[1,"cx","beard111"],[1,"cx","beard113"],[1,"cx","beard114"],[1,"cx","mask100"],[1,"cx","mask101"],[1,"cx","mask102"],[1,"cx","mask103"]],
    "cosmo4_makeup": [[1,"cx","bbeyes"],[1,"cx","facemakeup00"],[1,"cx","facemakeup01"],[1,"cx","facemakeup03"],[1,"cx","facemakeup04"],[1,"cx","facemakeup05"],[1,"cx","facemakeup06"],[1,"cx","facemakeup07"]],
    "cosmo4_back": [[1,"cx","backpacks00"],[1,"cx","backpacks01"],[1,"cx","backpacks02"],[1,"cx","backpacks03"],[1,"cx","backpacks04"],[1,"cx","backpacks200"],[1,"cx","backpacks201"],[1,"cx","wings100"],[1,"cx","wings101"],[1,"cx","wings103"],[1,"cx","wings104"],[1,"cx","wings300"],[1,"cx","wings301"],[1,"cx","wings302"],[1,"cx","wings303"],[1,"cx","wings304"]],
    "cosmo4_tail": [[1,"cx","tail100"],[1,"cx","tail200"],[1,"cx","tail300"]],
    "cosmo5": [[0.1,"cx","halo"],[1,"cx","gravestonea"],[1,"cx","xgravestone0"],[1,"cx","xgravestone1"],[0.1,"cx","xgravestone2"],[1,"cx","xgravestone3"],[1,"cx","xgravestone4"],[0.2,"cx","fart"],[1,"cx","wiggle"],[1,"cx","headwiggle"],[1,"cx","joy"],[1,"cx","jump"],[0.1,"cx","superjump"],[1,"cx","highfive"],[1,"cx","boop"],[0.35,"cx","spotlight"],[0.5,"cx","pocketstorm"],[0.1,"cx","mirrordance"]],
    "anniversary_legacy": [[1,"open","thrash"],[0.4,"cake"],[0.2,"poker"],[1,"confetti"],[0.8,"partyhat"],[0.1,"gift0"],[0.1,"open","armorbox"],[0.05,"ftrinket"],[0.006,"scroll3"],[0.006,"mysterybox"],[0.002,"offering"],[0.0003,"luckbooster"]],
    "sixcake": [[14.399999999999999,"candleward"],[14.399999999999999,"paradequiver"],[13.44,"homecominghelm"],[13.44,"homecomingcoat"],[13.44,"homecomingcape"],[9.6,"guestbook"],[9.6,"reunionbow"],[7.68,"keepsakependant"],[1,"cx","aniv0"],[1,"cx","aniv1"],[1,"cx","aniv2"],[1,"cx","aniv3"]],
    "cave_parcel": [[50,"cave_amber",1],[22,"cave_amber",2],[10,"scroll1"],[5,"gem1"],[2,"cave_locktooth"],[1,"cave_mothsteps"],[5,"cave_tunnelaxe"],[5,"cave_reedscythe"]],
    "cave_rescue": [[60,"cave_amber",2],[20,"cave_amber",3],[10,"gem1"],[3,"cave_counterweight"],[2,"cave_mothsteps"],[5,"cave_tunnelaxe"]],
    "cave_boss": [[55,"cave_amber",3],[15,"cave_locktooth"],[12,"cave_counterweight"],[8,"cave_mothsteps"],[10,"cave_tunnelaxe"]],
    "cave_finish": [[45,"cave_amber",5],[15,"cave_locktooth"],[15,"cave_counterweight"],[10,"cave_mothsteps"],[5,"cave_loaded_die"],[10,"cave_tunnelaxe"]],
    "cave_darkmage": [[1,"cave_blackstaff"]],
    "cave_rogue_weapon": [[1,"cave_backstabber"]],
    "cave_farm": [[57,"cave_amber",1],[20,"cave_amber",2],[10,"scroll1"],[3,"cave_locktooth"],[2,"cave_mothsteps"],[4,"cave_tunnelaxe"],[4,"cave_reedscythe"]],
    "cave_finish_bonus": [[0.001,"cave_deepaxe"],[0.001,"cave_ambercoat"]],
  },
  mapMonsters: {
    "cave": [{"type":"bat","count":6},{"type":"bat","count":7},{"type":"bat","count":8},{"type":"bat","count":5},{"type":"bat","count":2},{"type":"mvampire","count":1}],
    "main": [{"type":"crab","count":8},{"type":"squig","count":6},{"type":"squigtoad","count":2},{"type":"tortoise","count":6},{"type":"frog","count":2},{"type":"crabx","count":5},{"type":"target","count":1},{"type":"target_a500","count":1},{"type":"target_a750","count":1},{"type":"target_r500","count":1},{"type":"target_r750","count":1},{"type":"target_ar900","count":1},{"type":"target_ar500red","count":1},{"type":"goo","count":9},{"type":"bee","count":4},{"type":"bee","count":3},{"type":"bee","count":5},{"type":"bee","count":3},{"type":"bee","count":2},{"type":"poisio","count":5},{"type":"croc","count":6},{"type":"armadillo","count":6},{"type":"snake","count":6},{"type":"bigbird","count":5},{"type":"spider","count":7},{"type":"scorpion","count":6},{"type":"phoenix","count":1},{"type":"greenfairy","count":1},{"type":"redfairy","count":1},{"type":"bluefairy","count":1},{"type":"puppy1","count":1},{"type":"puppy2","count":1},{"type":"puppy3","count":1},{"type":"puppy4","count":1},{"type":"kitty1","count":1},{"type":"kitty2","count":1},{"type":"kitty3","count":1},{"type":"kitty4","count":1},{"type":"hen","count":2},{"type":"rooster","count":1}],
    "mansion": [{"type":"rat","count":5},{"type":"rat","count":3},{"type":"rat","count":3},{"type":"rat","count":3},{"type":"rat","count":3},{"type":"rat","count":3},{"type":"rat","count":4}],
    "jail": [{"type":"jrat","count":3}],
    "cyberland": [{"type":"mechagnome","count":1},{"type":"mechagnome","count":1},{"type":"mechagnome","count":1},{"type":"mechagnome","count":1}],
    "woffice": [{"type":"grinch","count":1}],
    "winter_cave": [{"type":"bbpompom","count":6},{"type":"bbpompom","count":7}],
    "winter_cove": [{"type":"rimedjinn","count":4},{"type":"harpy","count":5},{"type":"rharpy","count":1}],
    "winterland": [{"type":"stompy","count":1},{"type":"wolf","count":7},{"type":"arcticbee","count":10},{"type":"wolfie","count":4},{"type":"wolfie","count":3},{"type":"boar","count":8},{"type":"iceroamer","count":5},{"type":"iceroamer","count":4}],
    "desertland": [{"type":"plantoid","count":4},{"type":"plantoid","count":4},{"type":"porcupine","count":8},{"type":"ent","count":3},{"type":"fireroamer","count":4},{"type":"fireroamer","count":2},{"type":"gscorpion","count":6},{"type":"bscorpion","count":1}],
    "halloween": [{"type":"osnake","count":2},{"type":"osnake","count":4},{"type":"snake","count":9},{"type":"greenjr","count":1},{"type":"minimush","count":8},{"type":"mrpumpkin","count":1},{"type":"xscorpion","count":6},{"type":"snake","count":6},{"type":"osnake","count":2},{"type":"tinyp","count":1},{"type":"ghost","count":5},{"type":"ghost","count":5},{"type":"fvampire","count":1},{"type":"ghost","count":9}],
    "spookytown": [{"type":"mummy","count":9},{"type":"booboo","count":5},{"type":"booboo","count":4},{"type":"stoneworm","count":4},{"type":"stoneworm","count":4},{"type":"mrgreen","count":1},{"type":"jr","count":1}],
    "tunnel": [{"type":"mole","count":8},{"type":"mole","count":7}],
    "level1": [{"type":"prat","count":5},{"type":"prat","count":5}],
    "level2n": [{"type":"pppompom","count":6},{"type":"pppompom","count":7}],
    "level2e": [{"type":"pinkgoblin","count":3}],
    "level2s": [{"type":"cgoo","count":8}],
    "level2w": [{"type":"oneeye","count":5}],
    "level3": [{"type":"mummy","count":3},{"type":"bbpompom","count":4}],
    "level4": [{"type":"cgoo","count":6},{"type":"mummy","count":3}],
    "ucliffs": [{"type":"kobold","count":2},{"type":"kobold","count":2}],
    "uhills": [{"type":"sparkbot","count":4},{"type":"targetron","count":4}],
    "mforest": [{"type":"bluefairy","count":1},{"type":"greenfairy","count":1},{"type":"redfairy","count":1},{"type":"dryad","count":6},{"type":"odino","count":7}],
  },
};
  const MAIL_ENDPOINT = "/pi-account/mail";
  const ACTIVITY_ENDPOINT = "/pi-monitor/activity";
  const LAYOUT_KEY = "pi-script-dashboard-layout-v2";
  const SAFE_KEY_PATTERN = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2,}$/;
  const HIDDEN_KEY_PATTERN = /(session|pass|token|secret|auth|ticket|cookie|credential)/i;
  const MERCHANT_SETTINGS_KEY = "Character01MCH.MerchantConfigUI.settings";
  const MERCHANT_STATE_KEY = "Character01MCH.MerchantEvents.stateV3";
  const MERCHANT_ACTIVITY_KEY = "Character01MCH.MerchantActivityLog.entries";
  const MERCHANT_LOOT_KEY = "Character01MCH.MerchantConfigUI.lootRules";
  const MERCHANT_LOOT_LEGACY_PREFIX = "cstore_droid_merchant_v3_loot_rules_v1_";
  const MERCHANT_SETTINGS_LEGACY_KEYS = ["cstore_droid_merchant_v3_settings_v1", "cstore_droid_merchant_v2_settings_v1"];
  const MERCHANT_PONTY_LOG_KEY = "Character01MCH.MerchantPontyLog.entries";
  const MERCHANT_PONTY_EXPORT_TYPE = "adventureland-merchant-ponty-items";
  const MERCHANT_POSITIONS_KEY = "Character01MCH.MerchantConfigUI.windowPositions";
  const MERCHANT_LIVE_ENDPOINT = "/pi-merchant/Character01MCH/dashboard";
  const MERCHANT_STAND_ENDPOINT = "/pi-merchant/Character01MCH/stand";
  const MERCHANT_MARKET_ENDPOINT = "/pi-merchant/Character01MCH/market";
  const MERCHANT_MARKET_TRENDS_KEY = "CaracAL.MarketTrends.v1";
  const MERCHANT_SKILLS_ENDPOINT = "/pi-merchant/Character01MCH/skills";
  const MERCHANT_ACTION_ENDPOINT = "/pi-merchant/Character01MCH/action";
  const MERCHANT_LOOT_EXPORT_TYPE = "adventureland-merchant-loot-rules";
  const MERCHANT_HIDDEN_LOOT_ITEMS = new Set([
    "computer", "supercomputer", "tracker", "offering", "offeringp", "offeringgp",
    "hpot0", "hpot1", "mpot0", "mpot1", "elixirvit0", "hotchocolate",
    "scroll0", "scroll1", "scroll2", "cscroll0", "cscroll1", "cscroll2",
    "slice_strawberry", "slice_citrus", "slice_honey", "slice_mint", "slice_blueberry", "slice_nightberry",
    "sixcake", "anniversarygift", "gift0", "guestbook", "pendant", "stand0", "stand1",
  ]);
  const MERCHANT_GATHERING_TOOL_ITEMS = new Set(["rod", "goldrod", "slimerod", "pickaxe", "goldpickaxe"]);
  const MERCHANT_OPERATIONAL_LOOT_PANEL_ITEMS = new Set(["hpot0", "hpot1", "mpot0", "mpot1", "scroll0", "scroll1", "scroll2", "cscroll0", "cscroll1", "cscroll2"]);
  const TRIO_CONTROL_KEY = "Character01MCH.Trio.dashboardControl";
  const TRIO_RUNTIME_KEY = "Character01MCH.TrioRuntime.runtime";
  const TRIO_RUNTIME_STATUS_KEY = "Character01MCH.TrioRuntime.status";
  const TRIO_RUNTIME_CONTROL_KEY = "Character01MCH.TrioRuntime.controlRequest";
  const TRIO_INVENTORY_CONTROL_KEY = "Character01MCH.MerchantTrioUI.inventoryControlRequest";
  const TRIO_WINDOW_SCALE_KEY = "Character01MCH.MerchantTrioUI.windowScale";
  const TRIO_WATCHDOG_STATE_KEY = "Character01MCH.TrioRuntime.watchdogState";
  const TRIO_WATCHDOG_LOG_KEY = "Character01MCH.TrioRuntime.watchdogLog";
  const MERCHANT_SETTINGS_APPLY_KEY = "Character01MCH.CaracAL.settingsApplyRequest";
  const MAX_STATE_AGE = 60000;
  const SPRITE_ORIGIN = "https://adventure.land";
  const TEAM = [
    { name: "Character07", role: "WAR", color: "#ff6666" },
    { name: "Character02", role: "CLR", color: "#66dd66" },
    { name: "Character05", role: "RNG", color: "#66aaff" },
    { name: "Character01MCH", role: "MCH", color: "#e8bb55" },
  ];

  // Kept in lockstep with MERCHANT_TRIO_OPTION_GROUPS in LootPolicy.10.js.
  const TRIO_OPTION_GROUPS = [
    { title: "Training and safety", fields: [
      { key: "minMonsterXp", label: "Minimum monster XP", min: 0, max: 10000000, step: 10 },
      { key: "maxMonsterAttack", label: "Maximum monster ATK", min: 0, max: 1000000, step: 10 },
      { key: "preferredKillSeconds", label: "Preferred kill time", min: 0.1, max: 120, step: 0.1, unit: "sec" },
      { key: "maxQuickKillSeconds", label: "Maximum kill time", min: 0.1, max: 600, step: 0.5, unit: "sec" },
      { key: "minimumKillsBeforePromotion", label: "Kills before promotion", min: 1, max: 1000, step: 1, integer: true },
      { key: "maximumProgressionHpMultiplier", label: "Maximum HP step-up", min: 1, max: 100, step: 0.5, unit: "x" },
      { key: "requiredReadyMembers", label: "Members needed to promote", min: 1, max: 3, step: 1, integer: true },
      { key: "minimumCombatMembers", label: "Members needed to fight", min: 1, max: 3, step: 1, integer: true },
      { key: "allowMultiTargetSkills", label: "Allow multi-target attacks", type: "boolean" },
    ]},
    { title: "Healing and potions", fields: [
      { key: "minimumPullHpRatio", label: "Warrior HP needed for a new pull", min: 25, max: 100, step: 1, factor: 0.01, unit: "%" },
      { key: "priestHealingDutyFraction", label: "Priest time reserved for healing", min: 10, max: 90, step: 5, factor: 0.01, unit: "%" },
      { key: "priestMinimumHealCasts", label: "Minimum healing casts in reserve", min: 1, max: 100, step: 1, integer: true },
      { key: "healBelow", label: "Priest heals below", min: 1, max: 100, step: 1, factor: 0.01, unit: "%" },
      { key: "priestHealingReserveMp", label: "MP reserved for healing", min: 0, max: 100000, step: 50, integer: true },
      { key: "allowPriestAbsorb", label: "Allow Priest to absorb aggro", type: "boolean" },
      { key: "potionHpBelow", label: "Use HP potion below", min: 1, max: 100, step: 1, factor: 0.01, unit: "%" },
      { key: "potionMpBelow", label: "Use MP potion below", min: 1, max: 100, step: 1, factor: 0.01, unit: "%" },
      { key: "retreatBelow", label: "Retreat below HP", min: 1, max: 100, step: 1, factor: 0.01, unit: "%" },
      { key: "potionRestockAt", label: "Restock at or below", min: 0, max: 9999, step: 1, integer: true },
      { key: "potionTarget", label: "Restock both up to", min: 0, max: 9999, step: 1, integer: true },
      { key: "courierEnabled", label: "Use merchant courier", type: "boolean" },
      { key: "autoEquipCourierUpgrades", label: "Equip clear merchant upgrades", type: "boolean" },
      { key: "courierMaxServiceMs", label: "Maximum service pause", min: 10, max: 180, step: 5, factor: 1000, unit: "sec" },
      { key: "courierCriticalPotionCount", label: "Self-restock at or below", min: 0, max: 500, step: 1, integer: true },
      { key: "courierTopOffTolerance", label: "Minimum courier restock batch", min: 500, max: 5000, step: 100, integer: true, unit: "pots" },
      { key: "courierCraftingContributionLimit", label: "Maximum crafting contribution per visit", min: 0, max: 1000000, step: 1000, integer: true },
    ]},
    { title: "Party and movement", fields: [
      { key: "reassessEveryMs", label: "Reassess target every", min: 1, max: 600, step: 1, factor: 1000, unit: "sec" },
      { key: "teammateTimeoutMs", label: "Teammate timeout", min: 5, max: 600, step: 1, factor: 1000, unit: "sec" },
      { key: "followDistance", label: "Follow distance", min: 10, max: 1000, step: 10 },
      { key: "directMoveCooldownMs", label: "Direct-move cooldown", min: 0, max: 10, step: 0.1, factor: 1000, unit: "sec" },
      { key: "travelRetryMs", label: "Travel retry delay", min: 0.25, max: 120, step: 0.25, factor: 1000, unit: "sec" },
      { key: "autoJoinWarriorServer", label: "Auto-join Warrior server", type: "boolean" },
    ]},
    { title: "Maintenance", fields: [
      { key: "maintenanceEveryMs", label: "Maintenance interval", min: 1, max: 1440, step: 1, factor: 60000, unit: "min" },
      { key: "maintenanceGoldReserve", label: "Gold reserve", min: 0, max: 1000000000000, step: 1000, integer: true },
      { key: "maintenanceMinUpgradeChance", label: "Minimum upgrade/compound chance", min: 0, max: 100, step: 1, factor: 0.01, unit: "%" },
      { key: "maintenanceMaxUpgradeLevel", label: "Maximum upgrade level", min: 0, max: 12, step: 1, integer: true },
      { key: "maintenanceMaxCompoundLevel", label: "Maximum compound level", min: 0, max: 12, step: 1, integer: true },
      { key: "starterUpgradeLevel", label: "Starter gear level", min: 0, max: 12, step: 1, integer: true },
      { key: "sellJunkDuringMaintenance", label: "Sell junk during maintenance", type: "boolean" },
      { key: "junkSellMinValue", label: "Minimum junk value", min: 0, max: 1000000000, step: 1, integer: true },
    ]},
    { title: "Monster hunts", fields: [
      { key: "monsterHuntsEnabled", label: "Take Daisy's Monster Hunts", type: "boolean" },
      { key: "monsterHuntMaxMs", label: "Longest hunt to attempt", min: 5, max: 28, step: 1, factor: 60000, unit: "min" },
    ]},
  ];
  const TRIO_DEFAULTS = {
    minMonsterXp: 100, maxMonsterAttack: 300, preferredKillSeconds: 2.5, maxQuickKillSeconds: 45,
    minimumKillsBeforePromotion: 5, maximumProgressionHpMultiplier: 8, requiredReadyMembers: 3,
    minimumCombatMembers: 2, allowMultiTargetSkills: false, minimumPullHpRatio: 0.70,
    priestHealingDutyFraction: 0.40, priestMinimumHealCasts: 3, healBelow: 0.90,
    priestHealingReserveMp: 400, allowPriestAbsorb: false, potionHpBelow: 0.70, potionMpBelow: 0.80,
    retreatBelow: 0.22, potionRestockAt: 4500, potionTarget: 5000, courierEnabled: true,
    autoEquipCourierUpgrades: true, courierMaxServiceMs: 45000,
    courierCriticalPotionCount: 10, courierTopOffTolerance: 500, courierCraftingContributionLimit: 0,
    reassessEveryMs: 15000, teammateTimeoutMs: 60000, followDistance: 180,
    directMoveCooldownMs: 400, travelRetryMs: 5000, autoJoinWarriorServer: true,
    maintenanceEveryMs: 900000, maintenanceGoldReserve: 50000, maintenanceMinUpgradeChance: 0.95,
    maintenanceMaxUpgradeLevel: 5, maintenanceMaxCompoundLevel: 5, starterUpgradeLevel: 1,
    sellJunkDuringMaintenance: true, junkSellMinValue: 1, monsterHuntsEnabled: false, monsterHuntMaxMs: 1320000,
  };
  // These dashboards contain controls whose DOM must remain stable while the
  // user is editing. Rebuilding one of them replaces the user's focused input
  // and discards changes that have not been applied yet.
  const EDITABLE_DASHBOARDS = new Set([
    "merchant-config", "merchant-settings", "merchant-loot", "merchant-upgrade",
    "merchant-ponty", "merchant-anniversary", "trio-options", "trio-hunt",
    "trio-runtime", "script-storage",
  ]);
  // These views use versioned cached game data rather than a live heartbeat.
  // Keep them stable while open so search input and inspection dialogs survive
  // the dashboard-wide polling loop. Their explicit Refresh controls remain available.
  const STATIC_DASHBOARDS = new Set(["catalog", "bestiary"]);
  let dashboardWindowSequence = 0;
  let dashboardWindowZIndex = 2147483000;
  let activeDashboard = null;
  let activeSnapshot = null;
  const refreshTimers = new WeakMap();
  let settingsDirty = false;
  let trioInventoryScale = 0.7;
  let storageEditorKey = "";
  let trioGameData = { version: null, monsters: [], bestiary: [], items: [], dropInfo: [], skills: [], classes: [], bossTiers: [] };
  let trioGameDataPromise = null;
  let merchantLiveState = null;
  let merchantStandState = null;
  let merchantMarketState = null;
  let merchantMarketView = "listings";
  let merchantMarketTrends = null;
  let merchantMarketTrendsDirty = false;
  let merchantMarketTrendsRevision = 0;
  let merchantMarketTrendsLastAttemptAt = 0;
  let merchantMarketTrendsSaveError = "";
  let merchantMarketTrendsSavePromise = null;
  let merchantSkillsState = null;
  let mailState = { messages: [], count: 0, updatedAt: null, error: null };
  let activityState = { characters: {}, updatedAt: 0 };
  let merchantActivityFilter = "all";
  let merchantActivityCharacter = "all";
  let merchantActivitySearch = "";
  let merchantLootTab = "all";
  let merchantLootPolicyFilters = { auto: true, keep: true, bank: true, sell: true, upgrade: true };
  let merchantLootDraft = {};
  let merchantPontySearch = "";
  let merchantPontyDraft = null;
  let merchantPontyDraftScanAll = false;
  let merchantPontyView = "items";
  let trioHuntSubView = "quick";
  let bestiaryInitialSelection = "";
  let merchantPontyLogFilter = "all";
  let merchantPontyLogClearArmedAt = 0;
  let merchantUpgradeDraft = null;
  let selectedSkillId = null;

  const parseJson = (raw) => { if (typeof raw !== "string") return raw; try { return JSON.parse(raw); } catch (_) { return raw; } };
  const clone = (value) => { if (value === undefined) return undefined; try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } };
  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const getPath = (value, path) => path.split(".").reduce((current, part) => current == null ? undefined : current[part], value);
  function setPath(value, path, nextValue) { const parts = path.split("."); let cursor = value; parts.slice(0, -1).forEach((part) => { if (!isObject(cursor[part])) cursor[part] = {}; cursor = cursor[part]; }); cursor[parts[parts.length - 1]] = nextValue; }
  const safeText = (value) => String(value ?? "");
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const formatNumber = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "—";
  const timestamp = (value) => { if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value === "string") { const numeric = Number(value); if (Number.isFinite(numeric)) return numeric; const parsed = Date.parse(value); if (Number.isFinite(parsed)) return parsed; } return Number.NaN; };
  const formatTime = (value) => Number.isFinite(timestamp(value)) ? new Date(timestamp(value)).toLocaleTimeString() : "—";
  const fresh = (state, age = MAX_STATE_AGE) => !!(state && timestamp(state.updatedAt) && Date.now() - timestamp(state.updatedAt) <= age);
  const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

  function visibleEntries(snapshot) { return Object.entries((snapshot && snapshot.entries) || {}).filter(([key]) => SAFE_KEY_PATTERN.test(key) && !HIDDEN_KEY_PATTERN.test(key)).map(([key, raw]) => ({ key, raw, value: parseJson(raw) })).sort((a, b) => a.key.localeCompare(b.key)); }
  function merchantStorageEntries(primary, suffix, legacyMatcher) {
    const result = [];
    const seen = new Set();
    const add = (item) => { if (item && !seen.has(item.key)) { seen.add(item.key); result.push(item); } };
    add(entry(primary));
    visibleEntries(activeSnapshot).filter((item) => item.key.endsWith(suffix)).forEach(add);
    if (legacyMatcher) {
      Object.entries((activeSnapshot && activeSnapshot.entries) || {})
        .filter(([key]) => !HIDDEN_KEY_PATTERN.test(key) && legacyMatcher(key))
        .map(([key, raw]) => ({ key, raw, value: parseJson(raw) }))
        .sort((a, b) => a.key.localeCompare(b.key))
        .forEach(add);
    }
    return result;
  }
  function merchantStorageEntry(primary, suffix, legacyMatcher) {
    return merchantStorageEntries(primary, suffix, legacyMatcher)[0] || null;
  }
  function entry(key) { return visibleEntries(activeSnapshot).find((item) => item.key === key) || null; }
  function entrySuffix(suffix) { const entries = visibleEntries(activeSnapshot).filter((item) => item.key.endsWith(suffix)); return entries.find((item) => item.key.startsWith("Character01")) || entries[0] || null; }
  function publisherEntry(name, record, fallback = []) { return entry(name + ".CaracAL." + record) || fallback.map((key) => entry(key)).find(Boolean) || null; }
  function stateFor(name) { const item = entry(name === "Character01MCH" ? MERCHANT_STATE_KEY : name + ".Trio.state"); return isObject(item?.value) ? item.value : {}; }
  function trioRosterStatus() {
    const value = entry(TRIO_RUNTIME_STATUS_KEY)?.value;
    return isObject(value) && Date.now() - timestamp(value.updatedAt) <= 15000 ? value : null;
  }
  function trioMemberDefinition(name) {
    const configured = TEAM.find((member) => member.name === name);
    if (configured) return configured;
    const state = stateFor(name);
    return { name, role: String(state.ctype || "rogue").toUpperCase().slice(0, 3), color: "#c58cff" };
  }
  function activeTrioTeam() {
    const published = trioRosterStatus();
    let names = Array.isArray(published?.activeTeam) ? published.activeTeam : null;
    if (!names) {
      names = TEAM.slice(0, 3).map((member) => member.name);
      const presence = entry("Character01MCH.CrabFarm.presence")?.value;
      const presenceAt = timestamp(presence?.updatedAt);
      if (isObject(presence) && presence.mode === "trio" && presence.ctype === "rogue" &&
          typeof presence.name === "string" && /^[A-Za-z0-9]{1,32}$/.test(presence.name) &&
          Number.isFinite(presenceAt) && Date.now() - presenceAt <= 90000 &&
          presence.name !== "Character01MCH" && !TEAM.some((member) => member.name === presence.name)) {
        const ranger = stateFor(TEAM[2].name);
        const rangerAt = timestamp(ranger.updatedAt);
        const rangerFresh = Number.isFinite(rangerAt) && Date.now() - rangerAt <= 90000 && ranger.runtimeActive !== false;
        if (rangerFresh) names.push(presence.name);
        else names[2] = presence.name;
      }
    }
    const safeNames = names.filter((name, index) => typeof name === "string" && /^[A-Za-z0-9]{1,32}$/.test(name) &&
      name !== "Character01MCH" && names.indexOf(name) === index).slice(0, 4);
    return safeNames.map(trioMemberDefinition);
  }
  function characterStateFor(name) {
    const record = publisherEntry(name, "Dashboard.v2");
    const dashboard = isObject(record?.value) ? record.value : null;
    if (!dashboard) return stateFor(name);
    const identity = dashboard.identity || {};
    const location = dashboard.location || {};
    const vitals = dashboard.vitals || {};
    const status = dashboard.status || {};
    const target = dashboard.target || {};
    return {
      ...dashboard,
      name: identity.name || dashboard.characterName || name,
      role: identity.class || identity.ctype,
      ctype: identity.ctype || identity.class,
      skin: identity.skin || dashboard.skin,
      cx: Array.isArray(identity.cx) ? identity.cx : (Array.isArray(dashboard.cx) ? dashboard.cx : []),
      level: identity.level,
      hp: vitals.hp,
      max_hp: vitals.maxHp,
      mp: vitals.mp,
      max_mp: vitals.maxMp,
      partyShare: dashboard.partyShare ?? vitals.partyShare ?? stateFor(name).partyShare,
      xp: vitals.xp,
      max_xp: vitals.maxXp,
      map: location.map,
      x: location.x,
      y: location.y,
      rip: dashboard.rip,
      scriptPaused: status.paused,
      phase: status.phase,
      currentAction: status.currentAction,
      targetName: target.name,
      targetType: target.type,
    };
  }
  async function readSnapshot() { const response = await fetch(STORAGE_ENDPOINT, { cache: "no-store" }); const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.ok) throw new Error(payload.error || "Shared script storage is unavailable"); return payload; }
  async function readMerchantLiveState() {
    const response = await fetch(MERCHANT_LIVE_ENDPOINT, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "The live merchant runtime is unavailable");
    merchantLiveState = payload.state || payload;
    return merchantLiveState;
  }
  async function readMerchantStandState(force = false) {
    const stored = entry("CaracAL.Stand.v1") || entry("Character01MCH.CaracAL.Stand.v1");
    if (!force && isObject(stored?.value)) {
      const value = stored.value;
      merchantStandState = { ...value, character: value.owner || "Character01MCH", stand: value.open ? "Open" : "Closed", ownItems: Array.isArray(value.listings) ? value.listings : [] };
      return merchantStandState;
    }
    const response = await fetch(MERCHANT_STAND_ENDPOINT, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "The live merchant stand is unavailable");
    merchantStandState = payload;
    return merchantStandState;
  }
  async function readMerchantMarketState(force = false) {
    const stored = entry("CaracAL.Market.v1") || entry("Character01MCH.CaracAL.Market.v1");
    if (!force && isObject(stored?.value)) {
      const value = stored.value;
      const groups = new Map();
      (Array.isArray(value.listings) ? value.listings : []).forEach((listing) => {
        const key = [listing.seller, listing.map, listing.x, listing.y].join("\u0000");
        const group = groups.get(key) || { name: listing.seller || "Player stand", map: listing.map, x: listing.x, y: listing.y, listings: [] };
         group.id = listing.ownerId || group.id || null;
         group.listings.push({ ...(listing.item || {}), slot: listing.slot, rid: listing.rid || null, ownerId: listing.ownerId || group.id || null, price: listing.price, pricePerItem: listing.pricePerItem, side: listing.side, seller: listing.seller });
        groups.set(key, group);
      });
      merchantMarketState = { ...value, playerStands: Array.from(groups.values()), visibleStandCount: groups.size, live: true };
      await observeMerchantMarketTrends(merchantMarketState);
      return merchantMarketState;
    }
    const response = await fetch(MERCHANT_MARKET_ENDPOINT, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "The live player market is unavailable");
    merchantMarketState = payload;
    await observeMerchantMarketTrends(merchantMarketState);
    return merchantMarketState;
  }
  function marketTrendTimestamp(value) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  function emptyMerchantMarketTrends() {
    return { schema: "CaracAL.MarketTrends.v1", version: 1, updatedAt: 0, items: {} };
  }
  function parseMerchantMarketTrends(value) {
    let parsed = value;
    if (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch (_) { parsed = null; }
    }
    if (!isObject(parsed) || !isObject(parsed.items)) return emptyMerchantMarketTrends();
    return {
      schema: "CaracAL.MarketTrends.v1",
      version: 1,
      updatedAt: marketTrendTimestamp(parsed.updatedAt) || 0,
      items: parsed.items,
    };
  }
  function mergeMerchantMarketTrends(leftValue, rightValue) {
    const left = parseMerchantMarketTrends(leftValue);
    const right = parseMerchantMarketTrends(rightValue);
    const items = { ...left.items };
    Object.entries(right.items).forEach(([key, incoming]) => {
      if (!isObject(incoming)) return;
      const previous = items[key];
      if (!isObject(previous)) { items[key] = incoming; return; }
      const previousLastSeen = marketTrendTimestamp(previous.lastSeenAt) || 0;
      const incomingLastSeen = marketTrendTimestamp(incoming.lastSeenAt) || 0;
      const latest = incomingLastSeen >= previousLastSeen ? incoming : previous;
      const lowValues = [Number(previous.lowestPrice), Number(incoming.lowestPrice)].filter((value) => Number.isFinite(value) && value >= 0);
      const highValues = [Number(previous.highestPrice), Number(incoming.highestPrice)].filter((value) => Number.isFinite(value) && value >= 0);
      const firstSeenValues = [marketTrendTimestamp(previous.firstSeenAt), marketTrendTimestamp(incoming.firstSeenAt)].filter((value) => Number.isFinite(value) && value > 0);
      items[key] = {
        ...previous,
        ...latest,
        lowestPrice: lowValues.length ? Math.min(...lowValues) : null,
        highestPrice: highValues.length ? Math.max(...highValues) : null,
        firstSeenAt: firstSeenValues.length ? Math.min(...firstSeenValues) : null,
        lastSeenAt: Math.max(previousLastSeen, incomingLastSeen),
        lastSampleAt: Math.max(marketTrendTimestamp(previous.lastSampleAt) || 0, marketTrendTimestamp(incoming.lastSampleAt) || 0),
        samples: Math.max(Number(previous.samples) || 0, Number(incoming.samples) || 0),
      };
    });
    return {
      schema: "CaracAL.MarketTrends.v1",
      version: 1,
      updatedAt: Math.max(left.updatedAt, right.updatedAt),
      items,
    };
  }
  async function persistMerchantMarketTrends() {
    if (!merchantMarketTrends || merchantMarketTrendsSavePromise) return merchantMarketTrendsSavePromise;
    const saveAt = Date.now();
    const revision = merchantMarketTrendsRevision;
    const store = { ...merchantMarketTrends, updatedAt: saveAt };
    const body = JSON.stringify({ set: { [MERCHANT_MARKET_TRENDS_KEY]: JSON.stringify(store) } });
    merchantMarketTrendsLastAttemptAt = saveAt;
    const write = (async () => {
      try {
        const response = await fetch(SYNC_ENDPOINT, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Shared market trend storage is unavailable");
        activeSnapshot = payload;
        const stored = entry(MERCHANT_MARKET_TRENDS_KEY);
        merchantMarketTrends = mergeMerchantMarketTrends(store, stored?.value);
        if (merchantMarketTrendsRevision === revision) merchantMarketTrendsDirty = false;
        merchantMarketTrendsSaveError = "";
        return true;
      } catch (error) {
        merchantMarketTrendsSaveError = error?.message || "Market trend history could not be saved";
        return false;
      }
    })();
    merchantMarketTrendsSavePromise = write;
    const saved = await write;
    if (merchantMarketTrendsSavePromise === write) merchantMarketTrendsSavePromise = null;
    return saved;
  }
  async function observeMerchantMarketTrends(state) {
    if (!isObject(state)) return;
    const stored = entry(MERCHANT_MARKET_TRENDS_KEY);
    merchantMarketTrends = mergeMerchantMarketTrends(merchantMarketTrends, stored?.value);
    const updatedAt = marketTrendTimestamp(state.updatedAt) || Date.now();
    const serverRegion = String(state.server?.region || state.serverRegion || "");
    const serverId = String(state.server?.id || state.serverId || "");
    const observations = new Map();
    (Array.isArray(state.playerStands) ? state.playerStands : []).forEach((stand) => {
      (Array.isArray(stand?.listings) ? stand.listings : []).forEach((listing) => {
        const name = String(listing?.name || "").trim();
        if (!name || listing.giveaway) return;
        const level = Math.max(0, Number(listing.level) || 0);
        const side = String(listing.side || (listing.buyerOnly || listing.b ? "BUY" : "SELL")).toUpperCase();
        const currency = String(listing.currency || "gold");
        const sourcePrice = listing.price === null || listing.price === undefined ? Number.NaN : Number(listing.price);
        const explicitPrice = listing.pricePerItem === null || listing.pricePerItem === undefined ? Number.NaN : Number(listing.pricePerItem);
        const listedPrice = Number.isFinite(explicitPrice) && explicitPrice >= 0
          ? explicitPrice
          : Number.isFinite(sourcePrice) && sourcePrice >= 0
            ? sourcePrice
            : Number.NaN;
        if (!Number.isFinite(listedPrice)) return;
        const key = JSON.stringify([serverRegion, serverId, name, level, side, currency]);
        const row = observations.get(key) || {
          name, level, side, currency, serverRegion, serverId,
          lowestPrice: listedPrice,
          highestPrice: listedPrice,
          bestPrice: listedPrice,
          map: String(stand.map || listing.map || state.map || ""),
        };
        row.lowestPrice = Math.min(row.lowestPrice, listedPrice);
        row.highestPrice = Math.max(row.highestPrice, listedPrice);
        if ((side === "BUY" && listedPrice > row.bestPrice) || (side !== "BUY" && listedPrice < row.bestPrice)) row.bestPrice = listedPrice;
        observations.set(key, row);
      });
    });
    let changed = false;
    let importantChange = false;
    observations.forEach((observation, key) => {
      const previous = merchantMarketTrends.items[key];
      const oldLastSeen = marketTrendTimestamp(previous?.lastSeenAt) || 0;
      const oldLow = Number(previous?.lowestPrice);
      const oldHigh = Number(previous?.highestPrice);
      const oldLastPrice = Number(previous?.lastPrice);
      const lowestPrice = previous && Number.isFinite(oldLow) ? Math.min(oldLow, observation.lowestPrice) : observation.lowestPrice;
      const highestPrice = previous && Number.isFinite(oldHigh) ? Math.max(oldHigh, observation.highestPrice) : observation.highestPrice;
      const newObservation = !previous || updatedAt > oldLastSeen;
      const lastSeenAt = Math.max(oldLastSeen, updatedAt);
      const latestPrice = updatedAt >= oldLastSeen ? observation.bestPrice : oldLastPrice;
      const record = {
        name: observation.name,
        level: observation.level,
        side: observation.side,
        currency: observation.currency,
        serverRegion: observation.serverRegion,
        serverId: observation.serverId,
        map: updatedAt >= oldLastSeen ? observation.map : previous?.map || "",
        lastPrice: Number.isFinite(latestPrice) ? latestPrice : observation.bestPrice,
        lowestPrice,
        highestPrice,
        firstSeenAt: Math.min(marketTrendTimestamp(previous?.firstSeenAt) || updatedAt, updatedAt),
        lastSeenAt,
        lastSampleAt: newObservation ? updatedAt : marketTrendTimestamp(previous?.lastSampleAt) || updatedAt,
        samples: (Number(previous?.samples) || 0) + (newObservation ? 1 : 0),
      };
      if (!previous || newObservation || lowestPrice !== oldLow || highestPrice !== oldHigh || record.lastPrice !== oldLastPrice) changed = true;
      if (!previous || lowestPrice !== oldLow || highestPrice !== oldHigh) importantChange = true;
      merchantMarketTrends.items[key] = record;
    });
    if (changed) {
      merchantMarketTrendsDirty = true;
      merchantMarketTrendsRevision += 1;
    }
    const now = Date.now();
    const lastSavedAt = marketTrendTimestamp(merchantMarketTrends.updatedAt) || 0;
    const retryAfterFailure = !!merchantMarketTrendsSaveError && now - merchantMarketTrendsLastAttemptAt >= 30000;
    if (merchantMarketTrendsDirty && (importantChange || now - lastSavedAt >= 60000 || retryAfterFailure)) {
      await persistMerchantMarketTrends();
    }
  }
  async function readMerchantSkillsState() {
    const response = await fetch(MERCHANT_SKILLS_ENDPOINT, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "The live merchant skills catalog is unavailable");
    merchantSkillsState = payload;
    return merchantSkillsState;
  }
  async function sendMerchantAction(panel, action, payload = {}) {
    try {
      statusNode(panel, "Sending " + action.toUpperCase() + " to the active merchant...");
      const response = await fetch(MERCHANT_ACTION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "The merchant action was rejected");
       statusNode(panel, action.toUpperCase() + " was accepted by CaracAL.");
       if (action === "mail") await readMail(true).catch(() => {});
       if (action === "stand") await readMerchantStandState(true).catch(() => {});
       if (action === "market") await readMerchantMarketState(true).catch(() => {});
       merchantLiveState = await readMerchantLiveState().catch(() => merchantLiveState);
       renderActive(panel);
    } catch (error) {
      statusNode(panel, error.message || "The merchant action failed.", true);
    }
  }
  async function writeEntries(set) {
    const serialized = {};
    Object.entries(set || {}).forEach(([key, value]) => { if (SAFE_KEY_PATTERN.test(key) && !HIDDEN_KEY_PATTERN.test(key)) serialized[key] = JSON.stringify(value); });
    const response = await fetch(SYNC_ENDPOINT, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ set: serialized }), cache: "no-store" });
    const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.ok) throw new Error(payload.error || "Shared script storage rejected the update"); activeSnapshot = payload; return payload;
  }
  async function clearAllStorage(panel, button) {
    if (!window.confirm("Stop every CaracAL+ client and permanently clear all shared localStorage records?")) return;
    button.disabled = true;
    try {
      statusNode(panel, "Stopping all CaracAL+ clients and clearing shared localStorage...", false, false);
      const response = await fetch(CLEAR_STORAGE_ENDPOINT, {
        method: "POST",
        headers: { accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const responseText = await response.text();
      let payload = {};
      try { payload = responseText ? JSON.parse(responseText) : {}; } catch (_) {}
      if (response.status === 401 || response.status === 403) throw new Error("Your CaracAL session has expired. Sign in again to clear storage.");
      if (!response.ok || !payload.ok) throw new Error(payload.error || `The Pi returned HTTP ${response.status} while clearing storage`);
      activeSnapshot = payload;
      storageEditorKey = "";
      settingsDirty = false;
      renderActive(panel);
      statusNode(panel, `Completed: stopped ${Number(payload.stoppedCount) || 0} CaracAL+ client(s) and cleared ${Number(payload.clearedCount) || 0} localStorage record(s).`);
    } catch (error) {
      statusNode(panel, error.message || "Unable to stop clients and clear shared localStorage.", true);
    } finally {
      button.disabled = false;
    }
  }
  async function readTrioGameData() {
    if (trioGameDataPromise) return trioGameDataPromise;
    trioGameDataPromise = fetch(GAME_DATA_ENDPOINT, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Cached game data is unavailable");
      trioGameData = payload;
      return payload;
    }).finally(() => { trioGameDataPromise = null; });
    return trioGameDataPromise;
  }
  async function readMail(force = false) {
    const stored = entry("CaracAL.Mail.v1") || entry("Character01MCH.CaracAL.Mail.v1");
    if (!force && isObject(stored?.value)) {
      const value = stored.value;
      mailState = { ...value, count: Number(value.unreadCount) || 0, messages: Array.isArray(value.messages) ? value.messages : [], error: value.unavailableReason || null };
      return mailState;
    }
    const response = await fetch(MAIL_ENDPOINT, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "The server-side mail inbox is unavailable");
    mailState = payload;
    return mailState;
  }
  async function readActivity() {
    const response = await fetch(ACTIVITY_ENDPOINT, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "The server-side activity log is unavailable");
    activityState = payload;
    return activityState;
  }
  function make(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => { if (key === "class") node.className = value; else if (key === "text") node.textContent = value; else if (key === "style") Object.assign(node.style, value); else if (key.startsWith("data-")) node.setAttribute(key, value); else if (key in node) node[key] = value; else node.setAttribute(key, value); });
    children.flat().forEach((child) => { if (child !== undefined && child !== null) node.append(child.nodeType ? child : document.createTextNode(String(child))); }); return node;
  }
  function gameCatalogItem(name) {
    const key = String(name || "");
    if (!key) return null;
    return (Array.isArray(trioGameData.items) ? trioGameData.items : []).find((item) => String(item?.id || "") === key || String(item?.name || "") === key) || null;
  }
  function resolveGameSkin(skin, actual = null) {
    const requested = String(skin || "");
    const itemName = String(actual?.name || "");
    if (requested && window.G?.positions?.[requested]) return requested;
    const requestedCatalog = gameCatalogItem(requested);
    const actualCatalog = gameCatalogItem(itemName);
    return String(requestedCatalog?.skin || actualCatalog?.skin || requested || itemName);
  }
  function normalizeGameMarkupImages(root) {
    root.querySelectorAll("img").forEach((image) => {
      const source = image.getAttribute("src") || "";
      if (!source || /^(?:data:|blob:)/i.test(source)) return;
      try {
        const resolved = new URL(source, `${SPRITE_ORIGIN}/`);
        if (/^\/images\//i.test(resolved.pathname)) {
          image.src = `${SPRITE_ORIGIN}${resolved.pathname}${resolved.search}${resolved.hash}`;
        } else if (!/^(?:https?:|\/\/)/i.test(source)) {
          image.src = resolved.href;
        }
      } catch (_) { }
    });
  }

  function normalizeGameItemContainerMarkup(markup, size = 38) {
    const cell = Number(size) || 38;
    return String(markup || "")
      .replace(
        "margin: 2px; border: 2px solid",
        "margin: 0; box-sizing: border-box; border: 2px solid",
      )
      .replace(
        "background: black; position: absolute; bottom: -2px; left: -2px; border: 2px solid",
        `background: black; position: absolute; bottom: 0; left: 0; width: ${cell + 6}px; height: ${cell + 6}px; box-sizing: border-box; border: 2px solid`,
      )
      .replace(/border:\s*2px solid [^;]+;?/g, "border: 0;");
  }

  function gameIcon(skin, className = "pi-catalog-icon", actual = null) {
    const node = make("div", { class: className });
    const visualSkin = resolveGameSkin(skin, actual);
    if (!visualSkin) return node;
    try {
      let markup = "";
      if (actual && typeof window.item_container === "function") {
        const itemOptions = { skin: visualSkin, size: 38, draggable: false };
        const itemActual = actual.isSkill
          ? { name: actual.id || actual.name }
          : { name: actual.name, level: actual.level, q: actual.q ?? actual.quantity };
        if (actual.isSkill) itemOptions.skname = actual.id || actual.name;
        markup = window.item_container(itemOptions, itemActual);
        markup = normalizeGameItemContainerMarkup(markup, 38);
      } else if (typeof window.item_container === "function" && window.G?.positions?.[visualSkin]) {
        markup = window.item_container({ skin: visualSkin, size: 38, draggable: false });
      } else if (typeof window.sprite === "function") {
        markup = window.sprite(visualSkin, { scale: 1.45, width: 38, height: 42, overflow: true });
      }
      node.innerHTML = markup || "";
      normalizeGameMarkupImages(node);
      const image = node.querySelector("img");
      if (image) image.addEventListener("error", () => { node.replaceChildren(); node.textContent = visualSkin.slice(0, 2).toUpperCase(); }, { once: true });
      if (!node.firstElementChild) node.textContent = visualSkin.slice(0, 2).toUpperCase();
    } catch (_) {
      node.textContent = visualSkin.slice(0, 2).toUpperCase();
    }
    return node;
  }
  function themedButton(text, handler, kind = "normal") {
    const node = make("button", { type: "button", text }); node.addEventListener("click", handler);
    const danger = kind === "danger";
    Object.assign(node.style, { background: kind === "primary" ? "#173d46" : danger ? "#4b1e26" : "#17182a", color: kind === "primary" ? "#8ef1ff" : danger ? "#ff9da5" : "#d7d9e8", border: "1px solid " + (kind === "primary" ? "#51d2e1" : danger ? "#e36b78" : "#444861"), borderRadius: "4px", padding: "5px 10px", cursor: "pointer", font: "11px 'Courier New', monospace" }); return node;
  }
  function statusNode(panel, message, error = false, remember = true) {
    if (remember && panel) panel.__piDashboardNotice = message ? { message, error } : null;
    const node = panel.querySelector("[data-pi-dashboard-status]");
    if (node) { node.textContent = message || ""; node.style.color = error ? "#ff7777" : "#8ef1ff"; node.style.display = message ? "block" : "none"; }
    const inline = panel.querySelector("[data-pi-dashboard-inline-status]");
    if (inline) { inline.textContent = remember ? (message || "") : ""; inline.style.color = error ? "#ff7777" : "#66dd66"; }
  }
  function sourceNote(key, text = "Shared CaracAL localStorage") { return make("div", { class: "pi-source", text: text + (key ? " · " + key : "") }); }
  function addStyle(panel) {
    panel.append(make("style", { text: `
      #${WINDOW_ID} *{box-sizing:border-box}#${WINDOW_ID}{font-family:'Courier New',monospace;color:#d7d9e8;background:#0d0d1a;border:2px solid #51d2e1;border-radius:9px;box-shadow:0 0 30px rgba(81,210,225,.22)}
      #${WINDOW_ID} .pi-head{padding:8px 12px;display:flex;align-items:center;gap:8px;cursor:move;border-bottom:1px solid #343752;background:linear-gradient(135deg,#111133,#0d0d1a);user-select:none}#${WINDOW_ID} .pi-title{color:#8ef1ff;font-size:16px;font-weight:bold;flex:1}#${WINDOW_ID} .pi-status{min-height:18px;padding:4px 12px;color:#777b93;font-size:10px;border-bottom:1px solid #252638}#${WINDOW_ID} .pi-content{height:calc(100% - 69px);overflow:auto;padding:10px 12px 14px}
      #${WINDOW_ID} .pi-body{color:#d7d9e8;font:12px 'Courier New',monospace}#${WINDOW_ID} .pi-headline{color:#51d2e1;font-size:16px;font-weight:bold;border-bottom:1px solid #343752;padding-bottom:7px;margin-bottom:8px}#${WINDOW_ID} .pi-sub{color:#898ca3;font-size:10px;line-height:1.4;margin-bottom:9px}#${WINDOW_ID} .pi-section{border-top:1px solid #343752;padding-top:9px;margin-top:10px}#${WINDOW_ID} .pi-section-title{color:#51d2e1;font-size:13px;margin-bottom:6px}
      #${WINDOW_ID} .pi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}#${WINDOW_ID} .pi-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}#${WINDOW_ID} .pi-card{background:#17182a;border:1px solid #343752;border-radius:7px;padding:8px;min-width:0}#${WINDOW_ID} .pi-metric{background:#141525;border:1px solid #2d3048;border-radius:6px;padding:7px;min-width:0}#${WINDOW_ID} .pi-label{color:#898ca3;font-size:10px}#${WINDOW_ID} .pi-value{color:#f0f1fa;font-size:14px;font-weight:bold;overflow-wrap:anywhere;margin-top:2px}
      #${WINDOW_ID} .pi-current{background:#11232b;border:1px solid #3b8d9b;border-left:4px solid #51d2e1;border-radius:7px;padding:10px;margin:9px 0;overflow-wrap:anywhere}#${WINDOW_ID} .pi-current-label{color:#72e0eb;font-size:10px}#${WINDOW_ID} .pi-current-value{color:#fff;font-size:15px;font-weight:bold;margin-top:3px}#${WINDOW_ID} .pi-bar{height:18px;position:relative;background:#090a12;border:1px solid #444861;margin-top:4px;overflow:hidden}#${WINDOW_ID} .pi-bar-fill{height:100%;position:absolute;left:0;top:0}#${WINDOW_ID} .pi-bar-text{position:absolute;z-index:1;left:0;right:0;top:1px;text-align:center;color:#fff;font-weight:bold;font-size:11px;text-shadow:-1px 0 #000,0 1px #000,1px 0 #000,0 -1px #000}
      #${WINDOW_ID} .pi-role{font-size:9px;padding:1px 4px;border-radius:3px;color:#fff;margin-left:4px}#${WINDOW_ID} .pi-muted{color:#777b93;font-size:10px;line-height:1.4}#${WINDOW_ID} .pi-form-section{border-top:1px solid #343752;padding-top:10px;margin-top:10px}#${WINDOW_ID} .pi-form-title{color:#51d2e1;font-size:12px;text-transform:uppercase;letter-spacing:.4px;margin-bottom:7px}#${WINDOW_ID} .pi-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}#${WINDOW_ID} .pi-field{display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:8px;align-items:center;color:#aaa;font-size:11px}#${WINDOW_ID} .pi-field.full{grid-column:1/-1}
       #${WINDOW_ID} input,#${WINDOW_ID} select,#${WINDOW_ID} textarea{background:#151528;color:#eee;border:1px solid #444861;border-radius:4px;padding:5px 6px;font:11px 'Courier New',monospace;max-width:100%}#${WINDOW_ID} input[type=checkbox]{width:18px;height:18px;accent-color:#51d2e1;justify-self:start}#${WINDOW_ID} textarea{width:100%;min-height:110px;resize:vertical}#${WINDOW_ID} .pi-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid #333}#${WINDOW_ID} .pi-source{color:#777b93;font-size:9px;overflow-wrap:anywhere;margin-top:7px}#${WINDOW_ID} .pi-action-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:8px}#${WINDOW_ID} .pi-action-grid button{padding:5px 2px}
       #${WINDOW_ID}.pi-native-window{background:#0d0d1a;border-color:#51d2e1;border-radius:10px;box-shadow:0 0 30px rgba(81,210,225,.25);font-family:'Courier New',monospace}
       #${WINDOW_ID}.pi-native-window .pi-head{padding:8px 12px;border-radius:8px 8px 0 0;background:linear-gradient(135deg,#111133,#0d0d1a)}
       #${WINDOW_ID}.pi-native-window .pi-title{color:#8ef1ff;font-size:16px}
       #${WINDOW_ID}.pi-native-window .pi-head button{padding:2px 6px;background:transparent;border-color:#444861;color:#999;font-size:18px;line-height:1}
       #${WINDOW_ID}.pi-native-window .pi-status{font-size:10px;color:#777b93;border-bottom:1px solid #333}
       #${WINDOW_ID}.pi-native-window .pi-content{padding:10px 12px 12px}
       #${WINDOW_ID}.pi-native-window .pi-body{font-size:11px}
       #${WINDOW_ID}.pi-native-window .pi-headline{display:none}
       #${WINDOW_ID}.pi-native-window .pi-form-section{margin-top:10px;padding-top:8px;border-top:1px solid #333}
       #${WINDOW_ID}.pi-native-window .pi-form-title{color:#51d2e1;font-size:13px;text-transform:none;letter-spacing:0;margin-bottom:6px}
       #${WINDOW_ID}.pi-native-window .pi-form-grid{display:block}
       #${WINDOW_ID}.pi-native-window .pi-field{grid-template-columns:1fr 120px;margin:5px 0;color:#aaa;font-size:11px}
       #${WINDOW_ID}.pi-native-window .pi-field input[type=number]{width:88px;justify-self:start}
       #${WINDOW_ID}.pi-native-window .pi-field select{width:260px;justify-self:start}
       #${WINDOW_ID}.pi-native-window .pi-field.full{grid-column:auto}
       #${WINDOW_ID}.pi-native-window .pi-actions{margin:0 -12px -12px;padding:10px 12px;border-top:1px solid #333;background:#0d0d1a}
       #${WINDOW_ID}.pi-native-window .pi-source{margin-left:auto;max-width:55%;text-align:right}
       #${WINDOW_ID}.pi-control-menu-window{display:flex!important;flex-direction:column;resize:none!important}
       #${WINDOW_ID}.pi-control-menu-window .pi-refresh-control,#${WINDOW_ID}.pi-control-menu-window .pi-status{display:none}
       #${WINDOW_ID}.pi-control-menu-window .pi-content{height:auto;flex:1;min-height:0;overflow-y:auto}
       #${WINDOW_ID}.pi-control-menu-window .pi-actions{flex-shrink:0;align-items:center}
       #${WINDOW_ID}.pi-control-menu-window .pi-menu-status{margin-left:auto;color:#66dd66;font-size:10px;line-height:1.3;text-align:right}
       #${WINDOW_ID}.pi-companion-window .pi-refresh-control{display:none}
       #${WINDOW_ID}.pi-trio-options-window,#${WINDOW_ID}.pi-trio-hunt-window,#${WINDOW_ID}.pi-trio-hunt-menu-window,#${WINDOW_ID}.pi-trio-inventory-window,#${WINDOW_ID}.pi-trio-runtime-window,#${WINDOW_ID}.pi-trio-stats-window,#${WINDOW_ID}.pi-trio-dashboard-window{display:flex;flex-direction:column;resize:none}
       #${WINDOW_ID}.pi-trio-options-window .pi-content,#${WINDOW_ID}.pi-trio-hunt-window .pi-content,#${WINDOW_ID}.pi-trio-hunt-menu-window .pi-content,#${WINDOW_ID}.pi-trio-hunt-sub-window .pi-content,#${WINDOW_ID}.pi-trio-inventory-window .pi-content,#${WINDOW_ID}.pi-trio-runtime-window .pi-content,#${WINDOW_ID}.pi-trio-stats-window .pi-content,#${WINDOW_ID}.pi-trio-dashboard-window .pi-content{height:auto;flex:1;min-height:0;overflow:auto}
       #${WINDOW_ID}.pi-trio-options-window .pi-head,#${WINDOW_ID}.pi-trio-hunt-window .pi-head,#${WINDOW_ID}.pi-trio-hunt-menu-window .pi-head,#${WINDOW_ID}.pi-trio-stats-window .pi-head{background:linear-gradient(135deg,#111133,#0d0d1a)}
       #${WINDOW_ID}.pi-trio-options-window .pi-title,#${WINDOW_ID}.pi-trio-hunt-window .pi-title,#${WINDOW_ID}.pi-trio-hunt-menu-window .pi-title,#${WINDOW_ID}.pi-trio-stats-window .pi-title{color:#8ef1ff}
       #${WINDOW_ID}.pi-trio-runtime-window{border-color:#8b6dcc;border-radius:10px;box-shadow:0 0 30px rgba(139,109,204,.25)}
       #${WINDOW_ID}.pi-trio-runtime-window .pi-head{background:linear-gradient(135deg,#292342,#0d0d1a)}
       #${WINDOW_ID}.pi-trio-runtime-window .pi-title{color:#d4b9ff}
       #${WINDOW_ID}.pi-trio-inventory-window{border-color:#d6a844;border-radius:10px;box-shadow:0 0 30px rgba(214,168,68,.25)}
       #${WINDOW_ID}.pi-trio-inventory-window .pi-head{background:linear-gradient(135deg,#292111,#0d0d1a)}
       #${WINDOW_ID}.pi-trio-inventory-window .pi-title{color:#f0c766}
        #${WINDOW_ID}.pi-trio-inventory-window .pi-content{padding:10px;overflow:auto}
        #${WINDOW_ID}.pi-trio-hunt-sub-window{background:#0d0d1a;border:2px solid #8ef1ff;border-radius:10px;box-shadow:0 0 30px rgba(142,241,255,.22);font-family:'Courier New',monospace;color:#d0d0d0;display:flex;flex-direction:column;resize:none}
        #${WINDOW_ID}.pi-trio-hunt-sub-window .pi-head{padding:8px 12px;border-radius:8px 8px 0 0;background:linear-gradient(135deg,#111133,#0d0d1a)}
        #${WINDOW_ID}.pi-trio-hunt-sub-window .pi-title{color:#8ef1ff;font-size:16px}
        #${WINDOW_ID}.pi-trio-hunt-sub-window .pi-content{padding:10px 12px;overflow:auto;flex:1;min-height:0}
        #${WINDOW_ID}.pi-trio-hunt-sub-window .pi-refresh-control{display:none}
        #${WINDOW_ID} .pi-hunt-navigation{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:8px 0 12px}
        #${WINDOW_ID} .pi-hunt-navigation.pi-hunt-slots{grid-template-columns:repeat(3,minmax(0,1fr))}
        #${WINDOW_ID} .pi-hunt-nav{min-height:34px;text-align:left;white-space:normal}
        #${WINDOW_ID} .pi-hunt-target-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:6px}
        #${WINDOW_ID} .pi-hunt-target-button{display:flex;align-items:center;gap:8px;min-width:0;min-height:56px;padding:5px 7px;white-space:normal}
        #${WINDOW_ID} .pi-hunt-target-avatar{display:flex;align-items:center;justify-content:center;flex:0 0 42px;width:42px;height:46px;overflow:hidden;background:#090a12;border:1px solid #343752;border-radius:4px;image-rendering:pixelated}
        #${WINDOW_ID} .pi-hunt-target-avatar img{max-width:none;max-height:none;image-rendering:pixelated}
        #${WINDOW_ID} .pi-hunt-target-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
        #${WINDOW_ID} .pi-hunt-target-name{color:#f0f1fa;font-weight:bold;overflow-wrap:anywhere}
        #${WINDOW_ID} .pi-hunt-target-detail{color:#aeb2c8;font-size:9px;line-height:1.35;overflow-wrap:anywhere}
        #${WINDOW_ID} .pi-hunt-target-active{color:#8ef1ff;font-size:9px;font-weight:bold}
        #${WINDOW_ID} .pi-hunt-sub-actions{display:flex;justify-content:space-between;margin-bottom:10px}
        #${WINDOW_ID} .pi-hunt-drop-group{margin-top:8px;padding:6px 8px 4px;background:#121222;border:1px solid #29293d;border-radius:5px}
        #${WINDOW_ID}.pi-party-avatar{display:flex;align-items:center;justify-content:center;width:50px;height:54px;overflow:hidden;image-rendering:pixelated}
        #${WINDOW_ID} .pi-party-sprite{display:flex;align-items:center;justify-content:center;width:50px;height:54px;overflow:hidden;image-rendering:pixelated}
        #${WINDOW_ID} .pi-party-sprite img{max-width:none;image-rendering:pixelated}
        #${WINDOW_ID} .pi-party-heading{display:flex;align-items:center;gap:8px;min-width:0}
        #${WINDOW_ID} .pi-party-identity{min-width:0;flex:1}
       #${WINDOW_ID} .pi-header-action{flex:none;padding:3px 7px;font:9px 'Courier New',monospace}
       #${WINDOW_ID} .pi-inventory-members{display:grid;grid-template-columns:repeat(3,minmax(270px,1fr));gap:10px;min-width:830px;width:max-content}
       #${WINDOW_ID} .pi-inventory-card{background:#111326;border:1px solid #343752;border-radius:7px;padding:8px;min-width:270px}
       #${WINDOW_ID} .pi-inventory-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #343752;padding-bottom:6px;margin-bottom:7px;gap:6px}
       #${WINDOW_ID} .pi-inventory-status{display:flex;align-items:center;gap:5px}
       #${WINDOW_ID} .pi-inventory-grid{display:grid;grid-template-columns:repeat(6,42px);gap:0;justify-content:center}
       #${WINDOW_ID} .pi-inventory-slot{position:relative;width:42px;height:42px;min-height:42px;background:rgba(255,255,255,.035);border:2px solid #444;display:flex;justify-content:center;align-items:center;overflow:hidden;padding:0}
       #${WINDOW_ID} .pi-inventory-slot.has-item{background:#050505;border-color:#aaa875}
       #${WINDOW_ID} .pi-inventory-slot .pi-catalog-icon{width:36px;height:36px;min-width:36px;max-width:36px;min-height:36px;max-height:36px;image-rendering:pixelated}
        #${WINDOW_ID} .pi-inventory-slot .pi-catalog-icon img{max-width:100%;max-height:100%;image-rendering:pixelated}
       #${WINDOW_ID} .pi-inventory-slot .pi-item-quantity{position:absolute;right:1px;bottom:0;color:#fff;font:700 9px Arial,sans-serif;text-shadow:-1px 0 #000,0 1px #000,1px 0 #000,0 -1px #000}
       #${WINDOW_ID} .pi-inventory-slot .pi-item-level{position:absolute;left:1px;top:0;color:#ffe36b;font:700 9px Arial,sans-serif;text-shadow:-1px 0 #000,0 1px #000,1px 0 #000,0 -1px #000}
       #${WINDOW_ID} .pi-inventory-gold{border-top:1px solid #343752;color:#f0c766;font-size:17px;font-weight:bold;text-align:center;margin-top:7px;padding-top:6px}
       #${WINDOW_ID} .pi-inventory-empty{color:#777b93;text-align:center;padding:30px 8px;font-size:10px}
       #${WINDOW_ID} .pi-inventory-slot .pi-catalog-icon{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
       #${WINDOW_ID} .pi-runtime-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
       #${WINDOW_ID} .pi-runtime-intro{color:#898ca3;font-size:10px;line-height:1.4;margin-bottom:8px}
       #${WINDOW_ID} .pi-runtime-card{background:#141525;border:1px solid #2d3048;border-radius:6px;padding:8px;min-width:0}
       #${WINDOW_ID} .pi-runtime-card .pi-muted{font-size:9px;margin:4px 0}
       #${WINDOW_ID} .pi-runtime-buttons{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
       #${WINDOW_ID} .pi-runtime-buttons button{flex:1;min-width:68px;padding:4px 5px;font:9px 'Courier New',monospace}
       #${WINDOW_ID} .pi-runtime-log{color:#777b93;font-size:10px;line-height:1.4;padding:4px 0;border-bottom:1px solid #24263a}
       #${WINDOW_ID} .pi-options-action-buttons{display:grid;gap:7px;align-items:center}
       #${WINDOW_ID} .pi-join-warrior-row{display:grid;grid-template-columns:110px minmax(120px,1fr);gap:6px;align-items:center;margin:0}
       #${WINDOW_ID} .pi-join-warrior-row button{grid-column:1/-1;justify-self:start}
       #${WINDOW_ID}.pi-trio-options-window .pi-field select[data-join-warrior-member]{width:100%;justify-self:stretch}
       #${WINDOW_ID} .pi-trio-stats-body{font:10px 'Courier New',monospace;color:#d7d9e8}
       #${WINDOW_ID} .pi-stats-warning{background:#2a2113;border:1px solid #6b5520;border-radius:5px;padding:8px 10px;color:#e8c46a;font-size:11px;line-height:1.45;margin-bottom:9px}
       #${WINDOW_ID} .pi-stats-freshness{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;color:#898ca3;font-size:10px;margin-bottom:8px}
       #${WINDOW_ID} .pi-stats-member-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-bottom:8px}
       #${WINDOW_ID} .pi-stats-member{background:#17172a;border:1px solid #343752;border-radius:5px;padding:6px;min-width:0}
       #${WINDOW_ID} .pi-stats-member-name{font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
       #${WINDOW_ID} .pi-stats-member-status{font-size:10px;margin-top:3px}
       #${WINDOW_ID} .pi-stats-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
       #${WINDOW_ID} .pi-stats-graphs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
       #${WINDOW_ID} .pi-stats-caption{color:#898ca3;font-size:10px;margin-bottom:2px}
       #${WINDOW_ID} .pi-stats-no-series,#${WINDOW_ID} .pi-stats-no-data{color:#777b93;padding:8px 0;font-size:10px}
       #${WINDOW_ID} .pi-stats-no-series{text-align:center;padding:16px 0}
       #${WINDOW_ID} .pi-stats-lists{display:grid;grid-template-columns:1fr 1fr;gap:12px}
       #${WINDOW_ID} .pi-stats-name{color:#d7d9e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
       #${WINDOW_ID} .pi-stats-number{color:#fff;text-align:right;white-space:nowrap}
       #${WINDOW_ID} .pi-stats-share{color:#777b93;text-align:right}
       #${WINDOW_ID} .pi-stats-damage,#${WINDOW_ID} .pi-stats-measured{display:grid;grid-template-columns:minmax(130px,1fr) 60px 80px 65px;gap:3px 8px;align-items:center;font-size:10px;overflow-x:auto}
       #${WINDOW_ID} .pi-stats-measured{grid-template-columns:minmax(130px,1fr) 55px 72px 72px 72px}
       #${WINDOW_ID} .pi-stats-table-head{color:#777b93}
       #${WINDOW_ID} .pi-stats-targets{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
       #${WINDOW_ID} .pi-stats-targets>div{background:#17172a;border:1px solid #343752;border-radius:5px;padding:5px 8px;min-width:130px}
       #${WINDOW_ID} .pi-stats-targets strong{display:block;color:#fff;font-size:12px;margin-top:2px}
       #${WINDOW_ID} .pi-trio-stats-window{border-radius:8px;box-shadow:0 0 25px rgba(81,210,225,.2)}
       #${WINDOW_ID} .pi-trio-stats-window .pi-content{padding:10px 12px}
       #${WINDOW_ID} .pi-stats-tile{background:#17172a;border:1px solid #343752;border-radius:5px;padding:6px 8px;min-width:0}
       #${WINDOW_ID} .pi-stats-heading{color:#51d2e1;font-size:12px;font-weight:bold;border-bottom:1px solid #343752;padding:9px 0 5px;margin-bottom:5px}
       #${WINDOW_ID} .pi-stats-toplist{display:grid;grid-template-columns:minmax(120px,1fr) 60px 46px;gap:3px 8px;font-size:10px;align-items:center}
       #${WINDOW_ID} .pi-stats-sparkline{display:block;max-width:100%;height:46px}
        #${WINDOW_ID} .pi-boss-tier{margin-top:5px;padding:4px 6px 5px;background:#161323;border:1px solid #382a4d;border-radius:4px}
        #${WINDOW_ID} .pi-boss-tier-title{color:#d39bff;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.2px}
        #${WINDOW_ID} .pi-trio-boss-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:3px 6px;margin-top:3px}
        #${WINDOW_ID} .pi-trio-boss-chip{display:flex;align-items:center;gap:5px;min-height:32px;padding:3px 6px;border-radius:4px;cursor:pointer;font:10px 'Courier New',monospace;line-height:1.3;box-sizing:border-box}
        #${WINDOW_ID} .pi-trio-boss-avatar{display:flex;align-items:center;justify-content:center;flex:0 0 28px;width:28px;height:30px;overflow:hidden;image-rendering:pixelated}
        #${WINDOW_ID} .pi-trio-boss-avatar img{max-width:none;max-height:none;image-rendering:pixelated}
        #${WINDOW_ID} .pi-trio-active-boss{display:flex;align-items:center;gap:7px;margin-bottom:8px;padding:5px 7px;background:#292111;border:1px solid #ccaa22;border-radius:5px;color:#ffd98a;font-size:10px}
       #${WINDOW_ID} .pi-boss-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:3px 6px;margin-top:3px}
       #${WINDOW_ID} .pi-boss-chip{display:flex;align-items:center;gap:5px;padding:3px 6px;border-radius:4px;cursor:pointer;font:10px 'Courier New',monospace;line-height:1.3}
       #${WINDOW_ID} .pi-inventory-card{background:#111326;border:1px solid #d6a844;border-radius:8px;padding:8px;min-width:0}
       #${WINDOW_ID} .pi-inventory-head{display:flex;align-items:center;gap:7px;margin-bottom:6px;color:#ffd36a;font-weight:bold}
       #${WINDOW_ID} .pi-inventory-grid{display:grid;grid-template-columns:repeat(7,minmax(32px,1fr));gap:3px}
       #${WINDOW_ID} .pi-inventory-slot{min-height:42px;background:#191b2c;border:2px solid #45485e;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:#d7d9e8;font-size:8px;overflow:hidden;padding:2px}
       #${WINDOW_ID} .pi-inventory-slot.has-item{border-color:#aaa875;color:#fff}
       #${WINDOW_ID} .pi-inventory-slot .pi-item-name{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
       #${WINDOW_ID} .pi-party-grid{display:grid;grid-template-columns:repeat(5,100px);gap:6px;align-items:start;width:max-content}
       #${WINDOW_ID} .pi-party-card{position:relative;width:100px;min-height:192px;background:#050505;border:4px solid #777;border-radius:0;padding:5px;text-align:center;box-shadow:inset 0 0 0 1px #222}
       #${WINDOW_ID} .pi-party-avatar{height:64px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:3px;color:#ddd;background:#252525;font-size:13px;font-weight:bold}
       #${WINDOW_ID} .pi-party-name{height:21px;line-height:21px;color:#fff;font-size:12px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:-1px 0 #000,0 1px #000,1px 0 #000,0 -1px #000}
       #${WINDOW_ID} .pi-party-level{height:18px;line-height:18px;color:#fff;font-size:11px;font-weight:bold}
       #${WINDOW_ID} .pi-party-bar{position:relative;height:20px;text-align:center;margin-top:3px;overflow:hidden;background:#080808;border:1px solid #777}
       #${WINDOW_ID} .pi-party-bar-fill{position:absolute;top:0;left:0;bottom:0;border-right:1px solid #777}
       #${WINDOW_ID} .pi-party-bar-text{position:absolute;inset:0;z-index:1;line-height:18px;color:#fff;font-size:10px;font-weight:bold;text-shadow:-1px 0 #000,0 1px #000,1px 0 #000,0 -1px #000}
       #${WINDOW_ID} .pi-party-map{height:18px;line-height:18px;color:#fff;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
       #${WINDOW_ID} .pi-party-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:5px}
       #${WINDOW_ID} .pi-party-action{background:#173d46;color:#8ef1ff;border:1px solid #51d2e1;border-radius:4px;padding:2px 0;cursor:pointer;font:12px 'Courier New',monospace}
       #${WINDOW_ID}.pi-merchant-window{border-color:#d6a844;border-radius:10px;box-shadow:0 0 30px rgba(214,168,68,.25);background:#0d0d1a}
       #${WINDOW_ID}.pi-merchant-window .pi-head{padding:8px 12px;border-radius:8px 8px 0 0;background:linear-gradient(135deg,#292111,#0d0d1a)}
       #${WINDOW_ID}.pi-merchant-window .pi-title{color:#f0c766;font-size:16px}
       #${WINDOW_ID}.pi-merchant-dashboard-window .pi-head{display:flex;flex-direction:column;align-items:stretch;gap:6px}
       #${WINDOW_ID}.pi-merchant-dashboard-window .pi-title-line{display:flex;justify-content:space-between;align-items:center;gap:8px}
       #${WINDOW_ID}.pi-merchant-dashboard-window .pi-title-line .pi-title{flex:1}
       #${WINDOW_ID}.pi-merchant-dashboard-window .pi-title-line button{background:transparent;border:0;color:#999;font-size:20px;line-height:18px;padding:0 4px}
       #${WINDOW_ID}.pi-merchant-dashboard-window .pi-status{display:none}
       #${WINDOW_ID}.pi-merchant-dashboard-window .pi-content{height:calc(100% - 58px)}
       #${WINDOW_ID}.pi-merchant-dashboard-window .m-actions{margin:0;flex-wrap:nowrap}
       #${WINDOW_ID}.pi-merchant-window .pi-content{padding:0 10px 12px}
       #${WINDOW_ID} .m-body{padding:10px 0;color:#d7d9e8;font:12px 'Courier New',monospace}
       #${WINDOW_ID} .m-summary{display:grid;grid-template-columns:1.2fr .8fr;gap:8px;margin-bottom:9px}
       #${WINDOW_ID} .m-card{background:#17182a;border:1px solid #343752;border-radius:7px;padding:9px}
       #${WINDOW_ID} .m-current{background:#11232b;border:1px solid #3b8d9b;border-left:4px solid #51d2e1;border-radius:7px;padding:10px;margin:9px 0;overflow-wrap:anywhere}
       #${WINDOW_ID} .m-current-head{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#72e0eb;font-size:11px}
       #${WINDOW_ID} .m-current-job{font-size:15px;font-weight:bold;color:#fff;margin:6px 0}
       #${WINDOW_ID} .m-current-step{font-size:12px;line-height:1.45;color:#d2e7eb}
       #${WINDOW_ID} .m-current-time{font-size:10px;color:#98b9c1;margin-top:7px}
       #${WINDOW_ID} .m-name{color:#e8bb55;font-size:15px;font-weight:bold;margin-bottom:4px}
       #${WINDOW_ID} .m-muted{color:#898ca3;font-size:10px}
       #${WINDOW_ID} .m-bar-label{font-size:10px;color:#a9acc0;margin-top:6px}
       #${WINDOW_ID} .m-bar-wrap{height:8px;background:#090a12;border-radius:4px;overflow:hidden;margin-top:2px}
       #${WINDOW_ID} .m-bar{height:100%;border-radius:4px}
       #${WINDOW_ID} .m-section{border-top:1px solid #343752;padding-top:9px;margin-top:9px}
       #${WINDOW_ID} .m-title{color:#51d2e1;font-size:13px;margin-bottom:7px}
       #${WINDOW_ID} .m-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
       #${WINDOW_ID} .m-grid-two{grid-template-columns:repeat(2,minmax(0,1fr))}
       #${WINDOW_ID} .m-metric{background:#141525;border:1px solid #2d3048;border-radius:6px;padding:7px;min-width:0}
       #${WINDOW_ID} .m-label{color:#898ca3;font-size:9px;text-transform:uppercase;letter-spacing:.4px}
       #${WINDOW_ID} .m-value{color:#f0f1fa;font-size:13px;font-weight:bold;margin-top:2px;overflow:hidden;text-overflow:ellipsis}
       #${WINDOW_ID} .m-detail{color:#777b93;font-size:9px;margin-top:2px}
       #${WINDOW_ID} .m-positive{color:#5bd46d}.m-negative{color:#ef6868}.m-neutral{color:#f0f1fa}
       #${WINDOW_ID} .m-live{display:inline-block;width:7px;height:7px;border-radius:50%;background:#54d66a;box-shadow:0 0 6px #54d66a;margin-right:5px}
       #${WINDOW_ID} .m-actions{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 9px}
       #${WINDOW_ID} .m-actions button{border-radius:4px;padding:3px 7px;cursor:pointer;font:10px 'Courier New',monospace;white-space:nowrap}
       #${WINDOW_ID} .m-actions .m-config{background:#292342;color:#d4b9ff;border:1px solid #8b6dcc}
       #${WINDOW_ID} .m-actions .m-blue{background:#172f3d;color:#8edfff;border:1px solid #4599bb}
       #${WINDOW_ID} .m-actions .m-gold{background:#3d3218;color:#ffe093;border:1px solid #d6a844}
       #${WINDOW_ID} .m-actions .m-green{background:#1a2f1a;color:#8eff8e;border:1px solid #44bb44}
       #${WINDOW_ID} .m-actions .m-purple{background:#2f2440;color:#e1c7ff;border:1px solid #a56dcc}
         #${WINDOW_ID} .m-log-entry{border-bottom:1px solid #24263a;padding:6px 2px;color:#d7d9e8;font-size:10px;line-height:1.35}
         #${WINDOW_ID} .m-log-meta{color:#777b93;font-size:9px;margin-bottom:2px}
         #${WINDOW_ID} .m3-body{padding:12px;color:#d7d9e8;font:11px 'Courier New',monospace}
         #${WINDOW_ID} .m3-section{border-top:1px solid #343752;padding-top:10px;margin-top:10px}
         #${WINDOW_ID} .m3-section:first-child{border-top:0;margin-top:0}
         #${WINDOW_ID} .m3-title{color:#51d2e1;font-size:12px;text-transform:uppercase;letter-spacing:.4px;margin-bottom:7px}
         #${WINDOW_ID} .m3-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
         #${WINDOW_ID} .m3-field{display:flex;flex-direction:column;gap:3px;color:#898ca3}
         #${WINDOW_ID} .m3-field input,#${WINDOW_ID} .m3-field select,#${WINDOW_ID} .m3-area{width:100%;background:#17182a;color:#f0f1fa;border:1px solid #444861;border-radius:4px;padding:5px;font:11px 'Courier New',monospace}
         #${WINDOW_ID} .m3-check{display:flex;align-items:center;gap:6px;color:#d7d9e8;padding:4px 0}
         #${WINDOW_ID} .m3-check input{accent-color:#51d2e1}
         #${WINDOW_ID} .m3-area{min-height:72px;resize:vertical;margin-top:5px}
         #${WINDOW_ID} .m3-help{color:#777b93;font-size:9px;line-height:1.35;margin-top:4px}
         #${WINDOW_ID} .m3-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px -12px -12px;padding:10px 12px;border-top:1px solid #333;background:#0d0d1a}
         #${WINDOW_ID} .m3-actions button{font:11px 'Courier New',monospace;border-radius:4px;padding:5px 10px;cursor:pointer}
         #${WINDOW_ID} .m3-actions .m3-primary{background:#173d46;color:#8ef1ff;border:1px solid #51d2e1}
          #${WINDOW_ID} .m3-actions .m3-secondary{background:#17182a;color:#d7d9e8;border:1px solid #444861}
          #${WINDOW_ID} .pi-merchant-loot-window .pi-content{padding:0 10px 12px}
          #${WINDOW_ID} .m3-loot-body{padding:12px;color:#d7d9e8;font:11px 'Courier New',monospace}
          #${WINDOW_ID} .m3-loot-tabs,#${WINDOW_ID} .m3-loot-policies{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px}
          #${WINDOW_ID} .m3-loot-tab,#${WINDOW_ID} .m3-loot-policy{background:#17182a;color:#9a9db3;border:1px solid #444861;border-radius:4px;padding:5px 8px;cursor:pointer;font:10px 'Courier New',monospace}
          #${WINDOW_ID} .m3-loot-tab.active{background:#173d46;color:#8edfff;border-color:#51d2e1}
          #${WINDOW_ID} .m3-loot-policy.active{background:#382543;color:#e4b8ff;border-color:#a56dcc}
          #${WINDOW_ID} .m3-loot-policy[data-policy='sell'].active{background:#3b1e27;color:#ff9eac;border-color:#c55a6b}
          #${WINDOW_ID} .m3-loot-policy[data-policy='bank'].active{background:#3d3218;color:#ffe093;border-color:#d6a844}
          #${WINDOW_ID} .m3-loot-policy[data-policy='keep'].active{background:#243428;color:#a7e6b0;border-color:#58a96a}
          #${WINDOW_ID} .m3-loot-policy[data-policy='auto'].active{background:#173d46;color:#8ef1ff;border-color:#51d2e1}
          #${WINDOW_ID} .m3-loot-policy[data-policy='upgrade'].active{background:#1e2e3d;color:#93c5fd;border-color:#4a8fd4}
          #${WINDOW_ID} .m3-loot-filter-label{color:#777b93;font-size:9px;text-transform:uppercase;margin:3px 0}
          #${WINDOW_ID} .m3-loot-head,#${WINDOW_ID} .m3-loot-row{display:grid;grid-template-columns:1fr 100px 112px;gap:8px;align-items:center;padding:6px 0}
          #${WINDOW_ID} .m3-loot-head{color:#777b93;text-transform:uppercase;font-size:9px;border-bottom:1px solid #343752}
          #${WINDOW_ID} .m3-loot-row{border-bottom:1px solid #24263a}
          #${WINDOW_ID} .m3-loot-row select{width:100%;background:#17182a;color:#f0f1fa;border:1px solid #444861;border-radius:4px;padding:4px;font:10px 'Courier New',monospace}
          #${WINDOW_ID} .m3-loot-name{color:#f0f1fa}
          #${WINDOW_ID} .m3-loot-id{display:block;color:#777b93;font-size:8px;margin-top:2px}
          #${WINDOW_ID} .m3-loot-help{color:#777b93;font-size:9px;line-height:1.35;margin:5px 0 8px}
          #${WINDOW_ID} .m3-loot-io{display:none;flex:1 1 100%;gap:6px;flex-wrap:wrap;margin-top:2px}
          #${WINDOW_ID} .m3-loot-io.is-open{display:flex}
          #${WINDOW_ID} .m3-loot-io textarea{flex:1 1 100%;min-height:90px}
          #${WINDOW_ID} .pi-merchant-ponty-window .pi-content{padding:0 10px 12px}
          #${WINDOW_ID}.pi-merchant-ponty-window{border-color:#a56dcc;box-shadow:0 0 30px rgba(165,109,204,.25)}
          #${WINDOW_ID}.pi-merchant-ponty-window .pi-head{background:linear-gradient(135deg,#30264a,#0d0d1a)}
          #${WINDOW_ID}.pi-merchant-ponty-window .pi-title{color:#e6c9ff}
          #${WINDOW_ID} .m3-ponty-body{padding:12px;color:#d7d9e8;font:11px 'Courier New',monospace}
          #${WINDOW_ID} .m3-ponty-help{color:#777b93;font-size:9px;line-height:1.4;margin:0 0 9px}
          #${WINDOW_ID} .m3-ponty-scan{display:flex;align-items:flex-start;gap:6px;color:#d7d9e8;font-size:10px;line-height:1.35;margin:0 0 9px}
          #${WINDOW_ID} .m3-ponty-scan input{accent-color:#a56dcc;margin-top:1px}
          #${WINDOW_ID} .m3-ponty-search{width:100%;background:#17182a;color:#f0f1fa;border:1px solid #444861;border-radius:4px;padding:6px;font:11px 'Courier New',monospace;margin-bottom:6px}
          #${WINDOW_ID} .m3-ponty-picker{display:flex;gap:6px;align-items:center}
          #${WINDOW_ID} .m3-ponty-picker select{flex:1;min-width:0;background:#17182a;color:#f0f1fa;border:1px solid #444861;border-radius:4px;padding:6px;font:10px 'Courier New',monospace}
          #${WINDOW_ID} .m3-ponty-add,#${WINDOW_ID} .m3-ponty-remove{background:#30264a;color:#e6c9ff;border:1px solid #a56dcc;border-radius:4px;padding:6px 9px;cursor:pointer;font:600 10px 'Courier New',monospace;white-space:nowrap}
          #${WINDOW_ID} .m3-ponty-remove{background:#17182a;color:#ffb0b0;border-color:#8a5252;padding:4px 7px}
          #${WINDOW_ID} .m3-ponty-count{color:#d7d9e8;font-size:10px;margin:9px 0 5px}
          #${WINDOW_ID} .m3-ponty-list{border:1px solid #343752;border-radius:4px;background:#101121;max-height:38vh;overflow-y:auto}
          #${WINDOW_ID} .m3-ponty-selected-row{display:flex;align-items:center;gap:8px;border-bottom:1px solid #24263a;padding:7px 8px}
          #${WINDOW_ID} .m3-ponty-selected-row:last-child{border-bottom:0}
          #${WINDOW_ID} .m3-ponty-selected-copy{flex:1;min-width:0}
          #${WINDOW_ID} .m3-ponty-name{color:#f0f1fa}
          #${WINDOW_ID} .m3-ponty-id{display:block;color:#777b93;font-size:8px;margin-top:2px}
           #${WINDOW_ID} .m3-ponty-empty{padding:10px;color:#777b93;font-size:10px}
           #${WINDOW_ID} .pi-merchant-upgrade-window .pi-content{padding:0 10px 12px}
           #${WINDOW_ID} .m3-upgrade-body{padding:12px;color:#d7d9e8;font:11px 'Courier New',monospace}
           #${WINDOW_ID} .m3-upgrade-help{color:#898ca3;font-size:10px;line-height:1.45;margin-bottom:10px}
           #${WINDOW_ID} .m3-upgrade-section{border-top:1px solid #343752;padding-top:10px;margin-top:10px}
           #${WINDOW_ID} .m3-upgrade-title{color:#51d2e1;font-size:12px;text-transform:uppercase;letter-spacing:.4px;margin-bottom:7px}
           #${WINDOW_ID} .m3-production-head,#${WINDOW_ID} .m3-production-row{display:grid;grid-template-columns:minmax(135px,1.4fr) 74px 86px 110px 105px 62px;gap:6px;align-items:center}
           #${WINDOW_ID} .m3-production-head{color:#777b93;text-transform:uppercase;font-size:9px;padding:0 0 5px}
           #${WINDOW_ID} .m3-production-row{padding:6px 0;border-top:1px solid #24263a}
           #${WINDOW_ID} .m3-production-row input,#${WINDOW_ID} .m3-production-row select{width:100%;min-width:0;background:#17182a;color:#f0f1fa;border:1px solid #444861;border-radius:4px;padding:5px;font:10px 'Courier New',monospace}
           #${WINDOW_ID} .m3-production-row button{background:#3b1e27;color:#ff9eac;border:1px solid #c55a6b;border-radius:4px;padding:5px 4px;cursor:pointer;font:9px 'Courier New',monospace}
           #${WINDOW_ID} .m3-production-add{background:#172f3d;color:#8edfff;border:1px solid #4599bb;border-radius:4px;padding:6px 9px;cursor:pointer;font:10px 'Courier New',monospace;margin-top:7px}
           #${WINDOW_ID} .m3-production-empty{color:#777b93;font-size:10px;padding:6px 0}
           @media(max-width:760px){#${WINDOW_ID} .m3-production-head,#${WINDOW_ID} .m3-production-row{grid-template-columns:minmax(115px,1.3fr) 58px 70px 88px 82px 56px;gap:4px}#${WINDOW_ID} .m3-production-row input,#${WINDOW_ID} .m3-production-row select{padding:4px 3px;font-size:9px}}
           #${WINDOW_ID}.pi-merchant-anniversary-window .pi-content{padding:0 10px 12px}
           #${WINDOW_ID} .m4-body{padding:12px;color:#d7d9e8;font:11px 'Courier New',monospace}
           #${WINDOW_ID} .m4-section{border-top:1px solid #343752;padding-top:10px;margin-top:10px}
           #${WINDOW_ID} .m4-section:first-child{border-top:0;margin-top:0}
           #${WINDOW_ID} .m4-title{color:#f0c766;font-size:12px;text-transform:uppercase;letter-spacing:.4px;margin-bottom:7px}
           #${WINDOW_ID} .m4-help{color:#898ca3;font-size:9px;line-height:1.4;margin:5px 0}
           #${WINDOW_ID} .m4-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
           #${WINDOW_ID} .m4-field{display:flex;flex-direction:column;gap:3px;color:#898ca3}
           #${WINDOW_ID} .m4-field input,#${WINDOW_ID} .m4-field select{width:100%;background:#17182a;color:#f0f1fa;border:1px solid #444861;border-radius:4px;padding:5px;font:11px 'Courier New',monospace}
           #${WINDOW_ID} .m4-check{display:flex;align-items:center;gap:6px;color:#d7d9e8;padding:4px 0}
           #${WINDOW_ID} .m4-check input{accent-color:#51d2e1;width:14px;height:14px}
           #${WINDOW_ID} .m4-ann-status{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
           #${WINDOW_ID} .m4-ann-status>div{background:#17182a;border:1px solid #343752;border-radius:5px;padding:6px;min-width:0}
           #${WINDOW_ID} .m4-ann-status b{display:block;color:#f0f1fa;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
           #${WINDOW_ID} .m4-label{display:block;color:#777b93;font-size:8px;text-transform:uppercase}
           #${WINDOW_ID} .m4-actions{display:flex;flex-wrap:wrap;gap:6px}
           #${WINDOW_ID} .m4-button{background:#172f3d;color:#8edfff;border:1px solid #4599bb;border-radius:4px;padding:6px 8px;cursor:pointer;font:10px 'Courier New',monospace}
           #${WINDOW_ID} .m4-button.gold{background:#3d3218;color:#ffe093;border-color:#d6a844}
           #${WINDOW_ID} .m4-button.red{background:#3b1e27;color:#ff9eac;border-color:#c55a6b}
           @media(max-width:620px){#${WINDOW_ID} .m4-grid,#${WINDOW_ID} .m4-ann-status{grid-template-columns:1fr}}
           #${WINDOW_ID} .m3-plog{padding:10px 12px;color:#d7d9e8;font:11px 'Courier New',monospace}
          #${WINDOW_ID} .m3-plog-bar{display:flex;gap:6px;align-items:center;margin-bottom:6px}
          #${WINDOW_ID} .m3-plog-bar select{flex:1;min-width:0;background:#17182a;color:#f0f1fa;border:1px solid #444861;border-radius:4px;padding:5px;font:10px 'Courier New',monospace}
          #${WINDOW_ID} .m3-plog-btn{background:#17182a;color:#d7d9e8;border:1px solid #555b73;border-radius:4px;padding:5px 9px;cursor:pointer;font:600 10px 'Courier New',monospace;white-space:nowrap}
          #${WINDOW_ID} .m3-plog-btn.m3-plog-danger{color:#ffb0b0;border-color:#8a5252}
          #${WINDOW_ID} .m3-plog-stats{color:#777b93;font-size:9px;line-height:1.4;margin:0 0 7px}
          #${WINDOW_ID} .m3-plog-row{border:1px solid #343752;border-left-width:3px;border-radius:4px;background:#101121;padding:6px 8px;margin-bottom:6px}
          #${WINDOW_ID} .m3-plog-row-ok{border-left-color:#66dd66}#${WINDOW_ID} .m3-plog-row-error{border-left-color:#ff8a8a}#${WINDOW_ID} .m3-plog-row-warn{border-left-color:#f0c766}#${WINDOW_ID} .m3-plog-row-event{border-left-color:#a56dcc}#${WINDOW_ID} .m3-plog-row-quiet{border-left-color:#444861}
          #${WINDOW_ID} .m3-plog-head{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:2px;color:#9a9db3;font-size:9px}
          #${WINDOW_ID} .m3-plog-time{color:#f0f1fa}.m3-plog-tag,.m3-plog-server,.m3-plog-count{border:1px solid #444861;border-radius:3px;padding:0 4px}.m3-plog-server{color:#e6c9ff;border-color:#a56dcc}.m3-plog-count{color:#f0c766;border-color:#8a7440}
          #${WINDOW_ID} .m3-plog-main{color:#f0f1fa;line-height:1.35}#${WINDOW_ID} .m3-plog-row-quiet .m3-plog-main{color:#9a9db3}
          #${WINDOW_ID} .m3-plog-line{color:#b9bbd0;font-size:10px;line-height:1.4;margin-top:2px;word-break:break-word}#${WINDOW_ID} .m3-plog-line b{color:#9a9db3;font-weight:600}#${WINDOW_ID} .m3-plog-line.m3-plog-ok{color:#8fe08f}#${WINDOW_ID} .m3-plog-line.m3-plog-error{color:#ffb0b0}#${WINDOW_ID} .m3-plog-line.m3-plog-warn{color:#f0d488}
          #${WINDOW_ID} .m3-plog-empty{padding:10px;color:#777b93;font-size:10px}
         #${WINDOW_ID} .merchant-log-body{padding:12px;color:#d7d9e8;font:11px 'Courier New',monospace}
         #${WINDOW_ID} .merchant-log-toolbar{display:grid;grid-template-columns:170px minmax(0,1fr) auto;gap:8px;align-items:center;margin-bottom:8px}
         #${WINDOW_ID} .merchant-log-toolbar select,#${WINDOW_ID} .merchant-log-toolbar input{width:100%;background:#17182a;color:#f0f1fa;border:1px solid #444861;border-radius:4px;padding:6px;font:11px 'Courier New',monospace}
         #${WINDOW_ID} .merchant-log-count{color:#777b93;white-space:nowrap;text-align:right}
         #${WINDOW_ID} .merchant-log-characters{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:0 0 8px}
         #${WINDOW_ID} .merchant-log-character{background:#17182a;color:#9a9db3;border:1px solid #444861;border-radius:12px;padding:4px 9px;cursor:pointer;font:10px 'Courier New',monospace;white-space:nowrap}
         #${WINDOW_ID} .merchant-log-character:hover{border-color:#51d2e1;color:#d7faff}
         #${WINDOW_ID} .merchant-log-character.active{background:#173d46;color:#8ef1ff;border-color:#51d2e1}
         #${WINDOW_ID} .merchant-log-list{border-top:1px solid #24263a}
         #${WINDOW_ID} .merchant-log-row{display:grid;grid-template-columns:66px 92px minmax(0,1fr);gap:8px;align-items:start;padding:7px 9px;border-bottom:1px solid #24263a;font-size:11px;line-height:1.35}
         #${WINDOW_ID} .merchant-log-row:hover{background:#141525}
         #${WINDOW_ID} .merchant-log-time{color:#898ca3}
         #${WINDOW_ID} .merchant-log-category{border:1px solid currentColor;border-radius:10px;padding:1px 6px;text-align:center;font-size:9px;text-transform:uppercase;white-space:nowrap}
         #${WINDOW_ID} .merchant-log-message{overflow-wrap:anywhere}
         #${WINDOW_ID} .merchant-log-empty{padding:12px;color:#777b93}
         #${WINDOW_ID} .pi-merchant-config-window .pi-status,#${WINDOW_ID} .pi-merchant-log-window .pi-status{min-height:16px}
         #${WINDOW_ID} .pi-merchant-config-window .pi-content,#${WINDOW_ID} .pi-merchant-log-window .pi-content{padding:0 10px 12px}
         #${WINDOW_ID} .pi-merchant-config-window .pi-head,#${WINDOW_ID} .pi-merchant-log-window .pi-head{background:linear-gradient(135deg,#292111,#0d0d1a)}
         #${WINDOW_ID} .pi-merchant-config-window .pi-title,#${WINDOW_ID} .pi-merchant-log-window .pi-title{color:#f0c766}
        #${WINDOW_ID} .m-server-row{display:flex;align-items:center;gap:7px;padding:7px 0;border-bottom:1px solid #24263a}
        #${WINDOW_ID} .m-server-row select{flex:1;min-width:0}
        #${WINDOW_ID} .m-listing-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:7px}
        #${WINDOW_ID} .m-listing{display:grid;grid-template-columns:42px minmax(0,1fr);gap:8px;align-items:center;background:#141525;border:1px solid #2d3048;border-radius:6px;padding:7px;min-width:0}
        #${WINDOW_ID} .m-listing-icon{width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:#090a12;border:1px solid #45485e;border-radius:4px;overflow:hidden;color:#8ef1ff;font-weight:bold;font-size:10px}
        #${WINDOW_ID} .m-listing-icon img{max-width:none;max-height:none;image-rendering:pixelated}
        #${WINDOW_ID} .m-listing-name{color:#f0f1fa;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #${WINDOW_ID} .m-listing-meta{color:#ffd36a;font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #${WINDOW_ID} .m-listing-detail{color:#898ca3;font-size:9px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #${WINDOW_ID} .m-market-tabs{display:flex;gap:6px;margin:0 0 10px}
        #${WINDOW_ID} .m-market-tab{background:#17182a;color:#d7d9e8;border:1px solid #444861;border-radius:4px;padding:5px 10px;cursor:pointer;font:11px 'Courier New',monospace}
        #${WINDOW_ID} .m-market-tab.is-active{background:#173d46;color:#8ef1ff;border-color:#51d2e1;box-shadow:inset 0 0 0 1px rgba(81,210,225,.16)}
        #${WINDOW_ID} .m-trend-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:7px}
        #${WINDOW_ID} .m-trend-card{display:grid;grid-template-columns:42px minmax(0,1fr);gap:8px;background:#141525;border:1px solid #2d3048;border-radius:6px;padding:8px;min-width:0}
        #${WINDOW_ID} .m-trend-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}
        #${WINDOW_ID} .m-trend-name{color:#f0f1fa;font-weight:bold;overflow-wrap:anywhere}
        #${WINDOW_ID} .m-trend-meta{color:#898ca3;font-size:9px;margin-top:2px}
        #${WINDOW_ID} .m-trend-prices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}
        #${WINDOW_ID} .m-trend-stat{background:#0d0e18;border:1px solid #292c41;border-radius:4px;padding:5px;min-width:0}
        #${WINDOW_ID} .m-trend-stat-label{color:#898ca3;font-size:8px;text-transform:uppercase}
        #${WINDOW_ID} .m-trend-stat-value{color:#ffd36a;font-size:10px;font-weight:bold;margin-top:3px;overflow-wrap:anywhere}
        #${WINDOW_ID} .m-trend-last{color:#8ef1ff;font-size:9px;margin-top:7px}
        #${WINDOW_ID} .m-trend-warning{color:#ffb0b0;border:1px solid #8b424b;background:#311c24;border-radius:5px;padding:7px;margin-bottom:8px;font-size:10px}
        #${WINDOW_ID} .m-trend-note{color:#898ca3;font-size:9px;margin:0 0 8px}
        #${WINDOW_ID} .m-stand-empty{background:#141525;border:1px dashed #45485e;border-radius:6px;padding:12px;color:#898ca3}
        #${WINDOW_ID} .pi-catalog-toolbar{display:flex;gap:7px;align-items:center;margin-bottom:9px;flex-wrap:wrap}
       #${WINDOW_ID} .pi-catalog-toolbar input{flex:1;min-width:180px}
       #${WINDOW_ID} .pi-catalog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:6px}
       #${WINDOW_ID} .pi-catalog-card{display:flex;flex-direction:column;align-items:center;min-width:0;text-align:center;background:#111326;border:1px solid #343752;border-radius:6px;padding:7px;cursor:pointer;color:#d7d9e8}
       #${WINDOW_ID} .pi-catalog-card:hover{border-color:#51d2e1;background:#162332}
       #${WINDOW_ID} .pi-catalog-icon{height:44px;width:44px;display:flex;align-items:center;justify-content:center;color:#8ef1ff;font-weight:bold;font-size:10px;overflow:hidden}
       #${WINDOW_ID} .pi-catalog-icon img{max-width:none;max-height:none;image-rendering:pixelated}
       #${WINDOW_ID} .pi-catalog-name{max-width:100%;margin-top:4px;color:#f0f1fa;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
       #${WINDOW_ID} .pi-catalog-meta{max-width:100%;color:#898ca3;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
       #${WINDOW_ID} .pi-catalog-detail{margin-top:9px;padding:9px;background:#11232b;border:1px solid #3b8d9b;border-radius:6px;line-height:1.45;overflow-wrap:anywhere}
        #${WINDOW_ID} .pi-skill-detail{position:sticky;bottom:0;z-index:4;background:#101d2b;box-shadow:0 -8px 18px rgba(3,4,12,.55)}
        #${WINDOW_ID} .pi-skill-detail-head{display:flex;align-items:flex-start;gap:9px;margin-bottom:7px}
        #${WINDOW_ID} .pi-skill-detail-title{flex:1;color:#8ef1ff;font-size:14px;font-weight:bold}
       #${WINDOW_ID} .pi-catalog-modal{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(3,4,12,.84)}
       #${WINDOW_ID} .pi-catalog-modal-card{width:min(820px,100%);max-height:100%;overflow:auto;background:#0d0d1a;border:1px solid #51d2e1;border-radius:8px;box-shadow:0 0 28px rgba(81,210,225,.28);padding:12px}
       #${WINDOW_ID} .pi-catalog-modal-head{display:flex;align-items:flex-start;gap:9px;border-bottom:1px solid #343752;padding-bottom:8px;margin-bottom:9px}
       #${WINDOW_ID} .pi-catalog-modal-title{flex:1;color:#8ef1ff;font-size:15px;font-weight:bold;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-catalog-modal-close{flex:none}
       #${WINDOW_ID} .pi-catalog-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px;margin-top:9px}
       #${WINDOW_ID} .pi-catalog-stat{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #24263a;padding:5px 0;min-width:0}
       #${WINDOW_ID} .pi-catalog-stat-key{color:#898ca3;text-transform:capitalize;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-catalog-stat-value{color:#8ef1ff;font-family:'Courier New',monospace;text-align:right;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-catalog-explanation{margin-top:9px;padding:8px;background:#11232b;border-left:3px solid #51d2e1;color:#d7d9e8;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-catalog-acquisition{margin-top:13px;padding-top:10px;border-top:1px solid #343752}
       #${WINDOW_ID} .pi-catalog-acquisition-title{color:#8ef1ff;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.06em}
       #${WINDOW_ID} .pi-catalog-acquisition-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px;margin-top:7px}
       #${WINDOW_ID} .pi-catalog-source-card{display:grid;grid-template-columns:38px minmax(0,1fr);gap:7px;align-items:start;background:#111326;border:1px solid #343752;border-radius:6px;padding:7px;min-width:0}
       #${WINDOW_ID} .pi-catalog-source-card .pi-catalog-icon{height:36px;width:36px}
       #${WINDOW_ID} .pi-catalog-source-name{color:#f0f1fa;font-size:11px;font-weight:bold;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-catalog-source-odds{color:#8ef1ff;font-size:10px;margin-top:3px;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-catalog-source-meta{color:#898ca3;font-size:9px;margin-top:3px;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-catalog-acquisition-note{color:#898ca3;font-size:9px;margin-top:7px;line-height:1.4;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-catalog-recipe-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:6px;margin-top:7px}
       #${WINDOW_ID} .pi-catalog-recipe-item{display:flex;align-items:center;gap:7px;background:#111326;border:1px solid #343752;border-radius:6px;padding:5px;min-width:0}
       #${WINDOW_ID} .pi-catalog-recipe-item .pi-catalog-icon{height:30px;width:30px;flex:none}
       #${WINDOW_ID} .pi-catalog-recipe-name{color:#d7d9e8;font-size:10px;overflow-wrap:anywhere}
       @media(max-width:620px){#${WINDOW_ID} .pi-catalog-stat-grid{grid-template-columns:1fr}}
       #${WINDOW_ID} .pi-drop-modal{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(3,4,12,.82)}
       #${WINDOW_ID} .pi-drop-modal-card{width:min(700px,100%);max-height:100%;overflow:auto;background:#0d0d1a;border:1px solid #51d2e1;border-radius:8px;box-shadow:0 0 28px rgba(81,210,225,.28);padding:12px}
       #${WINDOW_ID} .pi-drop-modal-head{display:flex;align-items:flex-start;gap:9px;border-bottom:1px solid #343752;padding-bottom:8px;margin-bottom:9px}
       #${WINDOW_ID} .pi-drop-modal-title{flex:1;color:#8ef1ff;font-size:15px;font-weight:bold}
       #${WINDOW_ID} .pi-drop-modal-close{flex:none}
       #${WINDOW_ID} .pi-drop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px}
       #${WINDOW_ID} .pi-drop-card{display:grid;grid-template-columns:46px minmax(0,1fr);gap:7px;align-items:center;background:#17182a;border:1px solid #343752;border-radius:6px;padding:6px}
       #${WINDOW_ID} .pi-drop-card .pi-catalog-icon{height:42px;width:42px}
       #${WINDOW_ID} .pi-drop-name{color:#f0f1fa;font-size:11px;font-weight:bold;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-drop-id{color:#777b93;font-size:9px;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-drop-chance{color:#8ef1ff;font-size:10px;margin-top:2px}
       #${WINDOW_ID} .pi-mail-list,#${WINDOW_ID} .pi-log-list{display:grid;gap:7px}
       #${WINDOW_ID} .pi-mail-card,#${WINDOW_ID} .pi-log-card{background:#111326;border:1px solid #343752;border-radius:6px;padding:9px;overflow-wrap:anywhere}
       #${WINDOW_ID} .pi-mail-head,#${WINDOW_ID} .pi-log-head{display:flex;justify-content:space-between;gap:8px;color:#8ef1ff;font-size:10px}
       #${WINDOW_ID} .pi-mail-subject{color:#fff;font-weight:bold;margin:4px 0}
       #${WINDOW_ID} .pi-mail-message{color:#d7d9e8;white-space:pre-wrap;line-height:1.45}
       #${WINDOW_ID} .pi-mail-attachment{display:flex;align-items:center;gap:6px;margin-top:7px;color:#ffd36a}
       #${WINDOW_ID} .pi-class-block{border-top:1px solid #343752;padding-top:8px;margin-top:9px}
       #${WINDOW_ID} .pi-class-title{color:#d39bff;font-size:12px;font-weight:bold;margin-bottom:6px}
        #${WINDOW_ID} .pi-bank-tab{border-top:1px solid #343752;padding-top:8px;margin-top:8px}
        #${WINDOW_ID} .pi-bank-grid{display:grid;grid-template-columns:repeat(7,42px);grid-auto-rows:42px;gap:3px;margin-top:5px;justify-content:start}
        #${WINDOW_ID} .pi-bank-slot{position:relative;width:42px;height:42px;padding:0;background:#090a12;border:2px solid #45485e;border-radius:0;color:#d7d9e8;overflow:hidden;cursor:pointer}
        #${WINDOW_ID} .pi-bank-slot:disabled{cursor:default;opacity:.8}
        #${WINDOW_ID} .pi-bank-slot.has-item:hover,#${WINDOW_ID} .pi-bank-slot.has-item:focus-visible{border-color:#51d2e1;outline:none}
        #${WINDOW_ID} .pi-bank-slot-icon{position:absolute;inset:0;width:38px;height:38px;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#8ef1ff;font-weight:bold;font-size:9px}
        #${WINDOW_ID} .pi-bank-slot-icon img{max-width:none;max-height:none;width:auto;height:auto;image-rendering:pixelated}
        #${WINDOW_ID} .pi-bank-slot-quantity,#${WINDOW_ID} .pi-bank-slot-level{position:absolute;z-index:2;color:#fff;font:700 10px Arial,sans-serif;line-height:11px;text-shadow:-1px 0 #000,0 1px #000,1px 0 #000,0 -1px #000;pointer-events:none}
        #${WINDOW_ID} .pi-bank-slot-quantity{right:1px;bottom:0}
        #${WINDOW_ID} .pi-bank-slot-level{left:1px;top:0;color:#ffe36b}
       #${WINDOW_ID} .pi-log-character{color:#51d2e1;font-size:12px;font-weight:bold;margin:8px 0 4px}
       @media(max-width:620px){#${WINDOW_ID} .m-grid,#${WINDOW_ID} .m-grid-two,#${WINDOW_ID} .m-summary{grid-template-columns:1fr}}
        @media(max-width:620px){#${WINDOW_ID} .pi-grid,#${WINDOW_ID} .pi-grid.two,#${WINDOW_ID} .pi-form-grid,#${WINDOW_ID} .m3-grid{grid-template-columns:1fr}#${WINDOW_ID} .pi-field.full{grid-column:auto}#${WINDOW_ID} .merchant-log-toolbar{grid-template-columns:1fr}#${WINDOW_ID} .merchant-log-count{text-align:left}}
      `.replaceAll("#" + WINDOW_ID, "." + WINDOW_CLASS) }));
  }
  function makeDashboardWindow(title, dashboardId) {
    const panelId = WINDOW_ID + "-" + Date.now().toString(36) + "-" + (++dashboardWindowSequence);
    const merchantConfig = ["merchant-config", "merchant-settings"].includes(dashboardId);
    const merchantLoot = dashboardId === "merchant-loot";
    const merchantPonty = dashboardId === "merchant-ponty";
    const merchantUpgrade = dashboardId === "merchant-upgrade";
    const merchantAnniversary = dashboardId === "merchant-anniversary";
    const merchantDashboard = dashboardId === "merchant-dashboard";
    const merchantLog = ["merchant-log", "logs"].includes(dashboardId);
    const trioOptions = dashboardId === "trio-options";
    const trioHunt = dashboardId === "trio-hunt";
    const trioHuntMenu = dashboardId === "trio-hunt-menu";
    const trioHuntSub = dashboardId === "trio-hunt-sub";
    const trioInventory = dashboardId === "trio-inventory";
    const trioRuntime = dashboardId === "trio-runtime";
    const trioStats = dashboardId === "trio-stats";
    const trioDashboard = dashboardId === "trio-dashboard";
    const companionPanel = ["merchant-dashboard", "merchant-config", "merchant-settings", "merchant-loot", "merchant-ponty", "merchant-upgrade", "merchant-anniversary", "merchant-log", "trio-dashboard", "trio-options", "trio-hunt", "trio-hunt-menu", "trio-inventory", "trio-runtime", "trio-stats"].includes(dashboardId);
    const controlMenu = trioOptions || trioHunt || trioHuntMenu || trioHuntSub;
    const native = /^trio-/.test(dashboardId || "") || ["merchant-dashboard", "merchant-stand", "merchant-server", "merchant-log", "merchant-market", "merchant-config", "merchant-settings", "merchant-loot", "merchant-ponty", "merchant-upgrade", "merchant-anniversary", "mail", "catalog", "bestiary", "skills", "bank", "logs"].includes(dashboardId);
    const merchant = ["merchant-dashboard", "merchant-stand", "merchant-server", "merchant-log", "merchant-market", "merchant-config", "merchant-settings", "merchant-loot", "merchant-ponty", "merchant-upgrade", "merchant-anniversary", "logs"].includes(dashboardId);
    const wide = ["catalog", "bestiary", "skills", "bank", "logs", "merchant-stand", "merchant-market"].includes(dashboardId);
    const windowClass = (native ? (merchant ? "pi-native-window pi-merchant-window" : "pi-native-window") : "") +
      (controlMenu ? " pi-control-menu-window" : "") + (merchantDashboard ? " pi-merchant-dashboard-window" : "") +
      (merchantConfig ? " pi-merchant-config-window" : "") + (merchantLoot ? " pi-merchant-loot-window" : "") +
      (merchantPonty ? " pi-merchant-ponty-window" : "") + (merchantUpgrade ? " pi-merchant-upgrade-window" : "") +
      (merchantAnniversary ? " pi-merchant-anniversary-window" : "") + (merchantLog ? " pi-merchant-log-window" : "") +
      (trioOptions ? " pi-trio-options-window" : "") + (trioHunt ? " pi-trio-hunt-window" : "") + (trioHuntMenu ? " pi-trio-hunt-menu-window" : "") + (trioHuntSub ? " pi-trio-hunt-sub-window" : "") +
      (trioInventory ? " pi-trio-inventory-window" : "") + (trioRuntime ? " pi-trio-runtime-window" : "") +
      (trioStats ? " pi-trio-stats-window" : "") + (trioDashboard ? " pi-trio-dashboard-window" : "") + (companionPanel ? " pi-companion-window" : "");
    const width = trioOptions ? "min(430px, calc(100vw - 30px))" : trioHuntSub ? "min(620px, calc(100vw - 30px))" : trioHunt || trioHuntMenu ? "min(460px, calc(100vw - 30px))" :
      trioInventory ? "max-content" : trioRuntime ? "min(610px, calc(100vw - 30px))" : trioStats ? "min(640px, calc(100vw - 30px))" :
      merchantConfig ? "min(560px, calc(100vw - 30px))" : merchantLoot ? "min(430px, calc(100vw - 30px))" :
      merchantPonty ? "min(470px, calc(100vw - 30px))" : merchantUpgrade ? "min(760px, calc(100vw - 30px))" :
      merchantAnniversary ? "min(600px, calc(100vw - 30px))" : merchantLog ? "min(650px, calc(100vw - 30px))" :
      merchant ? "min(500px, calc(100vw - 30px))" : native ? (wide ? "min(900px, calc(100vw - 30px))" : trioDashboard ? "min(590px, calc(100vw - 30px))" : "min(500px, calc(100vw - 30px))") : "min(900px, calc(100vw - 24px))";
    const height = trioOptions || trioHunt || trioHuntMenu || trioHuntSub || trioInventory || trioRuntime || trioStats || trioDashboard ? "auto" :
      merchantConfig || merchantAnniversary ? "min(82vh, calc(100vh - 110px))" :
      merchantLoot || merchantPonty || merchantUpgrade ? "min(78vh, calc(100vh - 110px))" :
      merchantLog ? "min(480px, calc(100vh - 110px))" : merchant ? "min(820px, calc(100vh - 110px))" :
      native ? "min(820px, calc(100vh - 110px))" : "min(760px, calc(100vh - 90px))";
    const panel = make("div", { id: panelId, class: WINDOW_CLASS + " " + windowClass, "data-pi-dashboard-id": dashboardId });
    Object.assign(panel.style, { position: "fixed", left: native ? "35px" : "clamp(12px, 18vw, 260px)", top: native ? "95px" : "70px", width, height,
      maxHeight: merchantPonty ? "calc(100vh - 30px)" : trioRuntime ? "min(70vh, calc(100vh - 40px))" : trioDashboard ? "80vh" : (trioOptions || trioHunt || trioHuntMenu || trioHuntSub || trioInventory || trioStats) ? "min(82vh, calc(100vh - 30px))" : "",
      maxWidth: merchantPonty || trioInventory ? "calc(100vw - 30px)" : "", minWidth: trioOptions ? "min(430px, calc(100vw - 30px))" : trioHuntSub ? "min(620px, calc(100vw - 30px))" : trioHunt || trioHuntMenu ? "min(460px, calc(100vw - 30px))" : trioInventory ? "min(830px, calc(100vw - 30px))" : merchantPonty ? "min(390px, calc(100vw - 30px))" : "390px",
      minHeight: trioOptions || trioHunt || trioHuntMenu || trioHuntSub || trioInventory || trioRuntime || trioStats || trioDashboard ? "0" : merchantPonty ? "min(300px, calc(100vh - 30px))" : "320px", resize: native && !merchantPonty ? "none" : "both", overflow: "hidden", zIndex: String(dashboardWindowZIndex) });
    if (trioOptions) { panel.style.left = "40px"; panel.style.top = "95px"; }
    if (trioHunt) { panel.style.left = "auto"; panel.style.right = "40px"; panel.style.top = "95px"; }
    if (trioHuntSub) { panel.style.left = "auto"; panel.style.right = "70px"; panel.style.top = "120px"; }
    if (trioInventory) { panel.style.left = "auto"; panel.style.right = "20px"; panel.style.top = "120px"; }
    if (trioRuntime) { panel.style.left = "auto"; panel.style.right = "25%"; panel.style.top = "20px"; }
    if (trioStats) { panel.style.left = "auto"; panel.style.right = "70px"; panel.style.top = "120px"; }
    if (trioDashboard) { panel.style.left = "auto"; panel.style.right = "340px"; panel.style.top = "auto"; panel.style.bottom = "0"; panel.style.width = "max-content"; }
    const layoutKey = LAYOUT_KEY + ":" + dashboardId;
    const saved = parseJson(window.localStorage.getItem(layoutKey) || "null");
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top) && !controlMenu && !trioDashboard) { panel.style.right = "auto"; panel.style.bottom = "auto"; panel.style.left = Math.max(0, saved.left) + "px"; panel.style.top = Math.max(0, saved.top) + "px"; }
    if (saved && Number.isFinite(saved.width) && !controlMenu && !trioInventory && !trioDashboard) panel.style.width = Math.max(390, saved.width) + "px";
    if (saved && Number.isFinite(saved.height) && !controlMenu && !trioInventory && !trioRuntime && !trioStats && !trioDashboard) panel.style.height = Math.max(320, saved.height) + "px";
    addStyle(panel);
    const header = make("div", { class: "pi-head" });
    const heading = make("div", { class: "pi-title", text: title });
    const pontyViewButton = merchantPonty ? themedButton("PONTY LOG", () => { merchantPontyView = merchantPontyView === "log" ? "items" : "log"; heading.textContent = merchantPontyView === "log" ? "Merchant V3 Ponty Log" : "Merchant V3 Ponty Items"; pontyViewButton.textContent = merchantPontyView === "log" ? "PONTY ITEMS" : "PONTY LOG"; renderActive(panel); }) : null;
    const refresh = themedButton("REFRESH", () => { if (settingsDirty) { statusNode(panel, "Unsaved changes are waiting. Apply or reset them before refreshing.", true); return; } loadAndRender(panel); });
    const close = themedButton("×", () => { panel.remove(); stopRefresh(panel); });
    refresh.className += " pi-refresh-control"; refresh.title = "Refresh"; close.title = "Close";
    const headerAction = (label, titleText, handler, color = "cyan") => {
      const button = themedButton(label, handler);
      button.title = titleText;
      button.className += " pi-header-action";
      if (color === "gold") Object.assign(button.style, { background: "#3d3218", color: "#ffe093", borderColor: "#d6a844" });
      else if (color === "purple") Object.assign(button.style, { background: "#292342", color: "#d4b9ff", borderColor: "#8b6dcc" });
      else if (color === "blue") Object.assign(button.style, { background: "#193047", color: "#8fdfff", borderColor: "#4599bb" });
      return button;
    };
    if (merchantDashboard) {
      Object.assign(close.style, { background: "transparent", border: "0", color: "#999", fontSize: "20px", lineHeight: "18px", padding: "0 4px" });
      const titleLine = make("div", { class: "pi-title-line" }, heading, close);
      const actionRow = make("div", { class: "m-actions" });
      actionRow.append(merchantActionButton("CONFIG", "m-config", () => openDashboard("merchant-config")), merchantActionButton("LOG", "m-blue", () => openDashboard("merchant-log")), merchantActionButton("PONTY", "m-gold", () => sendMerchantAction(panel, "ponty")), merchantActionButton("SERVER", "m-gold", () => openDashboard("merchant-server")), merchantActionButton("COURIER", "m-green", () => sendMerchantAction(panel, "courier")), merchantActionButton("PATROL", "m-purple", () => sendMerchantAction(panel, "patrol")), merchantActionButton("BANK NOW", "m-gold", () => sendMerchantAction(panel, "bank")));
      header.append(titleLine, actionRow);
    } else if (trioInventory) {
      header.append(heading,
        headerAction("−", "Smaller inventory slots", () => { void setTrioInventoryScale(panel, -0.05); }, "gold"),
        headerAction("+", "Larger inventory slots", () => { void setTrioInventoryScale(panel, 0.05); }, "gold"),
        headerAction("SYNC ALL", "Request fresh inventories from the active Trio", () => sendTrioInventoryControl(panel, "syncAll"), "gold"), close);
    } else if (trioRuntime) {
      header.append(heading, headerAction("RESTART ALL", "Restart all active Trio characters", () => sendTrioRuntimeControl(panel, "restartAll"), "blue"), close);
    } else if (trioStats) {
      heading.textContent = "TRIO STATS";
      header.append(heading, headerAction("📈 GRAPHS", "Open the Trio metrics graphs", () => sendTrioGraphsRequest(panel)), close);
    } else {
      header.append(heading, ...(pontyViewButton ? [pontyViewButton] : []), ...(companionPanel ? [] : [refresh]), close);
    }
    panel.append(header, make("div", { class: "pi-status", "data-pi-dashboard-status": "" }), make("div", { class: "pi-content", "data-pi-dashboard-content": "" }));
    let drag = null;
    header.addEventListener("pointerdown", (event) => { focusDashboardWindow(panel); const target = event.target; if (target === refresh || target === close || (target instanceof Element && target.closest("button, input, select, textarea, a, label, [role='button']"))) return; drag = { x: event.clientX, y: event.clientY, left: panel.offsetLeft, top: panel.offsetTop }; header.setPointerCapture(event.pointerId); });
    header.addEventListener("pointermove", (event) => { if (drag) { panel.style.right = "auto"; panel.style.bottom = "auto"; panel.style.left = Math.max(0, drag.left + event.clientX - drag.x) + "px"; panel.style.top = Math.max(0, drag.top + event.clientY - drag.y) + "px"; } });
    header.addEventListener("pointerup", () => { drag = null; persistLayout(panel); });
    panel.addEventListener("mouseup", () => persistLayout(panel)); panel.addEventListener("mousedown", () => focusDashboardWindow(panel));
    document.body.append(panel); focusDashboardWindow(panel); return panel;
  }
  function focusDashboardWindow(panel) {
    if (!panel?.isConnected) return;
    dashboardWindowZIndex += 1;
    if (dashboardWindowZIndex >= 2147483646) {
      dashboardWindowZIndex = 2147483000;
      document.querySelectorAll("." + WINDOW_CLASS).forEach((candidate) => {
        candidate.style.zIndex = String(++dashboardWindowZIndex);
      });
    }
    panel.style.zIndex = String(dashboardWindowZIndex);
  }
  function persistLayout(panel) { if (panel?.isConnected && !["trio-options", "trio-hunt", "trio-hunt-menu", "trio-dashboard"].includes(panel.dataset?.piDashboardId)) window.localStorage.setItem(LAYOUT_KEY + ":" + panel.dataset.piDashboardId, JSON.stringify({ left: panel.offsetLeft, top: panel.offsetTop, width: panel.offsetWidth, height: panel.offsetHeight })); }
   function stopRefresh(panel) { if (!panel) return; const timer = refreshTimers.get(panel); if (timer) window.clearInterval(timer); refreshTimers.delete(panel); }
    function dashboardEditorActive(panel) { if (panel?.querySelector(".pi-drop-modal, .pi-catalog-modal")) return true; const dashboardId = panel?.dataset?.piDashboardId || activeDashboard; if (!EDITABLE_DASHBOARDS.has(dashboardId)) return false; if (settingsDirty) return true; const focused = document.activeElement; return Boolean(focused && panel.contains(focused) && ["INPUT", "SELECT", "TEXTAREA"].includes(focused.tagName)); }
   function startRefresh(panel) { stopRefresh(panel); const dashboardId = panel?.dataset?.piDashboardId || activeDashboard; if (STATIC_DASHBOARDS.has(dashboardId)) return; const timer = window.setInterval(async () => { if (!panel.isConnected) { stopRefresh(panel); return; } if (settingsDirty || dashboardId === "script-storage") return; try { activeDashboard = dashboardId; activeSnapshot = await readSnapshot(); if (["merchant-dashboard", "merchant-server", "merchant-anniversary"].includes(dashboardId)) await readMerchantLiveState(); if (dashboardId === "merchant-stand") await readMerchantStandState(); if (dashboardId === "merchant-market") await readMerchantMarketState(); if (dashboardId === "skills") await readMerchantSkillsState().catch(() => {}); if (dashboardId === "mail") await readMail(); if (["logs", "merchant-log"].includes(dashboardId)) await readActivity(); if (!dashboardEditorActive(panel)) renderActive(panel); } catch (_) { } }, 3000); refreshTimers.set(panel, timer); }
  function section(title, className = "pi-section") { return make("section", { class: className }, make("div", { class: "pi-section-title", text: title })); }
  function metric(title, value, detail = "") { return make("div", { class: "pi-metric" }, make("div", { class: "pi-label", text: title }), make("div", { class: "pi-value", text: safeText(value) }), detail ? make("div", { class: "pi-muted", text: detail }) : null); }
  function bar(labelText, value, maximum, color, display) { const percent = Math.max(0, Math.min(100, maximum ? number(value) / number(maximum, 1) * 100 : 0)); return make("div", { class: "pi-bar" }, make("div", { class: "pi-bar-fill", style: { width: percent + "%", background: color } }), make("div", { class: "pi-bar-text", text: labelText + ": " + (display ?? (formatNumber(value) + "/" + formatNumber(maximum))) })); }
  function valueFrom(object, paths, fallback = "—") { for (const path of paths) { const value = getPath(object, path); if (value !== undefined && value !== null && value !== "") return value; } return fallback; }
  function appendKeyValue(sectionNode, labelText, value) { sectionNode.appendChild(make("div", { class: "pi-field" }, make("span", { text: labelText }), make("span", { class: "pi-value", text: safeText(value) }))); }
  function footer(panel, ...buttons) { const actions = make("div", { class: "pi-actions" }); buttons.forEach((buttonNode) => actions.append(buttonNode)); panel.appendChild(actions); return actions; }

  function merchantDuration(milliseconds) { const value = Math.max(0, number(milliseconds, 0)); if (!Number.isFinite(Number(milliseconds))) return "—"; const seconds = Math.floor(value / 1000); const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60; if (days) return days + "d " + hours + "h"; if (hours) return hours + "h " + minutes + "m"; if (minutes) return minutes + "m " + rest + "s"; return rest + "s"; }
  function merchantMetric(title, value, detail = "") { return make("div", { class: "m-metric" }, make("div", { class: "m-label", text: title }), make("div", { class: "m-value", text: safeText(value) }), detail ? make("div", { class: "m-detail", text: safeText(detail) }) : null); }
  function merchantBar(labelText, value, maximum, color) { const percent = Math.max(0, Math.min(100, number(maximum) ? number(value) / number(maximum) * 100 : 0)); return make("div", {}, make("div", { class: "m-bar-label", text: labelText + ": " + formatNumber(value) + "/" + formatNumber(maximum) }), make("div", { class: "m-bar-wrap" }, make("div", { class: "m-bar", style: { width: percent + "%", background: color } }))); }
  function merchantActionButton(label, className, handler) { const button = make("button", { type: "button", class: className, text: label }); button.addEventListener("click", handler); return button; }
  function panelForContent(content) { return content.closest("." + WINDOW_CLASS); }
  function renderMerchantDashboard(content) {
    const stateEntry = entry(MERCHANT_STATE_KEY) || entrySuffix(".MerchantEvents.stateV3"); const settingsEntry = entry(MERCHANT_SETTINGS_KEY) || entrySuffix(".MerchantConfigUI.settings"); const stored = isObject(stateEntry?.value) ? stateEntry.value : {}; const state = Object.assign({}, stored, isObject(merchantLiveState) ? merchantLiveState : {}); const live = merchantLiveState && merchantLiveState.live === true; const body = make("div", { class: "m-body" });
      const summary = make("div", { class: "m-summary" }); const identity = make("div", { class: "m-card" }); identity.append(make("div", { class: "m-name", text: safeText(valueFrom(state, ["name", "character"], "Character01MCH")) + "  MERCHANT · LV " + safeText(valueFrom(state, ["level"], "—")) }), make("div", { text: "● " + safeText(valueFrom(state, ["phase"], "Waiting for merchant state")) }), merchantBar("HP", state.hp, state.max_hp, "#45bd59"), merchantBar("MP", state.mp, state.max_mp, "#3a91df"));
    const locationCard = make("div", { class: "m-card" }); locationCard.append(make("div", { class: "m-label", text: "LOCATION" }), make("div", { class: "m-value", text: safeText(valueFrom(state, ["map"], "—")) }), make("div", { class: "m-detail", text: safeText(valueFrom(state, ["serverRegion", "region"], "—")) + " " + safeText(valueFrom(state, ["serverId", "id"], "—")) + " · " + safeText(valueFrom(state, ["x"], "—")) + ", " + safeText(valueFrom(state, ["y"], "—")) }), make("div", { class: "m-label", style: { marginTop: "8px" }, text: "UPTIME" }), make("div", { class: "m-value", text: merchantDuration(Date.now() - number(state.sessionStartedAt, Date.now())) })); summary.append(identity, locationCard); body.append(summary);
    const current = make("div", { class: "m-current" }); const ageSeconds = state.updatedAt ? Math.max(1, Math.floor((Date.now() - number(state.updatedAt)) / 1000)) : 0; current.append(make("div", { class: "m-current-head" }, make("strong", { text: "CURRENTLY DOING" }), make("span", { text: live ? "LIVE · " + ageSeconds + "s" : "STORED STATE" })), make("div", { class: "m-current-job", text: safeText(valueFrom(state, ["action", "phase"], "Idle")) }), make("div", { class: "m-current-step", text: safeText(valueFrom(state, ["currentStep"], "Waiting for live merchant runtime")) }), make("div", { class: "m-current-time", text: "Job: " + merchantDuration(Date.now() - number(state.actionStartedAt, Date.now())) + " · Current step: " + merchantDuration(Date.now() - number(state.stepStartedAt, Date.now())) })); body.append(current);
    const courier = make("section", { class: "m-section" }, make("div", { class: "m-title", text: "Courier Operation" }), make("div", { class: "m-grid" })); courier.lastChild.append(merchantMetric("STATUS", state.courierPhase === "idle" ? "Standing by" : String(valueFrom(state, ["courierPhase"], "—")).replace(/_/g, " "), "Current: " + safeText(valueFrom(state, ["courierMember"], "—"))), merchantMetric("TRIPS", valueFrom(state, ["sessionCourierTrips"], "—"), valueFrom(state, ["sessionDeliveries"], "—") + " deliveries"), merchantMetric("PICKUPS", valueFrom(state, ["sessionPickupStacks"], "—"), "Stacks collected"), merchantMetric("JUNK SOLD", valueFrom(state, ["sessionJunkStacksSold"], "—"), "Protected loot banked"), merchantMetric("LAST CLIENT", valueFrom(state, ["lastCourierService"], "—"), "Most recent service")); body.append(courier);
    const funds = make("section", { class: "m-section" }, make("div", { class: "m-title", text: "Inventory and Funds" }), make("div", { class: "m-grid m-grid-two" })); const goldDelta = number(state.goldDelta, 0); funds.lastChild.append(merchantMetric("GOLD", formatNumber(state.gold), (goldDelta > 0 ? "+" : "") + formatNumber(goldDelta) + " net"), merchantMetric("POTIONS", state.potions ? formatNumber(state.potions.hp) + " / " + formatNumber(state.potions.mp) : "—", "HP / MP available"), merchantMetric("FREE SLOTS", valueFrom(state, ["freeSlots"], "—"))); body.append(funds);
    const gathering = state.gathering || {}; const gatheringSection = make("section", { class: "m-section" }, make("div", { class: "m-title", text: "Gathering" }), make("div", { class: "m-grid m-grid-two" })); gatheringSection.lastChild.append(merchantMetric("MINING", gathering.mining == null ? "—" : (gathering.mining > 0 ? "Wait " + merchantDuration(gathering.mining) : "Ready"), "Next mining attempt"), merchantMetric("FISHING", gathering.fishing == null ? "—" : (gathering.fishing > 0 ? "Wait " + merchantDuration(gathering.fishing) : "Ready"), "Next fishing attempt")); body.append(gatheringSection);
    const auto = make("section", { class: "m-section" }, make("div", { class: "m-title", text: "Automation" }), make("div", { class: "m-grid m-grid-two" })); const production = isObject(state.production) ? state.production : {}; const market = isObject(state.market) ? state.market : {}; auto.lastChild.append(merchantMetric("PRODUCTION", valueFrom(production, ["label", "status"], "—"), valueFrom(production, ["detail"], "No eligible production items")), merchantMetric("MARKET", valueFrom(market, ["value", "status"], "—"), valueFrom(market, ["detail"], "Stand automation"))); body.append(auto);
    const luck = make("section", { class: "m-section" }, make("div", { class: "m-title", text: "Merchant's Luck" }), make("div", { class: "m-grid m-grid-two" })); luck.lastChild.append(merchantMetric("TRIO CASTS", valueFrom(state, ["sessionMluckTrio"], "—"), "This session"), merchantMetric("OTHER PLAYERS", valueFrom(state, ["sessionMluckOther"], "—"), "This session")); body.append(luck);
    body.append(sourceNote(live ? MERCHANT_LIVE_ENDPOINT : stateEntry?.key, live ? "Live CaracAL merchant runtime" : "Stored merchant state"), sourceNote(settingsEntry?.key, "Merchant configuration")); content.append(body);
  }
  const MERCHANT_LOG_CATEGORIES = [
    { key: "all", label: "All activity", color: "#d7d9e8" },
    { key: "courier", label: "Courier", color: "#51d2e1" },
    { key: "gathering", label: "Gathering", color: "#62d985" },
    { key: "mluck", label: "Mluck", color: "#62d985" },
    { key: "production", label: "Production", color: "#ba8cff" },
    { key: "market", label: "Market", color: "#f0c766" },
    { key: "banking", label: "Banking", color: "#67a7ff" },
    { key: "supplies", label: "Supplies", color: "#ff9e64" },
    { key: "safety", label: "Safety", color: "#ef6868" },
    { key: "donation", label: "Donation", color: "#ffd700" },
    { key: "system", label: "System", color: "#9a9db3" },
  ];
  function merchantLogCategory(record) {
    const key = String(record?.category || record?.type || "system").toLowerCase();
    return MERCHANT_LOG_CATEGORIES.find((category) => category.key === key) || { key, label: key || "System", color: "#9a9db3" };
  }
  function merchantLogTime(value) {
    const stamp = timestamp(value);
    return Number.isFinite(stamp) ? new Date(stamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—";
  }
  function merchantActivityRecords() {
    const item = entry(MERCHANT_ACTIVITY_KEY) || entrySuffix(".MerchantActivityLog.entries");
    const stored = Array.isArray(item?.value?.entries) ? item.value.entries : [];
    if (stored.length && activeDashboard !== "logs") return { entries: stored, source: item?.key || MERCHANT_ACTIVITY_KEY, label: "Shared merchant activity log" };
    const allEntries = Object.entries(activityState?.characters || {}).flatMap(([character, records]) => (Array.isArray(records) ? records : []).map((record) => ({ ...record, character })));
    if (activeDashboard === "logs" && allEntries.length) return { entries: allEntries, source: ACTIVITY_ENDPOINT, label: "Server-persisted activity history · all characters" };
    const merchantEntries = Array.isArray(activityState?.characters?.Character01MCH) ? activityState.characters.Character01MCH : [];
    if (merchantEntries.length) return { entries: merchantEntries, source: ACTIVITY_ENDPOINT, label: "Server-persisted merchant activity history" };
    const fallback = Object.values(activityState?.characters || {}).flatMap((records) => Array.isArray(records) ? records : []);
    return { entries: fallback, source: ACTIVITY_ENDPOINT, label: "Server-persisted activity history" };
  }
  function renderMerchantActivity(content) {
    const data = merchantActivityRecords();
    const allEntries = data.entries.slice();
    const body = make("div", { class: "merchant-log-body" });
    const toolbar = make("div", { class: "merchant-log-toolbar" });
    const filter = make("select", {});
    MERCHANT_LOG_CATEGORIES.forEach((category) => filter.append(make("option", { value: category.key, text: category.label })));
    filter.value = MERCHANT_LOG_CATEGORIES.some((category) => category.key === merchantActivityFilter) ? merchantActivityFilter : "all";
    const search = make("input", { type: "search", placeholder: "Search activity…", value: merchantActivitySearch });
    const count = make("span", { class: "merchant-log-count" });
    const characterFilter = make("div", { class: "merchant-log-characters", role: "group", "aria-label": "Filter activity by character" });
    const knownCharacters = activeDashboard === "logs"
      ? Object.entries(activityState?.characters || {}).filter(([name, records]) => name && Array.isArray(records)).map(([name]) => name)
      : [];
    const characterNames = Array.from(new Set([...knownCharacters, ...allEntries.map((record) => String(record?.character || "").trim())].filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
    if (merchantActivityCharacter !== "all" && !characterNames.includes(merchantActivityCharacter)) merchantActivityCharacter = "all";
    const characterButtons = [["all", "All"], ...characterNames.map((name) => [name, name])].map(([key, label]) => {
      const button = make("button", { type: "button", class: "merchant-log-character", text: label });
      button.setAttribute("aria-pressed", String(merchantActivityCharacter === key));
      button.addEventListener("click", () => { merchantActivityCharacter = key; paint(); });
      characterFilter.append(button);
      return { key, button };
    });
    const list = make("div", { class: "merchant-log-list" });
    const paint = () => {
      merchantActivityFilter = filter.value;
      merchantActivitySearch = search.value;
      characterButtons.forEach(({ key, button }) => {
        const selected = merchantActivityCharacter === key;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      const needle = merchantActivitySearch.trim().toLowerCase();
      const visible = allEntries.filter((record) => {
        const category = merchantLogCategory(record);
        if (merchantActivityCharacter !== "all" && record?.character !== merchantActivityCharacter) return false;
        if (merchantActivityFilter !== "all" && category.key !== merchantActivityFilter) return false;
        if (!needle) return true;
         return [record?.character, record?.message, record?.text, record?.category, record?.type, record?.level, category.label].filter(Boolean).join(" ").toLowerCase().includes(needle);
      }).slice().reverse();
      count.textContent = visible.length + " of " + allEntries.length + " entries";
      list.replaceChildren();
      if (!visible.length) {
        list.append(make("div", { class: "merchant-log-empty", text: allEntries.length ? "No activity matches the current filter." : "No merchant activity has been published yet." }));
        return;
      }
      visible.forEach((record) => {
        const category = merchantLogCategory(record);
        const badge = make("span", { class: "merchant-log-category", text: category.label });
        badge.style.color = category.color;
        badge.style.borderColor = category.color;
         list.append(make("div", { class: "merchant-log-row" }, make("span", { class: "merchant-log-time", text: merchantLogTime(record?.at || record?.time || record?.updatedAt) }), badge, make("span", { class: "merchant-log-message", text: safeText((record?.character ? record.character + ": " : "") + (record?.message || record?.text || JSON.stringify(record))) })));
      });
    };
    filter.addEventListener("change", paint);
    search.addEventListener("input", paint);
    toolbar.append(filter, search, count);
    body.append(toolbar, characterFilter, list, sourceNote(data.source, data.label));
    content.append(body);
    paint();
  }
  function renderMerchantLog(content) { renderMerchantActivity(content); }
  function renderMerchantServer(content, panel) {
    const state = isObject(merchantLiveState) ? merchantLiveState : {}; const body = make("div", { class: "m-body" }); const servers = Array.isArray(state.servers) ? state.servers : []; body.append(make("div", { class: "m-title", text: "Merchant Server" }), make("div", { class: "m-muted", text: "This uses the same coordinated server-switch request as the in-game SERVER panel." }));
    const row = make("div", { class: "m-server-row" }); const select = make("select", {}); servers.forEach((server) => { const value = safeText(server.region) + "|" + safeText(server.id); const label = safeText(server.region) + " " + safeText(server.id) + (server.players == null ? "" : " · " + server.players + " players"); select.append(make("option", { value, text: label })); });
    const current = state.currentServer ? safeText(state.currentServer.region) + "|" + safeText(state.currentServer.id) : ""; if (current && servers.some((server) => safeText(server.region) + "|" + safeText(server.id) === current)) select.value = current; row.append(select, themedButton("SWITCH", async () => { const parts = String(select.value || "").split("|"); if (parts.length !== 2 || !parts[0] || !parts[1]) return statusNode(panel, "No server is available from the live merchant runtime.", true); await sendMerchantAction(panel, "server", { region: parts[0], id: parts[1] }); }, "primary")); body.append(row); if (!servers.length) body.append(make("div", { class: "m-muted", text: "The server list is unavailable until the merchant runtime is connected." })); body.append(sourceNote(MERCHANT_LIVE_ENDPOINT, "Live CaracAL merchant runtime")); content.append(body);
  }
  function listingText(item) {
    const quantity = Number(item?.quantity);
    const price = item?.giveaway ? "GIVEAWAY" : (item?.price === null || item?.price === undefined ? "Price unavailable" : formatNumber(item.price) + " gold");
    return (item?.side || "SELL") + " · " + (Number.isFinite(quantity) && quantity > 1 ? "×" + formatNumber(quantity) + " · " : "") + price;
  }
  function renderListingCard(item, owner, detail) {
    const catalogItem = gameCatalogItem(item?.name);
    const icon = gameIcon(catalogItem?.skin || item?.skin || item?.name, "m-listing-icon", item);
    const name = safeText(item?.name || "Unknown item") + (Number(item?.level) > 0 ? " +" + formatNumber(item.level) : "");
    return make("article", { class: "m-listing" }, icon, make("div", { style: { minWidth: "0" } }, make("div", { class: "m-listing-name", text: name, title: name }), make("div", { class: "m-listing-meta", text: listingText(item) }), make("div", { class: "m-listing-detail", text: [owner, detail, item?.slot].filter(Boolean).join(" · ") })));
  }
  function renderMerchantStand(content, panel) {
    const state = isObject(merchantStandState) ? merchantStandState : {};
    const items = Array.isArray(state.ownItems) ? state.ownItems : [];
    const body = make("div", { class: "m-body" });
    body.append(make("div", { class: "m-title", text: "Merchant Stand" }), make("div", { class: "m-muted", text: "The actual trade slots currently published by Character01MCH. This is not the merchant automation dashboard." }));
    const summary = make("div", { class: "m-grid m-grid-two" });
    summary.append(merchantMetric("OWNER", state.character || "Character01MCH"), merchantMetric("STAND", state.stand || "Closed"), merchantMetric("LISTINGS", items.length), merchantMetric("LOCATION", [state.map, state.x + ", " + state.y].filter(Boolean).join(" · ") || "—"));
    body.append(summary);
    const controls = make("div", { class: "m-actions" });
    controls.append(
      themedButton("OPEN STAND", () => sendMerchantAction(panel, "stand", { operation: "open" }), "primary"),
      themedButton("CLOSE STAND", () => sendMerchantAction(panel, "stand", { operation: "close" })),
    );
    body.append(controls);
    const publish = make("form", { class: "m-stand-publish" });
    const inventorySlot = make("input", { type: "number", min: "0", max: "41", placeholder: "Inventory slot" });
    const tradeSlot = make("input", { type: "text", value: "trade1", placeholder: "trade1" });
    const price = make("input", { type: "number", min: "1", step: "1", placeholder: "Price" });
    const quantity = make("input", { type: "number", min: "1", step: "1", value: "1", placeholder: "Quantity" });
    publish.append(make("div", { class: "m-muted", text: "Publish an inventory item to a trade slot" }), inventorySlot, tradeSlot, price, quantity, themedButton("PUBLISH", (event) => {
      event.preventDefault();
      sendMerchantAction(panel, "stand", { operation: "publish", inventorySlot: Number(inventorySlot.value), tradeSlot: tradeSlot.value.trim(), price: Number(price.value), quantity: Number(quantity.value) });
    }, "primary"));
    publish.addEventListener("submit", (event) => event.preventDefault());
    body.append(publish);
    const sectionNode = make("section", { class: "m-section" }, make("div", { class: "m-title", text: "Items for sale / trade" }));
    const grid = make("div", { class: "m-listing-grid" });
    items.forEach((item) => grid.append(renderListingCard(item, state.character || "Character01MCH", "Your stand")));
    if (!grid.childElementCount) grid.append(make("div", { class: "m-stand-empty", text: state.stand ? "The stand is open, but no trade items are visible in the current runner snapshot." : "The merchant stand is currently closed." }));
    sectionNode.append(grid); body.append(sectionNode);
    body.append(sourceNote(MERCHANT_STAND_ENDPOINT, "Live in-game merchant stand slots")); content.append(body);
  }
  function renderMerchantMarketTrends(body, state) {
    const trends = parseMerchantMarketTrends(merchantMarketTrends);
    const region = String(state.server?.region || state.serverRegion || "");
    const server = String(state.server?.id || state.serverId || "");
    const items = Object.values(trends.items).filter((item) => isObject(item) && item.name &&
      (!region || String(item.serverRegion || "") === region) && (!server || String(item.serverId || "") === server));
    items.sort((left, right) => (marketTrendTimestamp(right.lastSeenAt) || 0) - (marketTrendTimestamp(left.lastSeenAt) || 0) ||
      String(left.name).localeCompare(String(right.name)) || Number(left.level || 0) - Number(right.level || 0));
    body.append(make("div", { class: "m-trend-note", text: "Prices are the listing prices shown by Player Market. History is collected while this window is open and kept separately by server, item, upgrade level, listing side, and currency." }));
    if (merchantMarketTrendsSaveError) body.append(make("div", { class: "m-trend-warning", text: "Trend history could not be saved: " + merchantMarketTrendsSaveError }));
    if (!items.length) {
      body.append(make("div", { class: "m-stand-empty", text: "No price history recorded for this server yet. Leave Player Market open while listings are visible to start building history." }));
      return;
    }
    const grid = make("div", { class: "m-trend-grid" });
    items.forEach((item) => {
      const catalogItem = gameCatalogItem(item.name);
      const icon = gameIcon(catalogItem?.skin || item.skin || item.name, "m-listing-icon", item);
      const name = String(item.name) + (Number(item.level) > 0 ? " +" + formatNumber(item.level) : "");
      const currency = String(item.currency || "gold");
      const priceText = (value) => value !== null && value !== undefined && Number.isFinite(Number(value)) ? formatNumber(value) + " " + currency : "—";
      const lastSeenAt = marketTrendTimestamp(item.lastSeenAt);
      const firstSeenAt = marketTrendTimestamp(item.firstSeenAt);
      const seenText = lastSeenAt ? "Last seen " + merchantDuration(Date.now() - lastSeenAt) + " ago" : "Last seen time unavailable";
      const firstText = firstSeenAt ? "First seen " + merchantDuration(Date.now() - firstSeenAt) + " ago" : "";
      const record = make("article", { class: "m-trend-card" }, icon);
      const details = make("div", { style: { minWidth: "0" } });
      details.append(make("div", { class: "m-trend-head" }, make("div", { class: "m-trend-name", text: name, title: name }), make("div", { class: "m-trend-meta", text: String(item.side || "SELL") })));
      details.append(make("div", { class: "m-trend-meta", text: [item.serverRegion, item.serverId, item.map].filter(Boolean).join(" · ") || "Server not recorded" }));
      const prices = make("div", { class: "m-trend-prices" });
        [["LAST PRICE", item.lastPrice], ["ALL-TIME LOW", item.lowestPrice], ["ALL-TIME HIGH", item.highestPrice]].forEach(([label, value]) => {
        prices.append(make("div", { class: "m-trend-stat" }, make("div", { class: "m-trend-stat-label", text: label }), make("div", { class: "m-trend-stat-value", text: priceText(value) })));
      });
      details.append(prices, make("div", { class: "m-trend-last", title: lastSeenAt ? new Date(lastSeenAt).toLocaleString() : "", text: seenText + (firstText ? " · " + firstText : "") + " · " + formatNumber(item.samples || 0) + " observations" }));
      record.append(details); grid.append(record);
    });
    body.append(grid, sourceNote(MERCHANT_MARKET_TRENDS_KEY, "Persistent shared market history"));
  }
  function renderMerchantMarket(content, panel) {
    const state = isObject(merchantMarketState) ? merchantMarketState : {};
    const stands = Array.isArray(state.playerStands) ? state.playerStands : [];
    const body = make("div", { class: "m-body" });
    body.append(make("div", { class: "m-title", text: "Player Market" }), make("div", { class: "m-muted", text: "Player-owned merchant stands currently visible to Character01MCH on the same map and server." }));
    const summary = make("div", { class: "m-grid m-grid-two" });
    const listingCount = stands.reduce((total, stand) => total + (Array.isArray(stand.listings) ? stand.listings.length : 0), 0);
    summary.append(merchantMetric("SERVER", [state.server?.region, state.server?.id].filter(Boolean).join(" ") || "—"), merchantMetric("MAP", state.map || "—"), merchantMetric("PLAYER STANDS", stands.length, "Visible: " + formatNumber(state.visibleStandCount)), merchantMetric("LISTINGS", listingCount)); body.append(summary);
    const tabs = make("div", { class: "m-market-tabs", role: "tablist", "aria-label": "Player market views" });
    [["listings", "LISTINGS"], ["trends", "MARKET TRENDS"]].forEach(([view, label]) => {
      const active = merchantMarketView === view;
      const button = make("button", { class: "m-market-tab" + (active ? " is-active" : ""), type: "button", role: "tab", "aria-selected": String(active), text: label });
      button.addEventListener("click", () => { if (merchantMarketView === view) return; merchantMarketView = view; content.replaceChildren(); renderMerchantMarket(content, panel); });
      tabs.append(button);
    });
    body.append(tabs);
    if (merchantMarketView === "trends") renderMerchantMarketTrends(body, state);
    else {
      if (!stands.length) body.append(make("div", { class: "m-stand-empty", text: state.live === false ? "The merchant runtime is not connected." : "No player merchant stands with visible listings are currently in range / loaded on this map." }));
      stands.forEach((stand) => {
        const sectionNode = make("section", { class: "m-section" }, make("div", { class: "m-title", text: safeText(stand.name || "Player stand") + (stand.level ? " · LV " + stand.level : "") }), make("div", { class: "m-muted", text: [stand.map, stand.x + ", " + stand.y].filter(Boolean).join(" · ") }));
         const grid = make("div", { class: "m-listing-grid" }); (Array.isArray(stand.listings) ? stand.listings : []).forEach((item) => {
           const card = renderListingCard(item, stand.name, "Player stand");
           const buy = themedButton("BUY", () => {
             const quantity = Math.max(1, Number(window.prompt("Quantity to buy", "1")) || 1);
             sendMerchantAction(panel, "market", { operation: "buy", owner: stand.name, ownerId: item.ownerId || stand.id || null, tradeSlot: item.slot, rid: item.rid, quantity });
           }, "primary");
           card.append(buy); grid.append(card);
         }); sectionNode.append(grid); body.append(sectionNode);
      });
      body.append(sourceNote(MERCHANT_MARKET_ENDPOINT, "Live player entities and trade slots from the game runtime"));
    }
    content.append(body);
  }
  function statusFor(state, isFresh) { if (!state || !isFresh) return ["OFFLINE", "#777"]; if (state.rip) return ["DEAD", "#cc3333"]; if (state.scriptPaused) return ["PAUSED", "#66aaff"]; if (state.town) return ["TOWN", "#ccaa22"]; if (state.setupComplete === false || state.readyForParty === false) return ["NOT READY", "#ccaa22"]; return ["RUNNING", "#44bb44"]; }
  function renderCharacterFrame(member) {
    const state = characterStateFor(member.name); const isFresh = fresh(state);
    const cardNode = make("div", { class: "pi-party-card", style: { borderColor: member.color, opacity: isFresh ? "1" : ".55" } });
    const heading = make("div", { class: "pi-party-heading" });
    const portrait = gameIcon(state.skin || state.ctype || member.role, "pi-party-sprite");
    const identity = make("div", { class: "pi-party-identity" },
      make("div", { class: "pi-party-name", style: { color: member.color }, title: member.name, text: member.name }),
      make("div", { class: "pi-party-level", text: isFresh ? "LV: " + valueFrom(state, ["level"], "??") : "OFFLINE" }));
    heading.append(portrait, identity);
    cardNode.append(heading);
    if (!isFresh) { cardNode.append(make("div", { class: "pi-muted", text: "No fresh heartbeat" })); return cardNode; }
    const percent = (value, maximum) => Math.max(0, Math.min(100, number(value) / Math.max(1, number(maximum, 1)) * 100));
    const partyBar = (label, value, maximum, color, display) => make("div", { class: "pi-party-bar" },
      make("div", { class: "pi-party-bar-fill", style: { width: percent(value, maximum) + "%", background: color } }),
      make("div", { class: "pi-party-bar-text", text: label + ": " + display }));
    const xpPercent = percent(state.xp, state.max_xp);
    cardNode.append(partyBar("HP", state.hp, state.max_hp, "#f00", formatNumber(state.hp)),
      partyBar("MP", state.mp, state.max_mp, "#00e", formatNumber(state.mp)),
      partyBar("XP", xpPercent, 100, "#080", xpPercent.toFixed(2) + "%"));
    if (Number.isFinite(Number(state.partyShare))) {
      const share = Number(state.partyShare) * 100;
      cardNode.append(partyBar("SHARE", share, 100, "#008080", share.toFixed(2) + "%"));
    }
    cardNode.append(make("div", { class: "pi-party-map", title: safeText(state.map || "?"), text: valueFrom(state, ["map"], "?") }));
    return cardNode;
  }
  function renderTrioDashboardNative(content) {
    const warrior = characterStateFor("Character07");
    const warriorFresh = fresh(warrior);
    const targetType = warriorFresh ? first(warrior.targetType, warrior.selectedMonster, "") : "";
    const targetName = warriorFresh ? first(warrior.targetName, targetType, "NO TARGET") : "NO TARGET";
    const targetHp = number(warrior.targetHp);
    const targetMaxHp = number(warrior.targetMaxHp);
    const targetLive = warriorFresh && warrior.targetLive === true && targetMaxHp > 0;
    const body = make("div", { class: "pi-body" });
    const grid = make("div", { class: "pi-party-grid" });
    const targetCard = make("div", { class: "pi-party-card", style: { borderColor: targetLive ? "#777" : "#555", opacity: targetLive ? "1" : ".72" } });
    const targetAvatar = make("div", { class: "pi-party-avatar", title: targetType ? "Open monster info" : "" });
    if (targetType) {
      targetAvatar.append(gameIcon(targetType, "pi-party-sprite"));
      targetAvatar.style.cursor = "pointer";
      targetAvatar.addEventListener("click", () => { bestiaryInitialSelection = targetType; openDashboard("bestiary"); });
    } else targetAvatar.textContent = "—";
    targetCard.append(targetAvatar, make("div", { class: "pi-party-name", text: targetName }), make("div", { class: "pi-party-level", text: warrior.targetLevel ? "LV: " + warrior.targetLevel : "LV: ??" }));
    if (targetLive) targetCard.append(bar("HP", targetHp, targetMaxHp, "#e33")); else targetCard.append(make("div", { class: "pi-muted", text: "NO TARGET" }));
    const actions = make("div", { class: "pi-party-actions" });
    [["⚙", "trio-options"], ["📈", "trio-stats"], ["🖥", "trio-runtime"], ["🎯", "trio-hunt"], ["🎒", "trio-inventory"]].forEach(([label, id]) => { const button = make("button", { class: "pi-party-action", type: "button", text: label, title: dashboardTitle(id) }); button.addEventListener("click", () => openDashboard(id)); actions.append(button); });
    targetCard.append(actions);
    const activeMembers = activeTrioTeam();
    const freshCount = activeMembers.filter((member) => fresh(characterStateFor(member.name))).length;
    const partyFrames = [];
    if (freshCount) activeMembers.forEach((member) => partyFrames.push(renderCharacterFrame(member)));
    const roguePresence = entry("Character01MCH.CrabFarm.presence")?.value;
    const rogueAt = timestamp(roguePresence?.updatedAt);
    const rogueName = typeof roguePresence?.name === "string" && /^[A-Za-z0-9]{1,32}$/.test(roguePresence.name) ? roguePresence.name : "";
    const rogueIsSolo = !!rogueName && roguePresence.mode !== "trio" && rogueName !== "Character01MCH" && !TEAM.some((member) => member.name === rogueName) &&
      Number.isFinite(rogueAt) && Date.now() - rogueAt <= 90000 && fresh(characterStateFor(rogueName));
    if (rogueIsSolo) partyFrames.push(renderCharacterFrame(trioMemberDefinition(rogueName)));
    const showTarget = freshCount > 0 || !rogueIsSolo;
    if (showTarget) grid.append(targetCard);
    partyFrames.forEach((frame) => grid.append(frame));
    grid.append(renderCharacterFrame(TEAM[3]));
    grid.style.gridTemplateColumns = `repeat(${(showTarget ? 1 : 0) + partyFrames.length + 1}, 100px)`;
    body.append(grid, sourceNote(entry("Character07.Trio.state")?.key, "Party frames and target from Trio heartbeat storage")); content.append(body);
  }
  function dashboardTitle(id) { return ({ "merchant-dashboard": "Droid Merchant Dashboard", "merchant-stand": "Merchant Stand", "merchant-config": "Merchant V3 Configuration", "merchant-settings": "Merchant V3 Configuration", "merchant-loot": "Merchant V3 Loot Policies", "merchant-ponty": "Merchant V3 Ponty Items", "merchant-upgrade": "Merchant V3 Upgrade Rules", "merchant-anniversary": "10th Anniversary Event", "merchant-log": "Activity Log", "merchant-server": "Merchant Server", "merchant-market": "Player Market", "trio-dashboard": "Party Frames / Trio Dashboard", "trio-options": "Session Options", "trio-hunt": "Trio Hunt", "trio-hunt-menu": "Hunt Menu", "trio-hunt-sub": trioHuntSubView === "bosses" ? "Boss List" : trioHuntSubView === "quick" ? "Quick Gear Targets" : (TRIO_GEAR_SLOT_LABELS[trioHuntSubView.slice(5)] || trioHuntSubView.slice(5)) + " Targets", "trio-inventory": "Trio Inventory", "trio-runtime": "Trio Runtime", "trio-stats": "TRIO STATS", "script-storage": "Script Storage", mail: "Mail", catalog: "Equipment Catalog", bestiary: "Bestiary", skills: "Class Skills", bank: "Bank", logs: "Activity Log" })[id] || ""; }
   function openDashboard(id) {
     const existing = Array.from(document.querySelectorAll("." + WINDOW_CLASS)).find((panel) => panel.dataset.piDashboardId === id);
     if (existing) { focusDashboardWindow(existing); if (id === "trio-hunt-sub") { existing.querySelector(".pi-title").textContent = dashboardTitle(id); void loadAndRender(existing); } return existing; }
     activeDashboard = id; settingsDirty = false;
     if (id === "skills") selectedSkillId = null;
     if (id === "merchant-loot") { merchantLootTab = "all"; merchantLootPolicyFilters = { auto: true, keep: true, bank: true, sell: true, upgrade: true }; merchantLootDraft = {}; }
     if (id === "merchant-ponty") { merchantPontySearch = ""; merchantPontyDraft = null; merchantPontyDraftScanAll = false; merchantPontyView = "items"; merchantPontyLogFilter = "all"; }
     if (id === "merchant-upgrade") merchantUpgradeDraft = null;
     const panel = makeDashboardWindow(dashboardTitle(id), id); loadAndRender(panel); startRefresh(panel);
     if (id === "trio-inventory") void sendTrioInventoryControl(panel, "syncAll");
     return panel;
   }
  function renderTrioDashboard(content) { const warrior = stateFor("Character07"); const activeTeam = TEAM.filter((member) => member.name !== "Character01MCH"); const freshCount = activeTeam.filter((member) => fresh(stateFor(member.name))).length; const body = make("div", { class: "pi-body" }); body.append(make("div", { class: "pi-headline", text: "Party Frames / Trio Dashboard" }), make("div", { class: "pi-sub", text: "The same heartbeats used by MerchantTrioDashboard.43.js · " + freshCount + "/3 Trio members fresh" })); const target = first(warrior.monsterMode, warrior.selectedMonster, "Waiting for Warrior state"); const targetBox = make("div", { class: "pi-current" }, make("div", { class: "pi-current-label", text: "CURRENT HUNT TARGET" }), make("div", { class: "pi-current-value", text: target === "auto" ? "Auto target" : target })); if (warrior.bossInterruptActive) targetBox.append(make("div", { class: "pi-muted", text: "Interrupting: " + warrior.bossInterruptActive })); body.append(targetBox); const cards = section("PARTY STATUS"); const grid = make("div", { class: "pi-grid" }); activeTeam.forEach((member) => grid.append(renderCharacterFrame(member))); grid.append(renderCharacterFrame(TEAM[3])); cards.append(grid); body.append(cards); const actions = make("div", { class: "pi-action-grid" }); actions.append(themedButton("⚙ TRIO OPTIONS", () => openDashboard("trio-options"), "primary"), themedButton("📈 TRIO STATS", () => openDashboard("trio-stats"), "primary"), themedButton("🖥 TRIO RUNTIME", () => openDashboard("trio-runtime"), "primary"), themedButton("🎯 TRIO HUNT", () => openDashboard("trio-hunt"), "primary")); body.append(actions, sourceNote(entry("Character07.Trio.state")?.key, "Trio heartbeat storage")); content.append(body); }

  function makeInput(field, value) { const input = make("input", { type: field.type === "boolean" ? "checkbox" : "number" }); if (field.type === "boolean") input.checked = Boolean(value); else { input.value = value === undefined || value === null ? "" : String(number(value) / (field.factor || 1)); input.min = field.min; input.max = field.max; input.step = field.step; } input.dataset.optionKey = field.key; input.addEventListener("input", () => { settingsDirty = true; }); return input; }
  function renderOptionGroup(group, values) { const wrapper = make("section", { class: "pi-form-section" }, make("div", { class: "pi-form-title", text: group.title })); const grid = make("div", { class: "pi-form-grid" }); group.fields.forEach((field) => grid.append(make("label", { class: "pi-field" }, make("span", { text: field.label }), makeInput(field, values[field.key])))); wrapper.append(grid); return wrapper; }
  function recentTrioRequest() { const request = entry(TRIO_CONTROL_KEY)?.value; if (!isObject(request) || request.type !== "options" || !isObject(request.options)) return null; if (!Number.isFinite(Number(request.requestedAt)) || Date.now() - Number(request.requestedAt) > 10 * 60 * 1000) return null; return request; }
  function trioValues(state) { const values = Object.assign({}, TRIO_DEFAULTS, isObject(state?.sessionOptions) ? state.sessionOptions : {}); const request = recentTrioRequest(); if (request && Number(request.requestedAt) > Number(state?.updatedAt || 0)) Object.assign(values, request.options); return values; }
  function collectTrioValues(form) { const values = {}; TRIO_OPTION_GROUPS.forEach((group) => group.fields.forEach((field) => { const input = form.querySelector(`[data-option-key="${field.key}"]`); if (!input) return; if (field.type === "boolean") values[field.key] = input.checked; else { const displayed = Number(input.value); values[field.key] = (Number.isFinite(displayed) ? Math.max(field.min, Math.min(field.max, displayed)) : Number(field.min)) * (field.factor || 1); if (field.integer) values[field.key] = Math.round(values[field.key]); } })); return values; }
  function trioOptionsMatch(expected, actual) { if (!isObject(expected) || !isObject(actual)) return false; const knownKeys = Object.keys(expected).filter((key) => typeof actual[key] !== "undefined"); return knownKeys.length > 0 && knownKeys.every((key) => { if (typeof expected[key] === "number" || typeof actual[key] === "number") return Math.abs(Number(expected[key]) - Number(actual[key])) < 0.000001; return expected[key] === actual[key]; }); }
  function trioRequestApplied(request) { const state = stateFor("Character07"); if (!state || !state.updatedAt || Number(state.updatedAt) < Number(request.requestedAt || 0) - 2000) return false; if (request.type === "options") return trioOptionsMatch(request.options, state.sessionOptions) && (!request.monsterMode || request.monsterMode === state.monsterMode); if (request.type === "hunt") { const expected = request.interruptBossTypes; const actual = state.interruptBossTypes || {}; return (!request.monsterMode || request.monsterMode === state.monsterMode) && (expected === undefined || (Object.keys(expected).every((key) => !!actual[key] === !!expected[key]) && Object.keys(actual).every((key) => !!expected[key] === !!actual[key]))); } if (request.type === "resetAutoTier") return state.monsterMode === "auto"; return false; }
  function trioMonsterChoices(current) {
    const choices = [];
    const seen = new Set();
    (Array.isArray(trioGameData.monsters) ? trioGameData.monsters : []).forEach((monster) => {
      if (!monster || !monster.type || monster.stationary || monster.immune || monster.special || monster.cooperative ||
          !(Number(monster.hp) > 0) || !(Number(monster.xp) > 0) || Number(monster.respawn) < 0) return;
      seen.add(monster.type);
      choices.push(monster);
    });
    if (current !== "auto" && !seen.has(current)) {
      const selected = (Array.isArray(trioGameData.monsters) ? trioGameData.monsters : []).find((monster) => monster?.type === current);
      if (selected) choices.push(selected);
      else choices.push({ type: current, name: current, hp: 0, attack: 0, xp: 0 });
    }
    choices.sort((a, b) => Number(a.hp) - Number(b.hp) || String(a.name || a.type).localeCompare(String(b.name || b.type)));
    return choices.map((monster, index) => ({ ...monster, tier: index + 1 }));
  }
  function trioMonsterOptionLabel(monster) {
    return "Tier " + monster.tier + " · " + safeText(monster.name || monster.type) +
      " (base HP " + safeText(monster.hp || 0) + ", ATK " + safeText(monster.attack || 0) + ", XP " + safeText(monster.xp || 0) + ")";
  }
  function wait(milliseconds) { return new Promise((resolve) => window.setTimeout(resolve, milliseconds)); }
  async function waitForTrioControl(request) { const deadline = Date.now() + 12000; while (Date.now() < deadline) { try { activeSnapshot = await readSnapshot(); if (trioRequestApplied(request)) return true; } catch (_) { } await wait(750); } return false; }
  async function waitForSharedAction(key, id, timeoutMs = 12000) { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { try { activeSnapshot = await readSnapshot(); const record = entry(key)?.value; if (isObject(record) && record.id === id && record.handledAt) return record; } catch (_) { } await wait(700); } return null; }
  async function sendMerchantSettingsApply(dialog, section, action = "apply") {
    const request = { id: "CaracAL+:" + Date.now() + ":" + Math.floor(Math.random() * 1000000), panel: section, action, source: "CaracAL+", requestedAt: Date.now() };
    try {
      await writeEntries({ [MERCHANT_SETTINGS_APPLY_KEY]: request });
      statusNode(dialog, "Saved settings. Waiting for the Merchant to apply them in its active runtime...");
      const acknowledgement = await waitForSharedAction(MERCHANT_SETTINGS_APPLY_KEY, request.id);
      if (!acknowledgement) statusNode(dialog, "Settings are saved in shared storage, but the running Merchant has not acknowledged the apply request.", true);
      else statusNode(dialog, acknowledgement.message || "Merchant settings applied.", !acknowledgement.ok);
      return acknowledgement;
    } catch (error) {
      statusNode(dialog, error.message || "Could not request the Merchant settings apply.", true);
      return null;
    }
  }
  async function sendTrioControl(panel, type, payload) { const request = Object.assign({}, payload, { id: "CaracAL+:" + Date.now() + ":" + Math.floor(Math.random() * 1000000), type, requestedAt: Date.now(), source: "CaracAL+" }); settingsDirty = true; try { await writeEntries({ [TRIO_CONTROL_KEY]: request }); statusNode(panel, "Sent " + (type === "options" ? "session options" : type === "hunt" ? "hunt settings" : "the auto-tier reset") + " to Character07; waiting for its next shared heartbeat..."); const applied = ["options", "hunt", "resetAutoTier"].includes(type) ? await waitForTrioControl(request) : false; if (applied) statusNode(panel, type === "resetAutoTier" ? "Character07 reset Auto Tier and published the new target state." : "Character07 applied the Trio settings and published its heartbeat."); else statusNode(panel, "Request is saved, but Character07 has not acknowledged it yet. Keep the Trio running to apply it.", true); return request; } finally { settingsDirty = false; } }
  async function sendTrioRuntimeControl(panel, action, name = "") {
    const request = { id: "CaracAL+:" + Date.now() + ":" + Math.floor(Math.random() * 1000000), action, name, source: "CaracAL+", requestedAt: Date.now() };
    try {
      await writeEntries({ [TRIO_RUNTIME_CONTROL_KEY]: request });
      statusNode(panel, action === "restartAll" ? "Sent RESTART ALL to the Merchant runtime..." : "Sent " + action + " for " + name + " to the Merchant runtime...");
      const acknowledgement = await waitForSharedAction(TRIO_RUNTIME_CONTROL_KEY, request.id);
      if (!acknowledgement) statusNode(panel, "The Merchant has not acknowledged this Runtime action. Check that its script is running.", true);
      else statusNode(panel, acknowledgement.message || (acknowledgement.ok ? "Runtime action accepted." : "Runtime action was rejected."), !acknowledgement.ok);
    } catch (error) { statusNode(panel, error.message || "Could not send the Trio Runtime action.", true); }
  }
  async function sendTrioInventoryControl(panel, action, name = "") {
    const request = { id: "CaracAL+:" + Date.now() + ":" + Math.floor(Math.random() * 1000000), action, name, source: "CaracAL+", requestedAt: Date.now() };
    try {
      await writeEntries({ [TRIO_INVENTORY_CONTROL_KEY]: request });
      statusNode(panel, action === "syncAll" ? "Requesting inventory snapshots from the active Trio..." : "Requesting a fresh inventory snapshot from " + name + "...");
      const acknowledgement = await waitForSharedAction(TRIO_INVENTORY_CONTROL_KEY, request.id, 9000);
      if (!acknowledgement) { statusNode(panel, "The Merchant has not acknowledged the inventory request. Check that its script is running.", true); return; }
      await wait(800);
      activeSnapshot = await readSnapshot();
      renderActive(panel);
      statusNode(panel, acknowledgement.message || "Inventory sync request accepted by the Merchant.", !acknowledgement.ok);
    } catch (error) { statusNode(panel, error.message || "Could not send the inventory sync request.", true); }
  }
  async function setTrioInventoryScale(panel, delta) {
    const current = entry(TRIO_WINDOW_SCALE_KEY)?.value;
    const saved = isObject(current) ? clone(current) : {};
    const currentScale = Math.max(0.35, Math.min(1.25, Number(saved.inventory) || 0.7));
    saved.inventory = Math.max(0.35, Math.min(1.25, Math.round((currentScale + delta) * 100) / 100));
    try {
      await writeEntries({ [TRIO_WINDOW_SCALE_KEY]: saved });
      activeSnapshot = await readSnapshot();
      renderActive(panel);
    } catch (error) { statusNode(panel, error.message || "Could not save the Trio Inventory size.", true); }
  }
  async function sendTrioJoinWarrior(panel, name) {
    const key = name + ".Trio.joinWarriorServerRequest";
    const request = { id: "CaracAL+:" + Date.now() + ":" + Math.floor(Math.random() * 1000000), source: "CaracAL+", requestedAt: Date.now() };
    try {
      await writeEntries({ [key]: request });
      statusNode(panel, "Sent the join request to " + name + "; waiting for its script to act...");
      const acknowledgement = await waitForSharedAction(key, request.id, 9000);
      if (!acknowledgement) statusNode(panel, name + " has not acknowledged the server request. Keep that character's script running.", true);
      else statusNode(panel, acknowledgement.message || "Server request accepted by " + name + ".", !acknowledgement.ok);
    } catch (error) { statusNode(panel, error.message || "Could not send the Warrior server request.", true); }
  }
  async function sendTrioGraphsRequest(panel) {
    const request = { id: "CaracAL+:" + Date.now() + ":" + Math.floor(Math.random() * 1000000), type: "metrics", requestedAt: Date.now(), source: "CaracAL+" };
    try { await writeEntries({ [TRIO_CONTROL_KEY]: request }); statusNode(panel, "Trio metrics graph request sent to Character07. The graph window opens on its game client."); }
    catch (error) { statusNode(panel, error.message || "Could not request Trio metrics graphs.", true); }
  }
  function renderTrioOptions(content, panel) {
    const warrior = stateFor("Character07"); const values = trioValues(warrior); const form = make("form", { class: "pi-body" });
    form.addEventListener("submit", async (event) => { event.preventDefault(); const mode = form.querySelector("[data-monster-mode]").value || "auto"; try { statusNode(panel, "Sending Trio Options to Warrior..."); await sendTrioControl(panel, "options", { options: collectTrioValues(form), monsterMode: mode }); } catch (error) { statusNode(panel, error.message, true); } });
    form.append(make("div", { class: "pi-sub", text: "Changes apply immediately to the three running characters. Tuning settings reset when the Warrior code restarts; the selected hunting mode is remembered." }));
    const currentTarget = first(warrior.monsterMode, warrior.selectedMonster, "auto");
    const target = make("select", { "data-monster-mode": "" }, make("option", { value: "auto", text: "Auto — calibrated target selection" }));
    trioMonsterChoices(currentTarget).forEach((monster) => target.append(make("option", { value: monster.type, text: trioMonsterOptionLabel(monster) })));
    target.value = currentTarget;
    target.addEventListener("change", () => { settingsDirty = true; });
    const targetSection = make("section", { class: "pi-form-section" }, make("div", { class: "pi-form-title", text: "Monster selection" }), make("label", { class: "pi-field" }, make("span", { text: "Grinding target" }), target));
    form.append(targetSection); TRIO_OPTION_GROUPS.forEach((group) => form.append(renderOptionGroup(group, values)));
    const actions = make("section", { class: "pi-form-section" }, make("div", { class: "pi-form-title", text: "Actions" }));
    const memberSelect = make("select", { "data-join-warrior-member": "" });
    TEAM.slice(0, 3).forEach((member) => memberSelect.append(make("option", { value: member.name, text: member.name })));
    memberSelect.value = "Character02";
    const joinRow = make("div", { class: "pi-join-warrior-row" }, make("span", { class: "pi-muted", text: "Character to move" }), memberSelect,
      themedButton("JOIN WARRIOR SERVER", () => sendTrioJoinWarrior(panel, memberSelect.value), "primary"));
    const actionButtons = make("div", { class: "pi-options-action-buttons" }, themedButton("RESET AUTO TIER", () => sendTrioControl(panel, "resetAutoTier", {}), "normal"), joinRow);
    Object.assign(actionButtons.firstChild.style, { background: "#4a3518", color: "#ffd98a", borderColor: "#ccaa22" });
    actions.append(actionButtons, make("div", { class: "pi-muted", text: "Reset Auto Tier clears learned kill results and recalculates from the Trio's current strength." }));
    form.append(actions);
    footer(panel, themedButton("APPLY", () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })), "primary"), themedButton("RESET DEFAULTS", () => sendTrioControl(panel, "options", { options: clone(TRIO_DEFAULTS), monsterMode: "auto" })), make("span", { class: "pi-menu-status", "data-pi-dashboard-inline-status": "" }));
    content.append(form);
  }
  function renderTrioHunt(content, panel) {
    const warrior = stateFor("Character07");
    const current = first(warrior.monsterMode, warrior.selectedMonster, "auto");
    const selectedBosses = isObject(warrior.interruptBossTypes) ? warrior.interruptBossTypes : {};
    const form = make("form", { class: "pi-body" });
    form.addEventListener("input", () => { settingsDirty = true; });
    form.addEventListener("change", () => { settingsDirty = true; });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const bosses = {};
      form.querySelectorAll("[data-boss-type]").forEach((input) => { if (input.checked) bosses[input.dataset.bossType] = true; });
      try {
        statusNode(panel, "Sending Trio Hunt to Warrior...");
        await sendTrioControl(panel, "hunt", { monsterMode: form.querySelector("[data-hunt-mode]").value || "auto", interruptBossTypes: bosses });
      } catch (error) { statusNode(panel, error.message, true); }
    });

    form.append(
      make("div", { class: "pi-headline", text: "Trio Hunt" }),
      make("div", { class: "pi-sub", text: "Choose the Warrior's central hunting mode. The active Trio receives the change through the shared Warrior control record." }),
    );
    if (warrior.bossInterruptActive) {
      const activeType = String(warrior.bossInterruptActive);
      const activeMonster = (trioGameData.bestiary || []).find((monster) => monster.id === activeType);
      form.append(make("div", { class: "pi-trio-active-boss" }, gameIcon(activeMonster?.skin || activeType, "pi-trio-boss-avatar"), make("span", { text: "⚡ Auto-interrupting " + (activeMonster?.name || activeType) + " · the selected hunt resumes after the kill." })));
    }

    const target = make("select", { "data-hunt-mode": "" }, make("option", { value: "auto", text: "Auto — calibrated target selection" }));
    target.style.width = "100%";
    target.style.minWidth = "0";
    trioMonsterChoices(current).forEach((monster) => target.append(make("option", {
      value: monster.type,
      text: trioMonsterOptionLabel(monster),
    })));
    target.value = current;
    const targetField = make("label", { class: "pi-field" }, make("span", { text: "Grinding target" }), target);
    targetField.style.gridTemplateColumns = "1fr minmax(0, 260px)";
    const targetSection = make("section", { class: "pi-form-section" },
      make("div", { class: "pi-form-title", text: "Hunt Target" }),
      targetField,
      make("div", { class: "pi-muted", text: "Central grinding target while no boss below is being auto-interrupted." }));
    form.append(targetSection);

    const bossesSection = make("section", { class: "pi-form-section" },
      make("div", { class: "pi-form-title", text: "Auto-Interrupt Bosses" }),
      make("div", { class: "pi-sub", text: "Bosses spawn in random places after monsters die. Check any the Trio should break off to kill; it returns to the hunt target above afterward." }));
    const monstersByType = new Map((trioGameData.bestiary || []).map((monster) => [monster.id, monster]));
    (trioGameData.bossTiers || []).forEach((tier) => {
      const block = make("section", { class: "pi-boss-tier" }, make("div", { class: "pi-boss-tier-title", text: tier.label }));
      const grid = make("div", { class: "pi-trio-boss-grid" });
      (tier.bosses || []).forEach((boss) => {
        (boss.types || [boss.type]).filter(Boolean).forEach((type) => {
          const monster = monstersByType.get(type);
          const label = boss.types ? boss.label : (boss.label || monster?.name || type);
          const checkbox = make("input", { type: "checkbox", checked: !!selectedBosses[type], "data-boss-type": type });
          checkbox.style.cssText = "width:11px;height:11px;flex-shrink:0;accent-color:#51d2e1;margin:0";
          const chip = make("label", { class: "pi-trio-boss-chip", title: label + " (" + type + ")" },
            checkbox,
            gameIcon(monster?.skin || type, "pi-trio-boss-avatar"),
            make("span", { text: label }));
          Object.assign(chip.style, {
            background: checkbox.checked ? "#4a3518" : "#173d46",
            color: checkbox.checked ? "#ffd98a" : "#8ef1ff",
            border: "1px solid " + (checkbox.checked ? "#ccaa22" : "#51d2e1"),
          });
          checkbox.addEventListener("change", () => {
            Object.assign(chip.style, {
              background: checkbox.checked ? "#4a3518" : "#173d46",
              color: checkbox.checked ? "#ffd98a" : "#8ef1ff",
              borderColor: checkbox.checked ? "#ccaa22" : "#51d2e1",
            });
          });
          grid.append(chip);
        });
      });
      if (grid.childElementCount) { block.append(grid); bossesSection.append(block); }
    });
    if (!bossesSection.querySelector(".pi-boss-tier")) bossesSection.append(make("div", { class: "pi-muted", text: "Boss data is unavailable in the cached game catalog." }));
    form.append(bossesSection);
    form.append(footer(panel,
      themedButton("APPLY", () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })), "primary"),
      sourceNote(entry(TRIO_CONTROL_KEY)?.key || TRIO_CONTROL_KEY, "Trio hunt control request")));
    content.append(form);
  }
  const TRIO_QUICK_GEAR_TARGETS = [
    { label: "Boars", type: "boar", slots: ["ring", "cape"], drops: "Rings / Leather (leather can be exchanged for capes)" },
    { label: "Arctic Bees", type: "arcticbee", slots: ["ring"], drops: "Rings" },
    { label: "Stone Snakes", type: "osnake", slots: ["belt"], drops: "Belts" },
    { label: "Phoenix", type: "phoenix", slots: ["earring", "weapon"], drops: "Earrings / Fire Staff / Fire Sword" },
    { label: "Bats", type: "bat", slots: ["source"], drops: "Book of Knowledge" },
    { label: "Ghosts", type: "ghost", slots: ["amulet"], drops: "Amulets" },
    { label: "Pink Pom Poms", type: "pppompom", slots: ["amulet"], drops: "Amulets" },
    { label: "Fire Spirits", type: "fireroamer", slots: ["orb"], drops: "STR / DEX Orbs" },
    { label: "Green Pom Poms", type: "bbpompom", slots: ["orb"], drops: "VIT / INT Orbs" },
    { label: "Scorpions", type: "scorpion", slots: ["quiver"], drops: "Quivers" },
    { label: "Tortoise", type: "tortoise", slots: ["shield"], drops: "Shield" },
    { label: "Armadillos", type: "armadillo", slots: ["shield"], drops: "Shield" },
  ];
  const TRIO_GEAR_SLOT_ORDER = ["ring", "belt", "amulet", "earring", "orb", "weapon", "helmet", "chest", "pants", "shoes", "gloves", "shield", "quiver", "source", "cape", "tome", "misc_offhand"];
  const TRIO_GEAR_SLOT_LABELS = { ring: "Rings", belt: "Belts", amulet: "Amulets", earring: "Earrings", orb: "Orbs", weapon: "Weapons", helmet: "Helmets", chest: "Chests", pants: "Pants", shoes: "Shoes", gloves: "Gloves", shield: "Shields", quiver: "Quivers", source: "Books / Sources", cape: "Capes", tome: "Tomes", misc_offhand: "Other Offhands" };
  function trioHuntTargetLabel(type) { return trioGameData.monsters.find((monster) => monster.type === type)?.name || type; }
  function trioQuickGearTier(target, slot) {
    const record = (trioGameData.dropInfo || []).find((item) => item.type === target.type);
    const tiers = (record?.gear || []).filter((item) => item.type === slot && Number.isFinite(Number(item.tier))).map((item) => Number(item.tier));
    return tiers.length ? Math.min(...tiers) : null;
  }
  function trioHuntTargetButton(panel, type, label, detail, active, monster = null) {
    const button = themedButton("", () => {
      void sendTrioControl(panel, "hunt", { monsterMode: type });
    }, active ? "primary" : "normal");
    button.classList.add("pi-hunt-target-button");
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.style.width = "100%";
    button.style.textAlign = "left";
    if (detail) button.title = detail;
    const avatar = gameIcon(monster?.skin || type, "pi-hunt-target-avatar");
    avatar.setAttribute("role", "img");
    avatar.setAttribute("aria-label", (monster?.name || label) + " avatar");
    const copy = make("span", { class: "pi-hunt-target-copy" }, make("span", { class: "pi-hunt-target-name", text: label }));
    if (detail) copy.append(make("span", { class: "pi-hunt-target-detail", text: detail }));
    if (active) copy.append(make("span", { class: "pi-hunt-target-active", text: "ACTIVE TARGET" }));
    button.append(avatar, copy);
    return button;
  }
  function openTrioHuntSubView(view) {
    trioHuntSubView = view;
    const panel = openDashboard("trio-hunt-sub");
    const title = panel?.querySelector(".pi-title");
    if (title) title.textContent = view === "bosses" ? "Boss List" : view === "quick" ? "Quick Gear Targets" : (TRIO_GEAR_SLOT_LABELS[view.slice(5)] || view.slice(5)) + " Targets";
  }
  function renderTrioHuntSub(content, panel) {
    const view = trioHuntSubView;
    const warrior = stateFor("Character07");
    const current = first(warrior.monsterMode, warrior.selectedMonster, "auto");
    const body = make("div", { class: "pi-body" });
    const actions = make("div", { class: "pi-hunt-sub-actions" });
    actions.append(themedButton("BACK", () => { panel.remove(); stopRefresh(panel); openDashboard("trio-hunt-menu"); }), themedButton("× CLOSE", () => { panel.remove(); stopRefresh(panel); }));
    body.append(actions);
    const chooseable = new Set(trioMonsterChoices(current).map((monster) => monster.type));
    const dataByType = new Map((trioGameData.bestiary || []).map((monster) => [monster.id, monster]));
    if (view === "bosses") {
      (trioGameData.bossTiers || []).forEach((tier) => {
        const block = make("section", { class: "pi-boss-tier" }, make("div", { class: "pi-boss-tier-title", text: tier.label }));
        const grid = make("div", { class: "pi-hunt-target-grid" });
        (tier.bosses || []).forEach((boss) => {
          (boss.types || [boss.type]).filter(Boolean).forEach((type) => {
            const monster = dataByType.get(type);
            if (!monster) return;
            const selectable = chooseable.has(type);
            const detail = "HP " + formatNumber(monster.hp) + " · ATK " + formatNumber(monster.attack) + " · XP " + formatNumber(monster.xp) + (selectable ? "" : " · Event/raid target");
            const button = trioHuntTargetButton(panel, type, boss.types ? monster.name : boss.label || monster.name, detail, current === type, monster);
            button.disabled = !selectable;
            grid.append(button);
          });
        });
        block.append(grid); body.append(block);
      });
      if (!(trioGameData.bossTiers || []).length) body.append(make("div", { class: "pi-muted", text: "Boss data is still loading. Refresh this panel after cached game data is available." }));
    } else {
      const quickRows = TRIO_QUICK_GEAR_TARGETS.filter((target) => view === "quick" || target.slots.includes(view.slice(5)));
      if (view === "quick" || view.startsWith("slot:")) {
        const slots = view === "quick" ? TRIO_GEAR_SLOT_ORDER : [view.slice(5)];
        slots.forEach((slot) => {
          const targets = quickRows.filter((target) => target.slots.includes(slot)).sort((a, b) => {
            const at = trioQuickGearTier(a, slot), bt = trioQuickGearTier(b, slot);
            if (at !== null && bt !== null && at !== bt) return at - bt;
            if (at !== null) return -1;
            if (bt !== null) return 1;
            return a.label.localeCompare(b.label);
          });
          if (!targets.length) return;
          body.append(make("div", { class: "pi-form-title", text: TRIO_GEAR_SLOT_LABELS[slot] || slot }));
          targets.forEach((target) => {
            const monster = dataByType.get(target.type);
            const tier = trioQuickGearTier(target, slot);
            const detail = (tier === null ? "Item tier unavailable · " : "Item tier " + tier + " · ") + (target.drops ? "Drops: " + target.drops + " · " : "") + (monster ? "HP " + formatNumber(monster.hp) + " · ATK " + formatNumber(monster.attack) : "Not present in current game data");
            const button = trioHuntTargetButton(panel, target.type, target.label, detail, current === target.type, monster);
            button.disabled = !chooseable.has(target.type);
            body.append(button);
          });
        });
        if (view.startsWith("slot:")) {
          const slot = view.slice(5);
          const grouped = new Map();
          (trioGameData.dropInfo || []).forEach((record) => (record.gear || []).filter((item) => item.type === slot).forEach((item) => {
            if (!grouped.has(item.id)) grouped.set(item.id, { item, monsters: new Map() });
            grouped.get(item.id).monsters.set(record.type, record.type);
          }));
          const drops = Array.from(grouped.values()).sort((a, b) => (a.item.tier ?? Number.MAX_SAFE_INTEGER) - (b.item.tier ?? Number.MAX_SAFE_INTEGER) || a.item.name.localeCompare(b.item.name));
          body.append(make("div", { class: "pi-form-title", text: "Live drop data" }));
          if (!drops.length) body.append(make("div", { class: "pi-muted", text: "No matching drops are available in the current cached game data." }));
          drops.forEach(({ item, monsters }) => {
            const block = make("section", { class: "pi-hunt-drop-group" }, make("div", { class: "pi-boss-tier-title", text: item.name + (item.tier === null ? "" : " · Tier " + item.tier) }));
            const grid = make("div", { class: "pi-hunt-target-grid" });
            Array.from(monsters.keys()).sort((a, b) => trioHuntTargetLabel(a).localeCompare(trioHuntTargetLabel(b))).forEach((type) => {
              const monster = dataByType.get(type);
              if (!monster || !chooseable.has(type)) return;
              const detail = "HP " + formatNumber(monster.hp) + " · ATK " + formatNumber(monster.attack) + " · XP " + formatNumber(monster.xp);
              grid.append(trioHuntTargetButton(panel, type, monster.name, item.name + " drop · " + detail, current === type, monster));
            });
            if (grid.childElementCount) block.append(grid);
            if (block.querySelector(".pi-hunt-target-grid")) body.append(block);
          });
        }
      }
    }
    content.append(body);
  }
  function renderTrioHuntCatalog(content, panel) {
    const warrior = stateFor("Character07");
    const current = first(warrior.monsterMode, warrior.selectedMonster, "auto");
    const body = make("div", { class: "pi-body" });
    body.append(make("div", { class: "pi-sub", text: "Central target menu: choose Auto, a boss list, a quick gear goal, or a gear slot. Manual targets keep formation, anti-steal, and emergency-retreat checks active." }));
    body.append(trioHuntTargetButton(panel, "auto", "AUTO", "Measured XP + gold", current === "auto"));
    const nav = make("div", { class: "pi-hunt-navigation" });
    [["bosses", "BOSS LIST", "Easy → raid tiers"], ["quick", "QUICK GEAR", "Your upgrade checklist"]].forEach(([view, label, detail]) => {
      const button = themedButton(label + " · " + detail, () => openTrioHuntSubView(view)); button.classList.add("pi-hunt-nav"); nav.append(button);
    });
    body.append(nav, make("div", { class: "pi-form-title", text: "GEAR BY SLOT" }));
    const slots = make("div", { class: "pi-hunt-navigation pi-hunt-slots" });
    TRIO_GEAR_SLOT_ORDER.forEach((slot) => { const button = themedButton(TRIO_GEAR_SLOT_LABELS[slot] || slot, () => openTrioHuntSubView("slot:" + slot)); button.classList.add("pi-hunt-nav"); slots.append(button); });
    body.append(slots);
    if (warrior.bossInterruptActive) body.append(make("div", { class: "pi-muted", text: "⚡ Auto-interrupting " + safeText(warrior.bossInterruptActive) + "; the selected target resumes afterward." }));
    content.append(body);
  }
  function renderTrioInventory(content, panel) {
    const body = make("div", { class: "pi-body" });
    const grid = make("div", { class: "pi-inventory-members" });
    const savedScale = entry(TRIO_WINDOW_SCALE_KEY)?.value?.inventory;
    trioInventoryScale = Number.isFinite(Number(savedScale)) ? Math.max(0.35, Math.min(1.25, Number(savedScale))) : 0.7;
    const slotSize = 42;
    const cardWidth = Math.max(270, slotSize * 6 + 20);
    grid.style.gridTemplateColumns = `repeat(3, minmax(${cardWidth}px, 1fr))`;
    grid.style.minWidth = (cardWidth * 3 + 20) + "px";
    grid.style.zoom = String(trioInventoryScale);
    activeTrioTeam().forEach((member) => {
      const responseEntry = entry(member.name + ".MerchantTrioUI.inventoryResponse");
      const legacy = isObject(responseEntry?.value) ? responseEntry.value : null;
      const dashboardEntry = publisherEntry(member.name, "Dashboard.v2");
      const dashboard = isObject(dashboardEntry?.value) ? dashboardEntry.value : null;
      const snapshot = legacy && Array.isArray(legacy.items) ? legacy :
        (isObject(dashboard?.inventory) ? dashboard.inventory : null);
      const items = Array.isArray(snapshot?.items) ? snapshot.items : Array.isArray(snapshot?.slots) ? snapshot.slots : [];
      const size = Math.max(0, Number(snapshot?.size || snapshot?.capacity) || items.length);
      const used = items.filter(Boolean).length;
      const age = snapshot?.updatedAt ? Math.max(0, Math.floor((Date.now() - timestamp(snapshot.updatedAt)) / 1000)) : null;
      const status = !snapshot ? "NO SNAPSHOT" : (age > 60 ? "STALE " + age + "s" : "SYNCED " + age + "s AGO");
      const card = make("section", { class: "pi-inventory-card", style: { minWidth: cardWidth + "px" } });
      const syncButton = themedButton("SYNC", () => sendTrioInventoryControl(panel, "sync", member.name), "normal");
      Object.assign(syncButton.style, { background: "#3d3218", color: "#ffe093", borderColor: "#d6a844", padding: "3px 6px", fontSize: "9px" });
      card.append(make("div", { class: "pi-inventory-head" },
        make("span", { style: { color: "#f0c766", fontWeight: "bold", fontSize: "13px" }, text: member.name }),
        make("span", { class: "pi-inventory-status" }, make("span", { class: "pi-muted", text: status + " · " + used + "/" + size }), syncButton)));
      if (snapshot && size > 0) {
        const slots = make("div", { class: "pi-inventory-grid" });
        slots.style.gridTemplateColumns = `repeat(6, ${slotSize}px)`;
        for (let index = 0; index < size; index += 1) {
          const item = items[index];
          const slot = make("div", { class: "pi-inventory-slot" + (item ? " has-item" : "") });
          slot.style.width = slotSize + "px"; slot.style.height = slotSize + "px"; slot.style.minHeight = slotSize + "px";
          if (item) {
            const quantity = item.q === undefined ? item.quantity : item.q;
            const level = item.level === undefined ? item.upgradeLevel : item.level;
            const icon = gameIcon(item.skin || item.name, "pi-catalog-icon", item);
            icon.style.width = "36px"; icon.style.height = "36px";
            slot.title = safeText(item.name || "Unknown item") + (Number(level) > 0 ? " +" + Number(level) : "") + (Number(quantity) > 1 ? " ×" + Number(quantity) : "");
            slot.append(icon);
          } else slot.title = "Empty slot " + (index + 1);
          slots.append(slot);
        }
        card.append(slots, make("div", { class: "pi-inventory-gold", text: "GOLD: " + (snapshot.gold !== undefined && snapshot.gold !== null && Number.isFinite(Number(snapshot.gold)) ? formatNumber(snapshot.gold) : "--") }));
      } else card.append(make("div", { class: "pi-inventory-empty", text: "No current inventory snapshot." }));
      grid.append(card);
    });
    body.append(grid);
    content.append(body);
  }
  function renderTrioRuntime(content, panel) {
    const runtimeEntry = entry(TRIO_RUNTIME_KEY);
    const runtime = isObject(runtimeEntry?.value) ? runtimeEntry.value : {};
    const publishedStatus = trioRosterStatus();
    const logEntry = entry(TRIO_WATCHDOG_LOG_KEY);
    const log = Array.isArray(logEntry?.value) ? logEntry.value : [];
    const body = make("div", { class: "pi-body" });
    body.append(make("div", { class: "pi-runtime-intro", text: "Choose whether each Trio character runs in a full window or native CODE mode. The Merchant watchdog restarts active characters whose heartbeat is stale and records the reason in Merchant LOG." }));
    const grid = make("div", { class: "pi-runtime-grid" });
    const runtimeButton = (label, title, handler, color) => {
      const button = themedButton(label, handler, color === "danger" ? "danger" : "primary");
      button.title = title;
      Object.assign(button.style, { padding: "4px 5px", font: "9px 'Courier New',monospace" });
      if (color === "purple") Object.assign(button.style, { background: "#292342", color: "#d4b9ff", borderColor: "#8b6dcc" });
      else if (color === "blue") Object.assign(button.style, { background: "#193047", color: "#8fdfff", borderColor: "#4599bb" });
      else if (color === "success") Object.assign(button.style, { background: "#1a2f1a", color: "#8eff8e", borderColor: "#44bb44" });
      return button;
    };
    TEAM.slice(0, 3).forEach((member) => {
      const saved = isObject(runtime[member.name]) ? runtime[member.name] : {};
      const state = stateFor(member.name);
      const isFresh = !!(state.updatedAt && Date.now() - timestamp(state.updatedAt) <= 15000);
      const liveStatus = isObject(publishedStatus?.members?.[member.name]) ? publishedStatus.members[member.name] : null;
      const mode = liveStatus?.mode === "window" || liveStatus?.mode === "headless" ? liveStatus.mode :
        state.runtimeMode === "window" || state.runtimeMode === "headless" ? state.runtimeMode : saved.mode === "window" ? "window" : "headless";
      const runnerState = String(liveStatus?.runnerState || "").toLowerCase();
      const active = liveStatus ? liveStatus.active === true : isFresh && state.runtimeActive !== false;
      const standby = publishedStatus?.leftOut === member.name;
      const explicitlyStopped = liveStatus ? liveStatus.explicitlyStopped === true : state.runtimeActive === false;
      const disengaged = mode === "headless" && runnerState === "active";
      const starting = mode === "headless" && ["starting", "loading"].includes(runnerState);
      const status = active ? "RUNNING" : standby ? "STANDBY" : explicitlyStopped ? "STOPPED" : disengaged ? "DISENGAGED" : starting ? "STARTING" : "OFFLINE";
      const statusColor = active ? "#66dd66" : disengaged ? "#ffb454" : starting ? "#8fdfff" : "#898ca3";
      const lastWatchdog = log.slice().reverse().find((item) => item?.name === member.name);
      const card = make("article", { class: "pi-runtime-card" });
      const title = make("div", { style: { display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "center" } },
        make("div", { class: "pi-value", style: { margin: "0" }, text: member.name }),
        make("div", { class: "pi-label", style: { color: statusColor }, text: status }));
      const statusText = active ? "ENGAGED" : standby ? "STANDBY" : explicitlyStopped ? "STOPPED" : disengaged ? "DISENGAGED" : starting ? "STARTING" : "NOT DETECTED";
      const modeText = mode === "window" ? "WINDOW" : "HEADLESS";
      card.append(title, make("div", { class: "pi-muted", text: "Current: " + modeText }),
        make("div", { class: "pi-muted", text: "CODE: " + statusText }),
        make("div", { class: "pi-muted", title: lastWatchdog?.reason || "", text: lastWatchdog ? "Watchdog: " + merchantDuration(Date.now() - timestamp(lastWatchdog.at)) + " ago — " + safeText(lastWatchdog.status).replaceAll("_", " ") : "Watchdog: no automatic restart recorded" }));
      const buttons = make("div", { class: "pi-runtime-buttons" });
      buttons.append(runtimeButton(mode === "window" ? "HEADLESS" : "WINDOW", "Switch " + member.name + " to " + (mode === "window" ? "headless CODE" : "window") + " mode", () => sendTrioRuntimeControl(panel, "mode", member.name), "purple"),
        runtimeButton("RESTART", "Restart " + member.name, () => sendTrioRuntimeControl(panel, "restart", member.name), "blue"),
        runtimeButton(active ? "STOP" : "START", (active ? "Stop " : "Start ") + member.name, () => sendTrioRuntimeControl(panel, "power", member.name), active ? "danger" : "success"));
      card.append(buttons); grid.append(card);
    });
    body.append(grid);
    content.append(body);
  }

  const MERCHANT_CONFIG_FIELDS = [
    { title: "COURIER", fields: [
      { path: "courier.enabled", label: "Enable courier service", type: "boolean", defaultValue: true },
      { path: "courier.autoJoinTrioServer", label: "Join Warrior server", type: "boolean", defaultValue: true },
      { path: "courier.serviceRange", label: "Service range", type: "number", min: 50, max: 1000, step: 10, defaultValue: 350 },
      { path: "courier.pickupWaitMs", label: "Pickup wait (ms)", type: "number", min: 1000, max: 120000, step: 1000, defaultValue: 20000 },
      { path: "courier.tripCooldownMs", label: "Trip cooldown (ms)", type: "number", min: 0, max: 3600000, step: 1000, defaultValue: 30000 },
      { path: "courier.shoppingGoldReserve", label: "Potion shopping reserve", type: "number", min: 0, max: 100000000, step: 1000, defaultValue: 10000 },
      { path: "courier.goldReserve", label: "Trio gold reserve", type: "number", min: 0, max: 100000000, step: 1000, defaultValue: 250000 },
      { path: "courier.personalHpStock", label: "Personal HP stock", type: "number", min: 0, max: 9999, step: 1, defaultValue: 5000 },
      { path: "courier.personalMpStock", label: "Personal MP stock", type: "number", min: 0, max: 9999, step: 1, defaultValue: 5000 },
    ]},
    { title: "INVENTORY AND PRODUCTION", fields: [
      { path: "bank.enabled", label: "Enable banking", type: "boolean", defaultValue: true },
      { path: "overflow.enabled", label: "Enable overflow cleanup", type: "boolean", defaultValue: true },
      { path: "production.enabled", label: "Enable production", type: "boolean", defaultValue: true },
      { path: "bank.minimumFreeSlots", label: "Bank at free slots", type: "number", min: 0, max: 40, step: 1, defaultValue: 5 },
      { path: "overflow.triggerAtFreeSlots", label: "Cleanup at free slots", type: "number", min: 0, max: 40, step: 1, defaultValue: 12 },
      { path: "overflow.targetFreeSlots", label: "Cleanup target slots", type: "number", min: 0, max: 40, step: 1, defaultValue: 16 },
      { path: "bank.carryGold", label: "Gold to carry", type: "number", min: 0, max: 100000000000, step: 1000, defaultValue: 1000000 },
      { path: "production.minimumGold", label: "Production minimum gold", type: "number", min: 0, max: 100000000000, step: 1000, defaultValue: 100000 },
      { path: "production.reserveGold", label: "Production reserve gold", type: "number", min: 0, max: 100000000000, step: 1000, defaultValue: 500000 },
    ]},
    { title: "GATHERING AND OPTIONAL WORK", fields: [
      { path: "gathering.enabled", label: "Enable gathering", type: "boolean", defaultValue: true },
      { path: "idle.returnAfterTasks", label: "Return after finite jobs", type: "boolean", defaultValue: true },
      { path: "idle.townAfterCourier", label: "Town after courier delivery", type: "boolean", defaultValue: true },
      { path: "mluck.enabled", label: "Enable mluck", type: "boolean", defaultValue: true },
      { path: "mluck.patrol.enabled", label: "Patrol main map route", type: "boolean", defaultValue: true },
      { path: "trioWatchdog.enabled", label: "Restart stale Trio scripts", type: "boolean", defaultValue: true },
      { path: "market.enabled", label: "Enable market stand", type: "boolean", defaultValue: false },
      { path: "ponty.enabled", label: "Enable Ponty flipping", type: "boolean", defaultValue: false },
      { path: "donation.enabled", label: "Enable donation XP", type: "boolean", defaultValue: false },
      { path: "gathering.preferredSkill", label: "Preferred gathering", type: "select", options: [["auto", "Auto"], ["fishing", "Fishing"], ["mining", "Mining"]], defaultValue: "auto" },
    ]},
  ];
  function merchantSettingsValue(value) {
    const raw = isObject(value?.value) ? value.value : value;
    if (!isObject(raw)) return {};
    if (isObject(raw.settings)) return clone(raw.settings);
    if (isObject(raw.config)) return clone(raw.config);
    if (["courier", "bank", "overflow", "production", "gathering", "lootRules"].some((key) => isObject(raw[key]))) return clone(raw);
    return {};
  }
  function merchantLootRulesValue(value) {
    const raw = isObject(value?.value) ? value.value : value;
    if (!isObject(raw)) return {};
    const nested = [raw.rules, raw.lootRules, raw.settings?.lootRules, raw.config?.lootRules];
    const rules = nested.find((candidate) => isObject(candidate));
    if (rules) return clone(rules);
    const ruleNames = Object.keys(raw).filter((name) => !["version", "updatedAt", "savedAt"].includes(name));
    return ruleNames.length && ruleNames.some((name) => {
      const rule = raw[name];
      return typeof rule === "string" || (isObject(rule) && (rule.action !== undefined || rule.excessAction !== undefined));
    }) ? clone(raw) : {};
  }
  function merchantLootContext() {
    const settingsEntries = merchantStorageEntries(MERCHANT_SETTINGS_KEY, ".MerchantConfigUI.settings", (key) => MERCHANT_SETTINGS_LEGACY_KEYS.includes(key));
    const settingsEntry = settingsEntries[0] || null;
    const wrapper = isObject(settingsEntry?.value) ? clone(settingsEntry.value) : { version: 1 };
    const settings = merchantSettingsValue(settingsEntry);
    settings.bank = isObject(settings.bank) ? settings.bank : {};
    settings.bank.keepItems = isObject(settings.bank.keepItems) ? settings.bank.keepItems : {};
    settings.bank.neverStore = isObject(settings.bank.neverStore) ? settings.bank.neverStore : {};
    settings.overflow = isObject(settings.overflow) ? settings.overflow : {};
    settings.overflow.neverSell = isObject(settings.overflow.neverSell) ? settings.overflow.neverSell : {};
    settings.production = isObject(settings.production) ? settings.production : {};
    settings.production.upgradeRules = Array.isArray(settings.production.upgradeRules) ? settings.production.upgradeRules : [];
    settings.production.compoundRules = Array.isArray(settings.production.compoundRules) ? settings.production.compoundRules : [];
    const settingsSources = settingsEntries
      .map((item) => ({ item, settings: merchantSettingsValue(item) }))
      .sort((left, right) => number(right.item?.value?.updatedAt) - number(left.item?.value?.updatedAt));
    ["upgradeRules", "compoundRules"].forEach((key) => {
      if (settings.production[key].length) return;
      const source = settingsSources.find((candidate) => Array.isArray(candidate.settings?.production?.[key]) && candidate.settings.production[key].length);
      if (source) settings.production[key] = clone(source.settings.production[key]);
    });
    settings.lootRules = isObject(settings.lootRules) ? settings.lootRules : {};
    const lootEntries = merchantStorageEntries(MERCHANT_LOOT_KEY, ".MerchantConfigUI.lootRules", (key) => key.startsWith(MERCHANT_LOOT_LEGACY_PREFIX));
    const primaryLootRules = merchantLootRulesValue(lootEntries[0]);
    const savedRules = Object.keys(primaryLootRules).length ? primaryLootRules : merchantLootRulesValue(lootEntries.find((item) => Object.keys(merchantLootRulesValue(item)).length));
    if (isObject(savedRules)) Object.keys(savedRules).forEach((name) => { settings.lootRules[name] = clone(savedRules[name]); });
    return { wrapper, settings };
  }
  function merchantLootInventoryNames() {
    const state = characterStateFor("Character01MCH") || {};
    const slots = Array.isArray(state.inventory?.slots) ? state.inventory.slots : [];
    return slots.map((item) => item && item.name).filter(Boolean);
  }
  function merchantLootItemDefinition(name) {
    const item = gameCatalogItem(name);
    return isObject(item?.definition) ? item.definition : (item || {});
  }
  function merchantLootItemLabel(name) {
    const item = gameCatalogItem(name);
    const match = /^(cscroll|scroll)(\d+)$/.exec(String(name));
    if (match && (!item?.name || item.name === name || item.name === "Scroll" || item.name === "Compound Scroll")) {
      return (match[1] === "cscroll" ? "Compound Scroll " : "Upgrade Scroll ") + match[2];
    }
    return item?.name || String(name).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  function merchantNeverSellName(settings, name) {
    const seasonal = settings.seasonal;
    const marketParcelProtected = name === "marketparcel" && (!seasonal || seasonal.preserveMarketParcels !== false);
    const seasonalProtected = seasonal?.enabled && seasonal.preserveMarketParcels && Array.isArray(seasonal.merrit?.exchangeItems) && seasonal.merrit.exchangeItems.includes(name);
    return MERCHANT_HIDDEN_LOOT_ITEMS.has(name) || MERCHANT_GATHERING_TOOL_ITEMS.has(name) || marketParcelProtected || seasonalProtected;
  }
  function merchantLootPanelIncludesProtectedName(settings, name) {
    if (!MERCHANT_OPERATIONAL_LOOT_PANEL_ITEMS.has(name)) return false;
    return !!(settings.bank.keepItems[name] || settings.bank.neverStore[name] || settings.overflow.neverSell[name] || merchantLootAction(settings, name) === "keep");
  }
  function merchantLootCategory(settings, name) {
    if (merchantNeverSellName(settings, name)) return MERCHANT_GATHERING_TOOL_ITEMS.has(name) ? "tools" : "misc";
    const definition = merchantLootItemDefinition(name);
    const type = String(definition.type || "").toLowerCase();
    const weaponType = String(definition.wtype || "").toLowerCase();
    if (weaponType === "rod" || weaponType === "pickaxe") return "tools";
    if (["helmet", "chest", "pants", "shoes", "gloves", "amulet", "belt", "ring", "armor"].includes(type)) return "armor";
    if (definition.wtype || type === "weapon" || ["wblade", "staff", "bow", "crossbow", "dagger", "claw", "fist", "stars"].includes(type)) return "weapons";
    const item = merchantLootInventoryNames().map((itemName) => itemName === name ? characterStateFor("Character01MCH")?.inventory?.slots?.find((slot) => slot?.name === itemName) : null).find(Boolean);
    if (definition.s || definition.stackable || Number(item?.q ?? item?.quantity) > 1) return "stackable";
    return "misc";
  }
  function merchantLootNames(settings, tab = merchantLootTab) {
    const names = new Set(merchantLootInventoryNames());
    [settings.bank.keepItems, settings.bank.neverStore, settings.overflow.neverSell, settings.lootRules].forEach((group) => Object.keys(group || {}).forEach((name) => names.add(name)));
    settings.production.upgradeRules.concat(settings.production.compoundRules).forEach((rule) => { if (rule?.name) names.add(rule.name); });
    return Array.from(names).filter((name) => (!merchantNeverSellName(settings, name) || merchantLootPanelIncludesProtectedName(settings, name)) && (tab === "all" || merchantLootCategory(settings, name) === tab)).sort((left, right) => merchantLootItemLabel(left).localeCompare(merchantLootItemLabel(right)) || left.localeCompare(right));
  }
  function merchantLootNormalizeAction(action) {
    const value = typeof action === "string" ? action.toLowerCase() : action;
    if (value === "inventory" || value === "protect") return "keep";
    if (value === "combine") return "upgrade";
    return ["keep", "bank", "sell", "upgrade"].includes(value) ? value : "auto";
  }
  function merchantLootNormalizeExcessAction(action) {
    const value = typeof action === "string" ? action.toLowerCase() : action;
    return ["sell", "bank", "keep"].includes(value) ? value : "sell";
  }
  function merchantLootRule(settings, name) {
    const rule = settings.lootRules[name];
    if (!rule) return null;
    const action = merchantLootNormalizeAction(isObject(rule) ? rule.action : rule);
    return action === "auto" ? null : { action, excessAction: action === "upgrade" ? merchantLootNormalizeExcessAction(rule.excessAction) : null };
  }
  function merchantLootAction(settings, name) {
    const rule = merchantLootRule(settings, name);
    if (rule) return rule.action;
    if (settings.bank.keepItems[name] || settings.bank.neverStore[name] || settings.overflow.neverSell[name]) return "keep";
    return "auto";
  }
  function merchantLootExcessAction(settings, name) {
    const rule = merchantLootRule(settings, name);
    return rule?.action === "upgrade" ? rule.excessAction : "sell";
  }
  function merchantLootDisplayAction(settings, name) { return merchantLootDraft[name]?.action || merchantLootAction(settings, name); }
  function merchantLootDisplayExcessAction(settings, name) { return merchantLootDraft[name]?.excessAction || merchantLootExcessAction(settings, name); }
  function merchantLootAllPoliciesSelected() { return ["auto", "keep", "bank", "sell", "upgrade"].every((policy) => merchantLootPolicyFilters[policy]); }
  function captureMerchantLootDraft(content, settings) {
    content.querySelectorAll("[data-merchant-loot-action]").forEach((select) => {
      const row = select.closest(".m3-loot-row");
      const excess = row?.querySelector("[data-merchant-loot-excess]");
      merchantLootDraft[select.dataset.merchantLootAction] = { action: select.value || "auto", excessAction: excess?.value || merchantLootDisplayExcessAction(settings, select.dataset.merchantLootAction) };
    });
    merchantLootNames(settings, "all").forEach((name) => { if (!merchantLootDraft[name]) merchantLootDraft[name] = { action: merchantLootAction(settings, name), excessAction: merchantLootExcessAction(settings, name) }; });
  }
  function merchantLootSetRule(settings, name, action, excessAction) {
    action = merchantLootNormalizeAction(action);
    delete settings.bank.keepItems[name];
    delete settings.bank.neverStore[name];
    delete settings.overflow.neverSell[name];
    if (action === "auto") delete settings.lootRules[name];
    else if (action === "keep") { settings.lootRules[name] = { action: "keep" }; settings.bank.keepItems[name] = true; settings.overflow.neverSell[name] = true; }
    else if (action === "bank") { settings.lootRules[name] = { action: "bank" }; settings.overflow.neverSell[name] = true; }
    else if (action === "sell") settings.lootRules[name] = { action: "sell" };
    else if (action === "upgrade") settings.lootRules[name] = { action: "upgrade", excessAction: merchantLootNormalizeExcessAction(excessAction) };
  }
  async function merchantLootPersist(wrapper, settings, panel, applyPanel = "loot") {
    const updatedAt = Date.now();
    await writeEntries({
      [MERCHANT_SETTINGS_KEY]: { ...wrapper, version: wrapper.version || 1, updatedAt, settings },
      [MERCHANT_LOOT_KEY]: { version: 1, updatedAt, rules: clone(settings.lootRules || {}) },
    });
    return sendMerchantSettingsApply(panel, applyPanel);
  }
  function merchantLootExportData(settings) {
    const rules = {};
    merchantLootNames(settings, "all").forEach((name) => {
      const action = merchantLootDisplayAction(settings, name);
      if (action !== "auto") rules[name] = action === "upgrade" ? { action, excessAction: merchantLootDisplayExcessAction(settings, name) } : { action };
    });
    return { type: MERCHANT_LOOT_EXPORT_TYPE, version: 1, exportedAt: new Date().toISOString(), rules };
  }
  async function merchantLootClipboardWrite(text) { if (!navigator.clipboard?.writeText) throw new Error("Clipboard write is unavailable"); await navigator.clipboard.writeText(text); }
  async function merchantLootClipboardRead() { if (!navigator.clipboard?.readText) throw new Error("Clipboard read is unavailable"); return navigator.clipboard.readText(); }
  function merchantLootImportData(text, settings) {
    let data;
    try { data = JSON.parse(String(text || "").trim()); } catch (_) { return { error: "That text is not valid JSON." }; }
    if (!data || typeof data !== "object" || Array.isArray(data)) return { error: "That JSON does not contain loot settings." };
    if (data.type !== undefined && data.type !== MERCHANT_LOOT_EXPORT_TYPE) return { error: "That JSON is not an exported loot settings file." };
    const source = data.rules !== undefined ? data.rules : (data.type === undefined ? data : null);
    if (!source || typeof source !== "object" || Array.isArray(source)) return { error: "No loot rules found in that JSON." };
    const rules = {}; let count = 0; let skipped = 0;
    Object.keys(source).forEach((name) => {
      const sourceRule = source[name];
      const action = merchantLootNormalizeAction(isObject(sourceRule) ? sourceRule.action : sourceRule);
      const known = !!gameCatalogItem(name) || merchantLootNames(settings, "all").includes(name);
      if (action === "auto") return;
      if (!known || (merchantNeverSellName(settings, name) && !merchantLootPanelIncludesProtectedName(settings, name))) { skipped++; return; }
      rules[name] = { action, excessAction: action === "upgrade" ? merchantLootNormalizeExcessAction(sourceRule?.excessAction) : undefined }; count++;
    });
    return count ? { rules, count, skipped } : { error: "No usable loot rules found" + (skipped ? " (unknown or protected items were skipped)." : ".") };
  }
  function renderMerchantLoot(content, panel) {
    const { wrapper, settings } = merchantLootContext();
    const body = make("div", { class: "m3-loot-body" });
    body.append(make("div", { class: "m3-loot-help", text: "Item names are shown as they appear in game; the internal ID is shown underneath. Tools and merchant infrastructure are hidden and permanently protected. Keep protects an item from automatic banking and selling. Bank stores the item; Sell sends it to the vendor during cleanup. Upgrade follows the matching Upgrade Rules window; Excess controls what happens after the target is reached." }));
    body.append(make("div", { class: "m3-loot-filter-label", text: "Item category" }));
    const tabs = make("div", { class: "m3-loot-tabs" });
    ["all", "armor", "weapons", "tools", "stackable", "misc"].forEach((tab) => { const button = make("button", { type: "button", class: "m3-loot-tab" + (merchantLootTab === tab ? " active" : ""), text: tab.charAt(0).toUpperCase() + tab.slice(1), "data-loot-tab": tab }); button.addEventListener("click", () => { captureMerchantLootDraft(body, settings); merchantLootTab = tab; renderActive(panel); }); tabs.append(button); });
    body.append(tabs, make("div", { class: "m3-loot-filter-label", text: "Policy filters — select one or more" }));
    const policies = make("div", { class: "m3-loot-policies" });
    ["all", "auto", "keep", "bank", "sell", "upgrade"].forEach((policy) => { const active = policy === "all" ? merchantLootAllPoliciesSelected() : !!merchantLootPolicyFilters[policy]; const button = make("button", { type: "button", class: "m3-loot-policy" + (active ? " active" : ""), text: policy === "all" ? "All Policies" : policy.charAt(0).toUpperCase() + policy.slice(1), "data-policy": policy }); button.addEventListener("click", () => { captureMerchantLootDraft(body, settings); if (policy === "all") ["auto", "keep", "bank", "sell", "upgrade"].forEach((name) => { merchantLootPolicyFilters[name] = true; }); else merchantLootPolicyFilters[policy] = !merchantLootPolicyFilters[policy]; renderActive(panel); }); policies.append(button); });
    body.append(policies, make("div", { class: "m3-loot-head" }, make("span", { text: "Item" }), make("span", { text: "Policy" }), make("span", { text: "Excess" })));
    const rows = merchantLootNames(settings).filter((name) => merchantLootPolicyFilters[merchantLootDisplayAction(settings, name)]);
    if (!rows.length) body.append(make("div", { class: "m3-loot-help", text: "No items match the selected filters." }));
    rows.forEach((name) => {
      const action = merchantLootDisplayAction(settings, name);
      const row = make("div", { class: "m3-loot-row" });
      row.append(make("span", { title: "Internal item id: " + name }, make("span", { class: "m3-loot-name", text: merchantLootItemLabel(name) }), make("small", { class: "m3-loot-id", text: "[" + name + "]" })));
      const select = make("select", { "data-merchant-loot-action": name, title: "Loot policy" });
      [["auto", "Auto"], ["keep", "Keep"], ["bank", "Bank"], ["sell", "Sell"], ["upgrade", "Upgrade"]].forEach(([value, label]) => select.append(make("option", { value, text: label })));
      select.value = action;
      select.addEventListener("change", () => { captureMerchantLootDraft(body, settings); merchantLootDraft[name] = { action: select.value, excessAction: merchantLootDisplayExcessAction(settings, name) }; settingsDirty = true; renderActive(panel); });
      row.append(select);
      if (action === "upgrade") { const excess = make("select", { "data-merchant-loot-excess": name, title: "Excess action after upgrading" }); [["sell", "Excess: Sell"], ["bank", "Excess: Bank"], ["keep", "Excess: Keep"]].forEach(([value, label]) => excess.append(make("option", { value, text: label }))); excess.value = merchantLootDisplayExcessAction(settings, name); excess.addEventListener("change", () => { captureMerchantLootDraft(body, settings); merchantLootDraft[name] = { action: "upgrade", excessAction: excess.value }; settingsDirty = true; }); row.append(excess); } else row.append(make("span", { class: "m3-loot-id", text: "" }));
      body.append(row);
    });
    const io = make("div", { class: "m3-loot-io" }); const ioArea = make("textarea", { spellcheck: false }); const ioStatus = make("div", { class: "m3-loot-help" }); const ioAction = themedButton("IMPORT TEXT", async () => { try { const parsed = merchantLootImportData(ioArea.value, settings); if (parsed.error) throw new Error(parsed.error); const names = new Set([...merchantLootNames(settings, "all"), ...Object.keys(parsed.rules)]); names.forEach((name) => { const rule = parsed.rules[name]; merchantLootSetRule(settings, name, rule ? rule.action : "auto", rule?.excessAction); }); await merchantLootPersist(wrapper, settings, panel, "loot"); merchantLootDraft = {}; settingsDirty = false; io.classList.remove("is-open"); renderActive(panel); statusNode(panel, "Imported " + parsed.count + " loot rules and saved to the Merchant runtime." + (parsed.skipped ? " " + parsed.skipped + " entries skipped." : "")); } catch (error) { ioStatus.textContent = error.message || "Unable to import loot rules."; } }); const ioClose = themedButton("CANCEL", () => io.classList.remove("is-open")); io.append(ioArea, ioStatus, ioAction, ioClose);
    const actions = make("div", { class: "pi-actions" });
    actions.append(themedButton("APPLY AND SAVE", async () => { try { captureMerchantLootDraft(body, settings); const freshContext = merchantLootContext(); const names = new Set([...merchantLootNames(freshContext.settings, "all"), ...Object.keys(merchantLootDraft)]); names.forEach((name) => { const draft = merchantLootDraft[name] || { action: merchantLootAction(freshContext.settings, name), excessAction: merchantLootExcessAction(freshContext.settings, name) }; merchantLootSetRule(freshContext.settings, name, draft.action, draft.excessAction); }); const ack = await merchantLootPersist(freshContext.wrapper, freshContext.settings, panel, "loot"); merchantLootDraft = {}; settingsDirty = false; renderActive(panel); if (ack?.ok) statusNode(panel, "Merchant V3 loot policies saved and applied to the Merchant runtime."); } catch (error) { statusNode(panel, error.message || "Unable to save Merchant V3 loot policies.", true); } }, "primary"), themedButton("CLOSE", () => panel.remove()), themedButton("EXPORT", async () => { captureMerchantLootDraft(body, settings); const text = JSON.stringify(merchantLootExportData(settings), null, 2); try { await merchantLootClipboardWrite(text); statusNode(panel, "Loot policies copied to the clipboard."); } catch (_) { ioArea.value = text; ioStatus.textContent = "Clipboard blocked. Copy the exported JSON below."; io.classList.add("is-open"); } }), themedButton("IMPORT", async () => { try { statusNode(panel, "Reading loot policies from the clipboard..."); const text = await merchantLootClipboardRead(); ioArea.value = text; ioAction.click(); } catch (_) { ioArea.value = ""; ioStatus.textContent = "Clipboard read blocked. Paste the exported JSON below."; io.classList.add("is-open"); } }));
    content.append(body, io, actions);
  }
  function merchantPontyContext() {
    const context = merchantLootContext();
    context.settings.ponty = isObject(context.settings.ponty) ? context.settings.ponty : {};
    context.settings.ponty.items = Array.isArray(context.settings.ponty.items) ? context.settings.ponty.items.filter((name, index, items) => typeof name === "string" && name && items.indexOf(name) === index) : [];
    context.settings.ponty.scanAllServers = context.settings.ponty.scanAllServers === true;
    return context;
  }
  function merchantPontyKnownName(name) { return !!(name && gameCatalogItem(name)); }
  function merchantPontyAllNames() {
    const names = new Set((Array.isArray(trioGameData.items) ? trioGameData.items : []).map((item) => item?.id || item?.name).filter(Boolean));
    return Array.from(names).sort((left, right) => merchantLootItemLabel(left).localeCompare(merchantLootItemLabel(right)) || left.localeCompare(right));
  }
  function merchantUpgradePercent(value, fallback) {
    let result = Number(value);
    if (!Number.isFinite(result)) return fallback;
    if (result > 0 && result <= 1) result *= 100;
    return Math.max(0, Math.min(100, result));
  }
  function merchantUpgradeCandidates(kind, settings) {
    const names = new Set();
    (Array.isArray(trioGameData.items) ? trioGameData.items : []).forEach((item) => {
      const name = String(item?.id || "");
      const definition = isObject(item?.definition) ? item.definition : item;
      if (name && (item?.[kind] || definition?.[kind]) && !merchantNeverSellName(settings, name)) names.add(name);
    });
    const key = kind === "compound" ? "compoundRules" : "upgradeRules";
    (settings.production?.[key] || []).forEach((rule) => {
      if (rule?.name && !merchantNeverSellName(settings, rule.name)) names.add(String(rule.name));
    });
    return Array.from(names).sort((left, right) => merchantLootItemLabel(left).localeCompare(merchantLootItemLabel(right)) || left.localeCompare(right));
  }
  function merchantUpgradeDraftRules(context) {
    if (merchantUpgradeDraft === null) {
      merchantUpgradeDraft = {
        upgrade: (context.settings.production.upgradeRules || []).filter(isObject).map(clone),
        compound: (context.settings.production.compoundRules || []).filter(isObject).map(clone),
      };
    }
    return merchantUpgradeDraft;
  }
  function merchantUpgradeRuleRow(kind, rule, index, candidates, panel) {
    const names = candidates.slice();
    if (rule?.name && !names.includes(String(rule.name))) names.push(String(rule.name));
    names.sort((left, right) => merchantLootItemLabel(left).localeCompare(merchantLootItemLabel(right)) || left.localeCompare(right));
    const row = make("div", { class: "m3-production-row", "data-kind": kind, "data-index": String(index) });
    const name = make("select", { class: "m3-production-name", title: "Item" });
    if (!names.length) name.append(make("option", { value: "", text: "No eligible items" }));
    names.forEach((itemName) => name.append(make("option", { value: itemName, text: merchantLootItemLabel(itemName) })));
    name.value = String(rule?.name || names[0] || "");
    const level = make("input", { class: "m3-production-level", type: "number", min: "1", max: "12", step: "1", value: String(Math.max(1, Number(rule?.maxLevel) || (kind === "compound" ? 3 : 7))), title: "Target level" });
    const chance = make("input", { class: "m3-production-chance", type: "number", min: "0", max: "100", step: "1", value: String(merchantUpgradePercent(rule?.minChance, kind === "compound" ? 40 : 60)), title: "Minimum chance percent" });
    const scroll = make("input", { class: "m3-production-scroll", type: "number", min: "0", max: "100", step: "1", value: String(merchantUpgradePercent(rule?.higherScrollAt, 0)), title: "Use higher scroll below this chance" });
    const offering = make("select", { class: "m3-production-offering", title: "Offering" });
    [["", "None"], ["offering", "Offering"], ["offeringp", "Offering P"], ["offeringgp", "Offering GP"]].forEach(([value, label]) => offering.append(make("option", { value, text: label })));
    offering.value = String(rule?.offering || "");
    const remove = make("button", { type: "button", class: "m3-production-remove", text: "REMOVE", title: "Remove rule" });
    const update = () => {
      const current = merchantUpgradeDraft?.[kind]?.[index];
      if (!current) return;
      current.name = name.value;
      current.maxLevel = Math.max(1, Math.min(12, Number(level.value) || (kind === "compound" ? 3 : 7)));
      current.minChance = merchantUpgradePercent(chance.value, kind === "compound" ? 40 : 60) / 100;
      current.higherScrollAt = merchantUpgradePercent(scroll.value, 0);
      if (offering.value) current.offering = offering.value;
      else delete current.offering;
      settingsDirty = true;
    };
    [name, level, chance, scroll, offering].forEach((input) => { input.addEventListener("input", update); input.addEventListener("change", update); });
    remove.addEventListener("click", () => { if (merchantUpgradeDraft?.[kind]) merchantUpgradeDraft[kind].splice(index, 1); settingsDirty = true; renderActive(panel); });
    row.append(name, level, chance, scroll, offering, remove);
    return row;
  }
  function merchantUpgradeHeader() {
    return make("div", { class: "m3-production-head" }, make("span", { text: "Item" }), make("span", { text: "Target +" }), make("span", { text: "Min chance %" }), make("span", { text: "Higher scroll below %" }), make("span", { text: "Offering" }), make("span", { text: "" }));
  }
  function merchantUpgradeSection(kind, draft, settings, panel) {
    const key = kind === "compound" ? "compoundRules" : "upgradeRules";
    const title = kind === "compound" ? "Compounds" : "Upgrades";
    const candidates = merchantUpgradeCandidates(kind, settings);
    const sectionNode = make("div", { class: "m3-upgrade-section" }, make("div", { class: "m3-upgrade-title", text: title }));
    sectionNode.append(merchantUpgradeHeader());
    if (!draft[kind].length) sectionNode.append(make("div", { class: "m3-production-empty", text: kind === "compound" ? "No compound rules configured." : "No upgrade rules configured." }));
    draft[kind].forEach((rule, index) => sectionNode.append(merchantUpgradeRuleRow(kind, rule, index, candidates, panel)));
    const add = make("button", { type: "button", class: "m3-production-add", "data-kind": kind, text: kind === "compound" ? "+ ADD COMPOUND RULE" : "+ ADD UPGRADE RULE" });
    add.addEventListener("click", () => {
      if (!candidates.length) { statusNode(panel, "No eligible " + kind + " items are available in the cached game data.", true); return; }
      draft[kind].push({ name: candidates[0], maxLevel: kind === "compound" ? 3 : 7, minChance: kind === "compound" ? 0.4 : 0.6, higherScrollAt: 0 });
      settingsDirty = true;
      renderActive(panel);
    });
    sectionNode.append(add);
    return sectionNode;
  }
  function merchantUpgradeSaveRule(kind, rule, settings) {
    const defaultLevel = kind === "compound" ? 3 : 7;
    const defaultChance = kind === "compound" ? 40 : 60;
    const name = String(rule?.name || "").trim();
    if (!name || merchantNeverSellName(settings, name)) return null;
    const saved = {
      name,
      maxLevel: Math.max(1, Math.min(12, Number(rule?.maxLevel) || defaultLevel)),
      minChance: merchantUpgradePercent(rule?.minChance, defaultChance) / 100,
      higherScrollAt: merchantUpgradePercent(rule?.higherScrollAt, 0),
    };
    if (["offering", "offeringp", "offeringgp"].includes(rule?.offering)) saved.offering = rule.offering;
    return saved;
  }
  async function merchantUpgradePersist(context, draft) {
    const settings = context.settings;
    settings.production.upgradeRules = draft.upgrade.map((rule) => merchantUpgradeSaveRule("upgrade", rule, settings)).filter(Boolean);
    settings.production.compoundRules = draft.compound.map((rule) => merchantUpgradeSaveRule("compound", rule, settings)).filter(Boolean);
    const next = { ...context.wrapper, version: context.wrapper.version || 1, updatedAt: Date.now(), settings };
    await writeEntries({ [MERCHANT_SETTINGS_KEY]: next });
  }
  function renderMerchantUpgrade(content, panel) {
    const context = merchantLootContext();
    const draft = merchantUpgradeDraftRules(context);
    const body = make("div", { class: "m3-upgrade-body" });
    body.append(make("div", { class: "m3-upgrade-help", text: "Set the highest level the merchant should pursue and the minimum success chance required. Higher scroll below is optional: when the local chance estimate is below that percentage, the next available scroll grade is selected. Set it to 0 to keep using the normal same-grade scroll. Items protected as tools or merchant infrastructure cannot be added." }), merchantUpgradeSection("upgrade", draft, context.settings, panel), merchantUpgradeSection("compound", draft, context.settings, panel));
    const actions = make("div", { class: "pi-actions" });
    actions.append(themedButton("APPLY AND SAVE", async () => {
      try {
        const fresh = merchantLootContext();
        await merchantUpgradePersist(fresh, draft);
        const ack = await sendMerchantSettingsApply(panel, "upgrade");
        merchantUpgradeDraft = null;
        settingsDirty = false;
        renderActive(panel);
        if (ack?.ok) statusNode(panel, "Merchant V3 upgrade and compound rules saved and applied to the Merchant runtime.");
      } catch (error) { statusNode(panel, error.message || "Unable to save Merchant V3 upgrade rules.", true); }
    }, "primary"), themedButton("CLOSE", () => panel.remove()));
    content.append(body, actions);
  }
  function merchantAnniversaryContext() {
    const context = merchantLootContext();
    const settings = context.settings;
    const defaults = { enabled: false, autoVisit: false, autoCraft: false, autoOpen: false, autoCompound: false, visitEveryMs: 15 * 60 * 1000, craftRecipe: "sixcake", openItem: "sixcake", minimumFreeSlots: 3, reserveGold: 350000 };
    settings.anniversary = isObject(settings.anniversary) ? settings.anniversary : {};
    Object.entries(defaults).forEach(([key, value]) => { if (settings.anniversary[key] === undefined || settings.anniversary[key] === null) settings.anniversary[key] = value; });
    settings.anniversary.compound = isObject(settings.anniversary.compound) ? settings.anniversary.compound : {};
    if (!settings.anniversary.compound.itemName) settings.anniversary.compound.itemName = "guestbook";
    if (!settings.anniversary.compound.scrollName) settings.anniversary.compound.scrollName = "cscroll2";
    if (settings.anniversary.compound.previewOnly === undefined) settings.anniversary.compound.previewOnly = true;
    return context;
  }
  function merchantAnniversaryInventoryCounts() {
    const state = characterStateFor("Character01MCH") || {};
    const counts = {};
    (Array.isArray(state.inventory?.slots) ? state.inventory.slots : []).forEach((item) => {
      if (!item?.name) return;
      counts[item.name] = (counts[item.name] || 0) + Number(item.quantity === undefined ? (item.q === undefined ? 1 : item.q) : item.quantity) || 0;
    });
    return counts;
  }
  function merchantAnniversaryStatusGrid() {
    const live = isObject(merchantLiveState?.anniversary) ? merchantLiveState.anniversary : {};
    const event = isObject(live.event) ? live.event : null;
    const inventory = merchantAnniversaryInventoryCounts();
    const counts = { ...inventory, ...(isObject(live.counts) ? live.counts : {}) };
    const liveText = !event ? "Not detected" : (!event.active ? "Closed" : (event.live === false ? "Waiting for live round" : "Live"));
    const target = event?.target || "—";
    const ticket = Number(live.ticket?.ms) > 0 ? Math.ceil(Number(live.ticket.ms) / 1000) + "s" : "none";
    const state = characterStateFor("Character01MCH") || {};
    const gold = live.gold ?? state.economy?.gold ?? state.gold ?? "—";
    const freeSlots = live.freeSlots ?? state.inventory?.free ?? "—";
    const lastAction = live.statusText || "No event action recorded";
    const goldNumber = Number(gold);
    const goldText = Number.isFinite(goldNumber) ? (Math.abs(goldNumber) >= 1000000 ? (goldNumber / 1000000).toFixed(1) + "M" : (Math.abs(goldNumber) >= 1000 ? (goldNumber / 1000).toFixed(1) + "K" : Math.round(goldNumber).toLocaleString())) : "—";
    const value = (label, text) => make("div", {}, make("span", { class: "m4-label", text: label }), make("b", { text: safeText(text) }));
    const slices = ["slice_strawberry", "slice_citrus", "slice_honey", "slice_mint", "slice_blueberry", "slice_nightberry"].map((name) => counts[name] || 0).join(" / ");
    return make("div", { class: "m4-ann-status" }, value("Event", liveText), value("Round", event?.round === undefined ? "—" : event.round), value("Featured player", target), value("Visit ticket", ticket), value("Cakes / gifts", (counts.sixcake || 0) + " / " + (counts.anniversarygift || 0)), value("Slices", slices), value("Gold / free slots", goldText + " / " + safeText(freeSlots)), value("Last action", lastAction));
  }
  function merchantAnniversaryField(label, control) { return make("label", { class: "m4-field" }, make("span", { text: label }), control); }
  function merchantAnniversaryCheckbox(id, checked, label) { return make("label", { class: "m4-check" }, make("input", { id, type: "checkbox", checked: checked === true }), make("span", { text: label })); }
  function merchantAnniversaryButton(label, className, handler) { const button = make("button", { type: "button", class: "m4-button" + (className ? " " + className : ""), text: label }); button.addEventListener("click", handler); return button; }
  function renderMerchantAnniversary(content, panel) {
    const context = merchantAnniversaryContext();
    const c = context.settings.anniversary;
    const compound = c.compound;
    const body = make("div", { class: "m4-body" });
    const status = make("div", { class: "m4-section" }, make("div", { class: "m4-title", text: "Live anniversary status" }));
    const statusGrid = make("div", { id: "m4-ann-status" }); statusGrid.append(merchantAnniversaryStatusGrid());
    const statusHelp = make("div", { class: "m4-help", text: "The event controls use the live tutorial APIs. Event automation is off by default and all spending actions require a matching option below." });
    const refresh = merchantAnniversaryButton("REFRESH STATUS", "", async () => { try { await readMerchantLiveState(); statusGrid.replaceChildren(merchantAnniversaryStatusGrid()); statusNode(panel, "Anniversary status refreshed."); } catch (error) { statusNode(panel, error.message || "Unable to refresh anniversary status.", true); } });
    status.append(statusGrid, statusHelp, make("div", { class: "m4-actions" }, refresh));
    const automation = make("div", { class: "m4-section" }, make("div", { class: "m4-title", text: "Automation" }), make("div", { class: "m4-grid" }));
    const enabled = merchantAnniversaryCheckbox("m4-ann-enabled", c.enabled, "Enable event automation");
    const visit = merchantAnniversaryCheckbox("m4-ann-visit", c.autoVisit, "Auto-visit featured player");
    const craft = merchantAnniversaryCheckbox("m4-ann-craft", c.autoCraft, "Auto-craft selected recipe");
    const open = merchantAnniversaryCheckbox("m4-ann-open", c.autoOpen, "Auto-open selected reward");
    const autoCompound = merchantAnniversaryCheckbox("m4-ann-compound", c.autoCompound, "Auto-attempt event compound");
    const interval = make("input", { id: "m4-ann-interval", type: "number", min: "1", max: "1440", step: "1", value: String(Math.max(1, Math.round(Number(c.visitEveryMs) / 60000))) });
    automation.lastChild.append(enabled, visit, craft, open, autoCompound, merchantAnniversaryField("Action interval (minutes)", interval));
    automation.append(make("div", { class: "m4-help", text: "Auto-compound is ignored while preview-only is enabled. Keep a safe inventory and gold reserve; the merchant still prioritizes survival and courier work." }));
    const choices = make("div", { class: "m4-section" }, make("div", { class: "m4-title", text: "Craft and exchange choices" }), make("div", { class: "m4-grid" }));
    const recipe = make("select", { id: "m4-ann-recipe" }); [["sixcake", "sixcake — six slices + 100,000 gold"], ["homecomingcape", "homecomingcape"], ["makeawishjar", "makeawishjar — cake + 250,000 gold"]].forEach(([value, label]) => recipe.append(make("option", { value, text: label }))); recipe.value = c.craftRecipe;
    const openItem = make("select", { id: "m4-ann-open-item" }); [["sixcake", "sixcake"], ["anniversarygift", "anniversarygift"]].forEach(([value, label]) => openItem.append(make("option", { value, text: label }))); openItem.value = c.openItem;
    const compoundItem = make("select", { id: "m4-ann-compound-item" }); [["guestbook", "guestbook"], ["pendant", "pendant"]].forEach(([value, label]) => compoundItem.append(make("option", { value, text: label }))); compoundItem.value = compound.itemName;
    const scroll = make("input", { id: "m4-ann-scroll", value: String(compound.scrollName || "cscroll2") });
    const reserve = make("input", { id: "m4-ann-reserve", type: "number", min: "0", step: "1000", value: String(Number(c.reserveGold) || 0) });
    const slots = make("input", { id: "m4-ann-slots", type: "number", min: "1", max: "40", step: "1", value: String(Number(c.minimumFreeSlots) || 3) });
    choices.lastChild.append(merchantAnniversaryField("Recipe", recipe), merchantAnniversaryField("Reward to open", openItem), merchantAnniversaryField("Compound item", compoundItem), merchantAnniversaryField("Compound scroll", scroll), merchantAnniversaryField("Gold reserve", reserve), merchantAnniversaryField("Minimum free slots", slots));
    const preview = merchantAnniversaryCheckbox("m4-ann-preview", compound.previewOnly !== false, "Preview compound only (recommended)");
    choices.append(preview, make("div", { class: "m4-help", text: "The compound preview calls the game's calculation mode and does not consume the three copies or scroll. Clear this only when you intend to attempt the compound." }));
    const manual = make("div", { class: "m4-section" }, make("div", { class: "m4-title", text: "Manual actions" }), make("div", { class: "m4-actions" }));
    manual.lastChild.append(merchantAnniversaryButton("VISIT FEATURED PLAYER", "", () => sendMerchantAction(panel, "anniversary", { operation: "visit" })), merchantAnniversaryButton("CRAFT RECIPE", "gold", () => sendMerchantAction(panel, "anniversary", { operation: "craft", recipe: recipe.value })), merchantAnniversaryButton("PREVIEW COMPOUND", "", () => sendMerchantAction(panel, "anniversary", { operation: "preview" })), merchantAnniversaryButton("COMPOUND NOW", "red", () => sendMerchantAction(panel, "anniversary", { operation: "compound" })), merchantAnniversaryButton("OPEN REWARD", "gold", () => sendMerchantAction(panel, "anniversary", { operation: "open", item: openItem.value })));
    body.append(status, automation, choices, manual);
    const markDirty = () => { settingsDirty = true; };
    body.querySelectorAll("input,select").forEach((input) => { input.addEventListener("input", markDirty); input.addEventListener("change", markDirty); });
    const actions = make("div", { class: "pi-actions" });
    actions.append(themedButton("APPLY AND SAVE", async () => {
      try {
        const fresh = merchantAnniversaryContext();
        const nextSettings = fresh.settings;
        const next = nextSettings.anniversary;
        next.enabled = enabled.querySelector("input").checked;
        next.autoVisit = visit.querySelector("input").checked;
        next.autoCraft = craft.querySelector("input").checked;
        next.autoOpen = open.querySelector("input").checked;
        next.autoCompound = autoCompound.querySelector("input").checked;
        next.visitEveryMs = Math.max(1, Math.min(1440, Number(interval.value) || 15)) * 60000;
        next.craftRecipe = recipe.value || "sixcake";
        next.openItem = openItem.value || "sixcake";
        next.compound.itemName = compoundItem.value || "guestbook";
        next.compound.scrollName = String(scroll.value || "cscroll2").trim();
        next.compound.previewOnly = preview.querySelector("input").checked;
        next.reserveGold = Math.max(0, Number(reserve.value) || 0);
        next.minimumFreeSlots = Math.max(1, Math.min(40, Number(slots.value) || 3));
        const saved = { ...fresh.wrapper, version: fresh.wrapper.version || 1, updatedAt: Date.now(), settings: nextSettings };
        await writeEntries({ [MERCHANT_SETTINGS_KEY]: saved });
        const ack = await sendMerchantSettingsApply(panel, "anniversary");
        settingsDirty = false;
        renderActive(panel);
        if (ack?.ok) statusNode(panel, "10th Anniversary settings saved and applied to the Merchant runtime.");
      } catch (error) { statusNode(panel, error.message || "Unable to save anniversary settings.", true); }
    }, "primary"), themedButton("CLOSE", () => panel.remove()));
    content.append(body, actions);
  }
  function merchantPontySelectedNames() { return Object.keys(merchantPontyDraft || {}).filter((name) => merchantPontyDraft[name] && merchantPontyKnownName(name)).sort((left, right) => merchantLootItemLabel(left).localeCompare(merchantLootItemLabel(right)) || left.localeCompare(right)); }
  function merchantPontyItemMode() { return "buy every listing and keep it"; }
  function merchantPontyExportData() { return { type: MERCHANT_PONTY_EXPORT_TYPE, version: 1, exportedAt: new Date().toISOString(), items: merchantPontySelectedNames(), scanAllServers: !!merchantPontyDraftScanAll }; }
  function merchantPontyParseImport(text) {
    let data;
    try { data = JSON.parse(String(text || "").trim()); } catch (_) { return { error: "That text is not valid JSON." }; }
    const source = Array.isArray(data) ? data : data && data.items;
    if (!Array.isArray(source)) return { error: "That JSON does not contain a Ponty item list." };
    const accepted = new Set(); let skipped = 0;
    source.forEach((name) => { name = String(name || "").trim(); if (merchantPontyKnownName(name)) accepted.add(name); else skipped++; });
    return { items: Array.from(accepted).sort((left, right) => merchantLootItemLabel(left).localeCompare(merchantLootItemLabel(right)) || left.localeCompare(right)), scanAllServers: typeof data?.scanAllServers === "boolean" ? data.scanAllServers : null, skipped };
  }
  function merchantPontyLogEntries() {
    const record = entry(MERCHANT_PONTY_LOG_KEY);
    return Array.isArray(record?.value?.entries) ? record.value.entries.filter((item) => isObject(item)) : [];
  }
  function merchantPontyLogNumber(value) { const result = Number(value); return Number.isFinite(result) ? Math.round(result).toLocaleString("en-US") : "?"; }
  function merchantPontyLogItemText(item) { const name = item?.name || "?"; return merchantLootItemLabel(name) + (item?.level ? " +" + item.level : "") + (Number(item?.q) > 1 ? " x" + item.q : "") + (item?.price ? " (" + merchantPontyLogNumber(item.price) + " g)" : "") + (item?.error ? " - " + item.error : ""); }
  function merchantPontyLogItemsText(items, total) { const list = (Array.isArray(items) ? items : []).map(merchantPontyLogItemText).join(", "); return total > (items || []).length ? list + ", +" + (total - items.length) + " more" : list; }
  function merchantPontyLogClass(record) {
    if (record.kind === "event") return record.level === "warning" ? "warn" : "event";
    if (record.outcome === "error" || record.outcome === "interrupted" || record.failed?.length) return "error";
    if (record.bought?.length) return "ok";
    if (record.outcome === "skipped" || record.unaffordable?.length || record.inventoryFull || record.bank?.skipped) return "warn";
    return "quiet";
  }
  function merchantPontyLogSummary(record) {
    if (record.kind === "event") return record.text || "Ponty sweep event";
    const count = Number(record.count) || 1;
    if (record.outcome === "error") return "Check failed: " + (record.reason || "unknown error");
    if (record.outcome === "interrupted") return "Check interrupted: " + (record.reason || "merchant job stopped");
    if (record.outcome === "skipped") return "Skipped: " + (record.reason || "nothing to do");
    if (record.bought?.length) return "Bought " + record.bought.length + " listing" + (record.bought.length === 1 ? "" : "s") + " for " + merchantPontyLogNumber((record.bought || []).reduce((total, item) => total + (Number(item.price) || 0), 0)) + " gold (Ponty had " + (record.listings || 0) + ")";
    if (record.failed?.length) return "Could not buy " + record.failed.length + " listing" + (record.failed.length === 1 ? "" : "s") + " (Ponty had " + (record.listings || 0) + ")";
    if (record.wantedCount) return record.wantedCount + " of Ponty's " + (record.listings || 0) + " listings on the buy list, none bought";
    return (count > 1 ? "Scanned " + count + " times" : "Scanned") + ": Ponty had " + (record.listings || 0) + " listings, none on the buy list";
  }
  function merchantPontyLogDetails(record) {
    if (record.kind !== "run") return [];
    const lines = [];
    if (record.bought?.length) lines.push(["Bought", merchantPontyLogItemsText(record.bought, record.bought.length), "ok"]);
    if (record.failed?.length) lines.push(["Failed", merchantPontyLogItemsText(record.failed, record.failed.length), "error"]);
    if (record.unaffordable?.length) lines.push(["Not affordable", merchantPontyLogItemsText(record.unaffordable, record.unaffordable.length), "warn"]);
    if (record.inventoryFull) lines.push(["Inventory", "full - nothing more could be bought", "warn"]);
    if (!record.bought?.length && !record.failed?.length && !record.unaffordable?.length && record.wanted?.length) lines.push(["On the buy list", merchantPontyLogItemsText(record.wanted, record.wantedCount), ""]);
    if (record.bank) lines.push(["Bank", record.bank.trip ? "went to the bank; withdrew " + merchantPontyLogNumber(record.bank.withdrew || 0) : "needed " + merchantPontyLogNumber(record.bank.needed) + " more gold", Number(record.bank.withdrew) > 0 ? "" : "warn"]);
    if (record.goldBefore !== undefined && record.goldAfter !== undefined && record.goldBefore !== record.goldAfter) lines.push(["Gold", merchantPontyLogNumber(record.goldBefore) + " -> " + merchantPontyLogNumber(record.goldAfter), ""]);
    return lines;
  }
  function merchantPontyLogMatches(record) {
    if (merchantPontyLogFilter === "bought") return record.kind === "run" && record.bought?.length > 0;
    if (merchantPontyLogFilter === "problems") return ["error", "warn"].includes(merchantPontyLogClass(record));
    if (merchantPontyLogFilter === "sweeps") return record.kind === "event" || /sweep/.test(record.source || "");
    return true;
  }
  function merchantPontyLogText(entries) {
    return entries.map((record) => new Date(Number(record.at) || Date.now()).toLocaleString() + " [" + (record.source || record.kind || "ponty") + "] " + merchantPontyLogSummary(record)).join("\n");
  }
  function renderMerchantPontyItems(content, panel) {
    const context = merchantPontyContext();
    if (merchantPontyDraft === null) { merchantPontyDraft = {}; context.settings.ponty.items.forEach((name) => { merchantPontyDraft[name] = true; }); merchantPontyDraftScanAll = context.settings.ponty.scanAllServers; }
    const body = make("div", { class: "m3-ponty-body" });
    body.append(make("div", { class: "m3-ponty-help", text: "Choose an item from the combo box and click ADD ITEM. The chooser includes every item in the client data, including anniversary gifts and cakes. Ponty checks only the saved items below and buys every listing of them, whatever the price, and keeps what it buys. If the merchant is short of gold, it withdraws the difference from the bank first. While home and idle in town, Ponty checks every 60 seconds." }));
    const scan = make("label", { class: "m3-ponty-scan" }, make("input", { type: "checkbox", checked: merchantPontyDraftScanAll }), make("span", { text: "Check Ponty on every server, then return to the home server" })); scan.querySelector("input").addEventListener("change", (event) => { merchantPontyDraftScanAll = event.target.checked; settingsDirty = true; }); body.append(scan);
    const search = make("input", { class: "m3-ponty-search", type: "search", placeholder: "Filter the item chooser by name or ID", value: merchantPontySearch });
    const picker = make("div", { class: "m3-ponty-picker" }); const chooser = make("select", {}); chooser.append(make("option", { value: "", text: "Choose an item to add..." }));
    merchantPontyAllNames().forEach((name) => chooser.append(make("option", { value: name, "data-ponty-name": name, text: merchantLootItemLabel(name) + " [" + name + "]" + (merchantPontyDraft[name] ? " (already added)" : "") })));
    const add = make("button", { type: "button", class: "m3-ponty-add", text: "ADD ITEM" }); add.addEventListener("click", () => { if (merchantPontyKnownName(chooser.value)) { merchantPontyDraft[chooser.value] = true; chooser.value = ""; settingsDirty = true; renderActive(panel); } }); picker.append(chooser, add);
    search.addEventListener("input", () => { merchantPontySearch = search.value || ""; const needle = merchantPontySearch.trim().toLowerCase(); chooser.querySelectorAll("option[data-ponty-name]").forEach((option) => { option.hidden = !!needle && !option.textContent.toLowerCase().includes(needle); }); }); if (merchantPontySearch) { const needle = merchantPontySearch.trim().toLowerCase(); chooser.querySelectorAll("option[data-ponty-name]").forEach((option) => { option.hidden = !!needle && !option.textContent.toLowerCase().includes(needle); }); } body.append(search, picker);
    body.append(make("div", { class: "m3-ponty-count", text: merchantPontySelectedNames().length + " selected" }));
    const list = make("div", { class: "m3-ponty-list" }); const selected = merchantPontySelectedNames();
    if (!selected.length) list.append(make("div", { class: "m3-ponty-empty", text: "No Ponty items added yet." }));
    selected.forEach((name) => { const row = make("div", { class: "m3-ponty-selected-row" }); const copy = make("div", { class: "m3-ponty-selected-copy" }, make("span", { class: "m3-ponty-name", text: merchantLootItemLabel(name) }), make("small", { class: "m3-ponty-id", text: "[" + name + "] — " + merchantPontyItemMode(name) })); const remove = make("button", { type: "button", class: "m3-ponty-remove", text: "REMOVE" }); remove.addEventListener("click", () => { merchantPontyDraft[name] = false; settingsDirty = true; renderActive(panel); }); row.append(copy, remove); list.append(row); }); body.append(list);
    const io = make("div", { class: "m3-loot-io" }); const ioArea = make("textarea", { spellcheck: false }); const ioStatus = make("div", { class: "m3-loot-help" }); const ioImport = themedButton("IMPORT TEXT", async () => { try { const parsed = merchantPontyParseImport(ioArea.value); if (parsed.error) throw new Error(parsed.error); const fresh = merchantPontyContext(); fresh.settings.ponty.items = parsed.items; if (parsed.scanAllServers !== null) fresh.settings.ponty.scanAllServers = parsed.scanAllServers; const ack = await merchantLootPersist(fresh.wrapper, fresh.settings, panel, "ponty"); merchantPontyDraft = null; merchantPontyDraftScanAll = false; io.classList.remove("is-open"); settingsDirty = false; renderActive(panel); if (ack?.ok) statusNode(panel, "Imported " + parsed.items.length + " Ponty items and applied them to the Merchant." + (parsed.skipped ? " " + parsed.skipped + " skipped." : "")); } catch (error) { ioStatus.textContent = error.message || "Unable to import Ponty items."; } }); const ioCancel = themedButton("CANCEL", () => io.classList.remove("is-open")); io.append(ioArea, ioStatus, ioImport, ioCancel);
    const actions = make("div", { class: "pi-actions" }); actions.append(themedButton("APPLY AND SAVE", async () => { try { const fresh = merchantPontyContext(); fresh.settings.ponty.items = merchantPontySelectedNames(); fresh.settings.ponty.scanAllServers = !!merchantPontyDraftScanAll; const ack = await merchantLootPersist(fresh.wrapper, fresh.settings, panel, "ponty"); merchantPontyDraft = null; settingsDirty = false; renderActive(panel); if (ack?.ok) statusNode(panel, "Ponty item settings saved and applied to the Merchant runtime."); } catch (error) { statusNode(panel, error.message || "Unable to save Ponty item settings.", true); } }, "primary"), themedButton("CLOSE", () => panel.remove()), themedButton("EXPORT", async () => { const text = JSON.stringify(merchantPontyExportData(), null, 2); try { await merchantLootClipboardWrite(text); statusNode(panel, "Ponty item settings copied to the clipboard."); } catch (_) { ioArea.value = text; ioStatus.textContent = "Clipboard blocked. Copy the exported JSON below."; io.classList.add("is-open"); } }), themedButton("IMPORT", async () => { try { ioArea.value = await merchantLootClipboardRead(); ioImport.click(); } catch (_) { ioArea.value = ""; ioStatus.textContent = "Clipboard read blocked. Paste the exported JSON below."; io.classList.add("is-open"); } }));
    content.append(body, io, actions);
  }
  function renderMerchantPontyLog(content, panel) {
    const entries = merchantPontyLogEntries(); const body = make("div", { class: "m3-plog" }); const toolbar = make("div", { class: "m3-plog-bar" }); const filter = make("select", {}); [["all", "All entries"], ["bought", "Bought something"], ["problems", "Problems and skips"], ["sweeps", "Server sweeps"]].forEach(([value, label]) => filter.append(make("option", { value, text: label }))); filter.value = merchantPontyLogFilter; filter.addEventListener("change", () => { merchantPontyLogFilter = filter.value; renderActive(panel); }); const copy = make("button", { type: "button", class: "m3-plog-btn", text: "COPY" }); copy.addEventListener("click", async () => { try { await merchantLootClipboardWrite(merchantPontyLogText(entries)); statusNode(panel, "Ponty log copied to the clipboard."); } catch (_) { statusNode(panel, "Clipboard access is unavailable.", true); } }); const clear = make("button", { type: "button", class: "m3-plog-btn m3-plog-danger", text: "CLEAR" }); clear.addEventListener("click", async () => { if (Date.now() - merchantPontyLogClearArmedAt > 4000) { merchantPontyLogClearArmedAt = Date.now(); clear.textContent = "CLICK AGAIN TO CLEAR"; return; } merchantPontyLogClearArmedAt = 0; await writeEntries({ [MERCHANT_PONTY_LOG_KEY]: { version: 1, entries: [] } }); renderActive(panel); statusNode(panel, "Ponty log cleared."); }); toolbar.append(filter, copy, clear); body.append(toolbar);
    const checks = entries.filter((record) => record.kind === "run").reduce((total, record) => total + (Number(record.count) || 1), 0); const bought = entries.reduce((total, record) => total + (record.bought?.length || 0), 0); const spent = entries.reduce((total, record) => total + (record.bought || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0), 0); body.append(make("div", { class: "m3-plog-stats", text: checks + " check" + (checks === 1 ? "" : "s") + " logged, " + bought + " listing" + (bought === 1 ? "" : "s") + " bought for " + merchantPontyLogNumber(spent) + " gold" }));
    const shown = entries.filter(merchantPontyLogMatches).slice().reverse(); if (!shown.length) body.append(make("div", { class: "m3-plog-empty", text: entries.length ? "No entries match this filter." : "Nothing logged yet. Every Ponty check adds an entry here." }));
    shown.forEach((record) => { const kind = merchantPontyLogClass(record); const row = make("div", { class: "m3-plog-row m3-plog-row-" + kind }); const head = make("div", { class: "m3-plog-head" }, make("span", { class: "m3-plog-time", text: new Date(Number(record.at) || Date.now()).toLocaleString() }), make("span", { class: "m3-plog-tag", text: record.kind === "event" ? "sweep" : (record.source || "auto") }), record.server ? make("span", { class: "m3-plog-server", text: record.server }) : null, Number(record.count) > 1 ? make("span", { class: "m3-plog-count", text: "x" + record.count }) : null); row.append(head, make("div", { class: "m3-plog-main", text: merchantPontyLogSummary(record) })); merchantPontyLogDetails(record).forEach(([label, text, lineClass]) => row.append(make("div", { class: "m3-plog-line" + (lineClass ? " m3-plog-" + lineClass : "" ) }, make("b", { text: label + ": " }), text))); body.append(row); }); content.append(body);
  }
  function merchantSettingValue(settings, field) { const value = getPath(settings, field.path); return value === undefined || value === null ? field.defaultValue : value; }
  function merchantConfigStorageKeyIncluded(key) {
    return typeof key === "string" && key.length <= 300 && !HIDDEN_KEY_PATTERN.test(key) &&
      (/^cstore_[A-Za-z0-9_-]+$/.test(key) || /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key));
  }
  function merchantConfigStorageKeyIsCommand(key) {
    return /\.(dashboardControl|serverSwitch|serverSwitchAck|goldTransfer|settingsApplyRequest|controlRequest|inventoryControlRequest)$/.test(key) ||
      /^cstore_droid_(?:trio_server_switch|trio_dashboard_control|trio_server_ack|courier_gold_transfer|trio_runtime_control|trio_inventory_control|caracal_settings_apply)/.test(key);
  }
  function merchantConfigStorageExport() {
    const rawEntries = isObject(activeSnapshot?.entries) ? activeSnapshot.entries : {};
    const entries = {};
    Object.keys(rawEntries).sort().forEach((key) => {
      if (!merchantConfigStorageKeyIncluded(key) || merchantConfigStorageKeyIsCommand(key)) return;
      const raw = rawEntries[key];
      if (typeof raw !== "string") return;
      let value;
      try {
        value = JSON.parse(raw);
        if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 1 && Object.keys(value)[0] === "$raw") value = { $raw: raw };
      } catch (_) { value = { $raw: raw }; }
      entries[key] = value;
    });
    return { type: "adventureland-script-localstorage", version: 1, exportedAt: new Date().toISOString(), count: Object.keys(entries).length, entries };
  }
  async function merchantConfigStorageImport(text, panel) {
    let data;
    try { data = JSON.parse(String(text || "").trim()); } catch (_) { throw new Error("That text is not valid JSON."); }
    if (!isObject(data) || data.type !== "adventureland-script-localstorage" || !isObject(data.entries)) throw new Error("That JSON is not an EXPORT ALL file.");
    const serialized = {};
    let skipped = 0;
    Object.entries(data.entries).forEach(([key, value]) => {
      if (!merchantConfigStorageKeyIncluded(key) || merchantConfigStorageKeyIsCommand(key) || value === undefined) { skipped += 1; return; }
      if (value && isObject(value) && !Array.isArray(value) && Object.keys(value).length === 1 && typeof value.$raw === "string") serialized[key] = value.$raw;
      else serialized[key] = JSON.stringify(value);
    });
    if (!Object.keys(serialized).length) throw new Error("No importable script storage entries were found.");
    const response = await fetch(SYNC_ENDPOINT, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ set: serialized }), cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Shared script storage rejected the import.");
    activeSnapshot = payload;
    const acknowledgement = await sendMerchantSettingsApply(panel, "configuration");
    return { imported: Object.keys(serialized).length, skipped, acknowledgement };
  }
  function renderMerchantConfig(content, panel) {
    const currentEntry = entry(MERCHANT_SETTINGS_KEY) || entrySuffix(".MerchantConfigUI.settings");
    let wrapper = isObject(currentEntry?.value) ? clone(currentEntry.value) : { version: 1 };
    let settings = isObject(wrapper.settings) ? clone(wrapper.settings) : {};
    const form = make("form", { class: "m3-body" });
    const save = async (nextSettings) => {
      const next = Object.assign({}, wrapper, { version: wrapper.version || 1, updatedAt: Date.now(), settings: nextSettings });
      statusNode(panel, "Saving Merchant V3 configuration...");
      await writeEntries({ [MERCHANT_SETTINGS_KEY]: next });
      const ack = await sendMerchantSettingsApply(panel, "configuration");
      wrapper = next;
      settings = nextSettings;
      settingsDirty = false;
      if (ack?.ok) statusNode(panel, "Merchant V3 configuration saved and applied to the Merchant runtime.");
    };
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nextSettings = clone(settings) || {};
      try {
        form.querySelectorAll("[data-merchant-path]").forEach((input) => {
          const type = input.dataset.merchantType;
          const value = type === "boolean" ? input.checked : (type === "number" ? (input.value === "" ? undefined : Number(input.value)) : input.value);
          if (value !== undefined) setPath(nextSettings, input.dataset.merchantPath, value);
        });
        form.querySelectorAll("[data-merchant-json-path]").forEach((area) => {
          try { setPath(nextSettings, area.dataset.merchantJsonPath, JSON.parse(area.value || "[]")); } catch (_) { throw new Error("Fix invalid JSON in " + area.dataset.merchantJsonPath); }
        });
        await save(nextSettings);
      } catch (error) { statusNode(panel, error.message || "Unable to save Merchant V3 configuration.", true); }
    });
    MERCHANT_CONFIG_FIELDS.forEach((group) => {
      const block = make("section", { class: "m3-section" }, make("div", { class: "m3-title", text: group.title }));
      const grid = make("div", { class: "m3-grid" });
      group.fields.forEach((field) => {
        const current = merchantSettingValue(settings, field);
        let input;
        if (field.type === "select") {
          input = make("select", { "data-merchant-path": field.path, "data-merchant-type": field.type });
          field.options.forEach(([value, label]) => input.append(make("option", { value, text: label })));
          input.value = String(current);
        } else {
          input = make("input", { type: field.type === "boolean" ? "checkbox" : "number", "data-merchant-path": field.path, "data-merchant-type": field.type });
          if (field.type === "boolean") input.checked = current === true || current === "true" || current === 1 || current === "1";
          else { input.value = current === undefined || current === null ? "" : String(current); input.min = field.min; input.max = field.max; input.step = field.step; }
        }
        input.addEventListener(field.type === "boolean" ? "change" : "input", () => { settingsDirty = true; });
        if (field.type === "boolean") grid.append(make("label", { class: "m3-check" }, input, make("span", { text: field.label })));
        else grid.append(make("label", { class: "m3-field" }, make("span", { text: field.label }), input));
      });
      block.append(grid);
      form.append(block);
    });
    const market = make("section", { class: "m3-section" }, make("div", { class: "m3-title", text: "MARKET DATA" }));
    const addJson = (path, label) => {
      const area = make("textarea", { class: "m3-area", "data-merchant-json-path": path, "aria-label": label });
      const value = getPath(settings, path);
      area.value = JSON.stringify(Array.isArray(value) ? value : [], null, 2);
      area.addEventListener("input", () => { settingsDirty = true; });
      market.append(make("label", { class: "m3-field" }, make("span", { text: label }), area));
    };
    addJson("market.listings", "Listings JSON");
    addJson("market.wishlists", "Wishlists JSON");
    market.append(make("div", { class: "m3-help", text: 'Use arrays such as [{"name":"coat","level":0,"quantity":1,"price":10000}].' }));
    form.append(market);
    const io = make("section", { class: "m3-section" }, make("div", { class: "m3-title", text: "SCRIPT STORAGE" }));
    const ioArea = make("textarea", { class: "m3-area", spellcheck: false, "aria-label": "Import script storage JSON" });
    const ioStatus = make("div", { class: "m3-help" });
    const exportAll = themedButton("EXPORT ALL", async () => {
      const dump = merchantConfigStorageExport();
      if (!dump.count) { statusNode(panel, "Nothing to export — no script data found in shared storage.", true); return; }
      const text = JSON.stringify(dump, null, 2);
      try { await merchantLootClipboardWrite(text); statusNode(panel, "Copied " + dump.count + " script storage entries to the clipboard."); }
      catch (_) { ioArea.value = text; ioStatus.textContent = "Clipboard blocked. Copy the exported JSON below."; }
    });
    const importAll = themedButton("IMPORT TEXT", async () => {
      try {
        const result = await merchantConfigStorageImport(ioArea.value, panel);
        ioStatus.textContent = "Imported " + result.imported + " entries" + (result.skipped ? ", " + result.skipped + " skipped (credentials and one-shot controls)." : ".") + (result.acknowledgement?.ok ? " Merchant applied saved settings." : " Reload the relevant characters to apply imported settings.");
        settingsDirty = false;
      } catch (error) { ioStatus.textContent = error.message || "Unable to import script storage."; }
    }, "primary");
    const importClipboard = themedButton("IMPORT FROM CLIPBOARD", async () => {
      try { ioArea.value = await merchantLootClipboardRead(); importAll.click(); }
      catch (_) { ioStatus.textContent = "Clipboard read blocked. Paste the exported JSON in the text area."; }
    });
    io.append(make("div", { class: "m3-help", text: "Exports and imports script-owned shared storage, skipping credentials and one-shot requests, like the in-game EXPORT ALL / IMPORT ALL controls." }), make("div", { class: "m3-actions" }, exportAll, importClipboard), ioArea, make("div", { class: "m3-actions" }, importAll), ioStatus);
    form.append(io);
    const actions = make("div", { class: "m3-actions" });
    const apply = themedButton("APPLY AND SAVE", () => form.requestSubmit(), "primary"); apply.className += " m3-primary";
    const reset = themedButton("RESET V3 DEFAULTS", async () => {
      try { const ack = await sendMerchantSettingsApply(panel, "configuration", "resetDefaults"); if (ack?.ok) { activeSnapshot = await readSnapshot(); settingsDirty = false; renderActive(panel); statusNode(panel, "Merchant V3 defaults restored and applied to the Merchant runtime."); } } catch (error) { statusNode(panel, error.message || "Unable to reset Merchant V3 defaults.", true); }
    }); reset.className += " m3-secondary";
    const close = themedButton("CLOSE", () => { panel.remove(); stopRefresh(panel); }); close.className += " m3-secondary";
    actions.append(apply, reset, close); form.append(actions); content.append(form);
  }
  function trioStatsRecord(name) {
    const direct = entry(name + ".Trio.metricsData")?.value;
    if (isObject(direct) && Number(direct.updatedAt)) return direct;
    const published = publisherEntry(name, "Metrics.v2", [name + ".Trio.metricsData"]);
    return isObject(published?.value) ? published.value : null;
  }
  function trioStatsPoint(point) {
    if (Array.isArray(point)) return [Number(point[0]) || 0, Number(point[1]) || 0];
    if (!isObject(point)) return null;
    const at = Number(point.at ?? point.timestamp ?? point.time);
    const value = Number(point.value ?? point.total ?? point.y);
    return Number.isFinite(at) && Number.isFinite(value) ? [at, value] : null;
  }
  function trioStatsRateSeries(members, key) {
    const lists = members.map((member) => {
      const points = member.data?.history?.[key];
      return Array.isArray(points) ? points.map(trioStatsPoint).filter(Boolean).sort((a, b) => a[0] - b[0]) : [];
    }).filter((points) => points.length);
    if (!lists.length) return [];
    const start = Math.min(...lists.map((list) => list[0][0]));
    const end = Math.max(...lists.map((list) => list[list.length - 1][0]));
    const cumulative = [];
    for (let at = Math.ceil(start / 60000) * 60000; at <= end; at += 60000) {
      let total = 0;
      lists.forEach((list) => { let value = 0; for (const point of list) { if (point[0] > at) break; value = point[1]; } total += value; });
      cumulative.push([at, total]);
    }
    const rates = [];
    let first = 0;
    for (let index = 1; index < cumulative.length; index += 1) {
      while (first < index - 1 && cumulative[index][0] - cumulative[first + 1][0] >= 5 * 60000) first += 1;
      const span = cumulative[index][0] - cumulative[first][0];
      if (span > 0) rates.push([cumulative[index][0], Math.max(0, (cumulative[index][1] - cumulative[first][1]) / span * 3600000)]);
    }
    return rates;
  }
  function trioStatsSparkline(points, color) {
    if (!points || points.length < 2) return make("div", { class: "pi-stats-no-series", text: "collecting samples..." });
    const width = 270, height = 46, max = Math.max(1, ...points.map((point) => point[1]));
    const firstAt = points[0][0], span = Math.max(1, points[points.length - 1][0] - firstAt);
    const coordinates = points.map((point) => [2 + (point[0] - firstAt) / span * (width - 4), height - 3 - point[1] / max * (height - 8)]);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(width)); svg.setAttribute("height", String(height)); svg.setAttribute("viewBox", `0 0 ${width} ${height}`); svg.setAttribute("class", "pi-stats-sparkline");
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", `2,${height - 3} ${coordinates.map((point) => point.map((value) => value.toFixed(1)).join(",")).join(" ")} ${width - 2},${height - 3}`); polygon.setAttribute("fill", color); polygon.setAttribute("fill-opacity", "0.16");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.setAttribute("points", coordinates.map((point) => point.map((value) => value.toFixed(1)).join(",")).join(" ")); line.setAttribute("fill", "none"); line.setAttribute("stroke", color); line.setAttribute("stroke-width", "1.6");
    svg.append(polygon, line); return svg;
  }
  function trioStatsTile(label, value, detail = "", accent = "#343752") {
    return make("div", { class: "pi-stats-tile", style: { borderColor: accent } },
      make("div", { class: "pi-label", style: { textTransform: "uppercase", fontSize: "9px" }, text: label }),
      make("div", { class: "pi-value", style: { color: "#fff", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, text: value }),
      detail ? make("div", { class: "pi-muted", style: { fontSize: "9px" }, text: detail }) : null);
  }
  function trioStatsTopList(map, limit, labelFor) {
    const rows = Object.keys(map || {}).sort((a, b) => Number(map[b]) - Number(map[a])).slice(0, limit);
    const total = Object.values(map || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const list = make("div", { class: "pi-stats-toplist" });
    if (!rows.length) return make("div", { class: "pi-stats-no-data", text: "Nothing recorded yet." });
    rows.forEach((key) => list.append(make("span", { class: "pi-stats-name", text: labelFor(key) }),
      make("span", { class: "pi-stats-number", text: formatNumber(map[key]) }),
      make("span", { class: "pi-stats-share", text: total ? (Number(map[key]) / total * 100).toFixed(0) + "%" : "0%" })));
    return list;
  }
  function renderTrioStats(content) {
    const members = activeTrioTeam().map((member) => ({ name: member.name, color: member.color, data: trioStatsRecord(member.name) }));
    const live = members.filter((member) => member.data);
    const freshMembers = live.filter((member) => Date.now() - timestamp(member.data.updatedAt) <= 90000);
    const latestUpdate = live.reduce((latest, member) => Math.max(latest, timestamp(member.data.updatedAt)), 0);
    const startedAt = live.reduce((earliest, member) => Math.min(earliest, timestamp(member.data.startedAt || member.data.sessionStartedAt || member.data.updatedAt)), Infinity);
    const referenceNow = freshMembers.length ? Date.now() : latestUpdate;
    const elapsedMs = live.length ? Math.max(1000, referenceNow - startedAt) : 0;
    const summary = { xp: 0, gold: 0, kills: 0, largestGoldDrop: 0, mobKills: {}, itemCounts: {}, damage: {} };
    live.forEach((member) => {
      const data = member.data;
      summary.xp += Number(data.xpGained ?? data.xpEarned) || 0;
      summary.gold += Number(data.lootGold ?? data.goldEarned) || 0;
      summary.kills = Math.max(summary.kills, Number(data.kills) || 0);
      summary.largestGoldDrop = Math.max(summary.largestGoldDrop, Number(data.largestGoldDrop) || 0);
      const kills = data.mobKills || data.killsByMonster || {};
      Object.keys(kills).forEach((type) => { summary.mobKills[type] = Math.max(summary.mobKills[type] || 0, Number(kills[type]) || 0); });
      const items = data.itemCounts || data.itemTotals || {};
      Object.keys(items).forEach((name) => { summary.itemCounts[name] = (summary.itemCounts[name] || 0) + (Number(items[name]) || 0); });
      if (isObject(data.damage)) Object.keys(data.damage).forEach((name) => {
        const record = data.damage[name] || {};
        const score = (Number(record.damage) || 0) + (Number(record.damageReturn) || 0) + (Number(record.reflect) || 0) + (Number(record.heal) || 0);
        if (!summary.damage[name] || score > summary.damage[name].score) summary.damage[name] = { score, entry: record, updatedAt: timestamp(data.updatedAt) };
      });
    });
    const warrior = members[0]?.data;
    const warriorState = characterStateFor("Character07");
    const warriorElapsed = warrior ? Math.max(1000, referenceNow - timestamp(warrior.startedAt || warrior.sessionStartedAt || warrior.updatedAt)) : 0;
    const warriorXpRate = warriorElapsed ? (Number(warrior.xpGained ?? warrior.xpEarned) || 0) / warriorElapsed : 0;
    const currentXp = Number(warriorState.xp) || Number(warrior?.xp) || 0;
    const maxXp = Number(warriorState.max_xp) || Number(warrior?.maxXp) || 0;
    const timeToLevel = warriorXpRate > 0 && maxXp ? Math.max(0, maxXp - currentXp) / warriorXpRate : null;
    const itemTotal = Object.values(summary.itemCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const goldRate = elapsedMs ? summary.gold / elapsedMs * 3600000 : 0;
    const xpRate = elapsedMs ? summary.xp / elapsedMs * 3600000 : 0;
    const killRate = elapsedMs ? summary.kills / elapsedMs * 3600000 : 0;
    const body = make("div", { class: "pi-body pi-trio-stats-body" });
    if (!live.length) body.append(make("div", { class: "pi-stats-warning", text: "No Trio stats have been published yet. Each running Trio character publishes its stats to shared storage every few seconds." }));
    else body.append(make("div", { class: "pi-stats-freshness" },
      make("span", { text: "Live from shared storage · session " + merchantDuration(elapsedMs) }),
      make("span", { style: { color: freshMembers.length ? "#66dd66" : "#e13758" }, text: freshMembers.length ? "updated " + merchantDuration(Date.now() - latestUpdate) + " ago" : "STALE — last update " + merchantDuration(Date.now() - latestUpdate) + " ago" })));
    const memberGrid = make("div", { class: "pi-stats-member-grid" });
    members.forEach((member) => {
      const data = member.data;
      const isFresh = !!(data && Date.now() - timestamp(data.updatedAt) <= 90000);
      const memberElapsed = data ? Math.max(1000, (isFresh ? Date.now() : timestamp(data.updatedAt)) - timestamp(data.startedAt || data.sessionStartedAt || data.updatedAt)) : 0;
      const xp = Number(data?.xpGained ?? data?.xpEarned) || 0;
      const role = TEAM.find((item) => item.name === member.name)?.role || "";
      memberGrid.append(make("article", { class: "pi-stats-member" },
        make("div", { class: "pi-stats-member-name", style: { color: member.color }, text: member.name }),
        data ? make("div", { class: "pi-stats-member-status", style: { color: isFresh ? "#66dd66" : "#777" }, text: (isFresh ? "ONLINE" : "STALE") + " · " + role + " · LV " + (data.level || warriorState.level || "?") }) : make("div", { class: "pi-stats-member-status", text: "NO DATA" }),
        data ? make("div", { class: "pi-muted", text: safeText(data.map || warriorState.map || "?") + " · " + formatNumber(xp / memberElapsed * 3600000) + " xp/h" }) : null));
    });
    body.append(memberGrid);
    if (live.length) {
      const tiles = make("div", { class: "pi-stats-tiles" });
      tiles.append(trioStatsTile("Gold / hour", formatNumber(goldRate), formatNumber(summary.gold) + " looted this session", "#8a7a2c"),
        trioStatsTile("XP / hour", formatNumber(xpRate), formatNumber(summary.xp) + " earned this session", "#3b8d9b"),
        trioStatsTile("Time to level (Warrior)", timeToLevel === null ? "--" : merchantDuration(timeToLevel), "at the current XP rate"),
        trioStatsTile("Kills", formatNumber(summary.kills), formatNumber(killRate) + " / hour"),
        trioStatsTile("Largest gold drop", formatNumber(summary.largestGoldDrop)),
        trioStatsTile("Items looted", formatNumber(itemTotal), Object.keys(summary.itemCounts).length + " kinds"));
      body.append(tiles);
      const graphs = make("div", { class: "pi-stats-graphs" });
      const goldGraph = make("section", {}, make("div", { class: "pi-stats-caption", text: "Gold / hour (5 min window)" }), trioStatsSparkline(trioStatsRateSeries(members, "gold"), "#e5c23c"));
      const xpGraph = make("section", {}, make("div", { class: "pi-stats-caption", text: "XP / hour (5 min window)" }), trioStatsSparkline(trioStatsRateSeries(members, "xp"), "#51d2e1"));
      graphs.append(goldGraph, xpGraph); body.append(graphs);
      const damageRows = Object.keys(summary.damage).sort((a, b) => summary.damage[b].score - summary.damage[a].score).slice(0, 8);
      if (damageRows.length) {
        const damage = section("DAMAGE & HEALING"); const table = make("div", { class: "pi-stats-damage" });
        ["Player", "DPS", "Total damage", "Heal / s"].forEach((label) => table.append(make("span", { class: "pi-stats-table-head", text: label })));
        damageRows.forEach((name) => { const record = summary.damage[name]; const value = record.entry; const seconds = Math.max(1, (record.updatedAt - timestamp(value.since || record.updatedAt)) / 1000); const damageTotal = (Number(value.damage) || 0) + (Number(value.damageReturn) || 0) + (Number(value.reflect) || 0); table.append(make("span", { class: "pi-stats-name", text: name }), make("span", { class: "pi-stats-number", text: formatNumber(damageTotal / seconds) }), make("span", { class: "pi-stats-number", text: formatNumber(damageTotal) }), make("span", { class: "pi-stats-number", text: Number(value.heal) ? formatNumber(Number(value.heal) / seconds) : "--" })); });
        damage.append(table); body.append(damage);
      }
      const lists = make("div", { class: "pi-stats-lists" });
      const monsterNames = new Map((trioGameData.monsters || []).map((monster) => [monster.type, monster.name || monster.type]));
      const itemNames = (name) => gameCatalogItem(name)?.name || name;
      lists.append(make("section", {}, make("div", { class: "pi-stats-heading", text: "Kills by monster" }), trioStatsTopList(summary.mobKills, 10, (type) => monsterNames.get(type) || type)),
        make("section", {}, make("div", { class: "pi-stats-heading", text: "Loot" }), trioStatsTopList(summary.itemCounts, 10, itemNames)));
      body.append(lists);
    }
    const training = entry("Character07.Combat.trainingStats")?.value || {};
    const performance = entry("Character07.Combat.targetPerformance")?.value || {};
    const warriorMode = stateFor("Character07");
    const targetType = warriorMode.selectedMonster && warriorMode.selectedMonster !== "auto" ? warriorMode.selectedMonster : null;
    const targetName = targetType ? (trioGameData.monsters.find((monster) => monster.type === targetType)?.name || targetType) : "Auto target";
    const measured = section("MEASURED TARGETS");
    measured.append(make("div", { class: "pi-stats-targets" },
      make("div", {}, make("div", { class: "pi-stats-caption", text: "Current target" }), make("strong", { text: targetName })),
      make("div", {}, make("div", { class: "pi-stats-caption", text: "Hunt mode" }), make("strong", { text: warriorMode.monsterMode === "auto" || !warriorMode.monsterMode ? "Auto" : "Manual" }))));
    const measuredRows = Object.keys(isObject(training) ? training : {}).map((type) => {
      const entryValue = training[type] || {}; const kills = Math.max(0, Number(entryValue.kills) || 0); const averageMs = Math.max(0, Number(entryValue.averageMs) || (kills ? Number(entryValue.totalMs) / kills : 0));
      const sample = performance[type] || {}; const minutes = Math.max(0, Number(sample.elapsedMs) || 0) / 60000;
      return { type, name: trioGameData.monsters.find((monster) => monster.type === type)?.name || type, kills, averageSeconds: averageMs / 1000, xpPerMinute: minutes >= 2 ? (Number(sample.xp) || 0) / minutes : null, goldPerMinute: minutes >= 2 ? (Number(sample.gold) || 0) / minutes : null };
    }).sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name)).slice(0, 12);
    if (!measuredRows.length) measured.append(make("div", { class: "pi-stats-no-data", text: "No completed target samples yet." }));
    else {
      const table = make("div", { class: "pi-stats-measured" });
      ["Target", "Kills", "Avg kill", "XP/min", "Gold/min"].forEach((label) => table.append(make("span", { class: "pi-stats-table-head", text: label })));
      measuredRows.forEach((row) => table.append(make("span", { class: "pi-stats-name", style: { color: row.type === targetType ? "#ef7a4d" : "#d7d9e8" }, text: row.name }), make("span", { class: "pi-stats-number", text: formatNumber(row.kills) }), make("span", { class: "pi-stats-number", text: row.averageSeconds ? row.averageSeconds.toFixed(1) + "s" : "--" }), make("span", { class: "pi-stats-number", text: row.xpPerMinute === null ? "--" : formatNumber(row.xpPerMinute) }), make("span", { class: "pi-stats-number", text: row.goldPerMinute === null ? "--" : formatNumber(row.goldPerMinute) })));
      measured.append(table);
    }
    body.append(measured); content.append(body);
  }
  function renderMail(content, panel) {
    const body = make("div", { class: "pi-body" });
    body.append(make("div", { class: "pi-headline", text: "Mail" }), make("div", { class: "pi-sub", text: "Account mail from CaracAL.Mail.v1. Unread: " + formatNumber(mailState.count) + (mailState.error ? " · " + mailState.error : "") }));
    const toolbar = make("div", { class: "pi-catalog-toolbar" });
    toolbar.append(themedButton("REFRESH INBOX", async () => { try { statusNode(panel, "Refreshing account mail..."); await readMail(); renderActive(panel); } catch (error) { statusNode(panel, error.message, true); } }, "primary"));
    body.append(toolbar);
    const compose = make("form", { class: "pi-mail-compose" });
    const recipient = make("input", { type: "text", placeholder: "Recipient character" });
    const subject = make("input", { type: "text", placeholder: "Subject" });
    const message = make("textarea", { placeholder: "Message", rows: "3" });
    compose.append(make("div", { class: "pi-section-title", text: "SEND MAIL" }), recipient, subject, message, themedButton("SEND", () => {
      sendMerchantAction(panel, "mail", { operation: "send", to: recipient.value.trim(), subject: subject.value.trim(), message: message.value });
    }, "primary"));
    compose.addEventListener("submit", (event) => event.preventDefault());
    body.append(compose);
    const list = make("div", { class: "pi-mail-list" });
    const messages = Array.isArray(mailState.messages) ? mailState.messages : [];
    if (!messages.length) list.append(make("div", { class: "pi-muted", text: mailState.error || "No mail is currently addressed to the configured characters." }));
    messages.forEach((mail) => {
      const card = make("article", { class: "pi-mail-card" });
      card.append(make("div", { class: "pi-mail-head" }, make("span", { text: safeText(mail.from || "Unknown sender") + " → " + safeText(mail.to || "") }), make("span", { text: mail.sent ? formatTime(Date.parse(mail.sent)) : "—" })), make("div", { class: "pi-mail-subject", text: mail.subject || "(no subject)" }), make("div", { class: "pi-mail-message", text: mail.message || "" }));
       if (mail.item) card.append(make("div", { class: "pi-mail-attachment" }, gameIcon(mail.item.skin || mail.item.name, "pi-catalog-icon"), make("span", { text: "Attachment · " + safeText(mail.item.name || "item") + (mail.taken ? " · collected" : " · available") })));
       const actions = make("div", { class: "pi-catalog-toolbar" });
       if (mail.item && !mail.taken) actions.append(themedButton("COLLECT ATTACHMENT", () => sendMerchantAction(panel, "mail", { operation: "take", id: mail.id }), "primary"));
       actions.append(themedButton("DELETE", () => sendMerchantAction(panel, "mail", { operation: "delete", id: mail.id })));
       card.append(actions);
       list.append(card);
    });
    body.append(list, sourceNote("/pi-account/mail", "Server-side Adventure Land mail snapshot · " + formatNumber(mailState.count) + " messages"));
    content.append(body);
  }
  function renderCatalog(content) {
    const body = make("div", { class: "pi-body" });
    const items = Array.isArray(trioGameData.items) ? trioGameData.items : [];
    body.append(
      make("div", { class: "pi-headline", text: "Equipment Catalog" }),
      make("div", { class: "pi-sub", text: "Browse the cached Adventure Land item catalog. Open an item to see its stats, drop sources and odds, and crafting recipe." }),
    );
    const toolbar = make("div", { class: "pi-catalog-toolbar" });
    const search = make("input", { type: "search", placeholder: "Search items by name or id…" });
    const typeSelect = make("select", {});
    const types = [...new Set(items.map((item) => item.type).filter(Boolean))].sort();
    typeSelect.append(make("option", { value: "", text: "All item types" }));
    types.forEach((type) => typeSelect.append(make("option", { value: type, text: type })));
    const left = make("select", {}), right = make("select", {});
    items.forEach((item) => {
      const option = make("option", { value: item.id, text: item.name + " [" + item.id + "]" });
      left.append(option.cloneNode(true));
      right.append(option.cloneNode(true));
    });
    const compareDetail = make("div", { class: "pi-catalog-detail", hidden: true });
    const compare = () => {
      const firstItem = items.find((item) => item.id === left.value);
      const secondItem = items.find((item) => item.id === right.value);
      if (!firstItem || !secondItem) return;
      compareDetail.hidden = false;
      compareDetail.replaceChildren(
        make("strong", { text: "Comparison" }),
        make(
          "div",
          { class: "pi-grid two" },
          make(
            "div",
            { class: "pi-card" },
            gameIcon(firstItem.skin, "pi-catalog-icon", firstItem),
            make("div", { class: "pi-value", text: firstItem.name }),
            make("div", { class: "pi-muted", text: firstItem.type + " · " + formatNumber(firstItem.value) + "g · stack " + formatNumber(firstItem.stack) }),
          ),
          make(
            "div",
            { class: "pi-card" },
            gameIcon(secondItem.skin, "pi-catalog-icon", secondItem),
            make("div", { class: "pi-value", text: secondItem.name }),
            make("div", { class: "pi-muted", text: secondItem.type + " · " + formatNumber(secondItem.value) + "g · stack " + formatNumber(secondItem.stack) }),
          ),
        ),
      );
    };
    toolbar.append(search, typeSelect, left, right, themedButton("COMPARE", compare, "primary"));
    body.append(toolbar);
    const grid = make("div", { class: "pi-catalog-grid" });
    let activeModal = null;
    const closeModal = () => {
      if (!activeModal) return;
      activeModal.remove();
      activeModal = null;
    };
    const statOrder = [
      "equip_slot", "stackable", "max_stack_size", "tier", "scroll", "stat", "str", "dex", "int", "vit", "for", "hp", "mp", "attack", "frequency", "range", "armor", "resistance", "apiercing", "rpiercing", "pnresistance", "firesistance", "fzresistance", "phresistance", "stresistance", "evasion", "miss", "reflection", "crit", "critdamage", "lifesteal", "manasteal", "speed", "luck", "gold", "xp", "ability", "attr0", "attr1", "buy", "id",
    ];
    const statRank = new Map(statOrder.map((key, index) => [key, index]));
    const ignoredStats = new Set(["skin", "skin_a", "skin_c", "skin_r", "name", "explanation", "type", "g", "s", "grades", "upgrade", "compound", "level"]);
    const catalogDrops = CATALOG_ACQUISITION_DATA.drops || {};
    const findTableRewards = (tableName, itemId, visited = new Set(), depth = 0) => {
      if (!tableName || depth > 8 || visited.has(tableName)) return [];
      const table = Array.isArray(catalogDrops[tableName])
        ? catalogDrops[tableName]
        : (Array.isArray(catalogDrops.maps?.[tableName]) ? catalogDrops.maps[tableName] : null);
      if (!table) return [];
      const totalWeight = table.reduce((sum, row) => sum + (Array.isArray(row) && Number(row[0]) > 0 ? Number(row[0]) : 0), 0);
      if (!totalWeight) return [];
      const nextVisited = new Set(visited);
      nextVisited.add(tableName);
      const matches = [];
      table.forEach((row) => {
        if (!Array.isArray(row) || row.length < 2) return;
        const weight = Number(row[0]);
        if (!(weight > 0)) return;
        const conditionalChance = weight / totalWeight;
        if (row[1] === itemId) {
          matches.push({ chance: conditionalChance, tables: [tableName], quantity: row[2] });
        } else if (row[1] === "open" && row[2]) {
          findTableRewards(row[2], itemId, nextVisited, depth + 1).forEach((match) => {
            matches.push({ chance: conditionalChance * match.chance, tables: [tableName, ...match.tables], quantity: match.quantity });
          });
        }
      });
      return matches;
    };
    const formatCatalogChance = (value) => {
      const chance = Number(value);
      if (!Number.isFinite(chance)) return "Odds unavailable";
      if (chance <= 0) return "0%";
      if (chance >= 1) return chance === 1 ? "100% · guaranteed" : "100%+ · rate " + formatNumber(chance);
      const percent = chance * 100;
      const digits = percent >= 10 ? 2 : percent >= 1 ? 3 : percent >= 0.01 ? 4 : 6;
      const text = percent.toFixed(digits).replace(/\.?0+$/, "");
      return text + "% · 1 in " + Math.max(1, Math.round(1 / chance)).toLocaleString();
    };
    const catalogDropSources = (item) => {
      const monsters = Array.isArray(trioGameData.bestiary) ? trioGameData.bestiary : trioGameData.monsters;
      const sourceRows = [];
      const seenSources = new Set();
      const addSource = (source) => {
        const key = [source.monster?.id, source.category, source.map || "", source.path, source.chance, source.conditionalChance || ""].join("|");
        if (seenSources.has(key)) return;
        seenSources.add(key);
        sourceRows.push(source);
      };
      const addTableRewards = (rows, monster, category, baseMultiplier = 1, map = "", locations = []) => {
        if (!Array.isArray(rows)) return;
        rows.forEach((row) => {
          if (!Array.isArray(row) || row.length < 2) return;
          const rate = Number(row[0]);
          if (!(rate > 0)) return;
          if (row[1] === item.id) {
            addSource({ monster, category, map, locations, path: "Direct", chance: rate * baseMultiplier, quantity: row[2] });
            return;
          }
          if (row[1] === "open" && row[2]) {
            findTableRewards(row[2], item.id).forEach((match) => {
              addSource({ monster, category, map, locations, path: "Opens " + match.tables.join(" → "), chance: rate * baseMultiplier * match.chance, conditionalChance: match.chance, quantity: match.quantity });
            });
            return;
          }
          const container = gameCatalogItem(row[1]);
          if (!container || !["box", "misc"].includes(container.type)) return;
          findTableRewards(row[1], item.id).forEach((match) => {
            addSource({ monster, category: "Container drop", map, locations, path: "Drops " + container.name + "; item is inside " + match.tables.join(" → "), chance: rate * baseMultiplier * match.chance, containerChance: rate * baseMultiplier, conditionalChance: match.chance, quantity: match.quantity });
          });
        });
      };
      const mapMonsters = CATALOG_ACQUISITION_DATA.mapMonsters || {};
      const mapNamesByMonster = new Map();
      Object.entries(mapMonsters).forEach(([mapName, packs]) => (packs || []).forEach((pack) => {
        if (!pack?.type) return;
        if (!mapNamesByMonster.has(pack.type)) mapNamesByMonster.set(pack.type, []);
        mapNamesByMonster.get(pack.type).push(mapName);
      }));
      monsters.forEach((monster) => {
        const definition = isObject(monster.definition) ? monster.definition : {};
        const spawnMaps = [...new Set(mapNamesByMonster.get(monster.id) || [])].sort();
        const locations = [...new Set([
          ...(Array.isArray(definition.locations) ? definition.locations.map((location) => location?.map) : []),
          ...spawnMaps,
        ].filter(Boolean))].sort();
        addTableRewards(monster.drops, monster, "Monster drop", 1, "", locations);
        const homeRows = catalogDrops.monsters_home_server?.[monster.id];
        addTableRewards(homeRows, monster, "Home-server drop", 1, "", locations);
        const hpMultiplier = Number(monster.hp) > 0 ? Number(monster.hp) / 1000 : 1;
        ["global_static", "global"].forEach((tableName) => {
          addTableRewards(catalogDrops.maps?.[tableName], monster, tableName === "global_static" ? "Global static drop" : "Global map drop", hpMultiplier, "", locations);
        });
        spawnMaps.forEach((mapName) => {
          const mapRows = catalogDrops.maps?.[mapName];
          if (mapRows) addTableRewards(mapRows, monster, "Map drop", hpMultiplier, mapName, [mapName]);
        });
      });
      return sourceRows.sort((left, right) => Number(right.chance) - Number(left.chance) || String(left.monster?.name || "").localeCompare(String(right.monster?.name || "")) || left.path.localeCompare(right.path));
    };
    const catalogSection = (title, content) => make("section", { class: "pi-catalog-acquisition" }, make("div", { class: "pi-catalog-acquisition-title", text: title }), content);
    const displayValue = (key, value) => {
      if (typeof value === "boolean") return value ? "Yes" : "No";
      if (Array.isArray(value)) return value.map((entry) => Array.isArray(entry) ? entry.join(" ") : String(entry)).join(", ");
      if (isObject(value)) return JSON.stringify(value);
      if (typeof value === "number") return formatNumber(value);
      return safeText(value);
    };
    const inspect = (item) => {
      closeModal();
      const definition = isObject(item.definition) ? item.definition : {};
      const stackSize = Number(definition.s || item.stack || 0);
      const display = {
        ...definition,
        stackable: stackSize > 1,
        ...(stackSize > 1 ? { max_stack_size: stackSize } : {}),
      };
      const stats = Object.entries(display)
        .filter(([key, value]) => !ignoredStats.has(key) && value !== undefined && value !== null && value !== "")
        .sort(([leftKey], [rightKey]) => (statRank.get(leftKey) ?? Number.MAX_SAFE_INTEGER) - (statRank.get(rightKey) ?? Number.MAX_SAFE_INTEGER) || leftKey.localeCompare(rightKey));
      const statGrid = make("div", { class: "pi-catalog-stat-grid" });
      stats.forEach(([key, value]) => statGrid.append(make("div", { class: "pi-catalog-stat" }, make("span", { class: "pi-catalog-stat-key", text: key.replaceAll("_", " ") }), make("span", { class: "pi-catalog-stat-value", text: displayValue(key, value) }))));
      const dropSources = catalogDropSources(item);
      const dropGrid = make("div", { class: "pi-catalog-acquisition-grid" });
      dropSources.forEach((source) => {
        const monster = source.monster;
        const odds = source.containerChance !== undefined
          ? "Container " + formatCatalogChance(source.containerChance) + " · inside " + formatCatalogChance(source.conditionalChance) + " · combined " + formatCatalogChance(source.chance)
          : (source.conditionalChance !== undefined
            ? "Overall " + formatCatalogChance(source.chance) + " · within table " + formatCatalogChance(source.conditionalChance)
            : "Drop chance " + formatCatalogChance(source.chance));
        const meta = [source.category, source.map, source.path, source.quantity > 1 ? "quantity ×" + formatNumber(source.quantity) : "", source.locations?.length ? "Found on " + source.locations.join(", ") : "Location not listed in cached map data"]
          .filter(Boolean).join(" · ");
        dropGrid.append(make("div", { class: "pi-catalog-source-card" }, gameIcon(monster?.skin || monster?.id, "pi-catalog-icon"), make("div", {}, make("div", { class: "pi-catalog-source-name", text: monster?.name || monster?.id || "Unknown source" }), make("div", { class: "pi-catalog-source-odds", text: odds }), make("div", { class: "pi-catalog-source-meta", text: meta }))));
      });
      const sourceVersionMatches = Number(trioGameData.version) === Number(CATALOG_ACQUISITION_DATA.version);
      const dropSummary = dropSources.length
        ? dropGrid
        : make("div", { class: "pi-muted", text: "No monster or map drop source for this item is listed in the cached game data." });
      const dropNote = make("div", { class: "pi-catalog-acquisition-note", text: (sourceVersionMatches
        ? "Game data v" + CATALOG_ACQUISITION_DATA.version
        : "Odds tables v" + CATALOG_ACQUISITION_DATA.version + " do not match the live catalog v" + (trioGameData.version ?? "unknown") + "; these acquisition details may be out of date.") + ". Loot-table odds are conditional; map drops are scaled by monster HP. Current event and server modifiers can change actual odds." });
      const dropsSection = catalogSection("Drop sources", [dropSummary, dropNote]);
      const recipe = CATALOG_ACQUISITION_DATA.craft?.[item.id];
      const recipeBody = make("div", {});
      if (recipe && Array.isArray(recipe.items) && recipe.items.length) {
        const recipeGrid = make("div", { class: "pi-catalog-recipe-grid" });
        recipe.items.forEach((ingredient) => {
          if (!Array.isArray(ingredient) || ingredient.length < 2) return;
          const quantity = Number(ingredient[0]) || 1;
          const ingredientId = String(ingredient[1]);
          const ingredientItem = gameCatalogItem(ingredientId);
          const ingredientName = ingredientItem?.name || ingredientId;
          const level = Number(ingredient[2]) > 0 ? " +" + Number(ingredient[2]) : "";
          recipeGrid.append(make("div", { class: "pi-catalog-recipe-item" }, gameIcon(ingredientItem?.skin || ingredientId, "pi-catalog-icon", ingredientItem), make("div", { class: "pi-catalog-recipe-name", text: formatNumber(quantity) + " × " + ingredientName + level })));
        });
        recipeBody.append(recipeGrid, make("div", { class: "pi-catalog-acquisition-note", text: "Crafting cost: " + formatNumber(recipe.cost || 0) + " gold" + (recipe.quest ? " · Quest: " + String(recipe.quest).replaceAll("_", " ") : "") + " · game data v" + CATALOG_ACQUISITION_DATA.version }));
      } else {
        recipeBody.append(make("div", { class: "pi-muted", text: "No crafting recipe is listed for this item in game data v" + CATALOG_ACQUISITION_DATA.version + "." }));
      }
      const craftingSection = catalogSection("Crafting", recipeBody);
      const modal = make("div", { class: "pi-catalog-modal", role: "dialog", "aria-modal": "true", "aria-label": item.name });
      const modalCard = make("div", { class: "pi-catalog-modal-card" });
      const closeButton = themedButton("×", closeModal);
      closeButton.className += " pi-catalog-modal-close";
      closeButton.title = "Close item details";
      const header = make("div", { class: "pi-catalog-modal-head" }, gameIcon(item.skin, "pi-catalog-icon", item), make("div", { class: "pi-catalog-modal-title" }, item.name, make("div", { class: "pi-muted", text: item.id + " · " + item.type + " · " + formatNumber(item.value) + "g" })), closeButton);
      modalCard.append(header, make("div", { class: "pi-muted", text: stackSize > 1 ? "Item stats · maximum stack " + formatNumber(stackSize) : "Item stats" }));
      if (item.explanation) modalCard.append(make("div", { class: "pi-catalog-explanation", text: item.explanation }));
      modalCard.append(stats.length ? statGrid : make("div", { class: "pi-muted", text: "No additional stat fields are present in the cached game definition." }));
      modalCard.append(dropsSection, craftingSection);
      modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
      modal.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
      modal.tabIndex = -1;
      modal.append(modalCard);
      body.append(modal);
      activeModal = modal;
      modal.focus();
    };
    const paint = () => {
      closeModal();
      grid.replaceChildren();
      const query = search.value.trim().toLowerCase();
      const type = typeSelect.value;
      items
        .filter((item) => (!query || `${item.name} ${item.id}`.toLowerCase().includes(query)) && (!type || item.type === type))
        .forEach((item) => {
          const card = make("button", { type: "button", class: "pi-catalog-card", title: item.id });
          card.append(gameIcon(item.skin, "pi-catalog-icon", item), make("div", { class: "pi-catalog-name", text: item.name }), make("div", { class: "pi-catalog-meta", text: item.type + (item.value ? " · " + formatNumber(item.value) + "g" : "") }));
          card.addEventListener("click", () => inspect(item));
          grid.append(card);
        });
      if (!grid.childElementCount) grid.append(make("div", { class: "pi-muted", text: "No items match the current search." }));
    };
    search.addEventListener("input", paint);
    typeSelect.addEventListener("change", paint);
    body.append(grid, compareDetail, sourceNote("/pi-game-data/trio", "Cached game data · " + formatNumber(items.length) + " items"));
    content.append(body);
    paint();
  }
  function skillVisualSkin(skill) {
    return String(skill?.skin || skill?.definition?.skin || skill?.id || "");
  }
  function renderSkills(content, panel) {
    const body = make("div", { class: "pi-body" });
    const skills = Array.isArray(merchantSkillsState?.skills) && merchantSkillsState.skills.length
      ? merchantSkillsState.skills
      : (Array.isArray(trioGameData.skills) ? trioGameData.skills : []);
    const classNames = Object.fromEntries((trioGameData.classes || []).map((item) => [item.id, item.name]));
    body.append(
      make("div", { class: "pi-headline", text: "Class Skills" }),
      make("div", { class: "pi-sub", text: merchantSkillsState?.live ? "Live skill definitions from the active merchant runtime." : "Browse the cached class-bound and shared game skills." }),
      themedButton("REFRESH LIVE SKILLS", async () => {
        try { statusNode(panel, "Reading live skills from the merchant runtime..."); await readMerchantSkillsState(); renderActive(panel); }
        catch (error) { statusNode(panel, error.message, true); }
      }, "primary"),
    );
    const toolbar = make("div", { class: "pi-catalog-toolbar" });
    const search = make("input", { type: "search", placeholder: "Search classes or skills…" });
    toolbar.append(search); body.append(toolbar);
    const groups = make("div", {});
    const detail = make("div", { class: "pi-catalog-detail pi-skill-detail", hidden: true, role: "dialog", "aria-label": "Skill details" });
    const paintDetail = () => {
      const skill = skills.find((candidate) => candidate.id === selectedSkillId);
      if (!skill) { detail.hidden = true; detail.replaceChildren(); return; }
      detail.hidden = false;
      const close = themedButton("×", () => { selectedSkillId = null; paintDetail(); });
      close.className += " pi-catalog-modal-close";
      const definition = isObject(skill.definition) ? skill.definition : {};
      const stats = Object.entries({ range: skill.range, mp: skill.mp, cooldown: skill.cooldown, ...definition })
        .filter(([key, value]) => !["skin", "name", "explanation"].includes(key) && value !== undefined && value !== null && value !== "")
        .map(([key, value]) => make("div", { class: "pi-catalog-stat" }, make("span", { class: "pi-catalog-stat-key", text: key.replaceAll("_", " ") }), make("span", { class: "pi-catalog-stat-value", text: typeof value === "object" ? JSON.stringify(value) : String(value) })));
      detail.replaceChildren(
        make("div", { class: "pi-skill-detail-head" }, gameIcon(skillVisualSkin(skill), "pi-catalog-icon", { isSkill: true, id: skill.id }), make("div", { class: "pi-skill-detail-title" }, skill.name, make("div", { class: "pi-muted", text: skill.id + " · " + (skill.classes.join(", ") || "shared") })), close),
        skill.explanation ? make("div", { class: "pi-catalog-explanation", text: skill.explanation }) : null,
        stats.length ? make("div", { class: "pi-catalog-stat-grid" }, stats) : make("div", { class: "pi-muted", text: "No additional definition fields were published for this skill." }),
      );
    };
    const paint = () => {
      groups.replaceChildren();
      const query = search.value.trim().toLowerCase();
      const filtered = skills.filter((skill) => `${skill.name} ${skill.id} ${skill.classes.join(" ")}`.toLowerCase().includes(query));
      const grouped = new Map();
      filtered.forEach((skill) => {
        const names = skill.classes.length ? skill.classes : ["shared"];
        names.forEach((id) => { if (!grouped.has(id)) grouped.set(id, []); grouped.get(id).push(skill); });
      });
      [...grouped.entries()].sort((left, right) => left[0].localeCompare(right[0])).forEach(([id, entries]) => {
        const block = make("section", { class: "pi-class-block" }, make("div", { class: "pi-class-title", text: classNames[id] || (id === "shared" ? "Shared actions" : id) }));
        const grid = make("div", { class: "pi-catalog-grid" });
        entries.forEach((skill) => {
          const card = make("button", { type: "button", class: "pi-catalog-card", title: skill.id });
          card.append(gameIcon(skillVisualSkin(skill), "pi-catalog-icon", { isSkill: true, id: skill.id }), make("div", { class: "pi-catalog-name", text: skill.name }), make("div", { class: "pi-catalog-meta", text: (skill.range ? "Range " + skill.range : "No range") + (skill.mp ? " · " + skill.mp + " MP" : "") }));
          card.addEventListener("click", () => { selectedSkillId = skill.id; paintDetail(); detail.scrollIntoView({ block: "nearest" }); });
          grid.append(card);
        });
        block.append(grid); groups.append(block);
      });
      if (!groups.childElementCount) groups.append(make("div", { class: "pi-muted", text: "No skills match the current search." }));
      paintDetail();
    };
    search.addEventListener("input", paint);
    body.append(groups, detail, sourceNote("/pi-game-data/trio", "Cached game data · " + formatNumber(skills.length) + " skills")); content.append(body); paint();
  }
  function renderBestiary(content, panel) {
    const body = make("div", { class: "pi-body" });
    const monsters = Array.isArray(trioGameData.bestiary) ? trioGameData.bestiary : trioGameData.monsters;
    body.append(make("div", { class: "pi-headline", text: "Bestiary" }), make("div", { class: "pi-sub", text: "Monster definitions, drop inspection, and navigation use the same cached game catalog as the client." }));
    const toolbar = make("div", { class: "pi-catalog-toolbar" });
    const search = make("input", { type: "search", placeholder: "Search monsters…" });
    toolbar.append(search,
      themedButton("TRIO HUNT", () => openDashboard("trio-hunt"), "primary"),
      themedButton("HUNT MENU", () => openDashboard("trio-hunt-menu"), "primary"));
    body.append(toolbar);
    const grid = make("div", { class: "pi-catalog-grid" });
    let activeModal = null;
    const formatDropChance = (value) => {
      const chance = Number(value);
      if (!Number.isFinite(chance)) return "Chance unavailable";
      if (chance <= 0) return "0%";
      if (chance >= 1) return "100%";
      const percent = chance * 100;
      const decimals = percent >= 10 ? 2 : percent >= 1 ? 3 : percent >= 0.01 ? 4 : 6;
      const percentText = percent.toFixed(decimals).replace(/\.?(0+)$/, "");
      return percentText + "% · 1 in " + Math.max(1, Math.round(1 / chance)).toLocaleString();
    };
    const closeModal = () => {
      if (!activeModal) return;
      activeModal.remove();
      activeModal = null;
    };
    const show = (monster) => {
      closeModal();
      const definition = isObject(monster.definition) ? monster.definition : {};
      const rawDrops = Array.isArray(monster.drops)
        ? monster.drops
        : (Array.isArray(definition.drops) ? definition.drops : (Array.isArray(definition.drop) ? definition.drop : []));
      const drops = rawDrops.map((drop) => {
        if (Array.isArray(drop)) return { chance: drop[0], itemId: drop[1] };
        if (!isObject(drop)) return null;
        return { chance: first(drop.chance, drop.rate, drop.probability), itemId: first(drop.item, drop.itemId, drop.id, drop.name) };
      }).filter((drop) => drop && drop.itemId);
      const locations = Array.isArray(definition.locations) ? definition.locations : (Array.isArray(definition.locs) ? definition.locs : []);
      const modal = make("div", { class: "pi-drop-modal", role: "dialog", "aria-modal": "true", "aria-label": monster.name });
      const modalCard = make("div", { class: "pi-drop-modal-card" });
      const closeButton = themedButton("×", closeModal);
      closeButton.className += " pi-drop-modal-close";
      closeButton.title = "Close drop list";
      const header = make("div", { class: "pi-drop-modal-head" }, gameIcon(monster.skin), make("div", { class: "pi-drop-modal-title" }, monster.name, make("div", { class: "pi-muted", text: monster.id + " · " + formatNumber(monster.hp) + " HP · " + formatNumber(monster.xp) + " XP" })), closeButton);
      const dropGrid = make("div", { class: "pi-drop-grid" });
      drops.forEach(({ chance, itemId }) => {
        const item = gameCatalogItem(itemId);
        const itemName = item?.name || itemId;
        dropGrid.append(make("div", { class: "pi-drop-card" }, gameIcon(item?.skin || itemId, "pi-catalog-icon", item), make("div", {}, make("div", { class: "pi-drop-name", text: itemName }), make("div", { class: "pi-drop-id", text: itemName === itemId ? "" : itemId }), make("div", { class: "pi-drop-chance", text: formatDropChance(chance) }))));
      });
      const locationsText = locations.length ? locations.map((location) => location?.map || "unknown").join(", ") : "No location data in the cached catalog";
      modalCard.append(header, make("div", { class: "pi-muted", text: "Base drop chances · " + drops.length + " drop" + (drops.length === 1 ? "" : "s") }), drops.length ? dropGrid : make("div", { class: "pi-muted", text: "No drop table in the cached catalog" }), make("div", { class: "pi-muted", text: "Locations: " + locationsText }));
      const destination = locations.find((location) => location && location.map && Number.isFinite(Number(location.x)) && Number.isFinite(Number(location.y)));
      if (destination) modalCard.append(themedButton("NAVIGATE TO FIRST AREA", () => sendMerchantAction(panel, "navigate", { destination: { map: destination.map, x: Number(destination.x), y: Number(destination.y) } }), "primary"));
      modal.append(modalCard);
      modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
      modal.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
      modal.tabIndex = -1;
      body.append(modal);
      activeModal = modal;
      modal.focus();
    };
    const paint = () => {
      grid.replaceChildren();
      const query = search.value.trim().toLowerCase();
      monsters.filter((monster) => !query || `${monster.name} ${monster.id}`.toLowerCase().includes(query)).forEach((monster) => {
        const card = make("button", { type: "button", class: "pi-catalog-card", title: monster.id });
        card.append(gameIcon(monster.skin), make("div", { class: "pi-catalog-name", text: monster.name }), make("div", { class: "pi-catalog-meta", text: formatNumber(monster.hp) + " HP · " + formatNumber(monster.xp) + " XP" }), make("div", { class: "pi-catalog-meta", text: formatNumber(monster.attack) + " ATK · range " + formatNumber(monster.range) }));
        card.addEventListener("click", () => show(monster));
        grid.append(card);
      });
      if (!grid.childElementCount) grid.append(make("div", { class: "pi-muted", text: "No monsters match the current search." }));
    };
    search.addEventListener("input", paint);
    body.append(grid, sourceNote("/pi-game-data/trio", "Cached game data · " + formatNumber(monsters.length) + " monsters")); content.append(body); paint();
    if (bestiaryInitialSelection) {
      const initial = monsters.find((monster) => monster.id === bestiaryInitialSelection);
      bestiaryInitialSelection = "";
      if (initial) show(initial);
    }
  }
  const PI_MIN_BANK_TAB_SLOTS = 42;

  function bankTabSlots(tab) {
    if (Array.isArray(tab?.slots)) {
      const capacity = Math.max(PI_MIN_BANK_TAB_SLOTS, Number(tab.capacity) || 0, tab.slots.length);
      return tab.slots.slice(0, capacity).concat(Array.from({ length: Math.max(0, capacity - tab.slots.length) }, () => null));
    }
    const items = Array.isArray(tab?.items) ? tab.items : [];
    const highestPublishedSlot = items.reduce((highest, item) => {
      const slot = Number(item?.slot);
      return Number.isInteger(slot) && slot >= 0 ? Math.max(highest, slot + 1) : highest;
    }, 0);
    const capacity = Math.max(PI_MIN_BANK_TAB_SLOTS, Number(tab?.capacity) || 0, items.length, highestPublishedSlot);
    const slots = Array.from({ length: capacity }, () => null);
    let nextOpen = 0;
    items.forEach((item) => {
      if (item === null || item === undefined || item === "") return;
      const record = isObject(item) ? item : { name: item };
      let slot = Number(record.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot >= capacity || slots[slot]) {
        while (nextOpen < capacity && slots[nextOpen]) nextOpen += 1;
        slot = nextOpen;
      }
      if (slot >= 0 && slot < capacity && !slots[slot]) {
        slots[slot] = record;
        nextOpen = Math.max(nextOpen, slot + 1);
      }
    });
    return slots;
  }

  function renderBank(content, panel) {
    const bankPublisher = entry("CaracAL.Bank.v2")
      || entry("Character01MCH.CaracAL.Bank.v2")
      || entry("CaracAL.Bank.v1")
      || entry("Character01MCH.CaracAL.Bank.v1")
      || entrySuffix(".CaracAL.Bank.v1");
    const bankSaved = entry("MerchantBankUI.BankSnapshot.v1") || entry("Character01MCH.MerchantBankUI.bankSnapshot");
    const raw = bankPublisher?.value || bankSaved?.value || {};
    const wrapper = isObject(raw?.value) ? raw.value : raw;
    const bank = isObject(wrapper) ? wrapper : {};
    const tabsData = Array.isArray(bank.tabs)
      ? bank.tabs
      : Object.keys(bank)
        .filter((key) => /^items\d+$/.test(key) && Array.isArray(bank[key]))
        .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)))
        .map((name) => ({
          name,
          index: Number(name.slice(5)),
          capacity: bank[name].length,
          used: bank[name].filter(Boolean).length,
          items: bank[name].map((item, slot) => item ? { ...(isObject(item) ? item : { name: item }), slot } : null),
        }));
    const available = bank.available !== false && (tabsData.length > 0 || bankPublisher || bankSaved);
    const gold = bank.accountGold === undefined || bank.accountGold === null ? (bank.gold === undefined || bank.gold === null ? bank.bankGold : bank.gold) : bank.accountGold;
    const totalUsed = tabsData.reduce((total, tab) => total + bankTabSlots(tab).filter(Boolean).length, 0);
    const totalCapacity = tabsData.reduce((total, tab) => total + bankTabSlots(tab).length, 0);
    const body = make("div", { class: "pi-body" });
    body.append(
      make("div", { class: "pi-headline", text: "Bank" }),
      make("div", { class: "pi-sub", text: "Server-backed bank contents from the active CaracAL bank snapshot. This view does not open the game client." }),
      make("div", { class: "pi-current" },
        make("div", { class: "pi-current-label", text: "ACCOUNT GOLD" }),
        make("div", { class: "pi-current-value", text: gold === null || gold === undefined ? "—" : formatNumber(gold) }),
      ),
      make("div", { class: "pi-muted", text: available ? formatNumber(totalUsed) + " / " + formatNumber(totalCapacity) + " slots used" : "Waiting for the server-backed bank snapshot" }),
    );
    const goldControls = make("div", { class: "pi-catalog-toolbar" });
    const goldAmount = make("input", { type: "number", min: "1", step: "1", placeholder: "Gold amount" });
    goldControls.append(goldAmount,
      themedButton("WITHDRAW GOLD", () => sendMerchantAction(panel, "bank", { operation: "withdraw", amount: Number(goldAmount.value) }), "primary"),
      themedButton("DEPOSIT GOLD", () => sendMerchantAction(panel, "bank", { operation: "deposit", amount: Number(goldAmount.value) })),
      themedButton("BANK NOW", () => sendMerchantAction(panel, "bank", { operation: "now" }), "primary"));
    body.append(goldControls, make("div", { class: "pi-muted", text: "Click a populated bank slot to queue that item for retrieval. The active merchant must be at the bank." }));
    const tabs = make("div", {});
    tabsData.forEach((tab) => {
      const slots = bankTabSlots(tab);
      const used = Number.isFinite(Number(tab.used)) ? Number(tab.used) : slots.filter(Boolean).length;
      const sectionNode = make("section", { class: "pi-bank-tab" }, make("div", { class: "pi-section-title", text: (tab.name || "Items") + " · " + formatNumber(used) + "/" + formatNumber(slots.length) }));
      const grid = make("div", { class: "pi-bank-grid" });
      slots.forEach((item, index) => {
        const slot = make("button", { type: "button", class: "pi-bank-slot" + (item ? " has-item" : "") });
        if (!item) {
          slot.disabled = true;
          slot.title = `Empty slot ${index + 1}`;
          slot.setAttribute("aria-label", `Empty bank slot ${index + 1}`);
          grid.append(slot);
          return;
        }
        const record = isObject(item) ? item : { name: item };
        const catalogItem = gameCatalogItem(record.name);
        const visualSkin = record.skin || catalogItem?.skin || record.name;
        const quantity = record.quantity === undefined ? record.q : record.quantity;
        const level = record.upgradeLevel === undefined ? record.level : record.upgradeLevel;
        const label = safeText(record.name || "item") + (level ? " +" + level : "") + (Number(quantity) > 1 ? " ×" + quantity : "");
         slot.title = label;
         slot.setAttribute("aria-label", `Bank slot ${index + 1}: ${label}`);
         slot.addEventListener("click", () => sendMerchantAction(panel, "bank", { operation: "retrieve", pack: tab.name || "items" + (tab.index || 0), bankSlot: index }));
        slot.append(gameIcon(visualSkin, "pi-bank-slot-icon", record));
        if (level) slot.append(make("span", { class: "pi-bank-slot-level", text: "+" + level }));
        if (Number(quantity) > 1) slot.append(make("span", { class: "pi-bank-slot-quantity", text: String(quantity) }));
        grid.append(slot);
      });
      if (!grid.childElementCount) grid.append(make("span", { class: "pi-muted", text: "Empty" }));
      sectionNode.append(grid);
      tabs.append(sectionNode);
    });
    if (!tabs.childElementCount) tabs.append(make("div", { class: "pi-muted", text: "No bank snapshot has been published yet." }));
    body.append(tabs, sourceNote(bankPublisher?.key || bankSaved?.key || "CaracAL.Bank.v2", bankPublisher ? (bankPublisher.key.endsWith(".v2") ? "CaracAL.Bank.v2 publisher" : "CaracAL.Bank.v1 publisher") : "Saved MerchantBankUI bank snapshot"));
    content.append(body);
  }
  function renderLogs(content) { renderMerchantActivity(content); }
  function renderStorageEditor(content, panel) { const entries = visibleEntries(activeSnapshot); const body = make("div", { class: "pi-body" }); body.append(make("div", { class: "pi-headline", text: "Script Storage" }), make("div", { class: "pi-sub", text: "Advanced editor for project script records. Authentication and session records are intentionally hidden." })); const select = make("select", {}); entries.forEach((item) => select.append(make("option", { value: item.key, text: item.key }))); storageEditorKey = entries.some((item) => item.key === storageEditorKey) ? storageEditorKey : (entries[0]?.key || ""); select.value = storageEditorKey; const area = make("textarea", { style: { minHeight: "420px" } }); const load = () => { storageEditorKey = select.value; const item = entries.find((candidate) => candidate.key === storageEditorKey); area.value = item ? JSON.stringify(item.value, null, 2) : ""; }; select.addEventListener("change", load); body.append(make("label", { class: "pi-field full" }, make("span", { text: "Storage record" }), select), area); const save = themedButton("SAVE JSON", async () => { try { const value = JSON.parse(area.value); statusNode(panel, "Saving " + storageEditorKey + "..."); await writeEntries({ [storageEditorKey]: value }); settingsDirty = false; statusNode(panel, "Saved to shared CaracAL storage."); } catch (error) { statusNode(panel, error.message || "Invalid JSON.", true); } }, "primary"); const clear = themedButton("STOP ALL CLIENTS + CLEAR STORAGE", () => { void clearAllStorage(panel, clear); }, "danger"); clear.title = "Stop every configured CaracAL+ client, then clear all shared localStorage records"; body.append(footer(panel, save, clear, sourceNote(storageEditorKey))); content.append(body); load(); }
   function renderActive(panel) {
     const dashboardId = panel?.dataset?.piDashboardId || activeDashboard;
     activeDashboard = dashboardId;
     const content = panel.querySelector("[data-pi-dashboard-content]");
     if (!content) return;
     if (["trio-options", "trio-hunt", "trio-hunt-menu"].includes(dashboardId)) panel.querySelector(".pi-actions")?.remove();
     content.replaceChildren();
     if (dashboardId === "merchant-dashboard") renderMerchantDashboard(content);
     else if (dashboardId === "merchant-stand") renderMerchantStand(content, panel);
     else if (dashboardId === "merchant-market") renderMerchantMarket(content, panel);
     else if (dashboardId === "merchant-log") renderMerchantLog(content);
     else if (dashboardId === "merchant-server") renderMerchantServer(content, panel);
     else if (dashboardId === "merchant-config" || dashboardId === "merchant-settings") renderMerchantConfig(content, panel);
     else if (dashboardId === "merchant-loot") renderMerchantLoot(content, panel);
     else if (dashboardId === "merchant-upgrade") renderMerchantUpgrade(content, panel);
     else if (dashboardId === "merchant-anniversary") renderMerchantAnniversary(content, panel);
     else if (dashboardId === "merchant-ponty") merchantPontyView === "log" ? renderMerchantPontyLog(content, panel) : renderMerchantPontyItems(content, panel);
     else if (dashboardId === "trio-dashboard") renderTrioDashboardNative(content);
     else if (dashboardId === "trio-options") renderTrioOptions(content, panel);
     else if (dashboardId === "trio-hunt") renderTrioHunt(content, panel);
     else if (dashboardId === "trio-hunt-menu") renderTrioHuntCatalog(content, panel);
     else if (dashboardId === "trio-hunt-sub") renderTrioHuntSub(content, panel);
     else if (dashboardId === "trio-inventory") renderTrioInventory(content, panel);
     else if (dashboardId === "trio-runtime") renderTrioRuntime(content, panel);
     else if (dashboardId === "trio-stats") renderTrioStats(content);
     else if (dashboardId === "mail") renderMail(content, panel);
     else if (dashboardId === "catalog") renderCatalog(content);
     else if (dashboardId === "bestiary") renderBestiary(content, panel);
     else if (dashboardId === "skills") renderSkills(content, panel);
     else if (dashboardId === "bank") renderBank(content, panel);
     else if (dashboardId === "logs") renderLogs(content);
     else if (dashboardId === "script-storage") renderStorageEditor(content, panel);
     const notice = panel.__piDashboardNotice || null;
     statusNode(panel, notice?.message || "", notice?.error || false, false);
   }
   async function loadAndRender(panel) { const dashboardId = panel?.dataset?.piDashboardId || activeDashboard; activeDashboard = dashboardId; try { statusNode(panel, "Reading shared CaracAL localStorage...", false, false); activeSnapshot = await readSnapshot(); if (["merchant-dashboard", "merchant-server", "merchant-anniversary"].includes(dashboardId)) { statusNode(panel, "Reading the active merchant runtime...", false, false); await readMerchantLiveState(); } if (dashboardId === "merchant-stand") { statusNode(panel, "Reading the actual merchant stand slots...", false, false); await readMerchantStandState(); } if (dashboardId === "merchant-market") { statusNode(panel, "Reading visible player stands from the game runtime...", false, false); await readMerchantMarketState(); } if (dashboardId === "skills") { statusNode(panel, "Reading live merchant skills...", false, false); await readMerchantSkillsState().catch(() => {}); } const needsMonsterData = ["trio-options", "trio-hunt", "trio-hunt-menu", "trio-hunt-sub", "trio-stats", "bestiary", "catalog", "skills"].includes(dashboardId) && !trioGameData.monsters.length; const needsItemData = ["trio-stats", "catalog", "bank", "merchant-market", "merchant-loot", "merchant-ponty", "merchant-upgrade"].includes(dashboardId) && !trioGameData.items.length; if (needsMonsterData || needsItemData) { statusNode(panel, "Reading cached Adventure Land game data...", false, false); await readTrioGameData(); } if (dashboardId === "mail") { statusNode(panel, "Reading account mail through the server...", false, false); await readMail(); } if (["logs", "merchant-log"].includes(dashboardId)) { statusNode(panel, "Reading server-persisted activity...", false, false); await readActivity().catch(() => activityState); } renderActive(panel); } catch (error) { statusNode(panel, error.message, true); } }
  function open(dashboardId) { if (!dashboardTitle(dashboardId)) return; openDashboard(dashboardId); }
  function closeAll() {
    document.querySelectorAll("." + WINDOW_CLASS).forEach((panel) => {
      stopRefresh(panel);
      panel.remove();
    });
  }
  window.PiScriptDashboards = { open, closeAll };
})();
