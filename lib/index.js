'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Model = exports.doc = exports.client = exports.load = exports.local = exports.config = exports.version = undefined;

var _db = require('./db');

Object.defineProperty(exports, 'config', {
  enumerable: true,
  get: function get() {
    return _db.config;
  }
});
Object.defineProperty(exports, 'local', {
  enumerable: true,
  get: function get() {
    return _db.local;
  }
});
Object.defineProperty(exports, 'load', {
  enumerable: true,
  get: function get() {
    return _db.load;
  }
});
Object.defineProperty(exports, 'client', {
  enumerable: true,
  get: function get() {
    return _db.client;
  }
});
Object.defineProperty(exports, 'doc', {
  enumerable: true,
  get: function get() {
    return _db.doc;
  }
});

var _model = require('./model');

Object.defineProperty(exports, 'Model', {
  enumerable: true,
  get: function get() {
    return _model.Model;
  }
});

var _package = require('../package');

exports.version = _package.version;