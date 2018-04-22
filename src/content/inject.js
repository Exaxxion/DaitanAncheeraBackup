"use strict";
(function () {
  var gameVarsExist = false,
    gameVars = {
      'gs': {
        'turn': -1,
        'attacking': 0,
        'raid_id': null,
        'boss': {
          'param': [
            {
              'hp': 0,
              'hpmax': 0,
              'hpignored': []
            }, {
              'hp': 0,
              'hpmax': 0,
              'hpignored': []
            }, {
              'hp': 0,
              'hpmax': 0,
              'hpignored': []
            }
          ]
        }
      }
    },
    lockBossHP = false,
    trigger = [],
    options = {
      syncAll: false,
      syncTurns: false,
      syncBossHP: false,
      syncPlayerHP: false,
      syncPotions: false,
      syncAbilities: false,
      syncSummons: false,
      syncPlayerFormation: false,
      fasterRefresh: false
    },
    port = null,
    pendingMsgs = [],
    context = window.parent;

  var initChannelSetup = function (evt) {
    if (evt.data.init !== 'ancInit') {
      return;
    }
    port = evt.ports[0];
    port.onmessage = handleMessage;
    port.postMessage({ initExternal: true });
    window.removeEventListener('message', initChannelSetup, true);
    for (var i = 0, l = pendingMsgs.length; i < l; i++) {
      port.postMessage(pendingMsgs[i]);
    }
    pendingMsgs = [];
    for (var i in evt.data.options) {
      if (!evt.data.options.hasOwnProperty(i)) continue;
      options[i] = evt.data.options[i];
    }
    evt.preventDefault();
    evt.stopImmediatePropagation();
  }
  window.addEventListener('message', initChannelSetup, true);

  var postMessage = function (msg) {
    if (port !== null) {
      port.postMessage(msg);
    } else {
      pendingMsgs.push(msg);
    }
  };

  function handleMessage(msg) {
    var message = msg.data;
    if (typeof message.fastRefresh !== "undefined") {
      window.setTimeout(function () { window.history.go(-1); }, 100);
      window.setTimeout(function () { window.history.go(1); }, 250);
    }
    if (typeof message.gameState !== "undefined") {
      var gs = message.gameState;
      if (options.syncAll || options.syncTurns) {
        if (gs.turn !== null && gs.turn > 0) {
          gameVars.gs.turn = gs.turn;
          if (typeof context.stage !== "undefined" && context.stage !== null) {
            // this shit goes null/undefined again mid-function
            if (typeof context.stage.gGameStatus !== "undefined" && context.stage.gGameStatus !== null) {
              context.stage.gGameStatus.turn = gs.turn;
            }
          }
        }
      }
      if (options.syncAll || options.syncBossHP) {
        if (gs.ignoredEnemyHPValues !== null) {
          for (var i = 0; i < gs.enemies.length; i++) {
            if (typeof gs.enemies[i] !== "undefined" && gs.enemies[i] !== null) {
              gameVars.gs.boss.param[i].hp = gs.enemies[i].currHP;
              gameVars.gs.boss.param[i].hpmax = gs.enemies[i].maxHP;
              if (typeof context.stage !== "undefined" && context.stage !== null) {
                if (typeof context.stage.gGameStatus !== "undefined" && context.stage.gGameStatus !== null) {
                  if (typeof context.stage.gGameStatus.boss !== "undefined" && context.stage.gGameStatus.boss !== null) {
                    if (typeof context.stage.gGameStatus.boss.param[i] !== "undefined" && context.stage.gGameStatus.boss.param[i] !== null) {
                      context.stage.gGameStatus.boss.param[i].hp = gameVars.gs.boss.param[i].hp;
                      context.stage.gGameStatus.boss.param[i].hpmax = gameVars.gs.boss.param[i].hpmax;
                    }
                  }
                }
              }
            }
          }
        }
        if (gs.ignoredEnemyHPValues !== null) {
          for (var i = 0; i < gs.ignoredEnemyHPValues.length; i++) {
            if (typeof gs.ignoredEnemyHPValues[i] !== "undefined" && gs.ignoredEnemyHPValues[i] !== null && gs.ignoredEnemyHPValues[i].length) {
              gameVars.gs.boss.param[i].hpignored = gs.ignoredEnemyHPValues[i];
            }
          }
        }
      }
    }
    if (typeof message.updateAllSyncOptions !== "undefined") {
      options = message.updateAllSyncOptions.options;
    }
    if (typeof message.updateSyncOptions !== "undefined") {
      options[message.updateSyncOptions.key] = message.updateSyncOptions.val;
    }
    if (typeof message.updateOugiToggleBtn !== "undefined") {
      if (context.stage.gGameStatus.lock !== message.updateOugiToggleBtn) {
        //$('.btn-lock').attr('class', $('.btn-lock').attr('class').replace('lock' + context.stage.gGameStatus.lock, 'lock' + message.updateOugiToggleBtn));
        context.stage.gGameStatus.lock = message.updateOugiToggleBtn;
      }
    }
    if (typeof message.updateClientFormationData !== "undefined") {
      if (options.syncAll || options.syncPlayerFormation) {
        if (typeof context.stage !== "undefined" && context.stage !== null) {
          if (typeof context.stage.gGameStatus !== "undefined" &&
              context.stage.gGameStatus !== null) {
            var pos;
            var msg = message.updateClientFormationData;
            var whitelist = [
              'alive',      'attr',            'condition',       'effect',
              'extra_attr', 'form',            'formchange_type', 'hp',
              'hpmax',      'leader',          'name',            
              'pid_image',  'pid_image_cutin', 'recast',          'recastmax',
              'setting_id', 'skip_flag',       'special_comment', 'special_skill',
              'split'];
            for (var i = 0; i < msg.formation.length; i++) {
              pos = msg.formation[i];
              if (typeof msg.characters[pos] !== "undefined" && msg.characters[pos] !== null) {
                for (var key in context.stage.gGameStatus.player.param[i]) {
                  if (!context.stage.gGameStatus.player.param[i].hasOwnProperty(key)) continue;
                  if (!msg.characters[pos].data.hasOwnProperty(key)) continue;
                  if (whitelist.indexOf(key) !== -1) {
                    context.stage.gGameStatus.player.param[i][key] = msg.characters[pos].data[key];
                  }
                }
              }
            }
          }
        }
      }
    }
    if (typeof message.updatePlayerHP !== "undefined") {
      if (options.syncAll || options.syncPlayerHP) {
        if (typeof context.stage !== "undefined" && context.stage !== null) {
          if (typeof context.stage.gGameStatus !== "undefined" &&
            context.stage.gGameStatus !== null) {
            var pos;
            var msg = message.updatePlayerHP;
            for (var i = 0; i < msg.formation.length; i++) {
              pos = msg.formation[i];
              if (typeof msg.characters[pos] !== "undefined" && msg.characters[pos] !== null &&
                typeof context.stage.gGameStatus.player.param[i] !== "undefined" &&
                context.stage.gGameStatus.player.param[i] !== null) {
                context.stage.gGameStatus.player.param[i].hp = parseInt(msg.characters[pos].currHP);
                context.stage.gGameStatus.player.param[i].recast = '' + msg.characters[pos].currCharge;
              }
            }
          }
        }
      }
    }
    if (typeof message.updatePotions !== "undefined") {
      if (options.syncAll || options.syncPotions) {
        if (typeof context.stage !== "undefined" && context.stage !== null) {
          if (typeof context.stage.gGameStatus !== "undefined" &&
            context.stage.gGameStatus !== null) {
            context.stage.gGameStatus.potion.count = message.updatePotions.elixir.count;
            context.stage.gGameStatus.potion.limit_flg = message.updatePotions.elixir.limit_flg;
            context.stage.gGameStatus.potion.limit_number = message.updatePotions.elixir.limit_number;
            context.stage.gGameStatus.potion.limit_remain = message.updatePotions.elixir.limit_remain;
            context.stage.gGameStatus.temporary.large = message.updatePotions.large;
            context.stage.gGameStatus.temporary.small = message.updatePotions.small;
            if (typeof context.stage.gGameStatus.event !== "undefined") {
              for (var key in context.stage.gGameStatus.event.item) {
                if (!context.stage.gGameStatus.event.item.hasOwnProperty(key)) continue;
                if (!message.updatePotions.hasOwnProperty(key)) continue;
                context.stage.gGameStatus.event.item[key].number = message.updatePotions[key];
              }
            }
          }
        }
      }
    }
  }

  function updateTurns() {
    if (!options.syncAll && !options.syncTurns) {
      return;
    }
    if (gameVars.gs.turn === -1) {
      return;
    }
    if (typeof context.stage === "undefined" || context.stage === null) {
      return;
    }
    if (typeof context.stage.gGameStatus === "undefined" || context.stage.gGameStatus === null) {
      return;
      consoleLog('before: ' + context.stage.gGameStatus.turn);
    }
    if (context.stage.gGameStatus.turn < gameVars.gs.turn) {
      context.stage.gGameStatus.turn = gameVars.gs.turn;
    } else {
      gameVars.gs.turn = context.stage.gGameStatus.turn;
    }
  }

  function consoleLog(msg) {
    postMessage({
      'consoleLog': {
        'msg': msg
      }
    });
  }

  function observeEnemyHP(i) {
    new MutationObserver(function (mutations) {
      updateEnemyHP(i);
    }).observe(context.document.getElementById('enemy-hp' + i), { attributes: false, attributeOldValue: false, characterData: false, subtree: false, childList: true });
  }

  function updateEnemyHP(i) {
    if (!isNaN(context.stage.gGameStatus.boss.param[i].hp)) {
      // FUCKING WHY CYGAMES
      if (typeof context.stage.gGameStatus.boss.param[i].hp !== "number") {
        context.stage.gGameStatus.boss.param[i].hp = parseInt(context.stage.gGameStatus.boss.param[i].hp);
      }
      if (context.stage.gGameStatus.boss.param[i].hp !== gameVars.gs.boss.param[i].hp) {
        if (gameVars.gs.boss.param[i].hpignored.length > 0) {
          var isIgnored = false;
          for (var j = 0; j < gameVars.gs.boss.param[i].hpignored.length; j++) {
            if (context.stage.gGameStatus.boss.param[i].hp === gameVars.gs.boss.param[i].hpignored[j] && gameVars.gs.attacking === 1) {
              isIgnored = true;
              break;
            }
          }
          if (!isIgnored) {
            lockBossHP = true;
          }

          if (lockBossHP) {
            if (isIgnored) {
              context.stage.gGameStatus.boss.param[i].hp = gameVars.gs.boss.param[i].hp;
              context.stage.gGameStatus.boss.param[i].hpmax = gameVars.gs.boss.param[i].hpmax;
            }
          }
        }
        gameVars.gs.boss.param[i].hp = context.stage.gGameStatus.boss.param[i].hp;
        gameVars.gs.boss.param[i].hpmax = context.stage.gGameStatus.boss.param[i].hpmax;
        var hpPercent = '' + Math.ceil((gameVars.gs.boss.param[i].hp / gameVars.gs.boss.param[i].hpmax) * 100);
        if (hpPercent !== context.document.getElementById('enemy-hp' + i).textContent) {
          context.document.getElementById('enemy-hp' + i).textContent = hpPercent;
        }
      }
    }
  }

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (typeof context.stage !== "undefined" && context.stage !== null) {
        if (typeof context.stage.gGameStatus !== "undefined" && context.stage.gGameStatus !== null) {
          if (options.syncAll || options.syncTurns) {
            if (gameVars.gs.attacking !== context.stage.gGameStatus.attacking) {
              gameVars.gs.attacking = context.stage.gGameStatus.attacking;
              if (gameVars.gs.attacking === 0) {
                lockBossHP = false;
                for (var i = 0; i < context.stage.gGameStatus.boss.param.length; i++) {
                  gameVars.gs.boss.param[i].hpignored = [];
                }
              }
              updateTurns();
            }
            if (trigger.turnCounter === undefined) {
              if (context.document.getElementsByClassName('prt-turn-info').length) {
                new MutationObserver(function (mutations) {
                  updateTurns();
                }).observe(context.document.getElementsByClassName('prt-turn-info')[0], { attributes: true, attributeOldValue: true, characterData: false, subtree: true, childList: true });
                trigger.turnCounter = true;
              }
            }
          }
          if (options.syncAll || options.syncBossHP) {
            if (trigger.enemyHP0 === undefined) {
              if (context.document.getElementById('enemy-hp0') !== null) {
                observeEnemyHP(0);
                trigger.enemyHP0 = true;
              }
            }
            if (trigger.enemyHP1 === undefined) {
              if (context.document.getElementById('enemy-hp1') !== null) {
                observeEnemyHP(1);
                trigger.enemyHP1 = true;
              }
            }
            if (trigger.enemyHP2 === undefined) {
              if (context.document.getElementById('enemy-hp2') !== null) {
                observeEnemyHP(2);
                trigger.enemyHP2 = true;
              }
            }
          }
        }
      }
    });
  }).observe(context.document, { attributes: true, attributeOldValue: true, characterData: false, subtree: true, childList: true });
  context.window.addEventListener("hashchange", function (event) {
    if (typeof trigger.turnCounter !== "undefined") {
      delete trigger.turnCounter;
    }
    if (typeof trigger.enemyHP0 !== "undefined") {
      delete trigger.enemyHP0;
    }
    if (typeof trigger.enemyHP1 !== "undefined") {
      delete trigger.enemyHP1;
    }
    if (typeof trigger.enemyHP2 !== "undefined") {
      delete trigger.enemyHP2;
    }
  });
})();