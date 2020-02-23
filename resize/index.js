var async = require("async");
var AWS = require("aws-sdk");

var im = require("gm").subClass({imageMagick: true});
var s3 = new AWS.S3({signatureVersion: 'v4'});

function getImageType(objectContentType) {
  if (objectContentType === "image/jpeg") {
    return "jpeg";
  } else if (objectContentType === "image/png") {
    return "png";
  } else {
    throw new Error("unsupported objectContentType " + objectContentType);
  }
}

function cross(left, right) {
  var res = [];
  left.forEach(function(l) {
    right.forEach(function(r) {
      res.push([l, r]);
    });
  });
  return res;
}

exports.handler = function(event, context) {
  console.log("event ", JSON.stringify(event));
  async.mapLimit(event.Records, 4, function(record, cb) {
    var originalKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    s3.getObject({
      "Bucket": record.s3.bucket.name,
      "Key": originalKey
    }, function(err, data) {
      if (err) {
        cb(err);
      } else {
        cb(null, {
          "originalKey": originalKey,
          "contentType": data.ContentType,
          "imageType": getImageType(data.ContentType),
          "buffer": data.Body,
          "record": record
        });
      }
    });
  }, function(err, images) {
    if (err) {
      context.fail(err);
    } else {
      var resizePairs = cross(["1200x750", "360x225"], images);
      async.eachLimit(resizePairs, 4, function(resizePair, cb) {
        var config = resizePair[0];
        var image = resizePair[1];
        var width = config.split('x')[0]
        var height = config.split('x')[1]
        var operation = im(image.buffer).autoOrient().resize(width, height, '^');
        if (config == "360x225") {
          operation = operation.gravity('Center').crop(width, height);
        }
        operation.toBuffer(image.imageType, function(err, buffer) {
          if (err) {
            cb(err);
          } else {
            s3.putObject({
              "Bucket": process.env.RESIZED_BUCKET,
              "Key": "pics/resized/" + config + "/" + image.originalKey.replace("pics/original/", ""),
              "Body": buffer,
              "ServerSideEncryption": "AES256",
              "ContentType": image.contentType
            }, function(err) {
              cb(err);
            });
          }
        });
      }, function(err) {
        if (err) {
          context.fail(err);
        } else {
          context.succeed();
        }
      });
    }
  });
};
