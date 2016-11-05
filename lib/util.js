'use strict'

const path = require('path')
const co = require('co')
const request = require('superagent')
const fs = require('fs-extra-promise')
const pretry = require('promise.retry')

/**
 * get html for url
 */
exports.getHtml = function(url, query) {
  const req = request.get(url)
  if (query) req.query(query)
  return req.then(res => res.text)
}

/**
 * match right
 */
exports.getRight = function(input, fi) {
  const pairs = {
    '(': ')',
    '{': '}',
    '[': ']'
  }

  const left = input[fi]
  const right = pairs[left]

  if (!right) {
    return -1
  }

  let count = 1 // input[fi] = left

  for (let i = fi + 1, len = input.length; i < len; i++) {
    const cur = input[i]
    if (cur === right) {
      count--
      if (count === 0) {
        return i
      }
    } else if (cur === left) {
      count++
    }
  }

  return -1 // not found
}

/**
 * 下载一个文件
 */
exports.download = (src, dest, onCancel) => new Promise((resolve, reject) => {
  // ensure
  dest = path.resolve(dest)
  fs.ensureDirSync(path.dirname(dest))
  const s = fs.createWriteStream(dest)

  // construct
  const req = request
    .get(src)
    .on('error', reject)

  // pipe
  req
    .pipe(s)
    .on('error', reject)
    .on('finish', function() {
      this.close(() => {
        resolve()
      })
    })

  onCancel && onCancel(() => {
    req.abort()
    s.close()
  })
})

/**
 * tryDownload with timeout & times
 */

exports.tryDownload = co.wrap(function*(src, dest, timeout, times) {
  const fn = pretry(exports.download, {
    times,
    timeout,
    onerror: (err, index) => {
      // console.error('obj');
    }
  })

  yield fn(src, dest)
})