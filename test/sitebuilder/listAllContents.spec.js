const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const expect = chai.expect;

describe('siteBuilder listAllContents', function() {
  let siteBuilder;
  let handler;
  let putObjectFake;
  let clock;

  before(function() {
    putObjectFake = sinon.fake();
    mock('aws-sdk', {
      CloudFront: function() {},
      S3: function() { return {
        listObjectsV2: function(params, cb) {
          if (params.ContinuationToken) {
            cb(null, {Contents: [
              {Key: 'bananasinbahamas/bananas.jpg', LastModified: 20180808080000},
              {Key: 'bananasinbahamas/bahamas.jpg', LastModified: 20180808030000},
              {Key: 'carrotsincuba/carrots.jpg', LastModified: 20180808050000},
              {Key: 'carrotsincuba/cuba.jpg', LastModified: 20180808020000},
              {Key: 'carrotsincuba/havana.jpg', LastModified: 20180808090000}
            ]});
          }
          else {
            cb(null, {
              Contents: [],
              IsTruncated: true,
              NextContinuationToken: 999
            });
          }
        },
        getObject: function(params, cb) {
          const key = params.Key;

          if (key.includes('bananasinbahamas')) {
            cb(null, {Body: (
              'title: Bananas in Bahamas\n' +
              'comment1: Oh the sunshine\n' +
              'comment2: Upon my pineapple\n'
            )});
          }
          else {
            cb(true, null);
          }
        },
        putObject: putObjectFake
      }; }
    });

    mock('fs', {readFileSync: function(f) {
      if (f.includes('homepage/index.html')) {
        return (
          '<html>\n' +
          '<head>\n' +
          '{googletracking}\n' +
          '<title>{title}</title>\n' +
          '</head>\n' +
          '<body>\n' +
          '<h1>{title}</h1>\n' +
          '{pictures}\n' +
          '</body>\n' +
          '</html>\n'
        );
      }
      else if (f.includes('error.html')) {
        return (
          '<html>\n' +
          '<head>\n' +
          '{googletracking}\n' +
          '<title>Error</title>\n' +
          '</head>\n' +
          '<body>\n' +
          '<h1>Error</h1>\n' +
          '<form action="https://{website}/Prod/login"></form>\n' +
          '</body>\n' +
          '</html>\n'
        );
      }
      else if (f.includes('album/index.html')) {
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

    clock = sinon.useFakeTimers();

    siteBuilder = rewire('../../site-builder/index');

    handler = siteBuilder.handler;

    siteBuilder.__set__({
      walk: function(dir, done) {
        if (dir === 'homepage') {
          return done(null, [
            'homepage/index.html',
            'homepage/error.html'
          ]);
        }
        else {
          return done(null, ['album/index.html']);
        }
      },
      invalidateCloudFront: function() {},
      delayBlock: function() {}
    });

    sinon.stub(console, 'log');

    process.env.SITE_BUCKET = 'johnnyphotos';
    process.env.WEBSITE = "johnnyphotos.com";
    process.env.WEBSITE_TITLE = "Johnny's Awesome Photos";
  });

  it('publishes albums site based on pictures in source bucket', function() {
    sinon.resetHistory();

    handler(null, null);
    clock.tick(2000);

    const album1Markup = (
      "\t\t\t\t\t\t<article class=\"thumb\">\n" +
      "\t\t\t\t\t\t\t<a href=\"carrotsincuba/index.html\" class=\"image\">" +
      "<img src=\"/pics/resized/1200x750/carrotsincuba/havana.jpg\" alt=\"\" />" +
      "</a>\n" +
      "\t\t\t\t\t\t\t<h2>carrotsincuba</h2>\n" +
      "\t\t\t\t\t\t</article>"
    );
    const album2Markup = (
      "\t\t\t\t\t\t<article class=\"thumb\">\n" +
      "\t\t\t\t\t\t\t<a href=\"bananasinbahamas/index.html\" class=\"image\">" +
      "<img src=\"/pics/resized/1200x750/bananasinbahamas/bananas.jpg\" alt=\"\" />" +
      "</a>\n" +
      "\t\t\t\t\t\t\t<h2>Bananas in Bahamas</h2>\n" +
      "\t\t\t\t\t\t</article>"
    );

    const expectedIndexBody = (
      '<html>\n' +
      '<head>\n\n' +
      "<title>Johnny's Awesome Photos</title>\n" +
      '</head>\n' +
      '<body>\n' +
      "<h1>Johnny's Awesome Photos</h1>\n" +
      album1Markup +
      album2Markup + "\n" +
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

    const picture1Markup = (
      "\t\t\t\t\t\t<article>\n" +
      "\t\t\t\t\t\t\t" +
      "<a class=\"thumbnail\" " +
      "href=\"/pics/resized/1200x750/bananasinbahamas/bahamas.jpg\" " +
      "data-position=\"center\">" +
      "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
      "data-original=\"/pics/resized/360x225/bananasinbahamas/bahamas.jpg\" " +
      "width=\"360\" height=\"225\"/></a>\n" +
      "<p><a href=\"/pics/original/bananasinbahamas/bahamas.jpg\" download>" +
      "High Resolution Download</a></p>\n" +
      "\t\t\t\t\t\t</article>"
    );
    const picture2Markup = (
      "\t\t\t\t\t\t<article>\n" +
      "\t\t\t\t\t\t\t" +
      "<a class=\"thumbnail\" " +
      "href=\"/pics/resized/1200x750/bananasinbahamas/bananas.jpg\" " +
      "data-position=\"center\">" +
      "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
      "data-original=\"/pics/resized/360x225/bananasinbahamas/bananas.jpg\" " +
      "width=\"360\" height=\"225\"/></a>\n" +
      "<p><a href=\"/pics/original/bananasinbahamas/bananas.jpg\" download>" +
      "High Resolution Download</a></p>\n" +
      "\t\t\t\t\t\t</article>"
    );

    const expectedAlbum1IndexBody = (
      '<html>\n' +
      '<head>\n\n' +
      '<title>Bananas in Bahamas</title>\n' +
      '</head>\n' +
      '<body>\n' +
      '<h1>Bananas in Bahamas</h1>\n' +
      '<p>Oh the sunshine</p>\n' +
      '<p>Upon my pineapple</p>\n' +
      picture1Markup +
      picture2Markup + "\n" +
      '</body>\n' +
      '</html>\n'
    );

    const picture3Markup = (
      "\t\t\t\t\t\t<article>\n" +
      "\t\t\t\t\t\t\t" +
      "<a class=\"thumbnail\" " +
      "href=\"/pics/resized/1200x750/carrotsincuba/cuba.jpg\" " +
      "data-position=\"center\">" +
      "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
      "data-original=\"/pics/resized/360x225/carrotsincuba/cuba.jpg\" " +
      "width=\"360\" height=\"225\"/></a>\n" +
      "<p><a href=\"/pics/original/carrotsincuba/cuba.jpg\" download>" +
      "High Resolution Download</a></p>\n" +
      "\t\t\t\t\t\t</article>"
    );
    const picture4Markup = (
      "\t\t\t\t\t\t<article>\n" +
      "\t\t\t\t\t\t\t" +
      "<a class=\"thumbnail\" " +
      "href=\"/pics/resized/1200x750/carrotsincuba/carrots.jpg\" " +
      "data-position=\"center\">" +
      "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
      "data-original=\"/pics/resized/360x225/carrotsincuba/carrots.jpg\" " +
      "width=\"360\" height=\"225\"/></a>\n" +
      "<p><a href=\"/pics/original/carrotsincuba/carrots.jpg\" download>" +
      "High Resolution Download</a></p>\n" +
      "\t\t\t\t\t\t</article>"
    );
    const picture5Markup = (
      "\t\t\t\t\t\t<article>\n" +
      "\t\t\t\t\t\t\t" +
      "<a class=\"thumbnail\" " +
      "href=\"/pics/resized/1200x750/carrotsincuba/havana.jpg\" " +
      "data-position=\"center\">" +
      "<img class=\"lazy\" src=\"assets/css/images/placeholder.png\" " +
      "data-original=\"/pics/resized/360x225/carrotsincuba/havana.jpg\" " +
      "width=\"360\" height=\"225\"/></a>\n" +
      "<p><a href=\"/pics/original/carrotsincuba/havana.jpg\" download>" +
      "High Resolution Download</a></p>\n" +
      "\t\t\t\t\t\t</article>"
    );

    const expectedAlbum2IndexBody = (
      '<html>\n' +
      '<head>\n\n' +
      '<title>carrotsincuba</title>\n' +
      '</head>\n' +
      '<body>\n' +
      '<h1>carrotsincuba</h1>\n' +
      '<p></p>\n' +
      '<p></p>\n' +
      picture3Markup +
      picture4Markup +
      picture5Markup + "\n" +
      '</body>\n' +
      '</html>\n'
    );

    expect(putObjectFake).to.have.callCount(4);

    expect(putObjectFake).to.have.been.calledWith({
      Body: expectedIndexBody,
      Bucket: 'johnnyphotos',
      ContentType: 'text/html',
      Key: 'index.html'
    });

    expect(putObjectFake).to.have.been.calledWith({
      Body: expectedErrorBody,
      Bucket: 'johnnyphotos',
      ContentType: 'text/html',
      Key: 'error.html'
    });

    expect(putObjectFake).to.have.been.calledWith({
      Body: expectedAlbum1IndexBody,
      Bucket: 'johnnyphotos',
      ContentType: 'text/html',
      Key: 'bananasinbahamas/index.html'
    });

    expect(putObjectFake).to.have.been.calledWith({
      Body: expectedAlbum2IndexBody,
      Bucket: 'johnnyphotos',
      ContentType: 'text/html',
      Key: 'carrotsincuba/index.html'
    });

    expect(console.log).to.have.callCount(5);
    expect(console.log)
      .to.have.been.calledWith(
        'S3 listing was truncated. Pausing 2 sec before continuing 999'
      );
    expect(console.log)
      .to.have.been.calledWith('First Album: bananasinbahamas');
    expect(console.log)
      .to.have.been.calledWith('Last Album: carrotsincuba');
    expect(console.log)
      .to.have.been.calledWith('Writing ALBUM bananasinbahamas');
    expect(console.log)
      .to.have.been.calledWith('Writing ALBUM carrotsincuba');
  });

  after(function() {
    mock.stop('aws-sdk');
    mock.stop('fs');

    sinon.restore();
    clock.restore();

    delete process.env.SITE_BUCKET;
    delete process.env.WEBSITE;
    delete process.env.WEBSITE_TITLE;
  });
});
