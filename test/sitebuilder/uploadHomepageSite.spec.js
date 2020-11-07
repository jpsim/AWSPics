const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const expect = chai.expect;

describe('siteBuilder uploadHomepageSite', function() {
  let ga;
  let putObjectFake;
  let siteBuilder;
  let uploadHomepageSite;

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
      else {
        return 'lotsatext';
      }
    }});

    siteBuilder = rewire('../../site-builder/index');

    ga = siteBuilder.__get__('ga');
    uploadHomepageSite = siteBuilder.__get__('uploadHomepageSite');

    siteBuilder.__set__({walk: function(dir, done) {
      return done(null, [
        'homepage/foo/hoo.txt',
        'homepage/index.html',
        'homepage/error.html'
      ]);
    }});

    process.env.GOOGLEANALYTICS = 'googleanalyticsfunkycode';
    process.env.SITE_BUCKET = 'johnnyphotos';
    process.env.WEBSITE = "johnnyphotos.com";
    process.env.WEBSITE_TITLE = "Johnny's Awesome Photos";
  });

  it('uploads homepage files to s3', function() {
    sinon.resetHistory();

    uploadHomepageSite(
      [
        'california2020',
        'bluemtns2020'
      ],
      [
        [
          'california2020/disneyland.jpg',
          'california2020/napa.jpg'
        ],
        [
          'bluemtns2020/threesisters.png',
          'bluemtns2020/blackheath.jpg',
          'bluemtns2020/jenolancaves.jpg'
        ]
      ],
      [{title: 'California 2020'}]
    );

    const album1Markup = (
      "\t\t\t\t\t\t<article class=\"thumb\">\n" +
      "\t\t\t\t\t\t\t<a href=\"california2020/index.html\" class=\"image\">" +
      "<img src=\"/pics/resized/1200x750/california2020/disneyland.jpg\" alt=\"\" />" +
      "</a>\n" +
      "\t\t\t\t\t\t\t<h2>California 2020</h2>\n" +
      "\t\t\t\t\t\t</article>"
    );
    const album2Markup = (
      "\t\t\t\t\t\t<article class=\"thumb\">\n" +
      "\t\t\t\t\t\t\t<a href=\"bluemtns2020/index.html\" class=\"image\">" +
      "<img src=\"/pics/resized/1200x750/bluemtns2020/threesisters.png\" alt=\"\" />" +
      "</a>\n" +
      "\t\t\t\t\t\t\t<h2>bluemtns2020</h2>\n" +
      "\t\t\t\t\t\t</article>"
    );

    const expectedIndexBody = (
      '<html>\n' +
      '<head>\n' +
      ga.replace(/\{gtag\}/g, 'googleanalyticsfunkycode') + '\n' +
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

    expect(putObjectFake).to.have.callCount(3);

    expect(putObjectFake).to.have.been.calledWith({
      Body: 'lotsatext',
      Bucket: 'johnnyphotos',
      ContentType: 'text/plain',
      Key: 'foo/hoo.txt'
    });

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
  });

  it('omits google analytics markup if no tracking code configured', function() {
    sinon.resetHistory();
    delete process.env.GOOGLEANALYTICS;

    uploadHomepageSite(
      ['bluemtns2020'], [['bluemtns2020/jenolancaves.jpg']], []
    );

    const albumMarkup = (
      "\t\t\t\t\t\t<article class=\"thumb\">\n" +
      "\t\t\t\t\t\t\t<a href=\"bluemtns2020/index.html\" class=\"image\">" +
      "<img src=\"/pics/resized/1200x750/bluemtns2020/jenolancaves.jpg\" alt=\"\" />" +
      "</a>\n" +
      "\t\t\t\t\t\t\t<h2>bluemtns2020</h2>\n" +
      "\t\t\t\t\t\t</article>"
    );

    const expectedIndexBody = (
      '<html>\n' +
      '<head>\n\n' +
      "<title>Johnny's Awesome Photos</title>\n" +
      '</head>\n' +
      '<body>\n' +
      "<h1>Johnny's Awesome Photos</h1>\n" +
      albumMarkup + "\n" +
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

    expect(putObjectFake).to.have.callCount(3);

    expect(putObjectFake).to.have.been.calledWith({
      Body: 'lotsatext',
      Bucket: 'johnnyphotos',
      ContentType: 'text/plain',
      Key: 'foo/hoo.txt'
    });

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

    process.env.GOOGLEANALYTICS = 'googleanalyticsfunkycode';
  });

  it('raises error if albums is null', function() {
    expect(function() {
      uploadHomepageSite(
        null, [['bluemtns2020/jenolancaves.jpg']], []
      );
    }).to.throw(TypeError);
  });

  it('raises error if pictures is null', function() {
    expect(function() {
      uploadHomepageSite(
        ['bluemtns2020'], null, []
      );
    }).to.throw(TypeError);
  });

  it('raises error if metadata is null', function() {
    expect(function() {
      uploadHomepageSite(
        ['bluemtns2020'], [['bluemtns2020/jenolancaves.jpg']], null
      );
    }).to.throw(TypeError);
  });

  after(function() {
    mock.stop('aws-sdk');
    mock.stop('fs');

    delete process.env.GOOGLEANALYTICS;
    delete process.env.SITE_BUCKET;
    delete process.env.WEBSITE;
    delete process.env.WEBSITE_TITLE;
  });
});
