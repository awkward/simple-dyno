import * as localDynamo from 'local-dynamo';
import * as AWS from 'aws-sdk';
import { execSync } from 'child_process';

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html

export let client;
export let doc;

let localDyno;
let configParams = {};

export function setConfig(params) {
  params ? (configParams = params) : params = {};
  let options = {
    accessKeyId: (process.env.DYNO_AWS_KEY || params.DYNO_AWS_KEY),
    secretAccessKey: (process.env.DYNO_AWS_SECRET || params.DYNO_AWS_SECRET),
    region: (process.env.DYNO_AWS_REGION || params.DYNO_AWS_REGION)
  };

  let local = (process.env.DYNO_LOCAL === 'true' || params.DYNO_LOCAL)
  let inMemory = (process.env.DYNO_IN_MEMORY === 'true' || params.DYNO_IN_MEMORY)

  if(local) {
    try {
      if(localDyno.pid) execSync(`kill -9 ${localDyno.pid}`);
    } catch (e) {}

    let dbDir = null;
    if(!inMemory) dbDir = './';

    localDyno = localDynamo.launch(dbDir, 8000);
    options.endpoint = new AWS.Endpoint('http://localhost:8000');
  }

  client = new AWS.DynamoDB(options);
  doc = new AWS.DynamoDB.DocumentClient(options);
}

setConfig(configParams);

export function reset() {
  setConfig(configParams);
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
