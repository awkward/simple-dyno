# simple-dyno

Example:
```
// Import deps
import SimpleDyno from 'simple-dyno';

// Create model instance
var User = new SimpleDyno({
  table: "users",
  hashKey: "email",
  serializers: {
    default: ['email']
  },
  schema: {
    email: Joi.string().email(),
    access_token: Joi.string(),
    password: Joi.string().regex(/[a-zA-Z0-9]{3,30}/)
  }
});

// Uses the serializer and returns {email: "test@simpledyno.com"}
var user = yield User.create({email: "test@simpledyno.com", access_token: generateToken(), password: "******"})
```