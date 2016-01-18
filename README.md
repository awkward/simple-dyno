# simple-dyno

Easy, minimalist, ORM for [AWS DynamoDB](https://aws.amazon.com/dynamodb/)

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

## Example
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
  table: "users",
  hashKey: "email",
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

var userObj = yield User.create({email: "test@simpledyno.com", access_token: "aW12k3KDASsd012Ms1Mf29Mc7", password: "******"})
return User.serialize(userObj, {format: 'scary'});
```