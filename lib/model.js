import Joi from 'joi';
import * as db from './db';
import bcrypt from 'bcryptjs';
import debug from './debug';

let logger = debug.withTopic('simpledyno:model');

export class Model {
  constructor(options = {}) {
    if(typeof(db.client) === "undefined" || typeof(db.doc) === "undefined")
      throw new Error("Not connected to AWS, please use SimpleDyno.setConfig before creating an instance");
    if(typeof(options.hashKey) === "undefined")
      throw new Error("Please provide a hashKey field for the model");
    if(typeof(options.table) === "undefined")
      throw new Error("Please provide a table name that you want to create/use");
    if(typeof(options.schema) === "undefined")
      throw new Error("Please provide a schema for the model using Joi");

    this.encryptFields = [];
    this.serializers = options.serializers;
    this.hashKey = options.hashKey;
    this.rangeKey = options.rangeKey;
    this.table = options.table;

    this.schema = this.defineSchema(options.schema);

    logger(`Model created for table: ${this.table}`);

    // TODO: fire a `ready` event whenever this promise resolves, to know when this instance can be used
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
      if(typeof(serializer) === "undefined" || serializer.includes(key)) {
        newObject[key] = object[key];
      }
    }

    return newObject;
  }

  defineSchema(schema) {
    let joiSchema = {};

    for(let key of Object.keys(schema)) {
      let item = schema[key];
      if(item.isJoi) {
        joiSchema[key] = item;
      } else {

        if(item.format && item.format.isJoi) joiSchema[key] = item.format;
        if(item.encrypt) this.encryptFields.push(key);
      }
    }

    return Joi.object().keys(joiSchema);
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
    if(this.encryptFields) {
      for(let i of this.encryptFields) {
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

    return (callback) => {
      db.doc.scan(params, (err, response) => {
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
      });
    };
  }

  get(key) {
    let params = {
      TableName: this.table,
      Key: key
    };

    // TODO: use serializers to e.g. FILTER OUT PASSWORD!!
    return (callback) => {
      db.doc.getItem(params, (err, response) => {
        if(err) {
          callback(null, {error: err});
        } else {
          callback(null, response.Item);
        }
      });
    };
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