const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');

const expect = chai.expect;

describe('metadataUtils', function() {
  describe('getAlbumOrCollectionMetadata', function() {
    let metadataUtils;

    before(function() {
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() {
          return {
            getObject: function(params, cb) {
              const bucket = params.Bucket;
              const key = params.Key;

              if (bucket !== 'johnnyphotos') {
                cb(null, null);
              }
              else if (key.includes('funkyfauna/daisies')) {
                cb(null, {Body: "title: Daisies"});
              }
              else if (key.includes('bobsbirthday')) {
                cb(null, {Body: "title: Bob's Birthday"});
              }
              else if (key.includes('megsbirthday')) {
                cb(null, 'badyaml');
              }
              else {
                cb(true, null);
              }
            }
          };
        }
      });

      metadataUtils = rewire('../../site-builder/lib/metadataUtils');

      process.env.ORIGINAL_BUCKET = 'johnnyphotos';
    });

    it('gets metadata for specified album', function() {
      let metadata;

      metadataUtils.getAlbumOrCollectionMetadata('bobsbirthday', function(err, doc) {
        metadata = doc;
      });

      expect(metadata).to.eql({title: "Bob's Birthday"});
    });

    it('gets metadata for specified collection', function() {
      let metadata;

      metadataUtils.getAlbumOrCollectionMetadata('funkyfauna/daisies', function(err, doc) {
        metadata = doc;
      });

      expect(metadata).to.eql({title: "Daisies"});
    });

    it('gets nothing for album with invalid metadata', function() {
      let metadata;

      metadataUtils.getAlbumOrCollectionMetadata('megsbirthday', function(err, doc) {
        metadata = doc;
      });

      expect(metadata).to.be.a('null');
    });

    it('gets nothing for album with no metadata', function() {
      let metadata;

      metadataUtils.getAlbumOrCollectionMetadata('suesbirthday', function(err, doc) {
        metadata = doc;
      });

      expect(metadata).to.be.a('null');
    });

    it('gets nothing for wrong bucket', function() {
      let metadata;

      process.env.ORIGINAL_BUCKET = 'jimmyphotos';

      metadataUtils.getAlbumOrCollectionMetadata('bobsbirthday', function(err, doc) {
        metadata = doc;
      });

      expect(metadata).to.be.a('null');

      process.env.ORIGINAL_BUCKET = 'johnnyphotos';
    });

    after(function() {
      mock.stop('aws-sdk');

      delete process.env.ORIGINAL_BUCKET;
    });
  });
});
