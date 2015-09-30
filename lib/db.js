import * as localDynamo from 'local-dynamo';
import * as AWS from 'aws-sdk';
import * as DOC from 'dynamodb-doc';
import debug from './debug';
import { exec } from 'child_process';

let logger = debug.withTopic('simpledyno:db');

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html
// https://github.com/awslabs/dynamodb-document-js-sdk

export let client;
export let doc;

export function setConfig(options = {}) {

  // options = {
  //   "accessKeyId": AWS_ACCESS_KEY,
  //   "secretAccessKey": AWS_SECRET,
  //   "region": AWS_REGION
  // };

  if(debug.local) {
    exec("sudo killall java", { cwd: __dirname }, function (err, stdout, stderr) {
      localDynamo.launch(null, 4567);
      options.endpoint = new AWS.Endpoint('http://localhost:4567');
      logger("Started local DynamoDB on http://localhost:4567");
    });
  }

  client = new AWS.DynamoDB(options);
  doc = new DOC.DynamoDB(client);
}

if(!debug.local) {
  setConfig();
}

export function setTable(name, hashKey, rangeKey) {
  return new Promise(function(resolve, reject) {
    // Check if the table already exists
    // client.deleteTable({TableName: name}, function() {
      client.listTables({}, function(error, data) {
        if(error) return reject(error);
        if(data && data.TableNames.length) {
          // Found the table
          let result = data.TableNames.find(function(item) { item === name });
          if(result) return resolve();
        }

        let AttributeDefinitions = [{AttributeName: hashKey, AttributeType: 'S'}];
        let KeySchema = [{AttributeName: hashKey, KeyType: 'HASH'}];

        if(rangeKey) {
          AttributeDefinitions.push({AttributeName: rangeKey, AttributeType: 'S'});
          KeySchema.push({AttributeName: rangeKey, KeyType: 'RANGE'});
        }

        // Format of the table
        let table = {
          AttributeDefinitions: AttributeDefinitions,
          KeySchema: KeySchema,
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 5
          },
          TableName: name
        };

        // Create the table
        client.createTable(table, function(err, response) {
          if(err) return reject(err);
          resolve();
        });
      });
    // });
  });
}