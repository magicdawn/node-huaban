# node-huaban
花瓣(http://huaban.com) 画板下载器

[![npm version](https://img.shields.io/npm/v/node-huaban.svg)](#)
[![node version](https://img.shields.io/node/v/node-huaban.svg)](#)
[![license](https://img.shields.io/npm/l/node-huaban.svg)](#)


## 安装

```
$ npm i node-huaban -g
```

## 使用

```
$ huaban
  huaban board downloader v0.0.1

    Usage:
      huaban [options] <board_url>

    Options:
      -h,--help         输出此帮助信息
      -c,--concurrency  同时最大下载数量,默认10
      -t, --timeout     超时, 单位分, 默认1分钟 = 60 * 1000毫秒
      --max-times       重试次数, 默认5

    Example:
      huaban http://huaban.com/boards/17324249/ -c 10
```

## API

```js
const HuabanBoard = require('node-huaban');
```

### constructor

```js
const board = new HuabanBoard(url); // url 是画板地址
```

### init

```js
board.init(); // return a Promise, when all pins & title are ready

// normally, use with co
yield board.init();
```

运行 `init` 之后, board会包含以下字段:
- board.title board的名称
- board.pins 图片, 包含地址src & 文件类型 ext

### downloadBoard
下载所有图片

```js
yield board.downloadBoard(concurrency, timeout, maxTimes);
```

## License

the MIT License http://magicdawn.mit-license.org