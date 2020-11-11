const chai = require('chai');
const mock = require('mock-require');

const miscUtils = require('../../site-builder/lib/miscUtils');

const expect = chai.expect;

describe('miscUtils', function() {
  describe('isEmpty', function() {
    before(function() {
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() {}
      });
    });

    it('returns true if object is empty', function() {
      expect(miscUtils.isEmpty({})).to.be.true;
    });

    it('returns false if object is not empty', function() {
      expect(miscUtils.isEmpty({foo: 'hoo'})).to.be.false;
    });

    it('returns true if hasOwnProperty is hacked up', function() {
      expect(miscUtils.isEmpty({
        hasOwnProperty: function() {
          return false;
        },
        bar: 'Here be dragons'
      })).to.be.true;
    });

    it('returns true if passed null', function() {
      expect(miscUtils.isEmpty(null)).to.be.true;
    });

    after(function() {
      mock.stop('aws-sdk');
    });
  });

  describe('spacesToTabs', function() {
    before(function() {
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() {}
      });
    });

    it('converts each 2 spaces to a tab', function() {
      expect(miscUtils.spacesToTabs('hi  there  mate', 2)).to.equal('hi\tthere\tmate');
    });

    it('returns empty string if passed empty string', function() {
      expect(miscUtils.spacesToTabs('')).to.equal('');
    });

    it('raises error if passed null', function() {
      expect(function() { miscUtils.spacesToTabs(null); }).to.throw(TypeError);
    });

    after(function() {
      mock.stop('aws-sdk');
    });
  });

  describe('stripPrefix', function() {
    before(function() {
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() {}
      });
    });

    it('removes pics/original/ if present at start of string', function() {
      expect(miscUtils.stripPrefix({Key: 'pics/original/bla'})).to.equal('bla');
    });

    it('removes pics/original/ if present at end of string', function() {
      expect(miscUtils.stripPrefix({Key: 'bla/pics/original/'})).to.equal('bla/');
    });

    it('removes pics/original/ if present in middle of string', function() {
      expect(miscUtils.stripPrefix({Key: 'bla/pics/original/bla'})).to.equal('bla/bla');
    });

    it('removes only first instance of pics/original/ from string', function() {
      expect(miscUtils.stripPrefix({Key: 'hoo/pics/original/haa/pics/original/bla'}))
        .to.equal('hoo/haa/pics/original/bla');
    });

    it('leaves string un-modified if pics/original/ not present', function() {
      expect(miscUtils.stripPrefix({Key: 'hoohaa'})).to.equal('hoohaa');
    });

    it('raises error if passed null', function() {
      expect(function() { miscUtils.stripPrefix(null); }).to.throw(TypeError);
    });

    it('raises error if missing Key', function() {
      expect(function() { miscUtils.stripPrefix({}); }).to.throw(TypeError);
    });

    it('raises error if Key is null', function() {
      expect(function() { miscUtils.stripPrefix({Key: null}); }).to.throw(TypeError);
    });

    after(function() {
      mock.stop('aws-sdk');
    });
  });
});
