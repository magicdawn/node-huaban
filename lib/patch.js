'use strict';

/**
 * module dependencies
 */
const Promise = require('bluebird');

/**
 * superagent.Request.prototype.endAsync
 */
const superagent = exports.superagent = require('superagent');
const Request = superagent.Request;
Request.prototype.endAsync = Promise.promisify(Request.prototype.end);