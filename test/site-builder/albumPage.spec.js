const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const expect = chai.expect;

describe('albumPage', function() {
  describe('uploadAlbumPage', function() {
    let putObjectFake;
    let delayBlockFake;
    let albumPage;

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
            '  <head>\n' +
            '{googletracking}\n' +
            '    <title>{title}</title>\n' +
            '  </head>\n' +
            '  <body>\n' +
            '    <h1>{title}</h1>\n' +
            '{comment1}\n' +
            '{comment2}\n' +
            '{pictures}\n' +
            '  </body>\n' +
            '</html>\n'
          );
        }
        else if (f.includes('picture.html')) {
          return (
            '    <article>\n' +
            '      <a href="/pics/resized/1200x750/{pictureFileName}">\n' +
            '        <img src="/pics/resized/360x225/{pictureFileName}" />\n' +
            '      </a>\n' +
            '      <p><a href="/{picsOriginalPath}{pictureFileName}">DL</a></p>\n' +
            '    </article>\n'
          );
        }
        else if (f.includes('ga.html')) {
          return "    <script>gtag('config', '{gtag}');</script>\n";
        }
        else {
          return 'lotsatext';
        }
      }});

      mock('../../site-builder/lib/fileUtils', {
        walk: function(dir, done) {
          return done(null, [
            'album/foo/boo.txt',
            'album/index.html',
            'album/snippets/picture.html'
          ]);
        }
      });

      delayBlockFake = sinon.fake();
      mock('../../site-builder/lib/delayUtils', {
        delayBlock: delayBlockFake
      });

      albumPage = rewire('../../site-builder/lib/albumPage');

      sinon.stub(console, 'log');

      process.env.GOOGLEANALYTICS = 'googleanalyticsfunkycode';
      process.env.SITE_BUCKET = 'johnnyphotos';
    });

    it('uploads album files to s3', function() {
      sinon.resetHistory();

      albumPage.uploadAlbumPage(
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
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/summerinsicily/taormina.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/summerinsicily/taormina.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/summerinsicily/taormina.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/summerinsicily/agrigento.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/summerinsicily/agrigento.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/summerinsicily/agrigento.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedIndexBody = (
        '<html>\n' +
        '\t<head>\n' +
        "\t\t<script>gtag('config', 'googleanalyticsfunkycode');</script>\n\n" +
        '\t\t<title>Summer in Sicily</title>\n' +
        '\t</head>\n' +
        '\t<body>\n' +
        '\t\t<h1>Summer in Sicily</h1>\n' +
        '<p>With my cat</p>\n' +
        '<p>And my llama</p>\n' +
        picture1Markup +
        picture2Markup + "\n" +
        '\t</body>\n' +
        '</html>\n'
      );

      expect(putObjectFake).to.have.callCount(2);
      expect(console.log)
        .to.have.been.calledWith('Writing album summerinsicily');

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

      expect(delayBlockFake.called).to.be.false;
    });

    it('omits google analytics markup if no tracking code configured', function() {
      sinon.resetHistory();
      delete process.env.GOOGLEANALYTICS;
      process.env.SPACES_INSTEAD_OF_TABS = true;
      process.env.PICTURE_SORT = 'desc';

      albumPage.uploadAlbumPage(
        null,
        [
          'summerinsicily/taormina.jpg',
          'summerinsicily/agrigento.jpg'
        ],
        {someIgnoredMetadata: 123},
        null,
        null,
        500
      );

      const picture1Markup = (
        "    <article>\n" +
        "      <a href=\"/pics/resized/1200x750/summerinsicily/taormina.jpg\">\n" +
        "        <img src=\"/pics/resized/360x225/summerinsicily/taormina.jpg\" />\n" +
        "      </a>\n" +
        "      <p><a href=\"/pics/original/summerinsicily/taormina.jpg\">DL</a></p>\n" +
        "    </article>\n"
      );
      const picture2Markup = (
        "    <article>\n" +
        "      <a href=\"/pics/resized/1200x750/summerinsicily/agrigento.jpg\">\n" +
        "        <img src=\"/pics/resized/360x225/summerinsicily/agrigento.jpg\" />\n" +
        "      </a>\n" +
        "      <p><a href=\"/pics/original/summerinsicily/agrigento.jpg\">DL</a></p>\n" +
        "    </article>\n"
      );

      const expectedIndexBody = (
        '<html>\n' +
        '  <head>\n\n' +
        '    <title>null</title>\n' +
        '  </head>\n' +
        '  <body>\n' +
        '    <h1>null</h1>\n\n\n' +
        picture1Markup +
        picture2Markup + "\n" +
        '  </body>\n' +
        '</html>\n'
      );

      expect(putObjectFake).to.have.callCount(2);
      expect(console.log).to.have.been.calledWith(
        "Written 500 albums, forcing a short delay before continuing"
      );
      expect(console.log)
        .to.have.been.calledWith('Writing album null');

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

      expect(delayBlockFake.called).to.be.true;

      process.env.GOOGLEANALYTICS = 'googleanalyticsfunkycode';
      delete process.env.SPACES_INSTEAD_OF_TABS;
      delete process.env.PICTURE_SORT;
    });

    it('raises error if pictures is null', function() {
      expect(function() {
        albumPage.uploadAlbumPage(
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
      mock.stop('../../site-builder/lib/fileUtils');
      mock.stop('../../site-builder/lib/delayUtils');

      sinon.restore();

      delete process.env.GOOGLEANALYTICS;
      delete process.env.SITE_BUCKET;
    });
  });
});
