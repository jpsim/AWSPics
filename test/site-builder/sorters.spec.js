const chai = require('chai');
const mock = require('mock-require');

const sorters = require('../../site-builder/lib/sorters');

const expect = chai.expect;

describe('sorters', function() {
  describe('albumSorter', function() {
    before(function() {
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() {}
      });
    });

    it('sorts by album in ascending order', function() {
      const albumsAndStuff = [
        {album: 'ccc'},
        {album: 'bbb'},
        {album: 'ddd'},
        {album: 'bbb'},
        {album: 'aaa'}
      ];

      albumsAndStuff.sort(sorters.albumAscSorter);

      expect(albumsAndStuff).to.eql([
        {album: 'aaa'},
        {album: 'bbb'},
        {album: 'bbb'},
        {album: 'ccc'},
        {album: 'ddd'}
      ]);
    });

    it('sorts by album in descending order', function() {
      const albumsAndStuff = [
        {album: 'ccc'},
        {album: 'bbb'},
        {album: 'ddd'},
        {album: 'bbb'},
        {album: 'aaa'}
      ];

      albumsAndStuff.sort(sorters.albumDescSorter);

      expect(albumsAndStuff).to.eql([
        {album: 'ddd'},
        {album: 'ccc'},
        {album: 'bbb'},
        {album: 'bbb'},
        {album: 'aaa'}
      ]);
    });

    after(function() {
      mock.stop('aws-sdk');
    });
  });
});
