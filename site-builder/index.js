const AWS = require("aws-sdk");
const s3 = new AWS.S3({signatureVersion: 'v4'});
const cloudfront = new AWS.CloudFront();

const async = require('async');
const fs = require('fs');
const mime = require('mime');
const path = require('path');
const yaml = require('js-yaml');

function walk(dir, done) {
  let results = [];

  fs.readdir(dir, function(err, list) {
    /* istanbul ignore next */
    if (err) {
      return done(err);
    }

    let pending = list.length;
    if (!pending) {
      return done(null, results);
    }

    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);

            if (!--pending) {
              done(null, results);
            }
          });
        }
        else {
          results.push(file);

          if (!--pending) {
            done(null, results);
          }
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
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }

  return true;
}

// Google Analytics gtag code
const ga = "<!-- Global site tag (gtag.js) - Google Analytics -->\n" +
  "\t\t<script async src=\"https://www.googletagmanager.com/gtag/js?id={gtag}\">" +
  "</script>\n" +
  "\t\t<script>\n" +
  "\t\t  window.dataLayer = window.dataLayer || [];\n" +
  "\t\t  function gtag(){dataLayer.push(arguments);}\n" +
  "\t\t  gtag('js', new Date());\n" +
  "\t\t  gtag('config', '{gtag}');\n" +
  "\t\t</script>";

function getAlbums(data) {
  const objects = data
    .sort(function(a,b) {
      return b.LastModified - a.LastModified;
    })
    .map(stripPrefix);

  const albums = objects
    .map(folderName)
    // Deduplicate albums
    .filter(function(item, pos, self) {
      return self.indexOf(item) == pos;
    });

  const pictures = albums.map(function(album) {
    return objects.filter(function(object) {
      return (
        object.startsWith(album + "/") &&
        (
          object.toLowerCase().endsWith('.jpg') ||
          object.toLowerCase().endsWith('.png')
        )
      );
    });
  });

  return {albums: albums, pictures: pictures};
}

function uploadHomepageSite(albums, pictures, metadata) {
  const dir = 'homepage';
  walk(dir, function(err, files) {
    /* istanbul ignore next */
    if (err) {
      throw err;
    }

    async.map(files, function(f, cb) {
      let body = fs.readFileSync(f);

      if (path.basename(f) == 'error.html') {
        // Test if "googleanalytics" is set or not
        if (!isEmpty(process.env.GOOGLEANALYTICS)) {
          body = body
            .toString()
            .replace(/\{website\}/g, process.env.WEBSITE)
            .replace(/\{googletracking\}/g, ga)
            .replace(/\{gtag\}/g, process.env.GOOGLEANALYTICS);
        } else {
          body = body
            .toString()
            .replace(/\{website\}/g, process.env.WEBSITE)
            .replace('{googletracking}', '');
        }
      } else if (path.basename(f) == 'index.html') {
        let picturesHTML = '';

        for (let i = 0; i < albums.length; i++) {
          let albumTitle = albums[i];

          if (metadata[i] && metadata[i].title) {
            albumTitle = metadata[i].title;
          }

          picturesHTML += (
            "\t\t\t\t\t\t<article class=\"thumb\">\n" +
            "\t\t\t\t\t\t\t<a href=\"" + albums[i] +
            "/index.html\" class=\"image\"><img src=\"/pics/resized/1200x750/" +
            pictures[i][0] + "\" alt=\"\" /></a>\n" +
            "\t\t\t\t\t\t\t<h2>" + albumTitle + "</h2>\n" +
            "\t\t\t\t\t\t</article>"
          );
        }

        // Test if "googleanalytics" is set or not
        if (!isEmpty(process.env.GOOGLEANALYTICS)) {
          body = body
            .toString()
            .replace(/\{title\}/g, process.env.WEBSITE_TITLE)
            .replace(/\{pictures\}/g, picturesHTML)
            .replace(/\{googletracking\}/g, ga)
            .replace(/\{gtag\}/g, process.env.GOOGLEANALYTICS);
        } else {
          body = body
            .toString()
            .replace(/\{title\}/g, process.env.WEBSITE_TITLE)
            .replace(/\{pictures\}/g, picturesHTML)
            .replace('{googletracking}', '');
        }
      }

      const options = {
        Bucket: process.env.SITE_BUCKET,
        Key: path.relative(dir, f),
        Body: body,
        ContentType: mime.getType(path.extname(f))
      };

      s3.putObject(options, cb);
    },
    /* istanbul ignore next */
    function(err, results) {
      if (err) {
        console.log(err, err.stack);
      }
    });
  });
}

/* istanbul ignore next */
function delayBlock() {
  // This is a computationally expensive way to do a delay block -
  // this delay is ~100ms using processor allocated to 3008mb memory usage on a
  // Lambda instance.
  // Surely this could be done in a more node.js way, but if you're reading this,
  // Lambda computational power is likely cheaper than your time.
  let a = 0;
  for (let j = 5*10e6; j >= 0; j--) {
    a++;
  }
}

