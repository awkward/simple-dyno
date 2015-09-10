import Joi from 'joi';
import * as db from './db';
import bcrypt from 'bcrypt';

export class SimpleDyno {
  constructor(options) {
    this.schema = this.defineSchema(options.schema);
    this.serializers = options.serializers;
    this.hashKey = options.hashKey;
    this.rangeKey = options.rangeKey;
    this.table = options.table;
    db.setTable(this.table, this.hashKey, this.rangeKey);
  }

  serialize(object, options = {}) {
    let format = 'default';
    if(options.format) {
      format = options.format;
    }

    let serializer = this.serializers[format];

    let newObject = {};
    for(let key in object) {
      if(serializer.includes(key)) {
        newObject[key] = object[key];
      }
    }

    return newObject;
  }

  defineSchema(schema) {
    return Joi.object().keys(schema);
  }

  checkEncryptedField(value, hash) {
    return bcrypt.compareSync(value, hash);
  }

  create(item, options = {}) {
    // validation
    if(!options.skipValidation) {
      let result = this.validate(item, this.schema);
      if(result.error) {
        return function (callback) {
          // TODO: needs custom error messaging!!
          callback(null, {error: result.error});
        }
      }
    }

    // encrypt fields that need to be encrypted
    if(options.encryptFields) {
      for(let i of options.encryptFields) {
        let salt = bcrypt.genSaltSync(10);
        let hash = bcrypt.hashSync(item[i], salt);
        item[i] = hash;
      }
    }

    item.createdAt = Date.now();

    let params = {
      TableName: this.table,
      Item: item
    };

    return function (callback) {
      db.doc.putItem(params, function(err, response) {
        if(err) {
          callback(null, {error: err});
        } else {
          callback(null, item);
        }
      });
    }
  }

  update(keyValue, attributes) {
    let key = {};
    key[this.hashKey] = keyValue;

    for(let key in attributes) {
      attributes[key] = {
        Action: "PUT",
        Value: attributes[key]
      };
    }

    attributes.updatedAt = {Action: "PUT", Value: Date.now()};

    let params = {
      TableName: this.table,
      Key: key,
      AttributeUpdates: attributes
    };

    return function (callback) {
      db.doc.updateItem(params, function(err, response) {
        if(err) {
          callback(null, {error: err});
        } else {
          callback(null, response);
        }
      });
    }
  }

  destroy(key) {

  }

  find(query) {
    let filter = [];
    let name = "";

    for(let key in query) {
      name = key;
      filter.push(db.doc.Condition(key, "EQ", query[key]));
    }

    let params = {
      TableName: this.table,
      ScanFilter: filter,
      Select: "ALL_ATTRIBUTES"
    };

    return function(callback) {
      db.doc.scan(params, function(err, response) {
        if(err) {
          callback(null, {error: err});
        } else {
          switch(response.Count) {
            case 0:
              callback(null, {error: {message: `${name} could not be found`}});
              break;
            case 1:
              callback(null, response.Items[0]);
              break;
            default:
              callback(null, response.Items);
          }
        }
      }.bind(this));
    }.bind(this);
  }

  get(key) {
    let params = {
      TableName: this.table,
      Key: key
    };

    // TODO: use serializers to e.g. FILTER OUT PASSWORD!!
    return function(callback) {
      db.doc.getItem(params, function(err, response) {
        if(err) {
          callback(null, {error: err});
        } else {
          callback(null, response.Item);
        }
      }.bind(this));
    }.bind(this);
  }

  validate(value) {
    let result = Joi.validate(value, this.schema);
    if(result.error) {
      return {error: result.error};
    } else if(result.value) {
      return result.value;
    }
  }
}