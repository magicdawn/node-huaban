'use strict';

/**
 * module dependencies
 */
const Promise = require('bluebird');
const co = require('co');
const request = require('./patch').superagent;
const _ = require('lodash');
const mime = require('mime');
const debug = require('debug')('huaban:index');
const util = require('./util');
const fs = require('fs-extra');
const path = require('path');
const logSymbols = require('log-symbols');

/**
 * image host
 */
const imgHosts = {
  'hbimg': 'img.hb.aicdn.com',
  'hbfile': 'hbfile.b0.upaiyun.com',
  'hbimg2': 'hbimg2.b0.upaiyun.com'
};

/**
 * get board data
 */
const getBoard = function(html) {
  // debug('html in getBoard: %s', html);

  /* eslint quotes: 0 */
  const search = `app.page["board"] = {`;
  const start = html.indexOf(search) + search.length - 1; // html[start] = '{'
  const end = util.getRight(html, start); // html[end] = '}';
  const js = html.slice(start, end + 1);
  // debug('js in getBoard: %s', js);

  return JSON.parse(js);
};


/**
 * get pins on a page
 */
const getPagePins = function(html) {
  const board = getBoard(html);
  return board.pins;
};


/**
 * get pins from url、total amount
 */
const getPins = co.wrap(function*(url, total) {
  let pins = [];
  if (url.slice(-1) !== '/') url += '/';

  let i = 1;
  total = Math.ceil(total / 100); // e.g 150 need 2 requests
  while (i <= total) {
    const query = {
      limit: 100
    };

    if (pins.length > 0) { // not the first time
      query.max = pins[pins.length - 1].pin_id;
    }

    const html = yield util.getHtml(url, query);
    const _pins = getPagePins(html);
    pins = pins.concat(_pins);

    i++;
  }

  return pins.map((pin, index) => {
    return {
      src: `http://${ imgHosts[pin.file.bucket] }/${ pin.file.key }`,
      ext: mime.extension(pin.file.type) || 'jpg'
    };
  });
});

const HuabanBoard = module.exports = function(url) {
  if (!(this instanceof HuabanBoard)) return new HuabanBoard(url);

  this.url = url;
  this.title = undefined;
  this.pins = undefined;
};

HuabanBoard.prototype.init = co.wrap(function*() {
  const html = yield util.getHtml(this.url);
  const board = getBoard(html);

  // title
  this.title = board.title;
  this._raw = board;

  const pins = yield getPins(this.url, board['pin_count']);
  return this.pins = pins;
});

HuabanBoard.prototype.downloadBoard = co.wrap(function*(concurrency, timeout, maxTimes) {
  const title = this.title;
  const dir = path.resolve(title);
  fs.ensureDirSync(dir);

  const numLength = String(this.pins.length).length;

  return yield Promise.map(this.pins, function(pin, index, length) {
    const num = _.padStart(String(index + 1), numLength, '0'); // 001
    const dest = path.join(dir, `${ num }.${ pin.ext }`);

    return util.tryDownload(pin.src, dest, timeout, maxTimes)
      .then(function() {
        console.log(`${ logSymbols.success } %s/%s 下载成功`, num, length);
      })
      .catch(function(e) {
        console.error(`${ logSymbols.error } %s/%s 下载失败`, num, length);
        // console.error(e.stack || e);
      });
  }, {
    concurrency: concurrency
  });
});