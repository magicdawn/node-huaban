#!/usr/bin/env iojs

/**
 * module dependencies
 */
// 3rd
global.Promise = require('bluebird');
var co = require('co');
var request = require('superagent');
require('superagent-bluebird-promise');
var _ = require('lodash');
var mime = require('mime');
var minimist = require('minimist');
// core lib
var fmt = require('util').format;
var fs = require('fs');
var path = require('path');

/**
 * example url
 */
var exampleUrl = 'http://huaban.com/boards/17324249/'


/**
 * image host
 */
var imgHosts = {
  "hbimg": "img.hb.aicdn.com",
  "hbfile": "hbfile.b0.upaiyun.com",
  "hbimg2": "hbimg2.b0.upaiyun.com"
};


/**
 * get html for url
 */
var getHtmlAsync = co.wrap(function*(url, query) {
  /** construct request */
  var req = request
    .get(url)

  if (query) {
    req.query(query);
  }

  return req
    .promise()
    .then(function(res) {
      return res.text;
    })
});


/**
 * match right
 */
var getRight = function(input, fi) {
  var pairs = {
    '(': ')',
    '{': '}',
    '[': ']'
  };

  var left = input[fi];
  var right = pairs[left];

  if (!right) {
    return -1;
  }

  var count = 1; // input[fi] = left

  for (var i = fi + 1, len = input.length; i < len; i++) {
    var cur = input[i];

    if (cur === right) {
      count--;
      if (count === 0) {
        return i;
      }
    } else if (cur === left) {
      count++;
    }
  }

  return -1; // not found
};


/**
 * get board data
 */
var getBoard = function(html) {
  var search = 'app.page["board"] = {';
  var start = html.indexOf(search) + search.length - 1; // html[start] = '{'
  var end = getRight(html, start); // html[end] = '}';
  var js = html.slice(start, end + 1);

  return JSON.parse(js);
};


/**
 * get pins on a page
 */
var getPagePins = function(html) {
  var board = getBoard(html);
  return board.pins;
}


/**
 * get pins from url、total amount
 */
var getPinsAsync = co.wrap(function*(url, total) {
  var pins = [];
  if (url.slice(-1) !== '/') url += '/';

  var i = 1;
  total = Math.ceil(total / 100); // e.g 150 need 2 requests
  while (i <= total) {
    var query = {
      limit: 100
    };

    if (pins.length > 0) { // not the first time
      query.max = pins[pins.length - 1].pin_id;
    }

    var html =
      yield getHtmlAsync(url, query);
    var _pins = getPagePins(html);
    pins = pins.concat(_pins);

    i++;
  }

  // image download needs src&dest
  var fileNameLength = String(pins.length).length;
  pins = pins.map(function(pin, index) {
    var _pin = {
      src: fmt('http://%s/%s', imgHosts[pin.file.bucket], pin.file.key),

      index: index, // 0
      num: _.padLeft(String(index + 1), fileNameLength, '0'), // 001

      ext: mime.extension(pin.file.type) || 'jpg'
    }

    _pin.dest = _pin.num + '.' + _pin.ext;
    return _pin;
  });

  return pins;
});

var downloadAsync = function(src, dest) {
  return new Promise(function(resolve, reject) {
    request
      .get(src)
      .on('error', reject)
      .pipe(fs.createWriteStream(dest))
      .on('error', reject)
      .on('finish', function() {
        this.close(function() { // close filestream
          resolve();
        })
      })
  });
};

/**
 * from http://huaban.com/board/xxx download all images(pins)
 */
var downloadBoardAsync = co.wrap(function*(url, concurrency) {
  var html =
    yield getHtmlAsync(url);
  var board = getBoard(html);

  /** output board data */
  console.log('board title : %s', board.title);
  console.log('board id : %d', board.board_id);
  console.log('board pins count : %d', board.pin_count);

  // all pins
  var pins =
    yield getPinsAsync(url, board.pin_count);

  // take care of dir
  var dir = path.resolve(board.title);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // start download
  console.log('Start download ...');
  yield Promise.map(pins, function(pin, index, length) {
    return downloadAsync(pin.src, path.join(dir, pin.dest))
      .then(function() {
        console.log("√ %s/%s 下载成功", pin.num, length);
      })
      .catch(function() {
        console.error("× %s/%s 下载失败", pin.num, length);
      })
  }, {
    concurrency: concurrency
  });

});

var argv = minimist(process.argv.slice(2), {
  boolean: ['help'],
  alias: {
    c: ['concurrency'],
    h: ['help']
  },
  defaults: {
    concurrency: 10
  }
});

if (process.argv.length === 2 || argv.help) {
  console.log(`

  huaban board downloader

    Usage:
      iojs huaban.js <board-url> [options]

    Options:
      -c,--concurrency    ->    同时最大下载数量,默认10
      -h,--help           ->    输出此帮助信息

    Example:
      iojs huaban.js ${ exampleUrl } -c 10
  `);

  process.exit();
} else {
  co(function*() {
    var url = argv._[0];
    var concurrency = argv.concurrency;

    var start = new Date;
    yield downloadBoardAsync(url, concurrency);
    var end = new Date;
    console.log('耗时 %s 秒', (end - start) / 1000);
  }).catch(function(e) {
    console.error(e);
  })
}