const chai = require('chai');
const mock = require('mock-require');

const expect = chai.expect;

describe('pathUtils', function() {
  describe('firstLevelFolderName', function() {
    let pathUtils;

    before(function() {
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() {}
      });

      pathUtils = require('../../site-builder/lib/pathUtils');
    });

    it('gets string before first slash', function() {
      expect(pathUtils.firstLevelFolderName('folderfoo/filefoo')).to.equal('folderfoo');
    });

    it('gets string before first of many slashes', function() {
      expect(pathUtils.firstLevelFolderName('folder1/folder2/folder3/filefoo')).to.equal('folder1');
    });

    it('gets nothing if nothing before first slash', function() {
      expect(pathUtils.firstLevelFolderName('/somepath')).to.equal('');
    });

    it('gets nothing if passed nothing', function() {
      expect(pathUtils.firstLevelFolderName('')).to.equal('');
    });

    it('leaves string un-modified if no slash', function() {
      expect(pathUtils.firstLevelFolderName('somepath')).to.equal('somepath');
    });

    it('raises error if passed null', function() {
      expect(function() { pathUtils.firstLevelFolderName(null); }).to.throw(TypeError);
    });

    after(function() {
      mock.stop('aws-sdk');
    });
  });
});
