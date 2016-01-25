import * as AWS from 'aws-sdk';
import { execSync } from 'child_process';

var localDynamo;

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html

export let client;
export let doc;
export let isLocal;

export function config(options) {
  client = new AWS.DynamoDB(options);
  doc = new AWS.DynamoDB.DocumentClient(options);
}

config({accessKeyId: '', secretAccessKey: '', region: 'eu-west-1'});

export function local(options = {inMemory: true}) {
  localDyno = require('local-dynamo');
  isLocal = true;
  let dbDir = null;
  if(!options.inMemory) dbDir = './';
  let localDyno = localDynamo.launch(dbDir, 8000);
  config({endpoint: new AWS.Endpoint('http://localhost:8000'), region: 'eu-west-1'})
  return localDyno;
}

export function load(models) {
  if(client === 'undefined' || doc === 'undefined') config();

  let createPromise = function (model) {
    return new Promise(function(resolve, reject) {
      // Check if the table already exists
      client.listTables({}, function(error, data) {
        if(error) return reject(error);
        if(data && data.TableNames.length) {
          // Found the table
          let result = data.TableNames.find(function(item) { item === model.table });
          if(result) return resolve();
        }

        let AttributeDefinitions = [{AttributeName: model.hashKey, AttributeType: 'S'}];
        let KeySchema = [{AttributeName: model.hashKey, KeyType: 'HASH'}];

        if(model.rangeKey) {
          AttributeDefinitions.push({AttributeName: model.rangeKey, AttributeType: 'S'});
          KeySchema.push({AttributeName: model.rangeKey, KeyType: 'RANGE'});
        }

        // Format of the table
        let table = {
          AttributeDefinitions: AttributeDefinitions,
          KeySchema: KeySchema,
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 1
          },
          TableName: model.table
        };

        // Create the table
        client.createTable(table, function(err, response) {
          if(err) return reject(err);
          resolve();
        });
      });
    });
  }

  if(models.length) return Promise.all(models.map(model => createPromise(model)));
  return createPromise(models);
}
