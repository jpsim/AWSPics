const AWS = require("aws-sdk");

const albumPage = require('./albumPage');
const collectionPage = require('./collectionPage');


const s3 = new AWS.S3({signatureVersion: 'v4'});


const uploadAllContents = exports.uploadAllContents = function(allContents) {
  if (process.env.GROUP_ALBUMS_INTO_COLLECTIONS) {
    collectionPage.uploadAllContentsByCollection(allContents);
  }
  else {
    albumPage.uploadAllContentsByAlbum(allContents);
  }
};

function handleTruncatedListObjectsResponse(params, token, allContents) {
  const newParams = {};
  Object.assign(newParams, params);

  newParams.ContinuationToken = token;
  console.log(
    "S3 listing was truncated. Pausing 2 seconds before continuing " +
    token
  );
  // Rate limiting for reads - this is a tested safe value
  setTimeout(
    function() {
      listAndUploadAllContents(newParams, allContents);
    },
    2000
  );
}

const listAndUploadAllContents = exports.listAndUploadAllContents = function(
  params, allContents
) {
  // List all bucket objects
  s3.listObjectsV2(params, function (err, data) {
    /* istanbul ignore if */
    if (err) {
      console.log(err, err.stack); // an error occurred
    }
    else {
      const contents = data.Contents;

      if (allContents == null) {
        allContents = [];
      }

      contents.forEach(function (content) {
        allContents.push(content);
      });

      if (data.IsTruncated) {
        handleTruncatedListObjectsResponse(
          params, data.NextContinuationToken, allContents
        );
      }
      else {
        uploadAllContents(allContents);
      }
    }
  });
};
