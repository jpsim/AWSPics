var AWS = require("aws-sdk");
var s3 = new AWS.S3({signatureVersion: 'v4'});
var cloudfront = new AWS.CloudFront();

var async = require('async');
var fs = require('fs');
var mime = require('mime');
var path = require('path');
var yaml = require('js-yaml');

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

// Test if object is empty or not
function isEmpty(obj) {
  for(var key in obj) {
    if(obj.hasOwnProperty(key))
      return false;
  }
  return true;
}

// Google Analytics gtag code
var ga = "<!-- Global site tag (gtag.js) - Google Analytics -->\n" +
  "\t\t<script async src=\"https://www.googletagmanager.com/gtag/js?id={gtag}\"></script>\n" +
  "\t\t<script>\n" +
  "\t\t  window.dataLayer = window.dataLayer || [];\n" +
  "\t\t  function gtag(){dataLayer.push(arguments);}\n" +
  "\t\t  gtag('js', new Date());\n" +
  "\t\t  gtag('config', '{gtag}');\n" +
  "\t\t</script>";

function getAlbums(data) {
  var objects = data.sort(function(a,b){
    return b.LastModified - a.LastModified;
  }).map(stripPrefix);
  var albums = objects.map(folderName);
  // Deduplicate albums
  albums = albums.filter(function(item, pos) {
    return albums.indexOf(item) == pos;
  });

  var pictures = albums.map(function(album){
    return objects.filter(function(object){
      return object.startsWith(album + "/") && (object.toLowerCase().endsWith('.jpg') || object.toLowerCase().endsWith('.png'));
    });
  });

  return {albums: albums, pictures: pictures};
}

function uploadHomepageSite(albums, pictures, metadata) {
  var dir = 'homepage';
  walk(dir, function(err, files) {
    if (err) throw err;

    async.map(files, function(f, cb) {
      var body = fs.readFileSync(f);

      if (path.basename(f) == 'error.html') {
        // Test if "googleanalytics" is set or not
        if (!isEmpty(process.env.GOOGLEANALYTICS)) {
          body = body.toString().replace(/\{website\}/g, process.env.WEBSITE)
                                .replace(/\{googletracking\}/g, ga)
                                .replace(/\{gtag\}/g, process.env.GOOGLEANALYTICS);
        } else {
          body = body.toString().replace(/\{website\}/g, process.env.WEBSITE)
                                .replace('{googletracking}', '');
        }
      } else if (path.basename(f) == 'index.html') {
        var picturesHTML = '';
        for (var i = 0; i < albums.length; i++) {
          var albumTitle = albums[i];
          if (metadata[i] && metadata[i].title) {
            albumTitle = metadata[i].title;
          }
          picturesHTML += "\t\t\t\t\t\t<article class=\"thumb\">\n" +
                          "\t\t\t\t\t\t\t<a href=\"" + albums[i] + "/index.html\" class=\"image\"><img src=\"/pics/resized/1200x750/" + pictures[i][0] + "\" alt=\"\" /></a>\n" +
                          "\t\t\t\t\t\t\t<h2>" + albumTitle + "</h2>\n" +
                          "\t\t\t\t\t\t</article>";
        }
        // Test if "googleanalytics" is set or not
        if (!isEmpty(process.env.GOOGLEANALYTICS)) {
          body = body.toString().replace(/\{title\}/g, process.env.WEBSITE_TITLE)
                                .replace(/\{pictures\}/g, picturesHTML)
                                .replace(/\{googletracking\}/g, ga)
                                .replace(/\{gtag\}/g, process.env.GOOGLEANALYTICS);
        } else {
          body = body.toString().replace(/\{title\}/g, process.env.WEBSITE_TITLE)
                                .replace(/\{pictures\}/g, picturesHTML)
                                .replace('{googletracking}', '');
        }
      }

      var options = {
        Bucket: process.env.SITE_BUCKET,
        Key: path.relative(dir, f),
        Body: body,
        ContentType: mime.getType(path.extname(f))
      };

      s3.putObject(options, cb);
    }, function(err, results) {
      if (err) console.log(err, err.stack);
    });
  });
}

