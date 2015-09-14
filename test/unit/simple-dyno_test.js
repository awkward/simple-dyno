import { assert } from 'chai';
import sinon from 'sinon';
import debug from '../../lib/debug';
import SimpleDyno from '../../lib/simple-dyno';

// debug.enabled = true;

suite('SimpleDyno', function() {
  suite('#constructor()', function() {

    test('should throw an error when #setConfig was not called', function() {
      assert.throw(function() { new SimpleDyno() });
    });

    test('should throw an error when there is no schema given', function() {
      SimpleDyno.setConfig({"accessKeyId": "AWS_ACCESS_KEY", "secretAccessKey": "AWS_SECRET", "region": "AWS_REGION"});
      assert.throw(function() { new SimpleDyno({hashKey: "", table: ""}) });
    });

    test('should throw an error when there is no hashKey given', function() {
      SimpleDyno.setConfig({"accessKeyId": "AWS_ACCESS_KEY", "secretAccessKey": "AWS_SECRET", "region": "AWS_REGION"});
      assert.throw(function() { new SimpleDyno({schema: {}, table: ""}) });
    });

    test('should throw an error when there is no table given', function() {
      SimpleDyno.setConfig({"accessKeyId": "AWS_ACCESS_KEY", "secretAccessKey": "AWS_SECRET", "region": "AWS_REGION"});
      assert.throw(function() { new SimpleDyno({schema: {}, hashKey: ""}) });
    });

    test('should call setTable', function() {
      SimpleDyno.setConfig({"accessKeyId": "AWS_ACCESS_KEY", "secretAccessKey": "AWS_SECRET", "region": "AWS_REGION"});
      SimpleDyno.setTable = sinon.spy();
      new SimpleDyno({table: "", schema: {}, hashKey: ""});
    });
  });

  suite('#create()', function() {
    test('should do something', function() {

    });
  });

  suite('#get()', function() {
    test('should do something', function() {

    });
  });

  suite('#update()', function() {
    test('should do something', function() {

    });
  });

  suite('#find()', function() {
    test('should do something', function() {

    });
  });
});