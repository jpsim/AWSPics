'use strict';

var md5    = require('apache-md5');
var crypt  = require('apache-crypt');
var bcrypt = require('bcrypt');
var crypto = require('crypto');

function sha1 (password) {
  var hash = crypto.createHash('sha1');
  hash.update(password);
  return hash.digest('base64');
}

function checkPassword (digest, password) {
  return new Promise(function (fulfill, reject) {
    if (digest.substr(0, 6) === '$apr1$') {
      fulfill(digest === md5(password, digest));
    } else if (digest.substr(0, 4) === '$2y$') {
      digest = '$2a$'+digest.substr(4);
      bcrypt.compare(password, digest, function (err, res) {
        if (err) { return reject(err); }
        fulfill(res);
      });
    } else if (digest.substr(0, 5) === '{SHA}') {
      fulfill('{SHA}'+sha1(password) === digest);
    } else if (digest === password) {
      fulfill(true);
    } else {
      fulfill(crypt(password, digest) === digest);
    }
  });
}

function authenticate (username, password, htpasswd) {
  return new Promise(function (fulfill) {
    var lines = htpasswd.split('\n');
    lines.forEach(function (line) {
      line = line.split(':');
      if (line[0] === username) {
        fulfill(checkPassword(line[1], password));
      }
    });
    fulfill(false);
  });
}

exports.authenticate = authenticate;
