var AWS = require("aws-sdk");
var s3 = new AWS.S3();

function stripPrefix(object) {
  return object.Key.replace('pics/original/', '');
}

function folderName(path) {
  return path.split('/')[0];
}

exports.handler = function(event, context) {
  s3.listObjectsV2({Bucket: "protected.pictures4-original"}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      return;
    }
    var objects = data.Contents.map(stripPrefix);
    console.log("objects: " + objects);

    var albums = Array.from(new Set(objects.map(folderName)));
    console.log("albums: " + albums);
  });
};
