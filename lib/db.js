import * as localDynamo from 'local-dynamo';
import * as AWS from 'aws-sdk';
import debug from './debug';
import { execSync } from 'child_process';

let logger = debug.withTopic('simpledyno:db');

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html

export let client;
export let doc;

export function setConfig(options = {accessKeyId: "", secretAccessKey: "", region: "eu-west-1"}) {
  if(debug.local || process.env.NODE_ENV === 'test') {
    try {
      let stdout = execSync("killall java");
      logger(`killall java: ${stdout.split('\n').join('')}`);
    } catch (e) {}

    localDynamo.launch(null, 4567);
    options.endpoint = new AWS.Endpoint('http://localhost:4567');
    logger("Started local DynamoDB on http://localhost:4567");
  } else if(process.env.NODE_ENV === 'travis') {
    options.endpoint = new AWS.Endpoint('http://localhost:8000');
  }

  client = new AWS.DynamoDB(options);
  doc = new AWS.DynamoDB.DocumentClient(options);
}

if(!debug.local || process.env.NODE_ENV !== 'test') {
  setConfig();
}

export function reset() {
  setConfig();
  let promises = Object.assign([], tables);
  tables = [];

  promises = promises.map(item => setTable(item.name, item.hashKey, item.rangeKey));
  return Promise.all(promises);
}

let tables = [];

export function setTable(name, hashKey, rangeKey) {
  tables.push({name, hashKey, rangeKey});
  return new Promise(function(resolve, reject) {
    // Check if the table already exists
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
  });
}
