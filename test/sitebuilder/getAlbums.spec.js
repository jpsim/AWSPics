const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');

const expect = chai.expect;

describe('siteBuilder getAlbums', function() {
  let siteBuilder;
  let getAlbums;

  before(function() {
    mock('aws-sdk', {
      CloudFront: function() {},
      S3: function() {}
    });

    siteBuilder = rewire('../../site-builder/index');

    getAlbums = siteBuilder.__get__('getAlbums');
  });

  it('returns albums and pictures from input data', function() {
    const data = [
      {Key: 'california2020/disneyland.jpg', LastModified: 20200106090000},
      {Key: 'california2020/napa.jpg', LastModified: 20200101090000},
      {Key: 'bluemtns2020/threesisters.png'},
      {Key: 'bluemtns2020/blackheath.jpg', LastModified: 20200102090000},
      {Key: 'bluemtns2020/jenolancaves.jpg', LastModified: null},
      {Key: 'funnyalbum/funnyfile.txt', LastModified: 20200109090000}
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
    expect(getAlbums(data)).to.eql(expectedAlbumsAndPictures);
  });

  it('returns empty lists from empty input', function() {
    expect(getAlbums([])).to.eql({albums: [], pictures: []});
  });

  it('raises error if passed null', function() {
    expect(function() { getAlbums(null); }).to.throw(TypeError);
  });

  it('raises error if array element is null', function() {
    expect(function() { getAlbums([null]); }).to.throw(TypeError);
  });

  it('raises error if array element is empty object', function() {
    expect(function() { getAlbums([{}]); }).to.throw(TypeError);
  });

  it('raises error if array element missing Key', function() {
    expect(function() { getAlbums([{LastModified: 'yesterday'}]); })
      .to.throw(TypeError);
  });

  after(function() {
    mock.stop('aws-sdk');
  });
});
