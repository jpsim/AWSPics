var AWS = require("aws-sdk");
var s3 = new AWS.S3();

exports.handler = function(event, context) {
  console.log("site builder event ", JSON.stringify(event));
  s3.listObjectsV2({Bucket: "protected.pictures4-original"}, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
};
