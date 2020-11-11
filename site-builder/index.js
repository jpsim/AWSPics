const uploadContents = require('./lib/uploadContents');


exports.handler = function(event, context) {
  uploadContents.listAndUploadAllContents({
    Bucket: process.env.ORIGINAL_BUCKET
  });
};
