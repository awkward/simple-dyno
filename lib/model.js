'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Model = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _db = require('./db');

var db = _interopRequireWildcard(_db);

var _bcrypt = require('bcrypt');

var _bcrypt2 = _interopRequireDefault(_bcrypt);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Model = function () {
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
        (function () {
          // Get property from an object and set to new object
          var getProperty = function getProperty(newObj, obj, keys) {
            var key = keys[0];
            if (!obj) return;
            keys = keys.filter(function (item) {
              return item !== key;
            });
            if (!newObj[key]) newObj[key] = {};
            if (keys.length) return getProperty(newObj[key], obj[key], keys);
            newObj[key] = obj[key];
          };

          // Recursively get all properties (using a dot notation too, e.g.: profile.firstname)
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = serializer[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var key = _step.value;

              var keys = key.split(".");
              getProperty(newObject, object, keys);
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
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
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return _joi2.default.object().keys(joiSchema);
    }
  }, {
    key: 'checkEncryptedField',
    value: function checkEncryptedField(value, hash) {
      return _bcrypt2.default.compareSync(value, hash);
    }
  }, {
    key: 'create',
    value: function create(item) {
      var _this = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return new Promise(function (resolve, reject) {

        // actual create logic
        var doCreate = function doCreate() {
          // encrypt fields that need to be encrypted
          if (_this.encryptFields) {
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
              for (var _iterator3 = _this.encryptFields[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var i = _step3.value;

                if (item[i]) {
                  var salt = _bcrypt2.default.genSaltSync(10);
                  var hash = _bcrypt2.default.hashSync(item[i], salt);
                  item[i] = hash;
                }
              }
            } catch (err) {
              _didIteratorError3 = true;
              _iteratorError3 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                  _iterator3.return();
                }
              } finally {
                if (_didIteratorError3) {
                  throw _iteratorError3;
                }
              }
            }
          }

          // add extra fields
          item.createdAt = Date.now();

          // setup DynamoDB Parameters
          var params = {
            TableName: _this.table,
            Item: item
          };

          // insert the document into Dynamo
          _this.db.doc.put(params, function (err, response) {
            if (err) {
              reject(new Error(err));
            } else {
              resolve(item);
            }
          });
        };

        // Schema validation
        if (!options.skipValidation && _this.schema) {
          _this.validate(item, _this.schema).then(doCreate.bind(_this)).catch(reject);
        } else {
          doCreate.call(_this);
        }
      });
    }
  }, {
    key: 'unset',
    value: function unset(keyValues, key) {
      var _this2 = this;

      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      return new Promise(function (resolve, reject) {
        var attributes = {};

        attributes[key] = { Action: "DELETE" };
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
    key: 'update',
    value: function update(keyValues, attributes) {
      var _this3 = this;

      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      return new Promise(function (resolve, reject) {
        // do the actual updating
        var doUpdate = function doUpdate() {
          // encrypt fields that need to be encrypted
          if (_this3.encryptFields) {
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
              for (var _iterator4 = _this3.encryptFields[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                var i = _step4.value;

                if (attributes[i]) {
                  var salt = _bcrypt2.default.genSaltSync(10);
                  var hash = _bcrypt2.default.hashSync(attributes[i], salt);
                  attributes[i] = hash;
                }
              }
            } catch (err) {
              _didIteratorError4 = true;
              _iteratorError4 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                  _iterator4.return();
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
            TableName: _this3.table,
            Key: _this3._keyObjectForValues(keyValues),
            AttributeUpdates: attributes
          };

          _this3.db.doc.update(params, function (err, response) {
            if (err) {
              reject(new Error(err));
            } else {
              resolve(response);
            }
          });
        };

        // validation
        if (!options.skipValidation && _this3.schema) {
          _this3.validate(attributes, _this3.schema).then(doUpdate.bind(_this3)).catch(reject);
        } else {
          doUpdate.call(_this3);
        }
      });
    }
  }, {
    key: 'destroy',
    value: function destroy(keyValues) {
      var _this4 = this;

      var params = {
        TableName: this.table,
        Key: this._keyObjectForValues(keyValues)
      };

      return new Promise(function (resolve, reject) {
        _this4.db.doc.delete(params, function (err, response) {
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
    value: function _attributesAndNamesForQuery(query, operators) {
      var attributes = {},
          attributeNames = {},
          expression = "",
          keyAttr = "";

      for (var key in query) {
        keyAttr = key;

        var attrName = '#' + key;
        attributeNames[attrName] = key;

        var operator = '=';
        if (operators && operators[key]) operator = operators[key];

        if (expression === "") {
          expression = attrName + ' = :v_' + key;
        } else {
          expression += ' AND ' + attrName + ' ' + operator + ' :v_' + key;
        }

        attributes[':v_' + key] = query[key];
      }

      return { expression: expression, attributeNames: attributeNames, attributes: attributes, keyAttr: keyAttr };
    }
  }, {
    key: 'find',
    value: function find(indexName, query) {
      var _this5 = this;

      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var _attributesAndNamesFo = this._attributesAndNamesForQuery(query, options.operators);

      var expression = _attributesAndNamesFo.expression;
      var attributeNames = _attributesAndNamesFo.attributeNames;
      var attributes = _attributesAndNamesFo.attributes;
      var keyAttr = _attributesAndNamesFo.keyAttr;


      if (options.operators) delete options.operators;

      var params = _extends({
        TableName: this.table,
        FilterExpression: expression,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributes,
        Select: "ALL_ATTRIBUTES"
      }, options);

      if (!this.db.isLocal) {
        params.IndexName = indexName;
      }

      return new Promise(function (resolve, reject) {
        if (indexName === null) return reject(new Error('Must provide an indexName'));

        _this5.db.doc.scan(params, function (err, response) {
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
      var _this6 = this;

      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      if (this.db.isLocal) {
        return this.find(indexName, _query);
      }

      return new Promise(function (resolve, reject) {
        if (indexName === null) return reject(new Error('Must provide an indexName'));

        var _attributesAndNamesFo2 = _this6._attributesAndNamesForQuery(_query, options.operators);

        var expression = _attributesAndNamesFo2.expression;
        var attributeNames = _attributesAndNamesFo2.attributeNames;
        var attributes = _attributesAndNamesFo2.attributes;
        var keyAttr = _attributesAndNamesFo2.keyAttr;


        if (options.operators) delete options.operators;

        // setup parameters to do query with
        var params = _extends({
          TableName: _this6.table,
          IndexName: indexName,
          KeyConditionExpression: expression,
          ExpressionAttributeNames: attributeNames,
          ExpressionAttributeValues: attributes
        }, options);

        // perform the query
        _this6.db.doc.query(params, function (err, response) {
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
      var _this7 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var params = {
        TableName: this.table,
        Key: this._keyObjectForValues(keyValues),
        ConsistentRead: options.ConsistentRead || false
      };

      return new Promise(function (resolve, reject) {
        _this7.db.doc.get(params, function (err, response) {
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
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        _joi2.default.validate(value, _this8.schema, function (err, result) {
          if (err) return reject(err);else resolve(result.value);
        });
      });
    }
  }]);

  return Model;
}();

exports.Model = Model;