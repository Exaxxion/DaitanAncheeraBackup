(function() {
  $(window).on('beforeunload', function() {
    chrome.runtime.sendMessage({ refresh: true });
  });

  var tempImageURLS = {},
    gameState = {
      'turn': -1,
      'ability_turn': -1,
      'raid_id': null,
      'enemies': [null, null, null]
    },
    syncInit = false,
    options = {
      syncAll: false,
      syncTurns: false,
      syncAbilityTurns: false,
      syncBossHP: false,
      syncPlayerHP: false,
      syncPotions: false,
      syncAbilities: false,
      syncSummons: false,
      syncPlayerFormation: false,
      fasterRefresh: false,
      alwaysSkipSkillPopups: false
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
    if (message.updateRaidID) {
      gameState.raid_id = message.updateRaidID.id;
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

    if (message.syncClient) {
      if (options.syncAll || options.syncTurns || options.syncBossHP || options.syncAbilities) {
        if (message.syncClient.type === "start") {
          gameState.raid_id = message.syncClient.raid_id;
        }
        if (message.syncClient.raid_id === gameState.raid_id) {
          if ((options.syncAll || options.syncTurns) && message.syncClient.turn !== null) {
            gameState.turn = message.syncClient.turn;
          }
          if ((options.syncAll || options.syncAbilityTurns) && message.syncClient.ability_turn !== null) {
            gameState.ability_turn = message.syncClient.ability_turn;
          }
          if (options.syncAll || options.syncBossHP) {
            for (var i = 0; i < gameState.enemies.length; i++) {
              if (message.syncClient.boss[i] !== undefined && message.syncClient.boss[i] !== null) {
                gameState.enemies[i] = message.syncClient.boss[i];
              } else {
                gameState.enemies[i] = null;
              }
            }
          }
          if (options.syncAll || options.syncSummons) {
            updateSummonCooldowns(message.syncClient.summons);
            sendExternalMessage({
              'updateSummons': {
                'lyria_pos': message.syncClient.summons.lyria_pos,
                'lyria_num': message.syncClient.summons.lyria_num,
                'summon_enable': message.syncClient.summons.summon_enable
              }
            });
          }
          updateClient(gameState, message.syncClient.ignoredEnemyHPValues, message.syncClient.type);
          if (message.syncClient.characters !== null && message.syncClient.formation !== null) {
            if (options.syncAll || options.syncAbilities) {
              updateAbilityCooldowns(message.syncClient.characters, message.syncClient.formation);
              sendExternalMessage({
                'updateAbilities': {
                  'formation': message.syncClient.formation,
                  'characters': message.syncClient.characters
                }
              });
            }
            if (options.syncAll || options.syncPlayerHP) {
              updatePlayerHP(message.syncClient.characters, message.syncClient.formation);
              sendExternalMessage({
                'updatePlayerHP': {
                  'formation': message.syncClient.formation,
                  'characters': message.syncClient.characters
                }
              });
            }
            if (options.syncAll || options.syncPlayerFormation) {
              if (message.syncClient.hasFormationChanged) {
                updatePlayerFormation(message.syncClient.characters, message.syncClient.formation);
                sendExternalMessage({
                  'updateClientFormationData': {
                    'formation': message.syncClient.formation,
                    'characters': message.syncClient.characters
                  }
                });
              }
            }
            if (options.syncAll || options.syncPotions) {
              if (message.syncClient.potions !== null) {
                updatePotions(message.syncClient.potions);
                sendExternalMessage({
                  'updatePotions': message.syncClient.potions
                });
              }
            }
          }
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

  var updateClient = function(gs, ignoredEnemyHPValues) {
    sendExternalMessage({
      'gameState': {
        'turn': gs.turn,
        'ability_turn': gs.ability_turn,
        'enemies': gs.enemies,
        'ignoredEnemyHPValues': ignoredEnemyHPValues
      }
    });
  };

  var updateAbilityCooldowns = function(chars, formation) {
    if (chars === undefined || chars === null || formation === undefined || formation === null) {
      return;
    }
    var pos;
    var abilities;
    var ability;
    var $ability;
    var $abilities;
    var $abilityParent;
    var $abilityShine;
    var $charContainer;

    for (var i = 0; i < formation.length; i++) {
      pos = formation[i];
      if (chars[pos] === undefined || chars[pos] === null) {
        continue;
      }

      abilities = chars[pos].abilities;

      for (var j = 0; j < abilities.length; j++) {

        ability = abilities[j];
        if (ability === undefined || ability === null) {
          continue;
        }

        $ability = $('.ability-character-num-' + (i + 1) + '-' + (j + 1));
        if (!$ability.length) {
          continue;
        }

        for (var k = 0; k < $ability.length; k++) {
          $($ability[k]).attr('ability-recast', ability.cooldown);
          $abilityParent = $($ability[k]).parent();
          $abilityShine = $abilityParent.find('.ico-ability-shine');

          if (ability.cooldown === 0) {
            if ($abilityParent.hasClass('btn-ability-unavailable')) {
              $abilityParent.removeClass('btn-ability-unavailable').addClass('btn-ability-available');
            }
            if ($abilityShine.length) {
              $abilityShine.css('display', 'none');
            }
          } else {
            if ($abilityParent.hasClass('btn-ability-available')) {
              $abilityParent.removeClass('btn-ability-available').addClass('btn-ability-unavailable');
            }
            if ($abilityShine.length) {
              $abilityShine.css('display', 'block');
            }
          }
          $abilityShine.attr('class', 'shine' + ability.cooldown + ' ico-ability-shine');
          $abilityParent.find('.ico-ability-recast').find('span').attr({
            'class': 'num-recast-a' + ability.cooldown + ' ability-icon-num-' + (i + 1) + '-' + (j + 1),
            'value': ability.cooldown
          });

          if (ability.data.start_skill_set_recast !== undefined &&
              ability.data.start_skill_set_recast !== null &&
              ability.data.start_skill_set_recast != 0 &&
              ability.data.start_skill_set_recast !== '') {
            $abilityParent.find('.prt-start-recast').attr('class', 'prt-start-recast start-recast-' + ability.cooldown);
          } else {
            $abilityParent.find('.prt-start-recast').attr('class', 'prt-start-recast');
          }
        }

        $charContainer = $('.lis-character' + i);
        if (!$charContainer.length >= 2) {
          continue;
        }

        // only interate first 2 elements, not sure what the other remaining 2 are for
        // probably for popup prompts??
        for (var k = 0; k < 2; k++) {
          $ability = $($charContainer[k]).find('.ability' + (j + 1));
          if (!$ability.length) {
            continue;
          }

          for (var m = 0; m < $ability.length; m++) {

            if (ability.cooldown === 0) {
              $($ability[m]).attr('state', '2');
            } else {
              $($ability[m]).attr('state', '1');
            }
          }
        }
      }
    }
  };

  var updateSummonCooldowns = function (data) {
    if (data === undefined || data === null) {
      return;
    }
    if (data.summon_enable <= 0) {
      $('.prt-list-top').removeClass('summon-on').addClass('summon-off');
    } else {
      $('.prt-list-top').removeClass('summon-off').addClass('summon-on');
    }
    if (data.canSummon) {
      $('.prt-list-top').removeClass('summon-disable summon-off').addClass('summon-on');
    } else {
      $('.prt-list-top').removeClass('summon-on').addClass('summon-disable summon-off');
    }
    $('.lis-summon').each(function (i) {
      if (data.cooldowns[i].turn !== undefined && data.cooldowns[i].turn !== null) {
        if (data.cooldowns[i].turn > 0 || data.summon_enable <= 0 || !data.canSummon) {
          $(this).removeClass('on btn-summon-available').addClass('off btn-summon-unavailable');
          if (data.cooldowns[i].special_once_flag && data.cooldowns[i].turn > 1000) {
            $(this).addClass('non-reusable');
          }
        } else {
          $(this).removeClass('off btn-summon-unavailable').addClass('on btn-summon-available');
        }
      }
      $(this).attr('summon-recast', data.cooldowns[i].turn);
      $($(this).find('.ico-summon-recast').children()[0]).removeClass().addClass('num-recast-s' + data.cooldowns[i].turn);
    });
    if ($('.quick-summon').length > 0) {
      $('.quick-summon').each(function (i) {
        if (data.cooldowns[i].turn !== undefined && data.cooldowns[i].turn !== null) {
        }
        $(this).attr('recast', data.cooldowns[i].turn);
      });
    }
  }

  var updatePlayerHP = function(chars, formation) {
    if (chars === undefined || chars === null || formation === undefined || formation === null) {
      return;
    }
    var pos;
    var $charContainer;
    var $char;
    var $charHPText;
    var $charHPBar;
    var $charChargeBar;
    var hpPercent;

    for (var i = 0; i < formation.length; i++) {
      pos = formation[i];

      if (chars[pos] === undefined || chars[pos] === null) {
        continue;
      }
      if (isNaN(chars[pos].currHP) || isNaN(chars[pos].maxHP) || isNaN(chars[pos].currCharge)) {
        continue;
      }

      $charContainer = $('.lis-character' + i);
      if (!$charContainer.length >= 2) {
        continue;
      }

      // only interate first 2 elements, not sure what the other remaining 2 are for
      // probably for popup prompts??
      for (var j = 0; j < 2; j++) {
        $char = $($charContainer[j]);

        hpPercent = Math.trunc(chars[pos].currHP * 100 / chars[pos].maxHP);
        $charHPText = $char.find('.txt-hp-value');
        $charHPText.text(chars[pos].currHP);
        $charHPBar = $char.find('.prt-gauge-hp-inner');
        $charHPBar.css('width', hpPercent + '%');
        if (hpPercent > 25) {
          $charHPText.attr('color', 'green');
          $charHPBar.attr('color', 'green');
        } else {
          $charHPText.attr('color', 'red');
          $charHPBar.attr('color', 'red');
        }

        $char.find('.txt-gauge-value').text(chars[pos].currCharge);
        $charChargeBar = $char.find('.prt-gauge-special');

        if (chars[pos].currCharge < 100) {
          $charChargeBar.find('.prt-gauge-special-inner').css('width', chars[pos].currCharge + '%');
          $charChargeBar.find('.prt-gauge-special2-inner').css('width', '0%');
          $charChargeBar.find('.prt-shine').css('display', 'none');
          $charChargeBar.find('.prt-shine2').css('display', 'none');
        } else if (chars[pos].currCharge >= 100 && chars[pos].currCharge < 200) {
          $charChargeBar.find('.prt-gauge-special-inner').css('width', '100%');
          $charChargeBar.find('.prt-gauge-special2-inner').css('width', ((chars[pos].currCharge - 100) > 0 ? (chars[pos].currCharge - 100) : 0) + '%');
          $charChargeBar.find('.prt-shine').css('display', 'block');
          $charChargeBar.find('.prt-shine2').css('display', 'none');
        } else {
          $charChargeBar.find('.prt-gauge-special-inner').css('width', '100%');
          $charChargeBar.find('.prt-gauge-special2-inner').css('width', '100%');
          $charChargeBar.find('.prt-shine').css('display', 'block');
          $charChargeBar.find('.prt-shine2').css('display', 'block');
        }
      }
    }
  };

  var updatePlayerFormation = function(chars, formation) {
    if (chars === undefined || chars === null || formation === undefined || formation === null) {
      return;
    }

    var pos;
    var abilities;
    var ability;
    var $ability;
    var $abilities;
    var $abilityParent;
    var $abilityIcon;
    var $charContainer;
    var $charImage;
    var textData;

    var isViramate = false;
    var viramateShortcuts = ['Q', 'W', 'E', 'R'];

    if ($('.quick-panels').length) {
      isViramate = true;
    }

    for (var i = 0; i < formation.length; i++) {
      pos = formation[i];
      if (chars[pos] === undefined || chars[pos] === null) {
        continue;
      }
      if (chars[pos].currHP <= 0) {
        continue;
      }

      $charContainer = $('.lis-character' + i);
      if (!$charContainer.length >= 2) {
        continue;
      }

      for (var j = 0; j < 2; j++) {
        $charImage = $($charContainer[j]).find('.img-chara-command');
        if (chars[pos].currHP <= 0) {
          $charImage.attr('src', 'http://game-a1.granbluefantasy.jp/assets_en/img/sp/assets/npc/raid_normal/3999999999.jpg');
          if (isViramate) {
            $('.quick-panels').find("[index='" + i + "']");
          }
        } else {
          $charImage.attr('src', chars[pos].image);
          $($charContainer[j]).find('.ico-type').attr('class', 'ico-type ico-attribute-' + chars[pos].attribute);
        }
      }

      abilities = chars[pos].abilities;

      for (var j = 0; j < abilities.length; j++) {

        ability = abilities[j];
        $ability = $('.ability-character-num-' + (i + 1) + '-' + (j + 1));
        if (!$ability.length) {
          continue;
        }

        for (var k = 0; k < $ability.length; k++) {
          $abilityParent = $($ability[k]).parent();
          if (ability !== undefined && ability !== null) {
            $($ability[k]).attr(ability.data);
            if (ability.data['text-data'].indexOf('</div>') === -1) {
              textData = '<div class=prt-text-small>' + ability.data['text-data'] + '</div>';
            } else {
              textData = ability.data['text-data'];
            }
            $($ability[k]).attr('text-data', textData);

            if (isViramate) {
              $($ability[k]).attr('hotkey-text', viramateShortcuts[j]);
            }

            $abilityIcon = $($ability[k]).find('.img-ability-icon');
            if ($abilityIcon.length) {
              $abilityIcon.attr('src', ability.image).css({ 'height': '44px', 'width': '44px' });
            } else {
              $($ability[k]).append($('<img/>', {
                'class': 'img-ablity-icon',
                'src': ability.image
              }).css({ 'height': '44px', 'width': '44px' }));
            }

            textData = ability.data['ability-name'] + '\n';
            textData += ability.data['text-data'].replace('<div class=prt-text-small>', '').replace('</div>', '') + '\n';
            textData += 'Cooldown: ' + ability.cooldown + ' turn(s)';
            $abilityParent.attr('title', textData);
            $abilityParent.removeClass('empty');
            
            for (var m = 0; m < 2; m++) {
              $ability = $($charContainer[m]).find('.ability' + (j + 1));
              if (!$ability.length) {
                continue;
              }

              for (var n = 0; n < $ability.length; n++) {
                $($ability[n]).attr('type', ability.data['icon-type']);
              }
            }
          } else {
            $abilityParent.removeClass('btn-ability-available').removeClass('btn-ability-unavailable').addClass('empty');

            $ability.find('img').remove();
            $ability.each(function () {
              var attributes = this.attributes;
              for (var k = attributes.length - 1; k > 0; --k) {
                var attr = attributes[k];
                if (attr.name.indexOf('class') === -1) {
                  this.removeAttributeNode(attr);
                }
              }
            });

            var $span = $abilityParent.find('.ico-ability-recast').find('span');
            $span.attr({
              'class': 'num-recast-a0 ability-icon-num-' + (i + 1) + '-' + (j + 1)
            });
            $span.removeAttr('value');

            $abilityParent.find('.ability-character-num-' + (i + 1) + '-' + (j + 1)).attr('class', 'ico-ability ability-character-num-' + (i + 1) + '-' + (j + 1));
            $abilityParent.find('.ico-ability-shine').attr('class', 'ico-ability-shine');
            
            for (var m = 0; m < 2; m++) {
              $ability = $($charContainer[m]).find('.ability' + (j + 1));
              if (!$ability.length) {
                continue;
              }

              for (var n = 0; n < $ability.length; n++) {
                $($ability[n]).attr('state', '0');
              }
            }
          }
        } 
      }
    }
  }

  var updatePotions = function(potions) {
    var $small = $('.item-small');
    var $large = $('.item-large');
    var $elixir = $('.item-potion');
    var $eventContainer = $('.prt-event-item');
    var $eventPotions;
    var $event;

    if ($small.length) {
      $small.find('.having-num').text(potions.small);
      if (potions.small != 0) {
        $small.removeClass('disable');
      } else if ($small.hasClass('disable')) {
        $small.addClass('disable');
      }
    }

    if ($large.length) {
      $large.find('.having-num').text(potions.large);
      if (potions.large != 0) {
        $large.removeClass('disable');
      } else if ($large.hasClass('disable')) {
        $large.addClass('disable');
      }
    }

    if (!potions.elixir.is_trialbattle && potions.elixir.limit_flg) {
      if ($elixir.length) {
        $elixir.find('.having-num').text(potions.elixir.count);
        if (potions.elixir.limit_remain != 0) {
          $elixir.removeClass('disable');
        } else if ($elixir.hasClass('disable')) {
          $elixir.addClass('disable');
        }
      }
    }

    if ($eventContainer.length) {
      $eventPotions = $eventContainer.find('.btn-event-item');
      for (var i = 0; i < $eventPotions.length; i++) {
        for (var j in potions) {
          if (!potions.hasOwnProperty(j)) continue;
          if ($($eventPotions[i]).attr('item-id') === j) {
            $($eventPotions[i]).find('.having-num').text(potions[j]);
          }
        }
      }
    }
  }

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
