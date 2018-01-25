var $ancAttackRateLimit = 5;
var $ancCheckFreq = 250;
var $ancAttackFlag = false;
var $ancGameVarsExist = false;

if (!Object.prototype.watch) {
  Object.defineProperty(Object.prototype, "watch", {
    enumerable: false
    , configurable: true
    , writable: false
    , value: function (prop, handler) {
      var
        oldval = this[prop]
        , newval = oldval
        , getter = function () {
          return newval;
        }
        , setter = function (val) {
          oldval = newval;
          return newval = handler.call(this, prop, oldval, val);
        }
        ;

      if (delete this[prop]) {
        Object.defineProperty(this, prop, {
          get: getter
          , set: setter
          , enumerable: true
          , configurable: true
        });
      }
    }
  });
}
if (!Object.prototype.unwatch) {
  Object.defineProperty(Object.prototype, "unwatch", {
    enumerable: false
    , configurable: true
    , writable: false
    , value: function (prop) {
      var val = this[prop];
      delete this[prop];
      this[prop] = val;
    }
  });
}

window.addEventListener('ancGameStateUpdateTurns', function (evt) {
  if (typeof stage !== "undefined" && stage !== null) {
    if (typeof stage.gGameStatus !== "undefined" && stage !== null) {
      stage.gGameStatus.turn = evt.detail.turn;
    }
  }
});

function ancWaitForGameVars() {
  if (!$ancGameVarsExist) {
    if (typeof stage !== "undefined" && stage !== null) {
      if (typeof stage.gGameStatus !== "undefined" && stage.gGameStatus !== null) {
        $ancGameVarsExist = true;
        ancUpdateTurns(stage.gGameStatus.turn);
        stage.gGameStatus.watch('attacking', function (paramName, oldVal, newVal) {
          ancUpdateTurns(stage.gGameStatus.turn);
        });
      }
    }
  }
  if (typeof stage === "undefined" || stage === null) {
    $ancGameVarsExist = false;
  } else if (typeof stage.gGameStatus === "undefined" || stage.gGameStatus === null) {
    $ancGameVarsExist = false;
  }
  setTimeout(ancWaitForGameVars, $ancCheckFreq);
}

function ancUpdateTurns(turn) {
  var $ancGameStateVarEvent = new CustomEvent('ancGameStateVarChange', {
    detail: {
      'turn': turn,
    }
  });
  window.dispatchEvent($ancGameStateVarEvent);
}

ancWaitForGameVars();