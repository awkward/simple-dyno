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

var SimpleDyno = (function () {
  function SimpleDyno(options) {
    _classCallCheck(this, SimpleDyno);

    this.schema = this.defineSchema(options.schema);
    this.serializers = options.serializers;
    this.hashKey = options.hashKey;
    this.rangeKey = options.rangeKey;
    this.table = options.table;
    db.setTable(this.table, this.hashKey, this.rangeKey);
  }

  _createClass(SimpleDyno, [{
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
        if (serializer.includes(key)) {
          newObject[key] = object[key];
        }
      }

      return newObject;
    }
  }, {
    key: 'defineSchema',
    value: function defineSchema(schema) {
      return _joi2['default'].object().keys(schema);
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

      // validation
      if (!options.skipValidation) {
        var _ret = (function () {
          var result = _this.validate(item, _this.schema);
          if (result.error) {
            return {
              v: function (callback) {
                // TODO: needs custom error messaging!!
                callback(null, { error: result.error });
              }
            };
          }
        })();

        if (typeof _ret === 'object') return _ret.v;
      }

      // encrypt fields that need to be encrypted
      if (options.encryptFields) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = options.encryptFields[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var i = _step.value;

            var salt = _bcrypt2['default'].genSaltSync(10);
            var hash = _bcrypt2['default'].hashSync(item[i], salt);
            item[i] = hash;
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
      }

      item.createdAt = Date.now();

      var params = {
        TableName: this.table,
        Item: item
      };

      return function (callback) {
        db.doc.putItem(params, function (err, response) {
          if (err) {
            callback(null, { error: err });
          } else {
            callback(null, item);
          }
        });
      };
    }
  }, {
    key: 'update',
    value: function update(keyValue, attributes) {
      var key = {};
      key[this.hashKey] = keyValue;

      for (var _key in attributes) {
        attributes[_key] = {
          Action: "PUT",
          Value: attributes[_key]
        };
      }

      attributes.updatedAt = { Action: "PUT", Value: Date.now() };

      var params = {
        TableName: this.table,
        Key: key,
        AttributeUpdates: attributes
      };

      return function (callback) {
        db.doc.updateItem(params, function (err, response) {
          if (err) {
            callback(null, { error: err });
          } else {
            callback(null, response);
          }
        });
      };
    }
  }, {
    key: 'destroy',
    value: function destroy(key) {}
  }, {
    key: 'find',
    value: function find(query) {
      var filter = [];
      var name = "";

      for (var key in query) {
        name = key;
        filter.push(db.doc.Condition(key, "EQ", query[key]));
      }

      var params = {
        TableName: this.table,
        ScanFilter: filter,
        Select: "ALL_ATTRIBUTES"
      };

      return (function (callback) {
        db.doc.scan(params, (function (err, response) {
          if (err) {
            callback(null, { error: err });
          } else {
            switch (response.Count) {
              case 0:
                callback(null, { error: { message: name + ' could not be found' } });
                break;
              case 1:
                callback(null, response.Items[0]);
                break;
              default:
                callback(null, response.Items);
            }
          }
        }).bind(this));
      }).bind(this);
    }
  }, {
    key: 'get',
    value: function get(key) {
      var params = {
        TableName: this.table,
        Key: key
      };

      // TODO: use serializers to e.g. FILTER OUT PASSWORD!!
      return (function (callback) {
        db.doc.getItem(params, (function (err, response) {
          if (err) {
            callback(null, { error: err });
          } else {
            callback(null, response.Item);
          }
        }).bind(this));
      }).bind(this);
    }
  }, {
    key: 'validate',
    value: function validate(value) {
      var result = _joi2['default'].validate(value, this.schema);
      if (result.error) {
        return { error: result.error };
      } else if (result.value) {
        return result.value;
      }
    }
  }]);

  return SimpleDyno;
})();

exports.SimpleDyno = SimpleDyno;