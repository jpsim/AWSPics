const DEFAULT_PICS_ORIGINAL_PATH = 'pics/original/';


const getPicsOriginalPath = exports.getPicsOriginalPath = function() {
  if (process.env.PICS_ORIGINAL_PATH) {
    return process.env.PICS_ORIGINAL_PATH;
  }

  return DEFAULT_PICS_ORIGINAL_PATH;
};

exports.stripPrefix = function(object) {
  return object.Key.replace(getPicsOriginalPath(), '');
};

// Test if object is empty or not
exports.isEmpty = function(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }

  return true;
};

exports.spacesToTabs = function(text) {
  return text.replace(/  /g, '\t');
};