function uploadAlbumSite(title, pictures, metadata) {
  console.log("Writing ALBUM " + title);

  // This delay block is inserted to prevent S3 from being flooded and killing
  // the sitebuild.
  // This happens when you have more than 115 albums, writing about 30 files per
  // album saturates the 3500 writes/sec current rate limit for S3, and this
  // function doesn't handle those rejections well & hangs without some delay
  // block to force a rate limit.
  delayBlock();

  const dir = 'album';
  walk(dir, function(err, files) {
    /* istanbul ignore next */
    if (err) {
      throw err;
    }

    async.map(files, function(f, cb) {
      let body = fs.readFileSync(f);

      if (path.basename(f) == 'index.html') {
        // Defaults
        let renderedTitle = title,
            comment1 = '',
            comment2 = '';

        // Metadata
        if (metadata) {
          if (metadata.title) {
            renderedTitle = metadata.title;
          }
          if (metadata.comment1) {
            comment1 = metadata.comment1;
          }
          if (metadata.comment2) {
            comment2 = metadata.comment2;
          }
        }

        // Pictures
        let picturesHTML = '';
        for (let i = pictures.length - 1; i >= 0; i--) {
          picturesHTML += (
            "\t\t\t\t\t\t<article>\n" +
            "\t\t\t\t\t\t\t<a class=\"thumbnail\" href=\"/pics/resized/1200x750/" +
            pictures[i] +
            "\" data-position=\"center\">" +
            "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
            "data-original=\"/pics/resized/360x225/" + pictures[i] +
            "\" width=\"360\" height=\"225\"/></a>\n" +
            "<p><a href=\"/pics/original/" + pictures[i] +
            "\" download>High Resolution Download</a></p>\n" +
            "\t\t\t\t\t\t</article>"
          );
        }

        // Test if "googleanalytics" is set or not
        if (!isEmpty(process.env.GOOGLEANALYTICS)) {
          body = body
            .toString()
            .replace(/\{title\}/g, renderedTitle)
            .replace(/\{comment1\}/g, comment1)
            .replace(/\{comment2\}/g, comment2)
            .replace(/\{pictures\}/g, picturesHTML)
            .replace(/\{googletracking\}/g, ga)
            .replace(/\{gtag\}/g, process.env.GOOGLEANALYTICS);
        } else {
          body = body
            .toString()
            .replace(/\{title\}/g, renderedTitle)
            .replace(/\{comment1\}/g, comment1)
            .replace(/\{comment2\}/g, comment2)
            .replace(/\{pictures\}/g, picturesHTML)
            .replace('{googletracking}', '');
        }
      }

      const options = {
        Bucket: process.env.SITE_BUCKET,
        Key: title + "/" + path.relative(dir, f),
        Body: body,
        ContentType: mime.getType(path.extname(f))
      };

      s3.putObject(options, cb);
    },
    /* istanbul ignore next */
    function(err, results) {
      if (err) {
        console.log(err, err.stack);
      }
    });
  });
}

function invalidateCloudFront() {
  cloudfront.listDistributions(function(err, data) {
    /* istanbul ignore next */
    if (err) {
      console.log(err, err.stack);
      return;
    }

    // Get distribution ID from domain name
    const distributionID = data.Items.find(function (d) {
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
    },
    /* istanbul ignore next */
    function(err, data) {
      if (err) {
        console.log(err, err.stack);
      }
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
        const doc = yaml.safeLoad(data.Body.toString());
        cb(null, doc);
      } catch (err) {
        cb(null, null);
      }
    }
  });
}

function listAllContents(params) {
  // List all bucket objects
  s3.listObjectsV2(params, function (err, data) {
    /* istanbul ignore if */
    if (err) {
      console.log(err, err.stack); // an error occurred
    }
    else {
      const allContents = [],
            contents = data.Contents;

      contents.forEach(function (content) {
        allContents.push(content);
      });

      if (data.IsTruncated) {
        const newParams = {};
        Object.assign(newParams, params);

        const token = data.NextContinuationToken
        newParams.ContinuationToken = token;
        console.log(
          "S3 listing was truncated. Pausing 2 sec before continuing " +
          token
        );
        // Rate limiting for reads - this is a tested safe value
        setTimeout(
          function() {
            listAllContents(newParams);
          },
          2000
        );
      }
      else {
        // Parse albums
        const albumsAndPictures = getAlbums(allContents);
        console.log(
          "First Album: " +
          albumsAndPictures.albums[albumsAndPictures.albums.length - 1]
        );
        console.log("Last Album: " + albumsAndPictures.albums[0]);

        // Get metadata for all albums
        async.map(
          albumsAndPictures.albums,
          getAlbumMetadata,
          function(err, metadata) {
            // Upload homepage site
            uploadHomepageSite(
              albumsAndPictures.albums, albumsAndPictures.pictures, metadata
            );

            // Upload album sites
            for (let i = albumsAndPictures.albums.length - 1; i >= 0; i--) {
              uploadAlbumSite(
                albumsAndPictures.albums[i],
                albumsAndPictures.pictures[i],
                metadata[i]
              );
            }

            // Invalidate CloudFront
            invalidateCloudFront();
          }
        );
      }
    }
  });
}

exports.handler = function(event, context) {
  listAllContents({
    Bucket: process.env.ORIGINAL_BUCKET
  });
};
