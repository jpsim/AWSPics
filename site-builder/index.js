var AWS = require("aws-sdk");
var s3 = new AWS.S3();

exports.handler = function(event, context) {
  console.log("site builder event ", JSON.stringify(event));
};
