(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.simpleDyno = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.setConfig = setConfig;
exports.setTable = setTable;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _localDynamo = require('local-dynamo');

var localDynamo = _interopRequireWildcard(_localDynamo);

var _awsSdk = require('aws-sdk');

var AWS = _interopRequireWildcard(_awsSdk);

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

var _child_process = require('child_process');

var logger = _debug2['default'].withTopic('simpledyno:db');

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html

var client = undefined;
exports.client = client;
var doc = undefined;

exports.doc = doc;

function setConfig() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? { accessKeyId: "", secretAccessKey: "", region: "eu-west-1" } : arguments[0];

  if (_debug2['default'].local || process.env.NODE_ENV === 'test') {
    try {
      var stdout = (0, _child_process.execSync)("killall java");
      logger('killall java: ' + stdout.split('\n').join(''));
    } catch (e) {}

    localDynamo.launch(null, 4567);
    options.endpoint = new AWS.Endpoint('http://localhost:4567');
    logger("Started local DynamoDB on http://localhost:4567");
  }

  exports.client = client = new AWS.DynamoDB(options);
  exports.doc = doc = new AWS.DynamoDB.DocumentClient(options);
}

if (!_debug2['default'].local || process.env.NODE_ENV !== 'test') {
  setConfig();
}

function setTable(name, hashKey, rangeKey) {
  return new Promise(function (resolve, reject) {
    // Check if the table already exists
    // client.deleteTable({TableName: name}, function() {
    client.listTables({}, function (error, data) {
      if (error) return reject(error);
      if (data && data.TableNames.length) {
        // Found the table
        var result = data.TableNames.find(function (item) {
          item === name;
        });
        if (result) return resolve();
      }

      var AttributeDefinitions = [{ AttributeName: hashKey, AttributeType: 'S' }];
      var KeySchema = [{ AttributeName: hashKey, KeyType: 'HASH' }];

      if (rangeKey) {
        AttributeDefinitions.push({ AttributeName: rangeKey, AttributeType: 'S' });
        KeySchema.push({ AttributeName: rangeKey, KeyType: 'RANGE' });
      }

      // Format of the table
      var table = {
        AttributeDefinitions: AttributeDefinitions,
        KeySchema: KeySchema,
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 5
        },
        TableName: name
      };

      // Create the table
      client.createTable(table, function (err, response) {
        if (err) return reject(err);
        resolve();
      });
    });
    // });
  });
}

},{"./debug":2,"aws-sdk":undefined,"child_process":undefined,"local-dynamo":undefined}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Debug = (function () {
  function Debug() {
    _classCallCheck(this, Debug);

    this.enabled = false;
    this.local = false;
  }

  _createClass(Debug, [{
    key: "withTopic",
    value: function withTopic(topic) {
      var _this = this;

      return function (message) {
        if (_this.enabled) {
          console.log("[" + topic + "] " + message);
        }
      };
    }
  }]);

  return Debug;
})();

exports.Debug = Debug;

var debug = new Debug();
exports["default"] = debug;

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

var _package = require('../package');

exports.debug = _debug2['default'];
exports.version = _package.version;

var _db = require('./db');

Object.defineProperty(exports, 'setConfig', {
  enumerable: true,
  get: function get() {
    return _db.setConfig;
  }
});

var _model = require('./model');

