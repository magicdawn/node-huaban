'use strict';

const kit = require('needle-kit');
const request = kit.request;
const fs = kit.fs;
const path = require('path');
const co = require('co');

/**
 * get html for url
 */
exports.getHtml = function(url, query) {
  const req = request.get(url);
  if (query) req.query(query);

  return req
    .endAsync()
    .then(function(res) {
      return res.text;
    });
};

/**
 * match right
 */
exports.getRight = function(input, fi) {
  const pairs = {
    '(': ')',
    '{': '}',
    '[': ']'
  };

  const left = input[fi];
  const right = pairs[left];

  if (!right) {
    return -1;
  }

  let count = 1; // input[fi] = left

  for (let i = fi + 1, len = input.length; i < len; i++) {
    const cur = input[i];
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
 * 下载一个文件
 */
exports.download = (src, dest, timeout) => new Promise((resolve, reject) => {
  // ensure
  dest = path.resolve(dest);
  fs.ensureDirSync(path.dirname(dest));
  const s = fs.createWriteStream(dest);

  // construct
  const req = request
    .get(src)
    .on('error', reject);

  // timeout in ms
  if (timeout) req.timeout(timeout);

  // pipe
  req
    .pipe(s)
    .on('error', reject)
    .on('finish', function() {
      this.close(() => {
        resolve();
      });
    });
});

/**
 * predicate e is a SuperagentTimeoutError ?
 *
 * https: //github.com/visionmedia/superagent/blob/v1.7.2/lib/node/index.js#L892-L893
 */

const isSuperagentTimeoutError = e => e.code === 'ECONNABORTED' && e.timeout > 0;

/**
 * tryDownload with timeout & maxTimes
 */

exports.tryDownload = co.wrap(function*(src, dest, timeout, maxTimes) {
  const maxTimesBak = maxTimes;
  while (maxTimes > 0) {
    try {
      yield exports.download(src, dest, timeout);
      return;
    } catch (e) {
      // timeout了
      if (isSuperagentTimeoutError(e)) {
        maxTimes--;
        continue;
      }

      // 其他原因
      throw e;
    }
  }

  const message = `tryDownload failed, timeout = ${ timeout }, maxTimes = ${ maxTimesBak }`;
  const e = new Error(message);
  e.timeout = timeout;
  e.maxTimes = maxTimesBak;
  e.src = src;
  e.dest = dest;
  throw new Error(e);
});