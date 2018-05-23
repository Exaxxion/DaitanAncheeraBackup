(function() {
  var currTabID  = -1;
  var currURL    = '';
  var pageLoaded = true;

  var CURRENT_VERSION = '1.2.12';
  var BASE_VERSION    = '1.0.1';
  var patchNotes = {
    '1.0.1': {
      'index': 0,
      'notes': ['-Vira and Narumaya themes added',
        '-Supply name + location tooltips added',
        '(thanks lolPseudoSmart for supply locations)',
        '-Primarch misc daily added',
        '-Primarch raid + xeno jp names added']
    },
    '1.1.0': {
      'index': 1,
      'notes': ['-Weapon Series planner added',
        'Try it out in the supply tab!',
        '-Vira and Narumaya themes removed']
    },
    '1.1.1': {
      'index': 2,
      'notes': ['-Primarch daily changed to option',
        '-Small UI tweaks']
    },
    '1.1.2': {
      'index': 3,
      'notes': ['-GW 5* planner added',
        '(sorry it\'s so late D:)',
        '(also sorry no weapon drop tracking orz)',
        '-Tooltips added to repeat last quest',
        'and copy to clipboard buttons']
    },
    '1.1.3': {
      'index': 4,
      'notes': ['-Added arcarum ticketes to profile tracker',
        '-Fixed profile tracker',
        '-Skip upgrade/uncap results feature added',
        '-Skip coop results feature added']
    },
    '1.1.4': {
      'index': 5,
      'notes': ['-Sync turn counter between windows feature added',
        '(experimental and probably bug prone)']
    },
    '1.1.5': {
      'index': 6,
      'notes': ['-Improved turn sync between windows',
        '-Also syncs enemy/boss HP between',
        'windows as requested']
    },
    '1.2.0': {
      'index': 7,
      'notes': ['-Bunch of bug fixes',
        '-Separated multiwindow sync options',
        '-Fixed some multiwindow sync issues on refresh',
        '-Sped up refresh by using back/forward',
        'instead of refresh',
        '-Added a refresh option for all attacks',
        '-Fixed autoend quest to work with multiple',
        'self-hosted quests',
        '-Added a nightmare/special quest notification']
    },
    '1.2.1': {
      'index': 8,
      'notes': ['-Minor bug fixes',
        '-Fixed character uncap not skipping correctly',
        '-Fixed ougi toggle button not visually updating',
        'sometimes after refresh',
        '-Faster refresh is now its on toggleable option']
    },
    '1.2.2': {
      'index': 9,
      'notes': ['-Fixed issue with turn counter not resetting',
        'correctly in new raids and quest stages',
        '-Fixed item acquisition from quests',
        '-Removed items that no longer exist in the game',
        '-Updated HL pendant cap and added',
        'crew pendant tracker',
        '-Updated raid list to include the latest raids',
        '-Added Arcarum weekly tracker',
        '-Faster refresh is now its on toggleable option',
        '-Arcarum drops/shop now updates info']
    },
    '1.2.3': {
      'index': 10,
      'notes': ['-Added skill cooldown sync option',
        '!! NOTE FOR VIRAMATE USERS !!',
        'You MUST turn on the option',
        '\'Synchronize status between raid windows\'',
        'under Combat settings or this will NOT work']
    },
    '1.2.4': {
      'index': 11,
      'notes': ['-Other windows should now resync on refresh']
    },
    '1.2.5': {
      'index': 12,
      'notes': ['-Added sync player HP/charge option',
        '-Added sync potions option',
        '-Added sync character swapping option',
        '!! NOTE FOR VIRAMATE USERS !!',
        'This option doesn\'t work as intended with viramate,',
        'more specifically the skills and CDs don\'t swap',
        '-Fixed an issue with sync boss HP not being turned on',
        'which broke a few things',
        '-Fixed an issue where sometimes refresh/sync',
        'didn\'t work with some specific scenarios',
        '-Adjusted some timings on faster refresh',
        '-Other minor fixes']
    },
    '1.2.6': {
      'index': 13,
      'notes': ['-Added an auto repeat option',
        'Clicking the repeat button will toggle',
        'auto repeat while this option is enabled',
        '-Added an auto repeat option']
    },
    '1.2.7': {
      'index': 14,
      'notes': ['-Added an option to always hide skill prompts',
        '-Fixed skill cooldowns sometimes becoming',
        'desynced with viramate',
        '-Fixed an issue with skill buttons',
        'sometimes becoming unresponsive after',
        'being spam clicked and/or triggering',
        'the lockout prompt',
        '-Improved performance with sync',
        '(hopefully less laggy)']
    },
    '1.2.8': {
      'index': 15,
      'notes': ['-Added an option for "skill turn" syncing',
        '-Added an option for auto refreshing summons']
    },
    '1.2.9': {
      'index': 16,
      'notes': ['-Fixed an issue with skill turn sync',
        'not resetting when you join raids']
    },
    '1.2.10': {
      'index': 17,
      'notes': ['-Added summon cooldown syncing']
    },
    '1.2.11': {
      'index': 18,
      'notes': ['-Fixed cooldowns not syncing properly',
        'without Lyria in party']
    },
    '1.2.12': {
      'index': 19,
      'notes': ['-Fixed skill turn counters',
        '(cygames changed some variable references)']
    }
  };
  var patchNoteList = [
    '1.0.1',
    '1.1.0',
    '1.1.1',
    '1.1.2',
    '1.1.3',
    '1.1.4',
    '1.1.5',
    '1.2.0',
    '1.2.1',
    '1.2.2',
    '1.2.3',
    '1.2.4',
    '1.2.5',
    '1.2.6',
    '1.2.7',
    '1.2.8',
    '1.2.9',
    '1.2.10',
    '1.2.11',
    '1.2.12'
  ];
  var currentVersion = undefined;

  chrome.browserAction.onClicked.addListener(function() {
    chrome.runtime.openOptionsPage();
  });

  Storage.GetMultiple(['version'], function(response) {
    currentVersion = response['version'];
    if (!currentVersion) {
      currentVersion = CURRENT_VERSION;
      Storage.Set('version', CURRENT_VERSION);
    }
  });

  var generateNote = function(id) {
    if (patchNotes[id]) {
      var note = 'Version ' +id + ':\n';
      for (var i = 0; i < patchNotes[id].notes.length; i++) {
        note += patchNotes[id].notes[i] + '\n';
      }
      return note;
    }
  };

  Options.Initialize(function() {
    Dailies.Initialize(function() {
      Quest.Initialize(function() {
        Casino.Initialize(function() {
          Time.Initialize(function() {
            Supplies.Initialize();
            Profile.Initialize();
            Buffs.Initialize();
            //Info.Initialize();
          });
        });
      });
    });
  });

  var responseList = {};
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.setOption) {
      Options.Set(message.setOption.id, message.setOption.value);
    }
    if (message.getOption) {
      var id = message.getOption;
      sendResponse({
        'id': id,
        'value': Options.Get(id)
      });
    }

    if (message.getExternalOptions) {
      sendResponse({
        'value': Options.GetExternal()
      });
    }

    if (message.consoleLog) {
      console.log(message.consoleLog.sender + ': ' + message.consoleLog.message);
    }
    if (message.content) {
      var msg = message.content;
      if (msg.initialize) {
        Message.Post(sender.tab.id, {'checkInitialized': true});
      }
      if (msg.assault) {
        Time.SetAssaultTime(msg.assault.times);
      }
      if (msg.angel) {
        Time.SetAngelHalo(msg.angel.delta, msg.angel.active);
      }
      if (msg.defense) {
        Time.SetDefenseOrder(msg.defense.time, msg.defense.active);
      }
      if (msg.checkRaids) {
        Quest.CheckJoinedRaids(msg.checkRaids.raids, msg.checkRaids.unclaimed, msg.checkRaids.type);
      }
      if (msg.chips) {
        Profile.SetChips(msg.chips.amount);
      }
      if (msg.profile) {
        Profile.SetHomeProfile(
          msg.profile.rank,
          msg.profile.rankPercent,
          msg.profile.job,
          msg.profile.jobPercent,
          msg.profile.lupi,
          msg.profile.jobPoints,
          msg.profile.crystal,
          msg.profile.renown,
          msg.profile.prestige,
          msg.profile.arcarumTicket,
          msg.profile.arcapoints
        );
      }
      if (msg.arcarumWeekly) {
        Dailies.CheckArcarum(msg.arcarumWeekly);
      }
      if (msg.arcarumCheckpoint) {
        Dailies.ArcarumCheckpoint(msg.arcarumCheckpoint);
        Profile.AddArcapoints(msg.arcarumCheckpoint);
      }
      if (msg.event) {
        //Quest.SetEvent(msg.event);
      }
      if (msg.coopCode) {
        Quest.SetCoopCode(msg.coopCode, sender.tab.id);
      }
    }
  });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tab.url.indexOf('gbf.game.mbga.jp') !== -1) {
      if (currURL !== tab.url) {
        pageLoaded = false;
        currURL = tab.url;
      }
      if (currURL === tab.url && pageLoaded) {
        chrome.tabs.sendMessage(tabId, {pageUpdate: tab.url});
      }
    }
  });

  var connections = {};

  chrome.runtime.onConnect.addListener(function (port) {
    var extensionListener = function (message, sender) {
      if (message.connect) {
        connections[message.connect] = port;
        return;
      }
      if (message.initialize) {
        var response = [];
        response[0] = {
          'setTheme': Options.Get('windowTheme')
        };
        response = response.concat(Profile.InitializeDev());
        response = response.concat(Time.InitializeDev());
        response = response.concat(Dailies.InitializeDev());
        response = response.concat(Casino.InitializeDev());
        response = response.concat(Supplies.InitializeDev());
        response = response.concat(Buffs.InitializeDev());
        response = response.concat(Quest.InitializeDev());
        response.push({ 'setOption': {'id': 'autoRepeat', 'value': Options.Get('autoRepeat')}});
        connections[message.id].postMessage({initialize: response});
        return;
      }
      if (message.initializeContentScript) {
        chrome.tabs.sendMessage(message.id, { 'initialize': true });
      }
      if (message.pageLoad) {
        pageLoaded = true;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {pageLoad: tabs[0].url});
            connections[message.id].postMessage({pageLoad: tabs[0].url});
            var index = tabs[0].url.indexOf('#quest/supporter/');
            if (index !== -1) {
              Message.PostAll({'setClick': {
                'id': '#quest-repeat',
                'value': tabs[0].url.slice(index)
              }});
            } else {
              index = tabs[0].url.indexOf('#event/');
              if (index !== -1 && tabs[0].url.indexOf('/supporter/') !== -1)
              {
                Message.PostAll({'setClick': {
                  'id': '#quest-repeat',
                  'value': tabs[0].url.slice(index)
                }});
              }
            }
          }
        });
        return;
      }
      if (message.openURL) {
        chrome.tabs.update(message.id, {'url': message.openURL});
        return;
      }
      if (message.getURL) {
        chrome.tabs.get(message.id, function (tab) {
          if (tab.url) {
            if (message.getURL === 'bookmark' && tab.url.indexOf('http://game.granbluefantasy.jp/') !== -1) {
              var url = tab.url.replace('http://game.granbluefantasy.jp/', '');
              Message.PostAll({ 'bookmarkURL': url });
            }
          }
        });
        return;
      }
      if (message.getPlanner) {
        Supplies.GetPlanner(message.id, message.getPlanner);
      }
      if (message.refresh) {
        chrome.tabs.reload(message.id);
        return;
      }
      if (message.devAwake) {
        if (currentVersion !== CURRENT_VERSION) {
          var note = '';
          if (patchNotes[currentVersion] === undefined) {
            currentVersion = BASE_VERSION;
            note += generateNote(currentVersion);
          }
          var index = patchNotes[currentVersion].index + 1;
          for (var i = index; i < patchNoteList.length; i++) {
            currentVersion = patchNoteList[i];
            note += generateNote(currentVersion);
          }
          Message.Post(message.id, {'setMessage': note});
          currentVersion = CURRENT_VERSION;
          Storage.Set('version', CURRENT_VERSION);
        }
        Message.Post(message.id, {'setTheme': Options.Get('windowTheme', function(id, value) {
          Message.PostAll({
            'setTheme': value
          });
          Time.UpdateAlertColor();
        })});
      }
      if (message.debug) {
        Message.Notify('hey', 'its me ur brother', 'apNotifications');
        APBP.SetMax();
      }
      if (message.weaponBuild) {
        Supplies.BuildWeapon(message.id, message.weaponBuild);
      }
      if (message.removeItem) {
        Supplies.RemoveInvalidItem(message.removeItem);
      }
      if (message.consoleLog) {
        console.log(message.consoleLog);
      }
      if (message.getOption) {
        Message.Post(message.id, {
          'getOption': {
            'id': message.getOption,
            'value': Options.Get(message.getOption)
          }
        });
      }
      if (message.request) {
        //verify current ap/ep
        if (message.request.url.indexOf('/user/status?') !== -1 ||
            message.request.url.indexOf('/user/data_assets?') !== -1 ||
            //message.request.url.indexOf('/user/content/index?') !== -1 ||
            message.request.url.indexOf('/quest/content/') !== -1 ||
            message.request.url.indexOf('/coopraid/content/') !== -1 ||
            message.request.url.indexOf('/user/content/') !== -1) {
          APBP.VerifyAPBP(message.request.response);
          Profile.SetLupiCrystal(message.request.response);
        }
        //check entering raid resources
        if (message.request.url.indexOf('/quest/treasure_raid')  !== -1) {
          Supplies.RaidTreasureInfo(message.request.response);
        }
        //check limited quest
        if (message.request.url.indexOf('/quest/check_quest_start/') !== -1) {
          Quest.CheckDailyRaid(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('/quest/content/newindex/') !== -1) {
          Quest.UpdateInProgress(message.request.response, message.id);
        }
        //initialize quest -> SELECTING QUEST
        if (message.request.url.indexOf('/quest/quest_data/') !== -1) {
          APBP.InitializeQuest(message.request.response);
        }
        //start quest -> ACTUALLY ENTER THE QUEST
        if (message.request.url.indexOf('/quest/create_quest?') !== -1) {
          Quest.CreateQuest(message.request.response, message.request.payload, message.id);
          APBP.StartQuest(message.request.response, message.request.payload);
          Dailies.DecPrimarchs(message.request.payload);
        }
        if (message.request.url.indexOf('/quest/raid_info?') !== -1) {
          //Quest.CheckMulti(message.request.payload);
          //payload and response does not have a raid_id
        }

        //quest loot
        // if(message.request.url.indexOf('/result/content/') !== -1) {
        //   Supplies.GetLoot(message.request.response.option.result_data);
        //   Profile.CompleteQuest(message.request.response.option.result_data);
        // }
        if (message.request.url.indexOf('/result/data/') !== -1) {
          Supplies.GetLoot(message.request.response);
          Profile.CompleteQuest(message.request.response);
          Quest.CompleteQuest(message.request.response, message.request.url, message.id);
          Quest.CheckSpecialQuest(message.request.response);
          Dailies.CompleteQuest(message.request.response);
        }
        // //initialize raid -> SELECTING RAID
        // if(message.request.url.indexOf('/quest/assist_list') !== -1) {
        //     APBP.InitializeRaid(message.request.response);
        // }
        // //initialize raid through code
        // if(message.request.url.indexOf('/quest/battle_key_check') !== -1) {
        //     APBP.InitializeRaidCode(message.request.response);
        // }
        //join raid
        if (message.request.url.indexOf('/quest/raid_deck_data_create') !== -1) {
          APBP.StartRaid(message.request.payload);
          Quest.CreateRaid(message.request.payload, message.id);
        }
        //if(message.request.url.indexOf('/check_reward/') !== -1) {
        //  Quest.CompleteQuest(message.request.url);
        //}
        //raid loot
        // if(message.request.url.indexOf('/resultmulti/content/') !== -1) {
        //     Supplies.GetLoot(message.request.response.option.result_data);
        //     Profile.CompleteRaid(message.request.response.option.result_data);
        //     Dailies.CompleteCoop(message.request.response.option.result_data);
        //     Dailies.CompleteRaid(message.request.response.option.result_data);
        // }
        if (message.request.url.indexOf('/resultmulti/data/') !== -1) {
          Supplies.GetLoot(message.request.response);
          Profile.CompleteRaid(message.request.response);
          Quest.CompleteQuest(message.request.response, message.request.url, message.id);
          Quest.CheckSpecialQuest(message.request.response);
          Dailies.CompleteCoop(message.request.response, message.id);
          Dailies.CompleteRaid(message.request.response);
        }
        if (message.request.url.indexOf('retire.json') !== -1) {
          Quest.AbandonQuest(message.request.payload);
        }

        //restore ap/bp
        if (message.request.url.indexOf('/quest/user_item') !== -1) {
          APBP.RestoreAPBP(message.request.response);
          Supplies.UseRecovery(message.request.response, message.request.payload);
        }
        //gacha
        if (message.request.url.indexOf('/gacha/list?_=') !== -1) {
          Dailies.SetDraws(message.request.response);
        }
        if (message.request.url.indexOf('/gacha/normal/result//normal/6?_=') !== -1) {
          Dailies.DecDraws(message.request.response);
          Profile.LupiDraw(message.request.response);
        }
        if (message.request.url.indexOf('/gacha/result//legend') !== -1) {
          Dailies.DecDraws(message.request.response);
          //Profile.CrystalDraw(message.request.response);
        }
        //co-op dailies
        if (message.request.url.indexOf('/coopraid/daily_mission?_=') !== -1) {
          Dailies.SetCoop(message.request.response);
        }
        //casino list
        if (message.request.url.indexOf('/casino/article_list/1/1?_=') !== -1 || message.request.url.indexOf('/casino/article_list/undefined/1?_=') !== -1) {
          Casino.SetCasino1(message.request.response);
          Profile.SetChips(message.request.response.medal.number);
        }
        if (message.request.url.indexOf('/casino/article_list/undefined/2?_=') !== -1) {
          Casino.SetCasino2(message.request.response);
          Profile.SetChips(message.request.response.medal.number);
        }
        //casino buy
        if (message.request.url.indexOf('/casino/exchange?_=') !== -1) {
          Casino.BuyCasino(message.request.response, message.request.payload);
          Supplies.BuyCasino(message.request.response, message.request.payload);
        }
        if (message.request.url.indexOf('/twitter/twitter_info/') !== -1) {
          Dailies.CheckTweet(message.request.response);
          Quest.CopyTweet(message.request.response);
        }
        if (message.request.url.indexOf('/twitter/tweet?_=') !== -1) {
          Dailies.UseTweet(message.request.response);
        }
        if (message.request.url.indexOf('/item/recovery_and_evolution_list_by_filter_mode') !== -1) {
          Supplies.SetRecoveryAndPowerUp(message.request.response);
        }
        if (message.request.url.indexOf('/item/article_list_by_filter_mode') !== -1) {
          Supplies.SetTreasure(message.request.response);
        }
        if (message.request.url.indexOf('/item/gacha_ticket_and_others_list_by_filter_mode') !== -1) {
          Supplies.SetDraw(message.request.response);
        }
        if (message.request.url.indexOf('/present/possessed') !== -1) {
          Profile.CheckWeaponSummon(message.request.response);
        }
        if (message.request.url.indexOf('/present/receive') !== -1) {
          Supplies.ReceiveGift(message.request.response);
          Profile.ReceiveGift(message.request.response);
        }
        if (message.request.url.indexOf('/present/receive_all_confirm') !== -1) {
          Supplies.GetAllGifts(message.request.response, message.id);
          Profile.GetAllGifts(message.request.response, message.id);
        }
        if (message.request.url.indexOf('/present/receive_all?') !== -1 || message.request.url.indexOf('/present/term_receive_all?') !== -1) {
          Supplies.ReceiveAllGifts(message.request.response, message.id);
          Profile.ReceiveAllGifts(message.request.response, message.id);
        }
        //treasure trade purchase
        if (message.request.url.indexOf('/shop_exchange/purchase/') !== -1 || message.request.url.indexOf('/arcarum/purchase?') !== -1) {
          Supplies.PurchaseItem(message.request.response);
          Profile.PurchaseItem(message.request.response);
          Dailies.PurchaseDistinction(message.request.response);
        }
        if (message.request.url.indexOf('/weapon/list/') !== -1) {
          Profile.SetWeaponNumber(message.request.response, message.request.url, message.id);
        }
        if (message.request.url.indexOf('/npc/list/') !== -1) {
          Profile.SetCharacterNumber(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('/summon/list/') !== -1) {
          Profile.SetSummonNumber(message.request.response, message.request.url, message.id);
        }
        //reduce weapon/summons
        if (message.request.url.indexOf('/weapon/decompose?') !== -1 || message.request.url.indexOf('/summon/decompose?') !== -1) {
          Profile.Reduce(message.request.response, message.id);
        }
        if (message.request.url.indexOf('/container/move?') !== -1) {
          Profile.MoveFromStash(message.request.response);
        }
        if (message.request.url.indexOf('/listall/move?') !== -1) {
          Profile.MoveToStash(message.request.response);
        }
        if (message.request.url.indexOf('/shop/point_list') !== -1) {
          Profile.SetDrops(message.request.response);
        }
        //Moon shop
        if (message.request.url.indexOf('/shop_exchange/article_list/5/1/1/null/null/null?') !== -1 || message.request.url.indexOf('/shop_exchange/article_list/5/1/1/null/null/3?') !== -1) {
          Dailies.CheckMoons(message.request.response);
        }
        //do shop
        if (message.request.url.indexOf('/shop_exchange/article_list/10/1/1/null/null/') !== -1) {
          Profile.SetDefense(message.request.response);
          //Dailies.CheckDefense(message.request.response, message.request.url);
        }
        //prestige
        if (message.request.url.indexOf('/shop_exchange/article_list/6/1/') !== -1) {
          Dailies.SetDistinctions(message.request.response);
          //Dailies.CheckDefense(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('/shop/purchase') !== -1) {
          Profile.SpendCrystals(message.request.response);
        }
        if (message.request.url.indexOf('/mbp/mbp_info') !== -1 || message.request.url.indexOf('/profile/content/index') !== -1) {
          Dailies.CheckRenown(message.request.response);
        }
        if (message.request.url.indexOf('evolution_weapon/evolution?') !== -1 || message.request.url.indexOf('evolution_summon/evolution?') !== -1) {
          Profile.Uncap(message.request.response, message.request.url, message.id);
          Profile.BuyUncap();
        }
        if (message.request.url.indexOf('evolution_weapon/item_evolution?') !== -1 || message.request.url.indexOf('evolution_summon/item_evolution?') !== -1) {
          Supplies.Uncap(message.request.response, message.request.url, message.id);
          Profile.BuyUncap();
        }
        if (message.request.url.indexOf('item/evolution_items/') !== -1) {
          Supplies.CheckUncapItem(message.request.response);
        }
        if (message.request.url.indexOf('item/evolution_item_one') !== -1) {
          Supplies.SetUncapItem(message.request.response);
          Profile.SetUncapItem(message.request.response);
        }
        if (message.request.url.indexOf('weapon/weapon_base_material?') !== -1 || message.request.url.indexOf('summon/summon_base_material?') !== -1) {
          Supplies.SetUncap(message.request.response);
          Profile.SetUncap(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('npc/evolution_materials') !== -1) {
          Supplies.SetNpcUncap(message.request.response);
        }
        if (message.request.url.indexOf('evolution_npc/item_evolution?') !== -1) {
          Supplies.NpcUncap(message.request.response, message.id);
          Profile.BuyUncap();
        }
        if (message.request.url.indexOf('weapon/weapon_material') !== -1 ||
            message.request.url.indexOf('summon/summon_material') !== -1 ||
            message.request.url.indexOf('npc/npc_material') !== -1) {
          Profile.SetUpgrade(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('enhancement_weapon/enhancement') !== -1 ||
            message.request.url.indexOf('enhancement_summon/enhancement') !== -1 ||
            message.request.url.indexOf('enhancement_npc/enhancement') !== -1) {
          Profile.Upgrade(message.request.response, message.request.url, message.id);
        }

        if (message.request.url.indexOf('/shop_exchange/activate_personal_support?_=') !== -1) {
          Buffs.StartBuff(message.request.response, message.request.payload);
        }
        if (message.request.url.indexOf('/sell_article/execute') !== -1) {
          Supplies.SellCoop(message.request.response, message.request.payload);
        }
        if (message.request.url.indexOf('/raid/start.json?_=') !== -1 || message.request.url.indexOf('/multiraid/start.json?_=') !== -1) {
          Quest.StartBattle(message.request.response, message.id);
        }
        if (message.request.url.indexOf('/normal_attack_result.json?_=') !== -1 ||
            message.request.url.indexOf('/ability_result.json?_=') !== -1 ||
            message.request.url.indexOf('/summon_result.json?_=') !== -1 ||
            message.request.url.indexOf('/user_recovery.json?_=') !== -1 ||
            message.request.url.indexOf('/chat_result.json?_=') !== -1 ||
            message.request.url.indexOf('/temporary_item_result.json?_=') !== -1) {
          Quest.BattleAction(message.request.response, message.request.payload, message.id);
        }
        if (message.request.url.indexOf('/rest/raid/setting?') !== -1) {
          Quest.CheckOugiToggle(message.request.payload, message.id);
        }
        if (message.request.url.indexOf('/quest/init_list') !== -1) {
          //Quest.SetCurrentQuest(message.request.response);
        }
        if (message.request.url.indexOf('/quest/assist_list') !== -1) {
          Quest.CheckJoinedRaids(message.request.response);
        }
        if (message.request.url.indexOf('/gacha/list?') !== -1) {
          Dailies.CheckGacha(message.request.response);
        }
        if (message.request.url.indexOf('/gacha/legend/campaign') !== -1) {
          Dailies.RollCampaign(message.request.response, message.request.payload);
        }
        if (message.request.url.indexOf('/quest/content/newextra') !== -1) {
          Dailies.SetPrimarchs(message.request.response);
        }
        if (message.request.url.indexOf('/party/job') !== -1) {
          Profile.SetZenith(message.request.response);
        }
        //arcarum
        if (message.request.url.indexOf('/rest/arcarum/start_stage?') !== -1) {
          Profile.ProcessArcarumStage(message.request.response);
        }
        if (message.request.url.indexOf('/rest/arcarum/stage?') !== -1) {
          Profile.ProcessArcarumStage(message.request.response);
          Supplies.GetLoot(message.request.response);
        }
        if (message.request.url.indexOf('/rest/arcarum/open_chest?') !== -1) {
          Supplies.GetArcarumChest(message.request.response);
        }
      }
    };
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function(port) {
      port.onMessage.removeListener(extensionListener);

      var tabs = Object.keys(connections);
      for (var i = 0, len = tabs.length; i < len; i++) {
        if (connections[tabs[i]] == port) {
          delete connections[tabs[i]];
          break;
        }
      }
    });
  });

