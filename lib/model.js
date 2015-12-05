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

    this.db = db;
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

  _keyObjectForValues(values) {
    let key = {};
    if(values instanceof Array) {
      key[this.hashKey] = values[0];
      if(values[1] && this.rangeKey) key[this.rangeKey] = values[1];
    } else {
      key[this.hashKey] = values;
    }
    return key;
  }

  serialize(object, options = {}) {
    let format = 'default';
    if(options.format) {
      format = options.format;
    }

    let serializer = this.serializers[format];
    let newObject = {};

    if(serializer) {
      // Get property from an object and set to new object
      let getProperty = function(newObj, obj, keys) {
        let key = keys[0];
        if(!obj) return;
        keys = keys.filter(item => item !== key);
        if(!newObj[key]) newObj[key] = {};
        if(keys.length) return getProperty(newObj[key], obj[key], keys);
        newObj[key] = obj[key];
      }

      // Recursively get all properties (using a dot notation too, e.g.: profile.firstname)
      for(let key of serializer) {
        let keys = key.split(".");
        getProperty(newObject, object, keys);
      }
    } else {
      for(let key in object) {
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
    return new Promise( (resolve, reject) => {
      // validation
      if(!options.skipValidation && this.schema) {
        this.validate(item, this.schema).catch(reject);
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

      db.doc.put(params, function(err, response) {
        if(err) {
          reject(new Error(err));
        } else {
          resolve(item);
        }
      });
    });
  }

  update(keyValues, attributes, options = {}) {
    return new Promise( (resolve, reject) => {
      // validation
      if(!options.skipValidation && this.schema) {
        this.validate(attributes, this.schema).catch(reject);
      }

      // encrypt fields that need to be encrypted
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
        Key: this._keyObjectForValues(keyValues),
        AttributeUpdates: attributes
      };

      db.doc.update(params, function(err, response) {
        if(err) {
          reject(new Error(err));
        } else {
          resolve(response);
        }
      });
    });
  }

  destroy(keyValues) {
    let params = {
      TableName: this.table,
      Key: this._keyObjectForValues(keyValues)
    }

    return new Promise(function(resolve, reject) {
      db.doc.delete(params, function(err, response) {
        if(err) {
          reject(new Error(err));
        } else {
          resolve(response);
        }
      });
    });
  }


  _attributesAndNamesForQuery(query) {
    let attributes = {},
        attributeNames = {},
        expression = "",
        keyAttr = "";

    for(let key in query) {
      keyAttr = key;

      let attrName = `#${key}`;
      attributeNames[attrName] = key;

      if(expression === "") {
        expression = `${attrName} = :v_${key}`;
      } else {
        expression += ` AND ${attrName} = :v_${key}`;
      }

      attributes[`:v_${key}`] = query[key]
    }

    return {expression, attributeNames, attributes, keyAttr};
  }

  find(query) {
    let {expression, attributeNames, attributes, keyAttr} = this._attributesAndNamesForQuery(query);

    let params = {
      TableName: this.table,
      FilterExpression: expression,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributes,
      Select: "ALL_ATTRIBUTES"
    };

    return new Promise( (resolve, reject) => {
      db.doc.scan(params, (err, response) => {
        if(err) {
          reject(new Error(err));
        } else {
          if(response.Count === 0) {
            reject(new Error(`${keyAttr} could not be found`));
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
      if (indexName === null) reject(new Error('Must provide an indexName'));

      let {expression, attributeNames, attributes, keyAttr} = this._attributesAndNamesForQuery(query);

      // setup parameters to do query with
      let params = {
        TableName: this.table,
        IndexName: indexName,
        KeyConditionExpression: expression,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributes
      };

      // perform the query
      db.doc.query(params, (err, response) => {
        if(err) {
          reject(new Error(err));
        } else {
          if(response.Count === 0) {
            reject(new Error(`${keyAttr} could not be found`));
          } else {
            resolve(response.Items);
          }
        }
      });
    });
  }

  get(keyValues) {
    let params = {
      TableName: this.table,
      Key: this._keyObjectForValues(keyValues)
    };

    return new Promise( (resolve, reject) => {
      db.doc.get(params, (err, response) => {
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
    return new Promise( (resolve, reject) => {
      Joi.validate(value, this.schema, (err, result) => {
        if(err) return reject(err);
        else    resolve(result.value);
      });
    });
  }
}
