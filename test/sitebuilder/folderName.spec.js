const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');

const expect = chai.expect;

describe('siteBuilder folderName', function() {
  let siteBuilder;
  let folderName;

  before(function() {
    mock('aws-sdk', {
      CloudFront: function() {},
      S3: function() {}
    });

    siteBuilder = rewire('../../site-builder/index');

    folderName = siteBuilder.__get__('folderName');
  });

  it('gets string before first slash', function() {
    expect(folderName('folderfoo/filefoo')).to.equal('folderfoo');
  });

  it('gets string before first of many slashes', function() {
    expect(folderName('folder1/folder2/folder3/filefoo')).to.equal('folder1');
  });

  it('gets nothing if nothing before first slash', function() {
    expect(folderName('/somepath')).to.equal('');
  });

  it('gets nothing if passed nothing', function() {
    expect(folderName('')).to.equal('');
  });

  it('leaves string un-modified if no slash', function() {
    expect(folderName('somepath')).to.equal('somepath');
  });

  it('raises error if passed null', function() {
    expect(function() { folderName(null); }).to.throw(TypeError);
  });

  after(function() {
    mock.stop('aws-sdk');
  });
});
