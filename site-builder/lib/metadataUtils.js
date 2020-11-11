const AWS = require("aws-sdk");
const yaml = require('js-yaml');

const miscUtils = require('./miscUtils');


const s3 = new AWS.S3({signatureVersion: 'v4'});


exports.getAlbumOrCollectionMetadata = function(albumOrCollection, cb) {
  s3.getObject({
    "Bucket": process.env.ORIGINAL_BUCKET,
    "Key": miscUtils.getPicsOriginalPath() + albumOrCollection + "/metadata.yml"
  }, function(err, data) {
    if (err) {
      cb(null, null);
    } else {
      let doc;

      try {
        doc = yaml.safeLoad(data.Body.toString());
      } catch (err) {
        cb(null, null);
        return;
      }

      cb(null, doc);
    }
  });
};