// TODO: I think this is supposed to be the contents of message.js
  window.Message = {
    PostAll: function(message) {
      Object.keys(connections).forEach(function(key) {
        if (message !== undefined) {
          connections[key].postMessage(message);
        }
      });
    },

    Post: function(id, message) {
      if (connections[id] !== undefined) {
        if (message !== undefined) {
          connections[id].postMessage(message);
        }
        return true;
      } else {
        return false;
      }
    },

    Notify: function(title, message, source) {
      if (Options.Get('enableNotifications') && Options.Get(source)) {
        var theme = Options.Get('notificationTheme');
        if (theme === 'Random') {
          var rand = Math.random() * 3;
          if (rand < 1) {
            theme = 'Sheep';
          } else if (rand < 2) {
            theme = 'Rooster';
          } else {
            theme = 'Monkey';
          }
        }
        if (new Date().getMonth() === 3 && new Date().getDate() === 1) {
          theme = 'Garbage';
        }
        if (!Options.Get('muteNotifications')) {
          var sound = new Audio('src/assets/sounds/' + theme + '.wav');
          sound.play();
        }
        if (Math.random() * 300 < 1) {
          theme += '2';
        }
        chrome.notifications.create({
          type:   'basic',
          title:   title,
          message: message,
          iconUrl: 'src/assets/images/' + theme + '.png'
        });
      }
    },

    OpenURL: function (url, devID) {
      chrome.runtime.sendMessage({openURL: {
        url: url
      }});

    },

    MessageBackground: function(message, sendResponse) {
    },

    MessageTabs: function(message, sendResponse) {
      chrome.runtime.sendMessage({tabs: message}, function(response) {
        sendResponse(response);
      });
    },

    ConsoleLog: function(sender, message) {
      chrome.runtime.sendMessage({consoleLog: {
        sender: sender,
        message: message
      }});
    }
  };

})();
