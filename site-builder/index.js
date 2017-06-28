var AWS = require("aws-sdk");
var s3 = new AWS.S3();
var cloudfront = new AWS.CloudFront();

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
    // console.log("objects: " + objects);

    var albums = Array.from(new Set(objects.map(folderName)));
    // console.log("albums: " + albums);

    s3.putObject({
      "Bucket": "protected.pictures4",
      "Key": "index.html",
      "Body": Buffer.from(albums.toString(), "utf8"),
      "ContentType": "text/html"
    }, function(err) {
      if (err) console.log("error uploading index.html: " + err, err.stack);
    });

    // TODO: Dynamically pull distribution ID from CloudFront domain name
    //       already available as process.env['CLOUDFRONT_DISTRIBUTION_DOMAIN']

    var params = {
      DistributionId: 'E3Q2NM3S7HHGF4',
      InvalidationBatch: {
        CallerReference: 'site-builder-' + Date.now(),
        Paths: {
          Quantity: 1,
          Items: [
            '/*' // TODO: Only invalidate the paths that are touched
          ]
        }
      }
    };
    cloudfront.createInvalidation(params, function(err, data) {
      if (err) console.log(err, err.stack);
    });
  });
};
