const getPictures = exports.getPictures = function(albums, objects) {
  return albums.map(function(album) {
    return objects.filter(function(object) {
      const objectLower = object.toLowerCase();

      return (
        object.startsWith(album + "/") &&
        (objectLower.endsWith('.jpg') || objectLower.endsWith('.png'))
      );
    });
  });
};

exports.getPicturesByCollection = function(albumsByCollection, objects) {
  return albumsByCollection.map(function(collAndAlbums) {
    return getPictures(collAndAlbums.albums, objects);
  });
};
