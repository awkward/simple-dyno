import { expect } from 'chai';
import sinon from 'sinon';
import * as SimpleDyno from '../../lib/index';
import * as db from '../../lib/db';
import Joi from 'joi';

require('dotenv').load();

describe('SimpleDyno.Model', function() {

  describe('#constructor()', function() {
    it('should throw an error when #setConfig was not called', function() {
      expect(function() { new SimpleDyno.Model() }).to.throw();
    });

    it('should throw an error when there is no hashKey given', function() {
      SimpleDyno.setConfig({"accessKeyId": "AWS_ACCESS_KEY", "secretAccessKey": "AWS_SECRET", "region": "AWS_REGION"});
      expect(function() { new SimpleDyno.Model({schema: {}, table: ""}) }).to.throw();
    });

    it('should throw an error when there is no table given', function() {
      SimpleDyno.setConfig({"accessKeyId": "AWS_ACCESS_KEY", "secretAccessKey": "AWS_SECRET", "region": "AWS_REGION"});
      expect(function() { new SimpleDyno.Model({schema: {}, hashKey: ""}) }).to.throw();
    });

    it('should call setTable', function() {
      SimpleDyno.setConfig({"accessKeyId": "AWS_ACCESS_KEY", "secretAccessKey": "AWS_SECRET", "region": "AWS_REGION"});
      let spy = sinon.spy(db, "setTable");
      new SimpleDyno.Model({table: "", schema: {}, hashKey: ""});
      expect(spy.called).to.be.true;
      spy.restore();
    });
  });

  describe('Instance methods:', function () {
    let model;
    beforeEach(function() {
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
    });

    describe('#defineSchema()', function() {
      it('should set an encryptFields array', function() {
        expect(model.encryptFields.length).to.equal(1);
      });

      it('should set the schema for the model', function() {
        expect(model.schema).to.be.an('object');
      });
    });

    describe('#create()', function() {
      it('should call doc.put', function() {
        let spy = sinon.spy(db.doc, "put");
        model.create({email: "test@test.com"});
        console.log(spy)
        expect(spy.called).to.be.true;
        spy.restore();
      });
    });

    describe('#get()', function() {
      it('should do something', function() {

      });
    });

    describe('#update()', function() {
      it('should do something', function() {

      });
    });

    describe('#find()', function() {
      it('should do something', function() {

      });
    });

    describe('#_attributesAndNamesForQuery()', function() {
      it('should return the right format', function() {

      });
    });
  });

});