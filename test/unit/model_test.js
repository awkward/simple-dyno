import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
let expect = chai.expect;

import sinon from 'sinon';
import * as SimpleDyno from '../../lib/index';
import * as db from '../../lib/db';
import Joi from 'joi';

import { execSync } from 'child_process';

describe('SimpleDyno.Model', function() {

  describe('#constructor()', function() {
    let localDB;

    before(function () {
      localDB = SimpleDyno.local();
    });

    after(function () {
      execSync(`kill -9 ${localDB.pid}`);
    });

    it('should throw an error when #config was not called', function() {
      expect(function() { new SimpleDyno.Model() }).to.throw();
    });

    it('should throw an error when there is no hashKey given', function() {
      expect(function() { new SimpleDyno.Model({schema: {}, table: ""}) }).to.throw();
    });

    it('should throw an error when there is no table given', function() {
      expect(function() { new SimpleDyno.Model({schema: {}, hashKey: ""}) }).to.throw();
    });
  });

  describe('Instance methods:', function () {
    let model, localDB;

    before(function * () {
      localDB = SimpleDyno.local();

      model = new SimpleDyno.Model({
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

      yield SimpleDyno.load(model);
    });

    after(function () {
      execSync(`kill -9 ${localDB.pid}`);
    });

    describe('#defineSchema()', function() {
      it('should set an encryptFields array', function() {
        expect(model.encryptFields.length).to.equal(1);
      });

      it('should set the schema for the model', function() {
        expect(model.schema).to.be.an('object');
      });
    });

    describe('#create()', function () {
      it('should reject when passing invalid parameters', function () {
        return expect(model.create({email: "test"})).to.be.rejected;
      });

      it('should accept invalid parameters when skipping validation', function () {
        return expect(model.create({email: "test"}, {skipValidation: true})).to.be.fulfilled;
      });

      it('should encrypt fields that need to be encrypted', function *() {
        let response = yield model.create({email: "test@test.com", password: "test1234"});
        expect(response.password).to.not.equal("test1234");
      });

      it('should call doc.put', function *() {
        let spy = sinon.spy(db.doc, "put");
        yield model.create({email: "test@test.com"});
        expect(spy.called).to.be.true;
        spy.restore();
      });
    });

    describe('#get()', function() {
      it('should call doc.get', function * () {
        let spy = sinon.spy(db.doc, "get");
        yield model.get("test@test.com");
        expect(spy.called).to.be.true;
        spy.restore();
      });

      it('should throw an error when there is no response', function * () {
        return expect(model.get("non-existent")).to.be.rejected;
      });

      it('should return an object when there is 1 result', function * () {
        let response = yield model.get("test@test.com");
        expect(response).to.be.an('object');
      });
    });

    describe('#serialize()', function() {
      it('should only return an email', function *() {
        let response = yield model.get("test@test.com");
        expect(model.serialize(response)).to.be.eql({email: "test@test.com"});
      });

      it('should return items according to format that has been given', function *() {
        let response = yield model.get("test@test.com");
        expect(model.serialize(response, {format: "scary"})).to.have.ownProperty(model.serializers.scary[0]);
        expect(model.serialize(response, {format: "scary"})).to.have.ownProperty(model.serializers.scary[1]);
      });
    });

    describe('#update()', function() {
      it('should reject when item does\'nt exist', function () {
        return expect(model.update("blabla", {email: "t3st@test.com"})).to.be.rejected;
      });

      it('should accept invalid parameters when skipping validation', function () {
        return expect(model.update("test", {password: "a"}, {skipValidation: true})).to.be.fulfilled;
      });

      it('should encrypt fields that need to be encrypted', function *() {
        yield model.update("test", {password: "test12345"});
        let response = yield model.get("test");
        expect(response.password).to.not.equal("test12345");
      });

      it('should call doc.put', function *() {
        let spy = sinon.spy(db.doc, "update");
        yield model.update("test", {password: "testtest"});
        expect(spy.called).to.be.true;
        spy.restore();
      });
    });

    describe('#destroy()', function() {
      it('should throw an error when it doesn\'t find a result', function *() {
        return expect(model.find({email: "testtest@test.com"})).to.be.rejected;
      });

      it('should call doc.delete', function *() {
        let spy = sinon.spy(db.doc, "delete");
        yield model.destroy("test");
        expect(spy.called).to.be.true;
        spy.restore();
      });
    });

    describe('#find()', function() {
      it('should throw an error when it doesn\'t find a result', function *() {
        return expect(model.find({email: "testtest@test.com"})).to.be.rejected;
      });

      it('should call doc.scan', function *() {
        let spy = sinon.spy(db.doc, "scan");
        yield model.find({email: "test@test.com"});
        expect(spy.called).to.be.true;
        spy.restore();
      });
    });

    describe('#query()', function() {
      it('should call find when running locally', function *() {
        let spy = sinon.spy(model, "find");
        yield model.query("email", {email: "test@test.com"});
        expect(spy.called).to.be.true;
        spy.restore();
      });
    });

    describe('#_attributesAndNamesForQuery()', function() {
      it('should return the right format', function() {
        let attrs = model._attributesAndNamesForQuery({"email": "test@test.com"});
        expect(attrs).to.eql({
          expression: '#email = :v_email',
          attributeNames: {'#email': 'email'},
          attributes: {':v_email': 'test@test.com'},
          keyAttr: 'email'
        });
      });
    });
  });

});