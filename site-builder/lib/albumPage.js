const AWS = require("aws-sdk");
const async = require('async');
const fs = require('fs');
const mime = require('mime');
const path = require('path');

const album = require('./album');
const cloudfrontUtils = require('./cloudfrontUtils');
const delayUtils = require('./delayUtils');
const fileUtils = require('./fileUtils');
const homePage = require('./homePage');
const metadataUtils = require('./metadataUtils');
const miscUtils = require('./miscUtils');
const pathUtils = require('./pathUtils');


const DELAY_AFTER_THIS_MANY_ALBUMS = 100;

const s3 = new AWS.S3({signatureVersion: 'v4'});


function getAlbumPageBody(
  data, title, metadata, pictures, pictureMarkup, ga, parentLink, parentTitle
) {
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
      comment1 = '<p>' + metadata.comment1 + '</p>';
    }
    if (metadata.comment2) {
      comment2 = '<p>' + metadata.comment2 + '</p>';
    }
  }

  // Pictures
  let picturesHTML = '';
  const picturesSorted = pictures.slice();

  if (process.env.PICTURE_SORT &&
      process.env.PICTURE_SORT.toLowerCase() === 'asc') {
    picturesSorted.sort();
  }
  else if (
      process.env.PICTURE_SORT &&
      process.env.PICTURE_SORT.toLowerCase() === 'desc') {
    picturesSorted.sort();
    picturesSorted.reverse();
  }
  else {
    picturesSorted.reverse();
  }

  for (let i = 0; i < picturesSorted.length; i++) {
    const pictureFileName = picturesSorted[i];
    const pictureHTML = pictureMarkup
      .replace(/\{picsOriginalPath\}/g, miscUtils.getPicsOriginalPath())
      .replace(/\{pictureFileName\}/g, pictureFileName);

    picturesHTML += pictureHTML;
  }

  body = data
    .toString()
    .replace(/\{title\}/g, renderedTitle)
    .replace(/\{comment1\}/g, comment1)
    .replace(/\{comment2\}/g, comment2)
    .replace(/\{pictures\}/g, picturesHTML)
    .replace(/\{parentLink\}/g, (parentLink ? parentLink : ''))
    .replace(/\{parentTitle\}/g, (parentTitle ? parentTitle : 'albums'));

  // Test if "googleanalytics" is set or not
  if (!miscUtils.isEmpty(process.env.GOOGLEANALYTICS)) {
    body = body
      .replace(/\{googletracking\}/g, ga)
      .replace(/\{gtag\}/g, process.env.GOOGLEANALYTICS);
  } else {
    body = body.replace(/\{googletracking\}/g, '');
  }

  if (!process.env.SPACES_INSTEAD_OF_TABS) {
    body = miscUtils.spacesToTabs(body);
  }

  return body;
}

const uploadAlbumPage = exports.uploadAlbumPage = function(
  albumName, pictures, metadata, parentLink, parentTitle, albumIndex
) {
  // This delay block is inserted to prevent S3 from being flooded and killing
  // the sitebuild.
  // This happens when there are enough albums, that it saturates the 3500
  // writes/sec current rate limit for S3, and this function doesn't handle
  // those rejections well & hangs without some delay block to force a rate
  // limit.
  // Delaying after each chunk of 100 albums should be enough.
  if (!!albumIndex && albumIndex % DELAY_AFTER_THIS_MANY_ALBUMS === 0) {
    console.log(
      "Written " + albumIndex + " albums, " +
      "forcing a short delay before continuing"
    );
    delayUtils.delayBlock();
  }

  const title = (albumName && albumName.includes('/')) ?
    pathUtils.secondLevelFolderName(albumName) :
    albumName;
  console.log("Writing album " + title);

  const dir = 'album';

  fileUtils.walk(dir, function(err, files) {
    /* istanbul ignore next */
    if (err) {
      throw err;
    }

    // Google Analytics gtag code
    const ga = fs.readFileSync('shared/snippets/ga.html').toString();

    const pictureMarkup = fs.readFileSync('album/snippets/picture.html').toString();

    async.map(files, function(f, cb) {
      const filePath = path.relative(dir, f);

      if (
        !filePath.includes('snippets') &&
        (!filePath.includes('assets/') || !albumIndex)
      ) {
        let data = fs.readFileSync(f),
            body;

        if (path.basename(f) === 'index.html') {
          body = getAlbumPageBody(
            data,
            title,
            metadata,
            pictures,
            pictureMarkup,
            ga,
            parentLink,
            parentTitle
          );
        }
        else {
          body = data;
        }

        let fileKey;

        if (filePath.includes('assets/')) {
          fileKey = filePath.replace(/assets\//g, 'assets/album/');
        }
        else {
          fileKey = albumName + "/" + filePath;
        }

        const options = {
          Bucket: process.env.SITE_BUCKET,
          Key: fileKey,
          Body: body,
          ContentType: mime.getType(path.extname(f))
        };

        s3.putObject(options, cb);
      }
    },
    /* istanbul ignore next */
    function(err, results) {
      if (err) {
        console.log(err, err.stack);
      }
    });
  });
};

function uploadAlbums(albumsAndPictures, metadata) {
  // Upload home page
  homePage.uploadHomePage(
    albumsAndPictures.albums,
    albumsAndPictures.pictures,
    metadata
  );

  let albumIndex = 0;

  // Upload album pages
  for (let i = albumsAndPictures.albums.length - 1; i >= 0; i--) {
    uploadAlbumPage(
      albumsAndPictures.albums[i],
      albumsAndPictures.pictures[i],
      metadata[i],
      null,
      null,
      albumIndex
    );

    albumIndex += 1;
  }

  // Invalidate CloudFront
  cloudfrontUtils.invalidateCloudFront();
}

exports.uploadAllContentsByAlbum = function(allContents) {
  // Parse albums
  const albumsAndPictures = album.getAlbums(allContents);
  console.log(
    "First album: " +
    albumsAndPictures.albums[albumsAndPictures.albums.length - 1]
  );
  console.log("Last album: " + albumsAndPictures.albums[0]);

  // Get metadata for all albums
  async.map(
    albumsAndPictures.albums,
    metadataUtils.getAlbumOrCollectionMetadata,
    function(err, metadata) {
      /* istanbul ignore next */
      if (err) {
        console.log(err, err.stack);
        return;
      }

      uploadAlbums(albumsAndPictures, metadata);
    }
  );
};