function uploadAlbumSite(title, pictures, metadata) {
  console.log("Writing ALBUM " + title);
  //this is a computationally expensive way to do a delay block - 
  //this delay is ~100ms using processor allocated to 3008mb memory usage on a Lambda instance
  //Surely this could be done in a more node.js way, but if you're reading this, 
  //Lambda computational power is likely cheaper than your time.
  var a = 0;
  for (var j = 5*10e6; j >= 0; j--) {
    a++;
  }
  //the above delay block is inserted to prevent S3 from being flooded and killing the sitebuild.
  //This happens when you have more than 115 albums, writing about 30 files per album
  //saturates the 3500 writes/sec current rate limit for S3, and this function 
  //doesn't handle those rejections well & hangs without some delay block to force a rate limit.
  //--------------------------
  var dir = 'album';
  walk(dir, function(err, files) {
    if (err) throw err;
    async.map(files, function(f, cb) {
      var body = fs.readFileSync(f);

      if (path.basename(f) == 'index.html') {
        // Defaults
        var renderedTitle = title,
            comment1 = '',
            comment2 = '';

        // Metadata
        if (metadata) {
          if (metadata.title) renderedTitle = metadata.title;
          if (metadata.comment1) comment1 = metadata.comment1;
          if (metadata.comment2) comment2 = metadata.comment2;
        }

        // Pictures
        var picturesHTML = '';
        for (var i = pictures.length - 1; i >= 0; i--) {
          picturesHTML += "\t\t\t\t\t\t<article>\n" +
                          "\t\t\t\t\t\t\t<a class=\"thumbnail\" href=\"/pics/resized/1200x750/" + pictures[i] + "\" data-position=\"center\"><img class=\"lazy\" src=\"assets/css/images/placeholder.png\" data-original=\"/pics/resized/360x225/" + pictures[i] + "\" width=\"360\" height=\"225\"/></a>\n" +
                          "<p><a href=\"/pics/original/" + pictures[i] + "\" download>High Resolution Download</a></p>\n" +
                          "\t\t\t\t\t\t</article>";
        }
        // Test if "googleanalytics" is set or not
        if (!isEmpty(process.env.GOOGLEANALYTICS)) {
          body = body.toString().replace(/\{title\}/g, renderedTitle)
                                .replace(/\{comment1\}/g, comment1)
                                .replace(/\{comment2\}/g, comment2)
                                .replace(/\{pictures\}/g, picturesHTML)
                                .replace(/\{googletracking\}/g, ga)
                                .replace(/\{gtag\}/g, process.env.GOOGLEANALYTICS);
        } else {
          body = body.toString().replace(/\{title\}/g, renderedTitle)
                                .replace(/\{comment1\}/g, comment1)
                                .replace(/\{comment2\}/g, comment2)
                                .replace(/\{pictures\}/g, picturesHTML)
                                .replace('{googletracking}', '');
        }
      }

      var options = {
        Bucket: process.env.SITE_BUCKET,
        Key: title + "/" + path.relative(dir, f),
        Body: body,
        ContentType: mime.getType(path.extname(f))
      };

      s3.putObject(options, cb);
    }, function(err, results) {
      if (err) console.log(err, err.stack);
    });
  });
}

function invalidateCloudFront() {
  cloudfront.listDistributions(function(err, data) {
    // Handle error
    if (err) {
      console.log(err, err.stack);
      return;
    }

    // Get distribution ID from domain name
    var distributionID = data.Items.find(function (d) {
      return d.DomainName == process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN;
    }).Id;

    // Create invalidation
    cloudfront.createInvalidation({
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
    }, function(err, data) {
      if (err) console.log(err, err.stack);
    });
  });
}

function getAlbumMetadata(album, cb) {
  s3.getObject({
    "Bucket": process.env.ORIGINAL_BUCKET,
    "Key": "pics/original/" + album + "/metadata.yml"
  }, function(err, data) {
    if (err) {
      cb(null, null);
    } else {
      try {
        var doc = yaml.safeLoad(data.Body.toString());
        cb(null, doc);
      } catch (err) {
        cb(null, null);
      }
    }
  });
}

exports.handler = function(event, context) {
  // List all bucket objects
  var params = {
    Bucket: process.env.ORIGINAL_BUCKET
  };
  var allContents = [];
  listAllContents();
  function listAllContents() {
    s3.listObjectsV2(params, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
      } else {
        var contents = data.Contents;
        contents.forEach(function (content) {
          allContents.push(content);
        });

        if (data.IsTruncated) {
          params.ContinuationToken = data.NextContinuationToken;
          //listAllContents();
          console.log("S3 listing was truncated. Pausing 2 sec before continuing " + params.ContinuationToken );
          setTimeout(listAllContents,2000); //rate limiting for reads - this is a tested safe value
        }else{

          // Parse albums
          var albumsAndPictures = getAlbums(allContents);
          console.log("First Album: "+albumsAndPictures.albums[albumsAndPictures.albums.length - 1]);
          console.log("Last Album: "+albumsAndPictures.albums[0]);
  
          // Get metadata for all albums
          async.map(albumsAndPictures.albums, getAlbumMetadata, function(err, metadata) {
            // Upload homepage site
            uploadHomepageSite(albumsAndPictures.albums, albumsAndPictures.pictures, metadata);
  
            // Upload album sites
            for (var i = albumsAndPictures.albums.length - 1; i >= 0; i--) {
              uploadAlbumSite(albumsAndPictures.albums[i], albumsAndPictures.pictures[i], metadata[i]);
            }
  
            // Invalidate CloudFront
            invalidateCloudFront();
          });
        }
      }
    });
  }
};
