"use strict";
(function () {
  var gameVarsExist = false;
  var gameVars = {
    'gs': {
      'turn': 1,
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
  };
  var lockBossHP = false;
  var trigger = [];

  if (!Object.prototype.watch) {
    Object.defineProperty(Object.prototype, "watch", {
      enumerable: false,
      configurable: true,
      writable: false,
      value: function (prop, handler) {
        var
          oldval = this[prop],
          newval = oldval,
          getter = function () {
            return newval;
          },
          setter = function (val) {
            oldval = newval;
            return newval = handler.call(this, prop, oldval, val);
          };

        if (delete this[prop]) {
          Object.defineProperty(this, prop, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true
          });
        }
      }
    });
  }
  if (!Object.prototype.unwatch) {
    Object.defineProperty(Object.prototype, "unwatch", {
      enumerable: false,
      configurable: true,
      writable: false,
      value: function (prop) {
        var val = this[prop];
        delete this[prop];
        this[prop] = val;
      }
    });
  }

  window.addEventListener('ancUpdateGameState', function (evt) {
    if (typeof stage === "undefined" && stage === null) {
      return;
    }
    if (typeof stage.gGameStatus === "undefined" && stage === null) {
      return;
    }
    gameVars.gs.turn = evt.detail.turn;
    stage.gGameStatus.turn = evt.detail.turn;
    for (var i = 0; i < evt.detail.enemies.length; i++) {
      if (typeof evt.detail.enemies[i] !== "undefined" && evt.detail.enemies[i] !== null) {
        gameVars.gs.boss.param[i].hp = evt.detail.enemies[i].currHP;
        gameVars.gs.boss.param[i].hpmax = evt.detail.enemies[i].maxHP;
        stage.gGameStatus.boss.param[i].hp = gameVars.gs.boss.param[i].hp;
        stage.gGameStatus.boss.param[i].hpmax = gameVars.gs.boss.param[i].hpmax;
      }
    }
    if (evt.detail.ignoredEnemyHPValues !== null) {
      for (var i = 0; i < evt.detail.ignoredEnemyHPValues.length; i++) {
        if (typeof evt.detail.ignoredEnemyHPValues[i] !== "undefined" && evt.detail.ignoredEnemyHPValues[i] !== null && evt.detail.ignoredEnemyHPValues[i].length) {
          gameVars.gs.boss.param[i].hpignored = evt.detail.ignoredEnemyHPValues[i];
        }
      }
    }
  });

  function updateTurns(turn) {
    if (turn < gameVars.gs.turn) {
      stage.gGameStatus.turn = gameVars.gs.turn;
    } else if (stage.gGameStatus.turn !== gameVars.gs.turn) {
      stage.gGameStatus.turn = turn;
      gameVars.gs.turn = turn;
    }
  }

  function consoleLog(msg) {
    var event = new CustomEvent('ancConsoleLog', {
      detail: {
        'msg': msg
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
          if (!gameVarsExist) {
            gameVarsExist = true;
            updateTurns(stage.gGameStatus.turn);
            stage.gGameStatus.watch('attacking', function (paramName, oldVal, newVal) {
              if (newVal === 0) {
                lockBossHP = false;
                for (var i = 0; i < stage.gGameStatus.boss.param.length; i++) {
                  gameVars.gs.boss.param[i].hpignored = [];
                }
              }
              gameVars.gs.attacking = newVal;
              updateTurns(stage.gGameStatus.turn);
            });
          }
          if (trigger.turnCounter === undefined) {
            if ($('.prt-turn-info').length) {
              new MutationObserver(function (mutations) {
                stage.gGameStatus.turn = gameVars.gs.turn;
              }).observe(document.getElementsByClassName('prt-turn-info')[0], { attributes: true, attributeOldValue: true, characterData: false, subtree: true, childList: true });
              trigger.turnCounter = true;
            }
          }
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
    });
  }).observe(document, { attributes: true, attributeOldValue: true, characterData: false, subtree: true, childList: true });
  window.addEventListener("hashchange", function (event) {
    if (gameVarsExist) {
      gameVarsExist = false;
    }
    if (trigger.turnCounter !== undefined) {
      delete trigger.turnCounter;
    }
    if (trigger.enemyHP0 !== undefined) {
      delete trigger.enemyHP0;
    }
    if (trigger.enemyHP1 !== undefined) {
      delete trigger.enemyHP1;
    }
    if (trigger.enemyHP2 !== undefined) {
      delete trigger.enemyHP2;
    }
  });
})();