const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');

const expect = chai.expect;

describe('siteBuilder stripPrefix', function() {
  let siteBuilder;
  let stripPrefix;

  before(function() {
    mock('aws-sdk', {
      CloudFront: function() {},
      S3: function() {}
    });

    siteBuilder = rewire('../../site-builder/index');

    stripPrefix = siteBuilder.__get__('stripPrefix');
  });

  it('removes pics/original/ if present at start of string', function() {
    expect(stripPrefix({Key: 'pics/original/bla'})).to.equal('bla');
  });

  it('removes pics/original/ if present at end of string', function() {
    expect(stripPrefix({Key: 'bla/pics/original/'})).to.equal('bla/');
  });

  it('removes pics/original/ if present in middle of string', function() {
    expect(stripPrefix({Key: 'bla/pics/original/bla'})).to.equal('bla/bla');
  });

  it('removes only first instance of pics/original/ from string', function() {
    expect(stripPrefix({Key: 'hoo/pics/original/haa/pics/original/bla'}))
      .to.equal('hoo/haa/pics/original/bla');
  });

  it('leaves string un-modified if pics/original/ not present', function() {
    expect(stripPrefix({Key: 'hoohaa'})).to.equal('hoohaa');
  });

  it('raises error if passed null', function() {
    expect(function() { stripPrefix(null); }).to.throw(TypeError);
  });

  it('raises error if missing Key', function() {
    expect(function() { stripPrefix({}); }).to.throw(TypeError);
  });

  it('raises error if Key is null', function() {
    expect(function() { stripPrefix({Key: null}); }).to.throw(TypeError);
  });

  after(function() {
    mock.stop('aws-sdk');
  });
});
