# Changelog

## 2018-04-07 v1.4.1

- 合并 PR #3, 解决画板名称特殊字符问题

## 2018-02-22 v1.4.0

- 合并 PR #2, 解决字符串中包含 `{` 或 `}` 的问题
- 使用 prettier 代替 js-beautify
- 使用 fs-extra@5 自带 promise 支持, 移除 promise.ify
- 使用 mime@2
- 使用 async/await, 移除 co, 要求 node >= 7.6.0

## 2016-11-06 v1.3.0
- 重构代码, 去掉 fs-extra-promise, 使用 promise.ify & fs-extra
- 重构代码, 去掉 superagent, 使用 request & request-promise

## 2016-08-30 v1.2.0
- 升级依赖
- 重构代码
- 去掉 `needle-kit`

## 2016-03-09 v1.1.0
- 移除 bluebird 依赖, 使用ES6 原生 Promise

## Unknown date v1.0.0
- 初始版本