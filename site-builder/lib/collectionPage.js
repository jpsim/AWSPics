const AWS = require("aws-sdk");
const async = require('async');
const fs = require('fs');
const mime = require('mime');
const path = require('path');

const album = require('./album');
const albumPage = require('./albumPage');
const cloudfrontUtils = require('./cloudfrontUtils');
const fileUtils = require('./fileUtils');
const homePage = require('./homePage');
const metadataUtils = require('./metadataUtils');
const pathUtils = require('./pathUtils');


const s3 = new AWS.S3({signatureVersion: 'v4'});


function getAlbumListFromAlbumsByCollAndPictures(albumsByCollAndPictures) {
  const albums = [];
  let coll;

  for (let i = 0; i < albumsByCollAndPictures.albumsByCollection.length; i++) {
    coll = albumsByCollAndPictures.albumsByCollection[i];

    for (let j = 0; j < coll.albums.length; j++) {
      albums.push(coll.albums[j]);
    }
  }

  return albums;
}

function unflattenAlbumMetadataForCollections(
  albumMetadataFlat, albumsByCollAndPictures
) {
  const albumMetadata = [];
  let amd,
      coll;
  let albumMetadataIndex = 0;

  for (let i = 0; i < albumsByCollAndPictures.albumsByCollection.length; i++) {
    amd = [];
    coll = albumsByCollAndPictures.albumsByCollection[i];

    for (let j = 0; j < coll.albums.length; j++) {
      amd.push(albumMetadataFlat[albumMetadataIndex]);
      albumMetadataIndex += 1;
    }

    albumMetadata.push(amd);
  }

  return albumMetadata;
}

function uploadCollectionPage(
  collectionName, title, comment1, comment2, albums, pictures, metadata
) {
  const dir = 'homepage';
  console.log("Writing collection " + collectionName);

  fileUtils.walk(dir, function(err, files) {
    /* istanbul ignore next */
    if (err) {
      throw err;
    }

    // Google Analytics gtag code
    const ga = fs.readFileSync('shared/snippets/ga.html').toString();

    const albumMarkup = fs.readFileSync('homepage/snippets/album.html').toString();
    const nav = fs.readFileSync('homepage/snippets/nav.html').toString();
    const footer = fs.readFileSync('homepage/snippets/footer.html').toString();

    async.map(files, function(f, cb) {
      const filePath = path.relative(dir, f);
      if (filePath.includes('index.html')) {
        const data = fs.readFileSync(f);
        const body = homePage.getHomePageBody(
          data,
          albums,
          pictures,
          metadata,
          albumMarkup,
          ga,
          nav,
          footer,
          title,
          comment1,
          comment2
        );

        const options = {
          Bucket: process.env.SITE_BUCKET,
          Key: collectionName + '/' + filePath,
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
}

function uploadCollection(
  collection,
  collAlbums,
  collPictures,
  metadataForColl,
  metadataForAlbums,
  albumIndex
) {
  console.log(
    "First album in " + collection + ": " +
    pathUtils.secondLevelFolderName(collAlbums[collAlbums.length - 1])
  );
  console.log(
    "Last album in " + collection + ": " +
    pathUtils.secondLevelFolderName(collAlbums[0])
  );

  const collTitle = (metadataForColl && metadataForColl.title) ?
    metadataForColl.title :
    collection;
  const collComment1 = (metadataForColl && metadataForColl.comment1) ?
    metadataForColl.comment1 :
    null;
  const collComment2 = (metadataForColl && metadataForColl.comment2) ?
    metadataForColl.comment2 :
    null;

  uploadCollectionPage(
    collection,
    collTitle,
    collComment1,
    collComment2,
    collAlbums,
    collPictures,
    metadataForAlbums
  );

  let newAlbumIndex = albumIndex;

  // Upload album pages
  for (let i = collAlbums.length - 1; i >= 0; i--) {
    albumPage.uploadAlbumPage(
      collAlbums[i],
      collPictures[i],
      metadataForAlbums[i],
      collection + '/index.html',
      collTitle,
      newAlbumIndex
    );

    newAlbumIndex += 1
  }

  return newAlbumIndex;
}

function uploadCollections(
  collections, albumMetadataFlat, pictures, collMetadata, albumsByCollAndPictures
) {
  console.log("First collection: " + collections[collections.length - 1]);
  console.log("Last collection: " + collections[0]);

  const albumMetadata = unflattenAlbumMetadataForCollections(
    albumMetadataFlat, albumsByCollAndPictures
  );

  // Upload home page
  homePage.uploadHomePage(
    collections,
    pictures,
    collMetadata
  );

  let albumIndex = 0;

  // Upload collection pages
  for (let i = collections.length - 1; i >= 0; i--) {
    albumIndex = uploadCollection(
      collections[i],
      albumsByCollAndPictures.albumsByCollection[i].albums,
      albumsByCollAndPictures.pictures[i],
      collMetadata[i],
      albumMetadata[i],
      albumIndex
    );
  }

  // Invalidate CloudFront
  cloudfrontUtils.invalidateCloudFront();
}

function getAndUploadCollections(
  albumsByCollAndPictures, collections, pictures, collMetadata
) {
  const albums = getAlbumListFromAlbumsByCollAndPictures(
    albumsByCollAndPictures
  );

  // Get metadata for all albums
  async.map(
    albums,
    metadataUtils.getAlbumOrCollectionMetadata,
    function(err, albumMetadataFlat) {
      /* istanbul ignore next */
      if (err) {
        console.log(err, err.stack);
        return;
      }

      uploadCollections(
        collections, albumMetadataFlat, pictures, collMetadata, albumsByCollAndPictures
      );
    }
  );
}

exports.uploadAllContentsByCollection = function(allContents) {
  // Parse albums by collection
  const albumsByCollAndPictures = album.getAlbumsByCollection(allContents);

  const collections = albumsByCollAndPictures.albumsByCollection.map(
    function(coll) {
      return coll.collection;
    }
  );

  const pictures = albumsByCollAndPictures.pictures.map(function(collPictures) {
    return collPictures.reduce(function(albumPictures, moreAlbumPictures) {
      return albumPictures.concat(moreAlbumPictures);
    });
  });

  // Get metadata for all collections
  async.map(
    collections,
    metadataUtils.getAlbumOrCollectionMetadata,
    function(err, collMetadata) {
      /* istanbul ignore next */
      if (err) {
        console.log(err, err.stack);
        return;
      }

      getAndUploadCollections(
        albumsByCollAndPictures, collections, pictures, collMetadata
      );
    }
  );
};
