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
      syncBossHP: false
    };

  var event = new CustomEvent('ancClientMessage', {
    detail: {
      'requestSyncOptions': true
    }
  });
  setTimeout(function () { window.dispatchEvent(event); }, 1000);

  window.addEventListener('ancUpdateClient', function (evt) {
    if (typeof evt.detail.gameState !== "undefined") {
      if (typeof stage !== "undefined" && stage !== null) {
        if (typeof stage.gGameStatus !== "undefined" && stage.gGameStatus !== null) {
          var gs = evt.detail.gameState;
          if ((options.syncAll || options.syncTurns) && gs.turn !== null && gs.turn > 0) {
            gameVars.gs.turn = gs.turn;
            stage.gGameStatus.turn = gs.turn;
          }
          if (options.syncAll || options.syncBossHP) {
            if (gs.ignoredEnemyHPValues !== null) {
              for (var i = 0; i < gs.enemies.length; i++) {
                if (typeof gs.enemies[i] !== "undefined" && gs.enemies[i] !== null) {
                  gameVars.gs.boss.param[i].hp = gs.enemies[i].currHP;
                  gameVars.gs.boss.param[i].hpmax = gs.enemies[i].maxHP;
                  stage.gGameStatus.boss.param[i].hp = gameVars.gs.boss.param[i].hp;
                  stage.gGameStatus.boss.param[i].hpmax = gameVars.gs.boss.param[i].hpmax;
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
      }
    }
    if (typeof evt.detail.updateAllSyncOptions !== "undefined") {
      options = evt.detail.updateAllSyncOptions.options;
    }
    if (typeof evt.detail.updateSyncOptions !== "undefined") {
      options[evt.detail.updateSyncOptions.key] = evt.detail.updateSyncOptions.val;
    }
  });

  function updateTurns(turn) {
    if (!options.syncAll && !options.syncTurns) {
      return;
    }
    if (turn < gameVars.gs.turn) {
      stage.gGameStatus.turn = gameVars.gs.turn;
    } else if (stage.gGameStatus.turn !== gameVars.gs.turn) {
      stage.gGameStatus.turn = turn;
      gameVars.gs.turn = turn;
    }
  }

  function consoleLog(msg) {
    var event = new CustomEvent('ancClientMessage', {
      detail: {
        'consoleLog': {
          'msg': msg
        }
      }
    });
    window.dispatchEvent(event);
  }

  function observeEnemyHP(i) {
    new MutationObserver(function (mutations) {
      updateEnemyHP(i);
    }).observe(document.getElementById('enemy-hp' + i), { attributes: false, attributeOldValue: false, characterData: false, subtree: false, childList: true });
  }

  function updateEnemyHP(i) {
    if (!isNaN(stage.gGameStatus.boss.param[i].hp)) {
      // FUCKING WHY CYGAMES
      if (typeof stage.gGameStatus.boss.param[i].hp !== "number") {
        stage.gGameStatus.boss.param[i].hp = parseInt(stage.gGameStatus.boss.param[i].hp);
      }
      if (stage.gGameStatus.boss.param[i].hp !== gameVars.gs.boss.param[i].hp) {
        if (gameVars.gs.boss.param[i].hpignored.length > 0) {
          var isIgnored = false;
          for (var j = 0; j < gameVars.gs.boss.param[i].hpignored.length; j++) {
            if (stage.gGameStatus.boss.param[i].hp === gameVars.gs.boss.param[i].hpignored[j] && gameVars.gs.attacking === 1) {
              isIgnored = true;
              break;
            }
          }
          if (!isIgnored) {
            lockBossHP = true;
          }

          if (lockBossHP) {
            if (isIgnored) {
              stage.gGameStatus.boss.param[i].hp = gameVars.gs.boss.param[i].hp;
              stage.gGameStatus.boss.param[i].hpmax = gameVars.gs.boss.param[i].hpmax;
            }
          }
        }
        gameVars.gs.boss.param[i].hp = stage.gGameStatus.boss.param[i].hp;
        gameVars.gs.boss.param[i].hpmax = stage.gGameStatus.boss.param[i].hpmax;
        var hpPercent = '' + Math.ceil((gameVars.gs.boss.param[i].hp / gameVars.gs.boss.param[i].hpmax) * 100);
        if (hpPercent !== $('#enemy-hp' + i).text()) {
          $('#enemy-hp' + i).text(hpPercent);
        }
      }
    }
  }

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (typeof stage !== "undefined" && stage !== null) {
        if (typeof stage.gGameStatus !== "undefined" && stage.gGameStatus !== null) {
          if (options.syncAll || options.syncTurns) {
            if (gameVars.gs.attacking !== stage.gGameStatus.attacking) {
              gameVars.gs.attacking = stage.gGameStatus.attacking;
              if (gameVars.gs.attacking === 0) {
                lockBossHP = false;
                for (var i = 0; i < stage.gGameStatus.boss.param.length; i++) {
                  gameVars.gs.boss.param[i].hpignored = [];
                }
              }
              updateTurns(stage.gGameStatus.turn);
            }
            if (trigger.turnCounter === undefined) {
              if ($('.prt-turn-info').length) {
                new MutationObserver(function (mutations) {
                  gameVars.gs.turn = stage.gGameStatus.turn;
                }).observe(document.getElementsByClassName('prt-turn-info')[0], { attributes: true, attributeOldValue: true, characterData: false, subtree: true, childList: true });
                trigger.turnCounter = true;
              }
            }
          }
          if (options.syncAll || options.syncBossHP) {
            if (trigger.enemyHP0 === undefined) {
              if ($('#enemy-hp0').length) {
                observeEnemyHP(0);
                trigger.enemyHP0 = true;
              }
            }
            if (trigger.enemyHP1 === undefined) {
              if ($('#enemy-hp1').length) {
                observeEnemyHP(1);
                trigger.enemyHP1 = true;
              }
            }
            if (trigger.enemyHP2 === undefined) {
              if ($('#enemy-hp2').length) {
                observeEnemyHP(2);
                trigger.enemyHP2 = true;
              }
            }
          }
        }
      }
    });
  }).observe(document, { attributes: true, attributeOldValue: true, characterData: false, subtree: true, childList: true });
  window.addEventListener("hashchange", function (event) {
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