import * as localDynamo from 'local-dynamo';
import * as AWS from 'aws-sdk';
import { execSync } from 'child_process';

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html

export let client;
export let doc;

function setConfig() {
  let options = {accessKeyId: process.env.DYNO_AWS_KEY, secretAccessKey: process.env.DYNO_AWS_SECRET, region: process.env.DYNO_AWS_REGION};
  let local = (process.env.DYNO_LOCAL === 'true')
  let inMemory = (process.env.DYNO_IN_MEMORY === 'true')

  if(local) {
    try {
      execSync("killall java"); // Derp! Don't have any other java processes running on your machine
    } catch (e) {}

    let dbDir = null;
    if(!inMemory) dbDir = './';

    localDynamo.launch(dbDir, 8000);
    options.endpoint = new AWS.Endpoint('http://localhost:8000');
  }

  client = new AWS.DynamoDB(options);
  doc = new AWS.DynamoDB.DocumentClient(options);
}

setConfig();

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
