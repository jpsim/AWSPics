const miscUtils = require('./miscUtils');
const pathUtils = require('./pathUtils');
const picture = require('./picture');
const sorters = require('./sorters');


function getUniqueFirstLevelObjects(objects) {
  return objects
    .map(pathUtils.firstLevelFolderName)
    // Make unique
    .filter(function(item, pos, self) {
      return self.indexOf(item) === pos;
    });
}

function getUniqueSecondLevelObjects(objects) {
  return objects
    .map(pathUtils.firstAndSecondLevelFolderName)
    // Make unique
    .filter(function(item, pos, self) {
      return self.indexOf(item) === pos;
    });
}

function getFilteredSortedBucketData(data) {
  return data
    .sort(sorters.lastModifiedDescSorter)
    .filter(function(object) {
      return (
        object.Key.lastIndexOf(miscUtils.getPicsOriginalPath(), 0) === 0 &&
        !object.Key.includes('metadata.yml')
      );
    })
    .map(miscUtils.stripPrefix);
}

exports.getAlbums = function(data) {
  const objects = getFilteredSortedBucketData(data);

  const albums = getUniqueFirstLevelObjects(objects);
  const pictures = picture.getPictures(albums, objects);

  return {albums: albums, pictures: pictures};
};

exports.getAlbumsByCollection = function(data) {
  const objects = getFilteredSortedBucketData(data);

  const collections = getUniqueFirstLevelObjects(objects);
  const albums = getUniqueSecondLevelObjects(objects);

  let album, coll, collIndex;
  const albumsByCollection = [];
  const collIndexMap = {};

  for (let i = 0; i < albums.length; i++) {
    album = albums[i];
    coll = pathUtils.firstLevelFolderName(album);

    if (collIndexMap[coll] != null) {
      collIndex = collIndexMap[coll];
    }
    else {
      collIndex = albumsByCollection.length;
      collIndexMap[coll] = collIndex;
      albumsByCollection.push({collection: coll, albums: []});
    }

    albumsByCollection[collIndex].albums.push(album);
  }

  const pictures = picture.getPicturesByCollection(albumsByCollection, objects);

  return {albumsByCollection: albumsByCollection, pictures: pictures};
};

exports.getAlbumMarkup = function(albumName, pictures, metadata, albumMarkup) {
  let albumTitle = (albumName && albumName.includes('/')) ?
    pathUtils.secondLevelFolderName(albumName) :
    albumName;
  let albumPicture = pictures[0];

  if (metadata) {
    if (metadata.title) {
      albumTitle = metadata.title;
    }

    if (metadata.cover_image) {
      const coverPicture = albumName + '/' + metadata.cover_image;

      if (pictures.includes(coverPicture)) {
        albumPicture = coverPicture;
      }
    }
  }

  return albumMarkup
    .replace(/\{albumName\}/g, albumName)
    .replace(/\{albumPicture\}/g, albumPicture)
    .replace(/\{albumTitle\}/g, albumTitle);
};

exports.getAlbumSorter = function(title) {
  // Collection page, sorting its albums
  if (title) {
    if (
      process.env.ALBUM_SORT &&
      process.env.ALBUM_SORT.toLowerCase() === 'asc'
    ) {
      return sorters.albumAscSorter;
    }
    else if (
      process.env.ALBUM_SORT &&
      process.env.ALBUM_SORT.toLowerCase() === 'desc'
    ) {
      return sorters.albumDescSorter;
    }
  }
  // Home page, sorting its collections
  else if (process.env.GROUP_ALBUMS_INTO_COLLECTIONS) {
    if (
      process.env.COLLECTION_SORT &&
      process.env.COLLECTION_SORT.toLowerCase() === 'asc'
    ) {
      return sorters.albumAscSorter;
    }
    else if (
      process.env.COLLECTION_SORT &&
      process.env.COLLECTION_SORT.toLowerCase() === 'desc'
    ) {
      return sorters.albumDescSorter;
    }
  }
  // Home page, sorting its albums
  else {
    if (
      process.env.ALBUM_SORT &&
      process.env.ALBUM_SORT.toLowerCase() === 'asc'
    ) {
      return sorters.albumAscSorter;
    }
    else if (
      process.env.ALBUM_SORT &&
      process.env.ALBUM_SORT.toLowerCase() === 'desc'
    ) {
      return sorters.albumDescSorter;
    }
  }

  return null;
};
