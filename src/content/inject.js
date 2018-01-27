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
    gameVars.gs.turn = evt.detail.turn;
    for (var i = 0; i < evt.detail.enemies.length; i++) {
      if (typeof evt.detail.enemies[i] !== "undefined" && evt.detail.enemies[i] !== null) {
        gameVars.gs.boss.param[i].hp = evt.detail.enemies[i].currHP;
        gameVars.gs.boss.param[i].hpmax = evt.detail.enemies[i].maxHP;
      }
    }
    if (evt.detail.ignoredEnemyHPValues !== null) {
      for (var i = 0; i < evt.detail.ignoredEnemyHPValues.length; i++) {
        if (typeof evt.detail.ignoredEnemyHPValues[i] !== "undefined" && evt.detail.ignoredEnemyHPValues[i] !== null && evt.detail.ignoredEnemyHPValues[i].length !== 0) {
          gameVars.gs.boss.param[i].hpignored = evt.detail.ignoredEnemyHPValues[i];
        }
      }
    }
    if (typeof stage !== "undefined" && stage !== null) {
      if (typeof stage.gGameStatus !== "undefined" && stage !== null) {
        stage.gGameStatus.turn = evt.detail.turn;
      }
    }
  });

  function updateTurns(turn) {
    if (gameVars.gs.raid_id !== stage.pJsnData.raid_id) {
      gameVars.gs.raid_id = stage.pJsnData.raid_id;
      for (var i = 0; i < stage.gGameStatus.boss.param.length; i++) {
        gameVars.gs.boss.param[i].hp = stage.gGameStatus.boss.param[i].hp;
        gameVars.gs.boss.param[i].hpmax = stage.gGameStatus.boss.param[i].hpmax;
      }
    }
    if (turn < gameVars.gs.turn) {
      stage.gGameStatus.turn = gameVars.gs.turn;
      for (var i = 0; i < stage.gGameStatus.boss.param.length; i++) {
        stage.gGameStatus.boss.param[i].hp = gameVars.gs.boss.param[i].hp;
        stage.gGameStatus.boss.param[i].hpmax = gameVars.gs.boss.param[i].hpmax;
      }
    } else {
      stage.gGameStatus.turn = turn;
      gameVars.gs.turn = turn;
      for (var i = 0; i < stage.gGameStatus.boss.param.length; i++) {
        gameVars.gs.boss.param[i].hp = stage.gGameStatus.boss.param[i].hp;
        gameVars.gs.boss.param[i].hpmax = stage.gGameStatus.boss.param[i].hpmax;
      }
    }

    var event = new CustomEvent('ancGameStateVarChange', {
      detail: {
        'turn': turn,
        'raid_id': stage.pJsnData.raid_id
      }
    });
    window.dispatchEvent(event);
  }

  function consoleLog(msg) {
    var event = new CustomEvent('ancConsoleLog', {
      detail: {
        'msg': msg
      }
    });
    window.dispatchEvent(event);
  }

  var mutationObserver = window.WebKitMutationObserver;
  var MOConfig = { attributes: true, attributeOldValue: true, characterData: false, subtree: true, childList: true };

  var observer = new mutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (!gameVarsExist) {
        if (typeof stage !== "undefined" && stage !== null) {
          if (typeof stage.gGameStatus !== "undefined" && stage.gGameStatus !== null) {
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
        }
      }
      if (typeof stage === "undefined" || stage === null) {
        gameVarsExist = false;
      } else if (typeof stage.gGameStatus === "undefined" || stage.gGameStatus === null) {
        gameVarsExist = false;
      }
      if ($('.prt-turn-info').length) {
        if (stage.gGameStatus.turn < gameVars.gs.turn) {
          stage.gGameStatus.turn = gameVars.gs.turn;
        }
      }
      if ($('.txt-gauge-value').length) {
        for (var i = 0; i < stage.gGameStatus.boss.param.length; i++) {
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
      }
    });
  });

  observer.observe(document, MOConfig);
})();