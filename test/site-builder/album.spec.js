const chai = require('chai');
const mock = require('mock-require');

const album = require('../../site-builder/lib/album');

const expect = chai.expect;

describe('album', function() {
  describe('getAlbums', function() {
    before(function() {
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() {}
      });
    });

    it('returns albums and pictures from input data', function() {
      const data = [
        {Key: 'pics/original/california2020/disneyland.jpg', LastModified: 20200106090000},
        {Key: 'pics/original/california2020/napa.jpg', LastModified: 20200101090000},
        {Key: 'pics/original/bluemtns2020/threesisters.png'},
        {Key: 'pics/original/bluemtns2020/blackheath.jpg', LastModified: 20200102090000},
        {Key: 'pics/original/bluemtns2020/jenolancaves.jpg', LastModified: null},
        {Key: 'pics/original/funnyalbum/funnyfile.txt', LastModified: 20200109090000}
      ];
      const expectedAlbumsAndPictures = {
        albums: [
          'california2020',
          'bluemtns2020',
          'funnyalbum'
        ],
        pictures: [
          [
            'california2020/disneyland.jpg',
            'california2020/napa.jpg'
          ],
          [
            'bluemtns2020/threesisters.png',
            'bluemtns2020/blackheath.jpg',
            'bluemtns2020/jenolancaves.jpg'
          ],
          []
        ]
      };
      expect(album.getAlbums(data)).to.eql(expectedAlbumsAndPictures);
    });

    it('returns empty lists from empty input', function() {
      expect(album.getAlbums([])).to.eql({albums: [], pictures: []});
    });

    it('raises error if passed null', function() {
      expect(function() { album.getAlbums(null); }).to.throw(TypeError);
    });

    it('raises error if array element is null', function() {
      expect(function() { album.getAlbums([null]); }).to.throw(TypeError);
    });

    it('raises error if array element is empty object', function() {
      expect(function() { album.getAlbums([{}]); }).to.throw(TypeError);
    });

    it('raises error if array element missing Key', function() {
      expect(function() { album.getAlbums([{LastModified: 'yesterday'}]); })
        .to.throw(TypeError);
    });

    after(function() {
      mock.stop('aws-sdk');
    });
  });

  describe('getAlbumsByCollection', function() {
    before(function() {
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() {}
      });
    });

    it('returns albums and pictures by collection from input data', function() {
      const data = [
        {Key: 'pics/original/cruisy2019/borisbirthday/cake.jpg'},
        {Key: 'pics/original/whatayear2020/california2020/disneyland.jpg'},
        {Key: 'pics/original/whatayear2020/bluemtns2020/threesisters.png'},
        {Key: 'pics/original/whatayear2020/bluemtns2020/blackheath.jpg'}
      ];
      const expectedAlbumsPicturesCollections = {
        albumsByCollection: [
          {collection: 'cruisy2019', albums: ['cruisy2019/borisbirthday']},
          {
            collection: 'whatayear2020',
            albums: [
              'whatayear2020/california2020',
              'whatayear2020/bluemtns2020'
            ]
          }
        ],
        pictures: [
          [['cruisy2019/borisbirthday/cake.jpg']],
          [
            ['whatayear2020/california2020/disneyland.jpg'],
            [
              'whatayear2020/bluemtns2020/threesisters.png',
              'whatayear2020/bluemtns2020/blackheath.jpg'
            ]
          ]
        ]
      };
      expect(album.getAlbumsByCollection(data))
        .to.eql(expectedAlbumsPicturesCollections);
    });

    after(function() {
      mock.stop('aws-sdk');
    });
  });
});
