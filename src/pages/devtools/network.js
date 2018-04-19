(function() {
  var parseJSON = function(data) {
    var json = null;
    try {
      json = $.parseJSON(data);
    } catch (e) {
      json = null;
    }
    return json;
  };
  chrome.devtools.network.onRequestFinished.addListener(function (request) {
    if (request.request.url.indexOf('.css') !== -1 &&
      request.request.url.indexOf('/css/common/index.css') === -1) {
      Message.Post({ pageLoad: true });
    }
    if (request.request.url.indexOf('http://gbf.game.mbga.jp/') !== -1 ||
      request.request.url.indexOf('http://game.granbluefantasy.jp/') !== -1) {
      request.getContent(function (responseBody) {
        var response = parseJSON(responseBody);
        if (request.request.postData !== undefined) {
          var payload = parseJSON(request.request.postData.text);
          Message.Post({
            'request': {
              'url':      request.request.url,
              'response': response,
              'payload':  payload
            }
          });
        } else {
          Message.Post({
            'request': {
              'url':      request.request.url,
              'response': response,
              'payload':  undefined
            }
          });
        }
      });
    }
  });
})();
