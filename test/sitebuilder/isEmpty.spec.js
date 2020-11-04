const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');

const expect = chai.expect;

describe('siteBuilder isEmpty', function() {
  let siteBuilder;
  let isEmpty;

  before(function() {
    mock('aws-sdk', {
      CloudFront: function() {},
      S3: function() {}
    });

    siteBuilder = rewire('../../site-builder/index');

    isEmpty = siteBuilder.__get__('isEmpty');
  });

  it('returns true if object is empty', function() {
    expect(isEmpty({})).to.be.true;
  });

  it('returns false if object is not empty', function() {
    expect(isEmpty({foo: 'hoo'})).to.be.false;
  });

  it('returns true if hasOwnProperty is hacked up', function() {
    expect(isEmpty({
      hasOwnProperty: function() {
        return false;
      },
      bar: 'Here be dragons'
    })).to.be.true;
  });

  it('returns true if passed null', function() {
    expect(isEmpty(null)).to.be.true;
  });

  after(function() {
    mock.stop('aws-sdk');
  });
});
