import Joi from 'joi';
import * as db from './db';
import bcrypt from 'bcrypt';
import debug from './debug';

let logger = debug.withTopic('simpledyno:model');

export class Model {
  constructor(options = {}) {
    if(db.local && (typeof(db.client) === "undefined" || typeof(db.doc) === "undefined"))
      throw new Error("Not connected to AWS, please use SimpleDyno.setConfig before creating an instance");
    if(typeof(options.hashKey) === "undefined")
      throw new Error("Please provide a hashKey field for the model");
    if(typeof(options.table) === "undefined")
      throw new Error("Please provide a table name that you want to create/use");

    this.encryptFields = [];
    this.serializers = options.serializers;
    this.hashKey = options.hashKey;
    this.rangeKey = options.rangeKey;
    this.table = options.table;

    if(options.schema) this.schema = this.defineSchema(options.schema);

    logger(`Model created for table: ${this.table}`);

    db.setTable(this.table, this.hashKey, this.rangeKey).then(function() {
      if(debug.onReady) debug.onReady();
      debug.isReady = true;
    });
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
    if(!options.skipValidation && this.schema) {
      let result = this.validate(item, this.schema);
      if(result.error) {
        return new Promise(function(resolve, reject) {
          reject(new Error(result.error));
        });
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

    return new Promise(function(resolve, reject) {
      db.doc.putItem(params, function(err, response) {
        if(err) {
          reject(new Error(err));
        } else {
          resolve(item);
        }
      });
    });
  }

  update(keyValue, attributes) {
    let key = {};
    key[this.hashKey] = keyValue;

    if(this.encryptFields) {
      for(let i of this.encryptFields) {
        if(attributes[i]) {
          let salt = bcrypt.genSaltSync(10);
          let hash = bcrypt.hashSync(attributes[i], salt);
          attributes[i] = hash;
        }
      }
    }

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

    return new Promise(function(resolve, reject) {
      db.doc.updateItem(params, function(err, response) {
        if(err) {
          reject(new Error(err));
        } else {
          resolve(response);
        }
      });
    });
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

    return new Promise( (resolve, reject) => {
      db.doc.scan(params, (err, response) => {
        if(err) {
          reject(new Error(err));
        } else {
          if(response.Count === 0) {
            reject(new Error(`${name} could not be found`));
          } else {
            resolve(response.Items);
          }
        }
      });
    });
  }

  query(indexName, query) {

    if(debug.local || process.env.NODE_ENV === 'test') {
      return this.find(query);
    }

    return new Promise( (resolve, reject) => {
      if (indexName === null)
        reject(new Error('Must provide an indexName'));

      // extract key/value pair from query
      let key   = Object.keys(query)[0];
      let value = query[key];

      // setup parameters to do query with
      let params = {
        TableName: this.table,
        IndexName: indexName,
        KeyConditionExpression: `${key}=:v_${key}`,
      };

      // setup the value to query with
      params['ExpressionAttributeValues'] = {};
      params['ExpressionAttributeValues'][`:v_${key}`] = value

      // perform the query
      db.doc.query(params, (err, response) => {
        if(err) {
          reject(new Error(err));
        } else {
          if(response.Count === 0) {
            reject(new Error(`${key} could not be found`));
          } else {
            resolve(response.Items);
          }
        }
      });
    });
  }

  get(key) {
    let params = {
      TableName: this.table,
      Key: {}
    };

    params.Key[this.hashKey] = key;

    return new Promise( (resolve, reject) => {
      db.doc.getItem(params, (err, response) => {
        if(err) {
          reject(new Error(err));
        } else if(Object.keys(response).length === 0) {
          reject(new Error("No result."));
        } else {
          resolve(response.Item);
        }
      });
    });
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
