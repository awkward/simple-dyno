# simple-dyno

Todo:
- Nice validation error messages (Joi)
- Think about returning itself and keeping a state for chaining purposes

Example:
```
// Import deps
import SimpleDyno from 'simple-dyno';
import Joi from 'joi';

// Add your own methods
class UserModel extends SimpleDyno {
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

var userObj = yield User.create({email: "test@simpledyno.com", access_token: generateToken(), password: "******"})
return User.serialize(userObj, {format: 'scary'});
```