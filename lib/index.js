const path = require('path')
const fse = require('fs-extra')
const sanitizeFilename = require("sanitize-filename");
const _ = require('lodash')
const mime = require('mime')
const debug = require('debug')('huaban:index')
const logSymbols = require('log-symbols')
const pmap = require('promise.map')
const util = require('./util')

/**
 * image host
 */

const imgHosts = {
  hbimg: 'img.hb.aicdn.com',
  hbfile: 'hbfile.b0.upaiyun.com',
  hbimg2: 'hbimg2.b0.upaiyun.com',
}

/**
 * get board data
 */

const getBoard = function(html) {
  // debug('html in getBoard: %s', html);

  /* eslint quotes: 0 */
  const search = `app.page["board"] = {`
  const start = html.indexOf(search) + search.length - 1 // html[start] = '{'
  //const end = util.getRight(html, start) // html[end] = '}';
  const end = html.indexOf('};\n', start)
  const js = html.slice(start, end + 1)
  // debug('js in getBoard: %s', js);

  return JSON.parse(js)
}

/**
 * get pins on a page
 */

const getPagePins = function(html) {
  const board = getBoard(html)
  return board.pins
}

/**
 * get pins from url、total amount
 */

const getPins = async (url, total) => {
  let pins = []
  if (url.slice(-1) !== '/') url += '/'

  let i = 1
  total = Math.ceil(total / 100) // e.g 150 need 2 requests
  while (i <= total) {
    const query = {
      limit: 100,
    }

    if (pins.length > 0) {
      // not the first time
      query.max = pins[pins.length - 1].pin_id
    }

    const html = await util.getHtml(url, query)
    const _pins = getPagePins(html)
    pins = pins.concat(_pins)

    i++
  }

  return pins.map((pin, index) => {
    return {
      src: `http://${imgHosts[pin.file.bucket]}/${pin.file.key}`,
      ext: mime.getExtension(pin.file.type) || 'jpg',
    }
  })
}

module.exports = class HuabanBoard {
  constructor(url) {
    this.url = url
    this.title = undefined
    this.pins = undefined
  }

  async init() {
    const html = await util.getHtml(this.url)
    const board = getBoard(html)

    // title
    this.title = board.title
    this._raw = board
    
    this.id = board.board_id

    const pins = await getPins(this.url, board['pin_count'])
    return (this.pins = pins)
  }

  async downloadBoard(concurrency, timeout, maxTimes) {
    // dir
    const title = this.title
    const id = this.id
    const folderName = sanitizeFilename(`${id}-${title}`)
    const dir = path.resolve(folderName)
    fse.ensureDirSync(dir)

    // pad length
    const numLength = String(this.pins.length).length
    const length = this.pins.length

    return await pmap(
      this.pins,
      function(pin, index) {
        const num = _.padStart(String(index + 1), numLength, '0') // 001
        const dest = path.join(dir, `${num}.${pin.ext}`)

        return util
          .tryDownload(pin.src, dest, timeout, maxTimes)
          .then(function() {
            console.log(`${logSymbols.success} %s/%s 下载成功`, num, length)
          })
          .catch(function(e) {
            console.error(`${logSymbols.error} %s/%s 下载失败`, num, length)
            console.error(e.stack || e)
          })
      },
      concurrency
    )
  }
}
