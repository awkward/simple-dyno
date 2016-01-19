(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.simpleDyno = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.config = config;
exports.local = local;
exports.load = load;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _localDynamo = require('local-dynamo');

var localDynamo = _interopRequireWildcard(_localDynamo);

var _awsSdk = require('aws-sdk');

var AWS = _interopRequireWildcard(_awsSdk);

var _child_process = require('child_process');

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html

var client = undefined;
exports.client = client;
var doc = undefined;
exports.doc = doc;
var isLocal = undefined;

exports.isLocal = isLocal;

function config(options) {
  exports.client = client = new AWS.DynamoDB(options);
  exports.doc = doc = new AWS.DynamoDB.DocumentClient(options);
}

function local() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? { inMemory: true } : arguments[0];

  exports.isLocal = isLocal = true;
  var dbDir = null;
  if (!options.inMemory) dbDir = './';
  var localDyno = localDynamo.launch(dbDir, 8000);
  config({ endpoint: new AWS.Endpoint('http://localhost:8000'), region: "eu-west-1" });
  return localDyno;
}

function load(models) {
  if (client === 'undefined' || doc === 'undefined') config();

  var createPromise = function createPromise(model) {
    return new Promise(function (resolve, reject) {
      // Check if the table already exists
      client.listTables({}, function (error, data) {
        if (error) return reject(error);
        if (data && data.TableNames.length) {
          // Found the table
          var result = data.TableNames.find(function (item) {
            item === model.table;
          });
          if (result) return resolve();
        }

        var AttributeDefinitions = [{ AttributeName: model.hashKey, AttributeType: 'S' }];
        var KeySchema = [{ AttributeName: model.hashKey, KeyType: 'HASH' }];

        if (model.rangeKey) {
          AttributeDefinitions.push({ AttributeName: model.rangeKey, AttributeType: 'S' });
          KeySchema.push({ AttributeName: model.rangeKey, KeyType: 'RANGE' });
        }

        // Format of the table
        var table = {
          AttributeDefinitions: AttributeDefinitions,
          KeySchema: KeySchema,
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 1
          },
          TableName: model.table
        };

        // Create the table
        client.createTable(table, function (err, response) {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  };

  if (models.length) return Promise.all(models.map(function (model) {
    return createPromise(model);
  }));
  return createPromise(models);
}

},{"aws-sdk":undefined,"child_process":undefined,"local-dynamo":undefined}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _package = require('../package');

exports.version = _package.version;

var _db = require('./db');

Object.defineProperty(exports, 'reset', {
  enumerable: true,
  get: function get() {
    return _db.reset;
  }
});
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

var _model = require('./model');

Object.defineProperty(exports, 'Model', {
  enumerable: true,
  get: function get() {
    return _model.Model;
  }
});

},{"../package":4,"./db":1,"./model":3}],3:[function(require,module,exports){
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

var Model = (function () {
  function Model() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Model);

    if (typeof options.hashKey === "undefined" || options.hashKey === "") throw new Error("Please provide a hashKey field for the model");
    if (typeof options.table === "undefined" || options.table === "") throw new Error("Please provide a table name that you want to create/use");

    this.db = db;
    this.encryptFields = [];
    this.serializers = options.serializers;
    this.hashKey = options.hashKey;
    this.rangeKey = options.rangeKey;
    this.table = options.table;

    if (options.schema) this.schema = this.defineSchema(options.schema);
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

      if (serializer) {
        var _iteratorNormalCompletion;

        var _didIteratorError;

        var _iteratorError;

        var _iterator, _step;

        (function () {
          // Get property from an object and set to new object
          var getProperty = function getProperty(_x5, _x6, _x7) {
            var _again = true;

            _function: while (_again) {
              var newObj = _x5,
                  obj = _x6,
                  keys = _x7;
              _again = false;

              var key = keys[0];
              if (!obj) return;
              keys = keys.filter(function (item) {
                return item !== key;
              });
              if (!newObj[key]) newObj[key] = {};
              if (keys.length) {
                _x5 = newObj[key];
                _x6 = obj[key];
                _x7 = keys;
                _again = true;
                key = undefined;
                continue _function;
              }
              newObj[key] = obj[key];
            }
          };

          // Recursively get all properties (using a dot notation too, e.g.: profile.firstname)
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;

          try {
            for (_iterator = serializer[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var key = _step.value;

              var keys = key.split(".");
              getProperty(newObject, object, keys);
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
        })();
      } else {
        for (var key in object) {
          newObject[key] = object[key];
        }
      }

      return newObject;
    }
  }, {
    key: 'defineSchema',
    value: function defineSchema(schema) {
      var joiSchema = {};

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = Object.keys(schema)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var key = _step2.value;

          var item = schema[key];
          if (item.isJoi) {
            joiSchema[key] = item;
          } else {
            if (item.format && item.format.isJoi) joiSchema[key] = item.format;
            if (item.encrypt) this.encryptFields.push(key);
          }
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
          _this.validate(item, _this.schema)['catch'](reject);
        }

        // encrypt fields that need to be encrypted
        if (_this.encryptFields) {
          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = undefined;

          try {
            for (var _iterator3 = _this.encryptFields[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              var i = _step3.value;

              if (item[i]) {
                var salt = _bcrypt2['default'].genSaltSync(10);
                var hash = _bcrypt2['default'].hashSync(item[i], salt);
                item[i] = hash;
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

        item.createdAt = Date.now();

        var params = {
          TableName: _this.table,
          Item: item
        };

        _this.db.doc.put(params, function (err, response) {
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
      var _this2 = this;

      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      return new Promise(function (resolve, reject) {
        // validation
        if (!options.skipValidation && _this2.schema) {
          _this2.validate(attributes, _this2.schema)['catch'](reject);
        }

        // encrypt fields that need to be encrypted
        if (_this2.encryptFields) {
          var _iteratorNormalCompletion4 = true;
          var _didIteratorError4 = false;
          var _iteratorError4 = undefined;

          try {
            for (var _iterator4 = _this2.encryptFields[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
              var i = _step4.value;

              if (attributes[i]) {
                var salt = _bcrypt2['default'].genSaltSync(10);
                var hash = _bcrypt2['default'].hashSync(attributes[i], salt);
                attributes[i] = hash;
              }
            }
          } catch (err) {
            _didIteratorError4 = true;
            _iteratorError4 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                _iterator4['return']();
              }
            } finally {
              if (_didIteratorError4) {
                throw _iteratorError4;
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
          TableName: _this2.table,
          Key: _this2._keyObjectForValues(keyValues),
          AttributeUpdates: attributes
        };

        _this2.db.doc.update(params, function (err, response) {
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
      var _this3 = this;

      var params = {
        TableName: this.table,
        Key: this._keyObjectForValues(keyValues)
      };

      return new Promise(function (resolve, reject) {
        _this3.db.doc['delete'](params, function (err, response) {
          if (err) {
            reject(new Error(err));
          } else {
            resolve(response);
          }
        });
      });
    }
  }, {
    key: '_attributesAndNamesForQuery',
    value: function _attributesAndNamesForQuery(query) {
      var attributes = {},
          attributeNames = {},
          expression = "",
          keyAttr = "";

      for (var key in query) {
        keyAttr = key;

        var attrName = '#' + key;
        attributeNames[attrName] = key;

        if (expression === "") {
          expression = attrName + ' = :v_' + key;
        } else {
          expression += ' AND ' + attrName + ' = :v_' + key;
        }

        attributes[':v_' + key] = query[key];
      }

      return { expression: expression, attributeNames: attributeNames, attributes: attributes, keyAttr: keyAttr };
    }
  }, {
    key: 'find',
    value: function find(query) {
      var _this4 = this;

      var _attributesAndNamesForQuery2 = this._attributesAndNamesForQuery(query);

      var expression = _attributesAndNamesForQuery2.expression;
      var attributeNames = _attributesAndNamesForQuery2.attributeNames;
      var attributes = _attributesAndNamesForQuery2.attributes;
      var keyAttr = _attributesAndNamesForQuery2.keyAttr;

      var params = {
        TableName: this.table,
        FilterExpression: expression,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributes,
        Select: "ALL_ATTRIBUTES"
      };

      return new Promise(function (resolve, reject) {
        _this4.db.doc.scan(params, function (err, response) {
          if (err) {
            reject(new Error(err));
          } else {
            if (response.Count === 0) {
              reject(new Error(keyAttr + ' could not be found'));
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
      var _this5 = this;

      if (this.db.isLocal) {
        return this.find(_query);
      }

      return new Promise(function (resolve, reject) {
        if (indexName === null) reject(new Error('Must provide an indexName'));

        var _attributesAndNamesForQuery3 = _this5._attributesAndNamesForQuery(_query);

        var expression = _attributesAndNamesForQuery3.expression;
        var attributeNames = _attributesAndNamesForQuery3.attributeNames;
        var attributes = _attributesAndNamesForQuery3.attributes;
        var keyAttr = _attributesAndNamesForQuery3.keyAttr;

        // setup parameters to do query with
        var params = {
          TableName: _this5.table,
          IndexName: indexName,
          KeyConditionExpression: expression,
          ExpressionAttributeNames: attributeNames,
          ExpressionAttributeValues: attributes
        };

        // perform the query
        _this5.db.doc.query(params, function (err, response) {
          if (err) {
            reject(new Error(err));
          } else {
            if (response.Count === 0) {
              reject(new Error(keyAttr + ' could not be found'));
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
      var _this6 = this;

      var params = {
        TableName: this.table,
        Key: this._keyObjectForValues(keyValues)
      };

      return new Promise(function (resolve, reject) {
        _this6.db.doc.get(params, function (err, response) {
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
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        _joi2['default'].validate(value, _this7.schema, function (err, result) {
          if (err) return reject(err);else resolve(result.value);
        });
      });
    }
  }]);

  return Model;
})();

exports.Model = Model;

},{"./db":1,"bcrypt":undefined,"joi":undefined}],4:[function(require,module,exports){
module.exports={
  "name": "simple-dyno",
  "version": "0.0.4",
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
    "joi": "^6.9.1",
    "local-dynamo": "^0.1.1"
  },
  "devDependencies": {
    "babel": "^5.8.34",
    "babelify": "^6.4.0",
    "browserify": "^11.1.0",
    "chai": "^3.0.0",
    "chai-as-promised": "^5.2.0",
    "co-mocha": "^1.1.2",
    "mocha": "^2.2.5",
    "sinon": "^1.15.4"
  }
}

},{}]},{},[2])(2)
});