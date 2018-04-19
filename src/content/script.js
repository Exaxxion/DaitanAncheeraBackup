(function() {
  $(window).on('beforeunload', function() {
    chrome.runtime.sendMessage({ refresh: true });
  });

  var tempImageURLS = {},
    gameState = {
      'turn': -1,
      'raid_id': null,
      'enemies': [null, null, null]
    },
    syncInit = false,
    options = {
      syncAll: false,
      syncTurns: false,
      syncBossHP: false
    },
    shadowScript = null,
    externalChannel = null,
    pendingExternalMsgs = [],
    isChannelReady = false,
    hasProcessedHome = false,
    hasProcessedArcarumCheckpoint = false,
    arcaWeeklyPoints = 0;


  var injectSyncScript = function() {
    if (syncInit) {
      return;
    }
    syncInit = true;
    $.get(chrome.extension.getURL('src/content/inject.js'), function (result) {
      var shadowParent = document.createElement("div");
      document.documentElement.appendChild(shadowParent);
      var shadowRoot = shadowParent.attachShadow({ mode: 'closed' });;
      shadowScript = document.createElement("iframe");
      shadowScript.style = "display: none";
      shadowRoot.appendChild(shadowScript);
      var s = document.createElement('script');
      s.type = 'text/javascript';
      s.charset = 'utf-8';
      s.textContent = result;
      shadowScript.contentDocument.documentElement.appendChild(s);
      externalChannel = new MessageChannel();
      externalChannel.port1.onmessage = handleExternalMessage;
      shadowScript.contentWindow.postMessage({
        init: 'ancInit',
        'options': options
      }, "*", [externalChannel.port2]);
    });
  };

  var sendExternalMessage = function (msg) {
    if (!externalChannel || !isChannelReady) {
      pendingExternalMsgs.push(msg);
      return;
    }
    externalChannel.port1.postMessage(msg);
  };

  function handleExternalMessage(msg) {
    var message = msg.data;
    if (message.initExternal) {
      isChannelReady = true;
      for (var i = 0, l = pendingExternalMsgs.length; i < l; i++) {
        externalChannel.port1.postMessage(pendingExternalMsgs[i]);
      }
      pendingExternalMsgs = [];
    }
    if (message.consoleLog) {
      consoleLog("external", message.consoleLog.msg);
    }
  };

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    if (message.pageLoad) {
      pageLoad(message.pageLoad);
    }

    if (message.initialize) {
      chrome.runtime.sendMessage({
        getExternalOptions: true
      }, function (response) {
        if (response.value !== null) {
          var doInjectScript = false;
          for (var i in response.value) {
            if (!response.value.hasOwnProperty(i)) continue;
            options[i] = response.value[i];
            if (options[i]) {
              doInjectScript = true;
            }
          }
          if (doInjectScript) {
            injectSyncScript();
          }
        }
      });
    }

    if (message.selectQuest) {
      $('.prt-list-contents').each(function(index) {
        tempImageURLS[$(this).find('.txt-quest-title').first().text()] = $(this).find('.img-quest').first().attr('src');
      });
    }

    if (message.startQuest) {
      if (tempImageURLS[message.startQuest.name] !== undefined) {
        sendResponse(tempImageURLS[message.startQuest.name]);
      } else {
        sendResponse(null);
      }
    }

    if (message.checkRaids) {
      var list = $('#prt-multi-list');
      var raids = [];
      list.find('.btn-multi-raid').each(function(index) {
        if ($(this).find('.ico-enter').length > 0) {
          raids.push({
            id:     '' + $(this).data('raid-id'),
            name:   $(this).data('chapter-name'),
            imgURL: $(this).find('.img-raid-thumbnail').first().attr('src'),
            host:   ($(this).find('.txt-request-name').text() === 'You started this raid battle.')
          });
        }
      });

      var unclaimed = false;
      if ($('.btn-unclaimed').length > 0) {
        unclaimed = true;
      }

      var type;
      if ($('#tab-multi').hasClass('active')) {
        type = 'normal';
      } else {
        type = 'event';
      }

      messageDevTools({
        checkRaids: {
          'raids':     raids,
          'unclaimed': unclaimed,
          'type':      type
        }
      });
    }

    if (message.updateTurnCounter) {
      if (options.syncAll || options.syncTurns || options.syncBossHP) {
        if (message.updateTurnCounter.type === "start") {
          gameState.raid_id = message.updateTurnCounter.raid_id;
        }
        if (message.updateTurnCounter.raid_id === gameState.raid_id) {
          if ((options.syncAll || options.syncTurns) && message.updateTurnCounter.turn !== null) {
            gameState.turn = message.updateTurnCounter.turn;
          }
          if (options.syncAll || options.syncBossHP) {
            for (var i = 0; i < gameState.enemies.length; i++) {
              if (message.updateTurnCounter.boss[i] !== undefined && message.updateTurnCounter.boss[i] !== null) {
                gameState.enemies[i] = message.updateTurnCounter.boss[i];
              } else {
                gameState.enemies[i] = null;
              }
            }
          }
          updateClient(gameState, message.updateTurnCounter.ignoredEnemyHPValues, message.updateTurnCounter.type);
        }
      }
    }

    if (message.checkOugiToggle !== undefined) {
      if (!$('.btn-lock').hasClass('lock' + message.checkOugiToggle)) {
        sendExternalMessage({
          'updateOugiToggleBtn': message.checkOugiToggle
        });
        ougiBugged = true;
      }
    }

    if (message.fastRefresh) {
      sendExternalMessage({
        'fastRefresh': true
      });
    }
  });

  var pageLoad = function(url) {
    if (url.indexOf('#guild') !== -1) {
      if ($('.prt-assault-guildinfo').length > 0) {
        var times = [];
        $('.prt-assault-guildinfo').find('.prt-item-status').each(function(index) {
          var text = $(this).text();
          var hour = parseInt(text.split(':')[0]);
          if (text.indexOf('p.m.') !== -1 && text.indexOf('p.m') < text.length - 5) {
            if (hour !== 12) {
              hour += 12;
            }
          } else if (hour === 12) {
            hour = 0;
          }
          times[index] = hour;
        });
        messageDevTools({assault: {'times': times}});
      }
    } else if (url.indexOf('#mypage') !== -1) {
      
    } else if (url.indexOf('#coopraid/room/') !== -1) {
      messageDevTools({ coopCode: $('.txt-room-id').eq(0).text() });
    } else if (url.indexOf('#casino') !== -1) {
      var amt = parseInt($('.prt-having-medal').children('.txt-value').first().attr('value'));
      if (!isNaN(amt)) {
        messageDevTools({ chips: { 'amount': amt } });
      }
    } else if (url.indexOf('#profile') !== -1) {
    } else if (url.indexOf('#quest/index') !== -1) {
      $('.prt-quest-index').first().bind('DOMSubtreeModified',function(){
        if ($('.btn-recommend.visible').length !== 0) {
          $('.prt-quest-detail').each(function() {
            if ($(this).find('.txt-quest-title').text() === 'Angel Halo') {
              var time = $(this).find('.prt-remain-time');
              if (time.length !== 0 && time.text().indexOf('Starts') !== -1) {
                var num = time.first().text();
                if (num.indexOf('hour') !== -1) {
                  messageDevTools({angel: {
                    'delta': parseInt(num.substring(10, num.indexOf(' hour'))) + 1,
                    'active': false
                  }});
                } else if (num.indexOf('minutes') !== -1) {
                  messageDevTools({angel: {
                    'delta': 1,
                    'active': false
                  }});
                }
              } else {
                messageDevTools({angel: {
                  'delta': 1,
                  'active': true
                }});
              }
            }
          });
        }
      });
    } else if (url.indexOf('#quest/assist') !== -1) {
      if ($('.btn-unclaimed').length > 0) {
      }
    }
  };

  var messageDevTools = function(message) {
    chrome.runtime.sendMessage({content: message});
  };

  var consoleLog = function(sender, message) {
    chrome.runtime.sendMessage({consoleLog:{
      'sender': sender,
      'message': message
    }});
  };

  var updateClient = function (gs, ignoredEnemyHPValues) {
    sendExternalMessage({
      'gameState': {
        'turn': gs.turn,
        'enemies': gs.enemies,
        'ignoredEnemyHPValues': ignoredEnemyHPValues
      }
    });
  };
  
  $(document).ready(function () {
    messageDevTools({ 'initialize': true });

    // brute force searching for arcapoints
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (document.location.href.indexOf('#arcarum2') !== -1) {
          if ($('.pop-point-detail').length) {
            var $arcarumInfo = $('.pop-point-detail').find('.txt-point-num');
            var pts = '' + $arcarumInfo.find('.txt-weekly-point').text();
            if (arcaWeeklyPoints !== pts) {
              arcaWeeklyPoints = pts;
              messageDevTools({
                arcarumWeekly: {
                  'points': arcaWeeklyPoints,
                  'max':    $arcarumInfo.find('.txt-weekly-max-point').text()
                }
              });
            }
          } else if (!hasProcessedArcarumCheckpoint && $('.pop-check-point').length) {
            var $arcarumInfo = $('.pop-check-point');
            var val = $arcarumInfo.find('.txt-arcarum-point-num').text().replace('+', '');
            if (!isNaN(val)) {
              messageDevTools({
                arcarumCheckpoint: {
                  'points': val
                }
              });
              hasProcessedArcarumCheckpoint = true;
            }
          }
          return;
        }
        if (document.location.href.indexOf('#mypage') !== -1) {
          if (!hasProcessedHome) {
            if ($('.prt-user-info').length) {
              // old defend order garbage
              //if ($('.txt-do-remain-on-button').length !== 0) {
              //  messageDevTools({
              //    defense: {
              //      'time': parseInt($('.txt-do-remain-on-button').text()),
              //      'active': false
              //    }
              //  });
              //} else if ($('.do-underway').length !== 0) {
              //  messageDevTools({
              //    defense: {
              //      'time': -1,
              //      'active': true
              //    }
              //  });
              //} else {
              //  messageDevTools({
              //    defense: {
              //      'time': -1,
              //      'active': false
              //    }
              //  });
              //}

              var $prtUserInfo = $('.prt-user-info');
              var $prtInfoStatus = $prtUserInfo.children('.prt-info-status');
              var $prtInfoPossessed = $prtUserInfo.children('.prt-info-possessed');
              var $prtMbpStatus = $prtInfoPossessed.eq(1).children('#mbp-status');
              var $prtArcarumStatus = $prtInfoPossessed.eq(1).children('#arcarum-status');
              var profile = {
                'profile': {
                  'rank': $prtInfoStatus.find('.txt-rank-value').attr('title'),
                  'rankPercent': $prtInfoStatus.find('.prt-rank-gauge-inner').attr('style'),
                  'job': $prtInfoStatus.find('.txt-joblv-value').attr('title'),
                  'jobPercent': $prtInfoStatus.find('.prt-job-gauge-inner').attr('style'),
                  'lupi': $prtInfoPossessed.eq(0).find('.prt-lupi').text(),
                  'jobPoints': $prtInfoPossessed.eq(0).find('.prt-jp').text(),
                  'crystal': $prtInfoPossessed.eq(0).find('.prt-stone').text(),
                  'renown': $prtMbpStatus.find('.txt-current-point').eq(0).text(),
                  'prestige': $prtMbpStatus.find('.txt-current-point').eq(1).text(),
                  'arcarumTicket': $prtArcarumStatus.find('.prt-arcarum-passport-box').text(),
                  'arcapoints': $prtArcarumStatus.find('.prt-arcarum-point-box').text()
                }
              };

              var stopProcess = false;

              for (key in profile.profile) {
                if (!profile.hasOwnProperty(key)) continue;
                if (profile[key] === null || profile[key] === undefined || profile[key] === '') {
                  stopProcess = true;
                }
              }

              if (!stopProcess) {
                messageDevTools(profile);
                hasProcessedHome = true;
              }
            }
          }
          if ($('.pop-arcarum-point-detail').length) {
            var $arcarumInfo = $('.pop-arcarum-point-detail').find('.txt-point-num').text().split('/');
            if ($arcarumInfo.length === 2) {
              var pts = '' + $arcarumInfo[0];
              if (arcaWeeklyPoints !== pts) {
                arcaWeeklyPoints = pts;
                messageDevTools({
                  arcarumWeekly: {
                    'points': arcaWeeklyPoints,
                    'max':    $arcarumInfo[1]
                  }
                });
              }
            }
          }
          return;
        }
      });
    }).observe(document, { attributes: true, attributeOldValue: true, characterData: false, subtree: true, childList: true });

    window.addEventListener("hashchange", function (event) {
      hasProcessedHome = false;
      hasProcessedArcarumCheckpoint = false;
    });
  });
})();
