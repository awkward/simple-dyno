'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.setTable = setTable;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _localDynamo = require('local-dynamo');

var localDynamo = _interopRequireWildcard(_localDynamo);

var _awsSdk = require('aws-sdk');

var AWS = _interopRequireWildcard(_awsSdk);

var _dynamodbDoc = require('dynamodb-doc');

var DOC = _interopRequireWildcard(_dynamodbDoc);

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html
// https://github.com/awslabs/dynamodb-document-js-sdk

// var databaseConfig = {
//   "accessKeyId": config.AWS_ACCESS_KEY,
//   "secretAccessKey": config.AWS_SECRET,
//   "region": config.AWS_REGION
// };

// if(config.DEBUG) {
//   localDynamo.launch({port: 4567});
//   databaseConfig.endpoint = new AWS.Endpoint('http://localhost:4567');
// }

var client = new AWS.DynamoDB(databaseConfig);
exports.client = client;
var doc = new DOC.DynamoDB(client);

exports.doc = doc;

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