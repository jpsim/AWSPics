'use strict';

var expect   = require('chai').expect;
var htpasswd = require('../index');
var fs       = require('fs');

describe('htpasswd', function () {
  it('returns false with an empty htpasswd', function () {
    let fixture = fs.readFileSync('./test/fixtures/blank', 'utf8');
    return htpasswd.authenticate('dickeyxxx', 'pass', fixture)
    .then(function (auth) {
      return expect(auth).to.be.false;
    });
  });

  it('supports md5', function () {
    let fixture = fs.readFileSync('./test/fixtures/md5', 'utf8');
    return htpasswd.authenticate('dickeyxxx', 'pass', fixture)
    .then(function (auth) {
      return expect(auth).to.be.true;
    });
  });

  it('supports bcrypt', function () {
    let fixture = fs.readFileSync('./test/fixtures/bcrypt', 'utf8');
    return htpasswd.authenticate('dickeyxxx', 'pass', fixture)
    .then(function (auth) {
      return expect(auth).to.be.true;
    });
  });

  it('supports sha1', function () {
    let fixture = fs.readFileSync('./test/fixtures/sha1', 'utf8');
    return htpasswd.authenticate('dickeyxxx', 'pass', fixture)
    .then(function (auth) {
      return expect(auth).to.be.true;
    });
  });

  it('supports crypt', function () {
    let fixture = fs.readFileSync('./test/fixtures/crypt', 'utf8');
    return htpasswd.authenticate('dickeyxxx', 'pass', fixture)
    .then(function (auth) {
      return expect(auth).to.be.true;
    });
  });
});
