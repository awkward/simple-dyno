'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isLocal = exports.doc = exports.client = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.config = config;
exports.local = local;
exports.load = load;

var _awsSdk = require('aws-sdk');

var AWS = _interopRequireWildcard(_awsSdk);

var _child_process = require('child_process');

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var localDynamo;

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html

var client = exports.client = void 0;
var doc = exports.doc = void 0;
var isLocal = exports.isLocal = void 0;

function config(options) {
  if (!isLocal) {
    options.httpOptions = {
      agent: new _https2.default.Agent({
        rejectUnauthorized: true,
        // keepAlive: true,
        ciphers: 'ALL',
        secureProtocol: 'TLSv1_method'
      })
    };
  }
  exports.client = client = new AWS.DynamoDB(options);
  exports.doc = doc = new AWS.DynamoDB.DocumentClient(_extends({}, options, { service: client }));
}

var awsRegion = process.env.AWS_REGION || 'eu-west-1';
config({ accessKeyId: '', secretAccessKey: '', region: awsRegion });

function local() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? { inMemory: true } : arguments[0];

  localDynamo = require('local-dynamo');
  exports.isLocal = isLocal = true;
  var dbDir = null;
  if (!options.inMemory) dbDir = './';
  var localDyno = localDynamo.launch(dbDir, 8000);
  config({ accessKeyId: 'akid', secretAccessKey: 'secret', endpoint: new AWS.Endpoint('http://localhost:8000'), region: 'eu-west-1' });
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