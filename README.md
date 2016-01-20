# simple-dyno

[![Build Status](https://travis-ci.org/awkward/simple-dyno.svg?branch=master)](https://travis-ci.org/awkward/simple-dyno)

Easy to use, minimalistic wrapper for [AWS DynamoDB](https://aws.amazon.com/dynamodb/)

## Installation
```bash
$ npm install simple-dyno
```

## Features

* Easy way to create a model, keeping your code consistent and saving it to DynamoDB
* Serializers to format your (json) response
* Validation based on [Joi](https://github.com/hapijs/joi)
* Encryption using [bcrypt](https://github.com/ncb000gt/node.bcrypt.js) for your passwords
* Local DynamoDB for testing purposes

## Methods

* `Model.create(attributes, options)` to create a new entry, and options can include `{skipValidation: true}`
* `Model.get(keyValues)` to get an entry or multiple entries
* `Model.update(keyValues, attributes, options)` to update an entry, and options can include `{skipValidation: true}`
* `Model.destroy(keyValues)` to delete an entry
* `Model.find(attributes)` to perform a scan operation (not recommended)
* `Model.query(indexName, attributes)` to query using a secondary index
* `Model.serialize(response, options)` to serialize the response attributes

* `SimpleDyno.local(options)` to run a local DynamoDB (which runs on Java), by default runs in memory but you can also store on disk using `{inMemory: false}` as options.
* `SimpleDyno.config(options)` which you can pass the following options `{accessKeyId: ', secretAccessKey: ', region: '}`

## Example (in this case the config is set by default by AWS and assumes tables are already created)
```javascript
// Import deps
import { Model } from 'simple-dyno';
import Joi from 'joi';

// Add your own methods
class UserModel extends Model {
  myAwesomeMethod(obj) {
    return obj.firstName+obj.lastName;
  }
}

// Create model instance
var User = new UserModel({
  table: 'users',
  hashKey: 'email',
  serializers: {
    default: ['email'],
    scary: ['access_token', 'password']
  },
  schema: {
    email: Joi.string().email(),
    access_token: Joi.string(),
    password: {
      format: Joi.string().regex(/[a-zA-Z0-9]{3,30}/),
      encrypt: true
    }
  }
});

var userObj = yield User.create({email: 'test@simpledyno.com', access_token: 'aW12k3KDASsd012Ms1Mf29Mc7', password: '******'})
return User.serialize(userObj, {format: 'scary'});
```

## Example of running the local environment
```javascript
// Import deps
import * as SimpleDyno from 'simple-dyno';

// Start a local DynamoDB
yield SimpleDyno.local();

// Create accociated tables for the following model(s)
SimpleDyno.load(User);
```

## Todo

* Migrations
* Better docs (explain how AWS works)

## How to contribute

Please create a pull request, make sure to include and update the tests and that they're working. And don't forget to build the minified version (with babel) with `make simple-dyno.js`.

## Running tests

Use `make test` to do a test run using Mocha.

## Legal stuff (MIT License)

Copyright (c) 2016 Awkward.

Distributed under MIT license.