Object.defineProperty(exports, 'Model', {
  enumerable: true,
  get: function get() {
    return _model.Model;
  }
});

},{"../package":5,"./db":1,"./debug":2,"./model":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _db = require('./db');

var db = _interopRequireWildcard(_db);

var _bcrypt = require('bcrypt');

var _bcrypt2 = _interopRequireDefault(_bcrypt);

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

var logger = _debug2['default'].withTopic('simpledyno:model');

var Model = (function () {
  function Model() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Model);

    if (db.local && (typeof db.client === "undefined" || typeof db.doc === "undefined")) throw new Error("Not connected to AWS, please use SimpleDyno.setConfig before creating an instance");
    if (typeof options.hashKey === "undefined") throw new Error("Please provide a hashKey field for the model");
    if (typeof options.table === "undefined") throw new Error("Please provide a table name that you want to create/use");

    this.db = db;
    this.encryptFields = [];
    this.serializers = options.serializers;
    this.hashKey = options.hashKey;
    this.rangeKey = options.rangeKey;
    this.table = options.table;

    if (options.schema) this.schema = this.defineSchema(options.schema);

    logger('Model created for table: ' + this.table);

    db.setTable(this.table, this.hashKey, this.rangeKey).then(function () {
      if (_debug2['default'].onReady) _debug2['default'].onReady();
      _debug2['default'].isReady = true;
    });
  }

  _createClass(Model, [{
    key: '_keyObjectForValues',
    value: function _keyObjectForValues(values) {
      var key = {};
      if (values instanceof Array) {
        key[this.hashKey] = values[0];
        if (values[1] && this.rangeKey) key[this.rangeKey] = values[1];
      } else {
        key[this.hashKey] = values;
      }
      return key;
    }
  }, {
    key: 'serialize',
    value: function serialize(object) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var format = 'default';
      if (options.format) {
        format = options.format;
      }

      var serializer = this.serializers[format];

      var newObject = {};
      for (var key in object) {
        if (typeof serializer === "undefined" || serializer.includes(key)) {
          newObject[key] = object[key];
        }
      }

      return newObject;
    }
  }, {
    key: 'defineSchema',
    value: function defineSchema(schema) {
      var joiSchema = {};

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(schema)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          var item = schema[key];
          if (item.isJoi) {
            joiSchema[key] = item;
          } else {
            if (item.format && item.format.isJoi) joiSchema[key] = item.format;
            if (item.encrypt) this.encryptFields.push(key);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator['return']) {
            _iterator['return']();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return _joi2['default'].object().keys(joiSchema);
    }
  }, {
    key: 'checkEncryptedField',
    value: function checkEncryptedField(value, hash) {
      return _bcrypt2['default'].compareSync(value, hash);
    }
  }, {
    key: 'create',
    value: function create(item) {
      var _this = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return new Promise(function (resolve, reject) {
        // validation
        if (!options.skipValidation && _this.schema) {
          _this.validate(item, _this.schema)['catch'](function (err) {
            reject(err);
          });
        }

        // encrypt fields that need to be encrypted
        if (_this.encryptFields) {
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = _this.encryptFields[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var i = _step2.value;

              var salt = _bcrypt2['default'].genSaltSync(10);
              var hash = _bcrypt2['default'].hashSync(item[i], salt);
              item[i] = hash;
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                _iterator2['return']();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }
        }

        item.createdAt = Date.now();

        var params = {
          TableName: _this.table,
          Item: item
        };

        db.doc.put(params, function (err, response) {
          if (err) {
            reject(new Error(err));
          } else {
            resolve(item);
          }
        });
      });
    }
  }, {
    key: 'update',
    value: function update(keyValues, attributes) {
      if (this.encryptFields) {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = this.encryptFields[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var i = _step3.value;

            if (attributes[i]) {
              var salt = _bcrypt2['default'].genSaltSync(10);
              var hash = _bcrypt2['default'].hashSync(attributes[i], salt);
              attributes[i] = hash;
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3['return']) {
              _iterator3['return']();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
      }

      for (var key in attributes) {
        attributes[key] = {
          Action: "PUT",
          Value: attributes[key]
        };
      }

      attributes.updatedAt = { Action: "PUT", Value: Date.now() };

      var params = {
        TableName: this.table,
        Key: this._keyObjectForValues(keyValues),
        AttributeUpdates: attributes
      };

      return new Promise(function (resolve, reject) {
        db.doc.update(params, function (err, response) {
          if (err) {
            reject(new Error(err));
          } else {
            resolve(response);
          }
        });
      });
    }
  }, {
    key: 'destroy',
    value: function destroy(keyValues) {
      var params = {
        TableName: this.table,
        Key: this._keyObjectForValues(keyValues)
      };

      return new Promise(function (resolve, reject) {
        db.doc['delete'](params, function (err, response) {
          if (err) {
            reject(new Error(err));
          } else {
            resolve(response);
          }
        });
      });
    }
  }, {
    key: 'find',
    value: function find(query) {
      var filter = "";
      var attributes = {};
      var attributeNames = {};
      var name = "";

      for (var key in query) {
        name = key;

        var attrName = '#' + key;
        attributeNames[attrName] = key;

        if (filter === "") {
          filter = attrName + ' = :v_' + key;
        } else {
          filter += ' AND ' + attrName + ' = :v_' + key;
        }

        attributes[':v_' + key] = query[key];
      }

      var params = {
        TableName: this.table,
        FilterExpression: filter,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributes,
        Select: "ALL_ATTRIBUTES"
      };

      return new Promise(function (resolve, reject) {
        db.doc.scan(params, function (err, response) {
          if (err) {
            reject(new Error(err));
          } else {
            if (response.Count === 0) {
              reject(new Error(name + ' could not be found'));
            } else {
              resolve(response.Items);
            }
          }
        });
      });
    }
  }, {
    key: 'query',
    value: function query(indexName, _query) {
      var _this2 = this;

      if (_debug2['default'].local || process.env.NODE_ENV === 'test') {
        return this.find(_query);
      }

      return new Promise(function (resolve, reject) {
        if (indexName === null) reject(new Error('Must provide an indexName'));

        // extract key/value pair from query
        var key = Object.keys(_query)[0];
        var value = _query[key];

        // setup parameters to do query with
        var params = {
          TableName: _this2.table,
          IndexName: indexName,
          KeyConditionExpression: key + '=:v_' + key
        };

        // setup the value to query with
        params['ExpressionAttributeValues'] = {};
        params['ExpressionAttributeValues'][':v_' + key] = value;

        // perform the query
        db.doc.query(params, function (err, response) {
          if (err) {
            reject(new Error(err));
          } else {
            if (response.Count === 0) {
              reject(new Error(key + ' could not be found'));
            } else {
              resolve(response.Items);
            }
          }
        });
      });
    }
  }, {
    key: 'get',
    value: function get(keyValues) {
      var params = {
        TableName: this.table,
        Key: this._keyObjectForValues(keyValues)
      };

      return new Promise(function (resolve, reject) {
        db.doc.get(params, function (err, response) {
          if (err) {
            reject(new Error(err));
          } else if (Object.keys(response).length === 0) {
            reject(new Error("No result."));
          } else {
            resolve(response.Item);
          }
        });
      });
    }
  }, {
    key: 'validate',
    value: function validate(value) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        _joi2['default'].validate(value, _this3.schema, function (err, result) {
          if (err) return reject(err);else resolve(result.value);
        });
      });
    }
  }]);

  return Model;
})();

exports.Model = Model;

},{"./db":1,"./debug":2,"bcrypt":undefined,"joi":undefined}],5:[function(require,module,exports){
module.exports={
  "name": "simple-dyno",
  "version": "0.0.1",
  "description": "Wrapper around AWS DynamoDB SDK to make things easier",
  "main": "simple-dyno.js",
  "directories": {
    "test": "test"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/awkward/simple-dyno.git"
  },
  "scripts": {
    "test": "make test"
  },
  "author": "David van Leeuwen",
  "license": "MIT",
  "dependencies": {
    "aws-sdk": "^2.2.10",
    "babel": "^5.8.23",
    "bcrypt": "^0.8.5",
    "joi": "^6.5.0",
    "local-dynamo": "^0.1.1"
  },
  "devDependencies": {
    "babelify": "^6.4.0",
    "browserify": "^11.1.0",
    "chai": "^3.0.0",
    "mocha": "^2.2.5",
    "nock": "^2.7.0",
    "sinon": "^1.15.4"
  }
}

},{}]},{},[3])(3)
});