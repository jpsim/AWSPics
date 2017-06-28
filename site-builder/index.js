var AWS = require("aws-sdk");
var s3 = new AWS.S3();
var cloudfront = new AWS.CloudFront();

var async = require('async')
var fs = require('fs');
var mime = require('mime');
var path = require('path');

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

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
    var albums = Array.from(new Set(objects.map(folderName)));

    var dir = 'multiverse';
    walk(dir, function(err, files) {
      if (err) throw err;

      async.map(files, function (f, cb) {
        var body = fs.readFileSync(f);

        if (path.basename(f) == '.DS_Store' || f.includes('assets/sass/')) {
          return;
        } else if (path.basename(f) == 'index.template.html') {
          f = f.replace('index.template.html', 'index.html');
          var replacement = "\t\t\t\t\t\t<article class=\"thumb\">\n" +
                            "\t\t\t\t\t\t\t<a href=\"https://pics.jpsim.com/" + albums[0] + "/index.html\" class=\"image\"><img src=\"https://dvowid7hugjpo.cloudfront.net/pics/resized/360x225/First%20Album/00.jpg\" alt=\"\" /></a>\n" +
                            "\t\t\t\t\t\t\t<h2>" + albums[0] + "</h2>\n" +
                            "\t\t\t\t\t\t</article>"
          body = body.toString().replace('{articles}', replacement);
        }

        var options = {
          Bucket: "protected.pictures4",
          Key: path.relative(dir, f),
          Body: body,
          ContentType: mime.lookup(path.extname(f))
        };

        s3.putObject(options, cb);
      }, function (err, results) {
        if (err) console.log(err, err.stack);
      });
    });

    cloudfront.listDistributions(function(err, data) {
      if (err) {
        console.log(err, err.stack);
        return;
      }

      var distributionID = data.Items.find(function (d) {
          return d.DomainName == process.env['CLOUDFRONT_DISTRIBUTION_DOMAIN'];
      }).Id;

      var params = {
        DistributionId: distributionID,
        InvalidationBatch: {
          CallerReference: 'site-builder-' + Date.now(),
          Paths: {
            Quantity: 1,
            Items: [
              '/*'
            ]
          }
        }
      };
      cloudfront.createInvalidation(params, function(err, data) {
        if (err) console.log(err, err.stack);
      });
    });
  });
};
