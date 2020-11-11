exports.lastModifiedDescSorter = function(a, b) {
  return (a.LastModified < b.LastModified) ?
    1 :
    ((b.LastModified < a.LastModified) ? -1 : 0);
};

exports.albumAscSorter = function(a, b) {
  return (a.album > b.album) ? 1 : ((b.album > a.album) ? -1 : 0);
};

exports.albumDescSorter = function(a, b) {
  return (a.album < b.album) ? 1 : ((b.album < a.album) ? -1 : 0);
};
