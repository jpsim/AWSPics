const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const expect = chai.expect;

describe('siteBuilder uploadAlbumSite', function() {
  let ga;
  let putObjectFake;
  let siteBuilder;
  let uploadAlbumSite;

  before(function() {
    putObjectFake = sinon.fake();
    mock('aws-sdk', {
      CloudFront: function() {},
      S3: function() { return {putObject: putObjectFake}; }
    });

    mock('fs', {readFileSync: function(f) {
      if (f.includes('index.html')) {
        return (
          '<html>\n' +
          '<head>\n' +
          '{googletracking}\n' +
          '<title>{title}</title>\n' +
          '</head>\n' +
          '<body>\n' +
          '<h1>{title}</h1>\n' +
          '<p>{comment1}</p>\n' +
          '<p>{comment2}</p>\n' +
          '{pictures}\n' +
          '</body>\n' +
          '</html>\n'
        );
      }
      else {
        return 'lotsatext';
      }
    }});

    siteBuilder = rewire('../../site-builder/index');

    ga = siteBuilder.__get__('ga');
    uploadAlbumSite = siteBuilder.__get__('uploadAlbumSite');

    siteBuilder.__set__({
      walk: function(dir, done) {
        return done(null, [
          'album/foo/boo.txt',
          'album/index.html'
        ]);
      },
      delayBlock: function() {}
    });

    sinon.stub(console, 'log');

    process.env.GOOGLEANALYTICS = 'googleanalyticsfunkycode';
    process.env.SITE_BUCKET = 'johnnyphotos';
  });

  it('uploads album files to s3', function() {
    sinon.resetHistory();

    uploadAlbumSite(
      'summerinsicily',
      [
        'summerinsicily/agrigento.jpg',
        'summerinsicily/taormina.jpg'
      ],
      {
        title: 'Summer in Sicily',
        comment1: 'With my cat',
        comment2: 'And my llama'
      }
    );

    const picture1Markup = (
      "\t\t\t\t\t\t<article>\n" +
      "\t\t\t\t\t\t\t" +
      "<a class=\"thumbnail\" " +
      "href=\"/pics/resized/1200x750/summerinsicily/taormina.jpg\" " +
      "data-position=\"center\">" +
      "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
      "data-original=\"/pics/resized/360x225/summerinsicily/taormina.jpg\" " +
      "width=\"360\" height=\"225\"/></a>\n" +
      "<p><a href=\"/pics/original/summerinsicily/taormina.jpg\" download>" +
      "High Resolution Download</a></p>\n" +
      "\t\t\t\t\t\t</article>"
    );
    const picture2Markup = (
      "\t\t\t\t\t\t<article>\n" +
      "\t\t\t\t\t\t\t" +
      "<a class=\"thumbnail\" " +
      "href=\"/pics/resized/1200x750/summerinsicily/agrigento.jpg\" " +
      "data-position=\"center\">" +
      "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
      "data-original=\"/pics/resized/360x225/summerinsicily/agrigento.jpg\" " +
      "width=\"360\" height=\"225\"/></a>\n" +
      "<p><a href=\"/pics/original/summerinsicily/agrigento.jpg\" download>" +
      "High Resolution Download</a></p>\n" +
      "\t\t\t\t\t\t</article>"
    );

    const expectedIndexBody = (
      '<html>\n' +
      '<head>\n' +
      ga.replace(/\{gtag\}/g, 'googleanalyticsfunkycode') + '\n' +
      '<title>Summer in Sicily</title>\n' +
      '</head>\n' +
      '<body>\n' +
      '<h1>Summer in Sicily</h1>\n' +
      '<p>With my cat</p>\n' +
      '<p>And my llama</p>\n' +
      picture1Markup +
      picture2Markup + "\n" +
      '</body>\n' +
      '</html>\n'
    );

    const expectedErrorBody = (
      '<html>\n' +
      '<head>\n' +
      ga.replace(/\{gtag\}/g, 'googleanalyticsfunkycode') + '\n' +
      '<title>Error</title>\n' +
      '</head>\n' +
      '<body>\n' +
      '<h1>Error</h1>\n' +
      '<form action="https://johnnyphotos.com/Prod/login"></form>\n' +
      '</body>\n' +
      '</html>\n'
    );

    expect(putObjectFake).to.have.callCount(2);
    expect(console.log)
      .to.have.been.calledWith('Writing ALBUM summerinsicily');

    expect(putObjectFake).to.have.been.calledWith({
      Body: 'lotsatext',
      Bucket: 'johnnyphotos',
      ContentType: 'text/plain',
      Key: 'summerinsicily/foo/boo.txt'
    });

    expect(putObjectFake).to.have.been.calledWith({
      Body: expectedIndexBody,
      Bucket: 'johnnyphotos',
      ContentType: 'text/html',
      Key: 'summerinsicily/index.html'
    });
  });

  it('omits google analytics markup if no tracking code configured', function() {
    sinon.resetHistory();
    delete process.env.GOOGLEANALYTICS;

    uploadAlbumSite(
      null,
      [
        'summerinsicily/agrigento.jpg',
        'summerinsicily/taormina.jpg'
      ],
      {someIgnoredMetadata: 123}
    );

    const picture1Markup = (
      "\t\t\t\t\t\t<article>\n" +
      "\t\t\t\t\t\t\t" +
      "<a class=\"thumbnail\" " +
      "href=\"/pics/resized/1200x750/summerinsicily/taormina.jpg\" " +
      "data-position=\"center\">" +
      "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
      "data-original=\"/pics/resized/360x225/summerinsicily/taormina.jpg\" " +
      "width=\"360\" height=\"225\"/></a>\n" +
      "<p><a href=\"/pics/original/summerinsicily/taormina.jpg\" download>" +
      "High Resolution Download</a></p>\n" +
      "\t\t\t\t\t\t</article>"
    );
    const picture2Markup = (
      "\t\t\t\t\t\t<article>\n" +
      "\t\t\t\t\t\t\t" +
      "<a class=\"thumbnail\" " +
      "href=\"/pics/resized/1200x750/summerinsicily/agrigento.jpg\" " +
      "data-position=\"center\">" +
      "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
      "data-original=\"/pics/resized/360x225/summerinsicily/agrigento.jpg\" " +
      "width=\"360\" height=\"225\"/></a>\n" +
      "<p><a href=\"/pics/original/summerinsicily/agrigento.jpg\" download>" +
      "High Resolution Download</a></p>\n" +
      "\t\t\t\t\t\t</article>"
    );

    const expectedIndexBody = (
      '<html>\n' +
      '<head>\n\n' +
      '<title>null</title>\n' +
      '</head>\n' +
      '<body>\n' +
      '<h1>null</h1>\n' +
      '<p></p>\n' +
      '<p></p>\n' +
      picture1Markup +
      picture2Markup + "\n" +
      '</body>\n' +
      '</html>\n'
    );

    const expectedErrorBody = (
      '<html>\n' +
      '<head>\n\n' +
      '<title>Error</title>\n' +
      '</head>\n' +
      '<body>\n' +
      '<h1>Error</h1>\n' +
      '<form action="https://johnnyphotos.com/Prod/login"></form>\n' +
      '</body>\n' +
      '</html>\n'
    );

    expect(putObjectFake).to.have.callCount(2);
    expect(console.log)
      .to.have.been.calledWith('Writing ALBUM null');

    expect(putObjectFake).to.have.been.calledWith({
      Body: 'lotsatext',
      Bucket: 'johnnyphotos',
      ContentType: 'text/plain',
      Key: 'null/foo/boo.txt'
    });

    expect(putObjectFake).to.have.been.calledWith({
      Body: expectedIndexBody,
      Bucket: 'johnnyphotos',
      ContentType: 'text/html',
      Key: 'null/index.html'
    });

    process.env.GOOGLEANALYTICS = 'googleanalyticsfunkycode';
  });

  it('raises error if pictures is null', function() {
    expect(function() {
      uploadAlbumSite(
        'summerinsicily', null,
        {
          title: 'Summer in Sicily',
          comment1: 'With my cat',
          comment2: 'And my llama'
        }
      );
    }).to.throw(TypeError);
  });

  after(function() {
    mock.stop('aws-sdk');
    mock.stop('fs');

    sinon.restore();

    delete process.env.GOOGLEANALYTICS;
    delete process.env.SITE_BUCKET;
  });
});
