'use strict';

const request = require('./patch').superagent;
const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');

/**
 * get html for url
 */
exports.getHtmlAsync = function(url, query) {
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

exports.downloadAsync = function(src, dest) {
  return new Promise(function(resolve, reject) {
    dest = path.resolve(dest);
    dest = fs.createOutputStream(dest);
    request
      .get(src)
      .on('error', reject)
      .pipe(dest)
      .on('error', reject)
      .on('finish', function() {
        this.close(function() { // close filestream
          resolve();
        });
      });
  });
};