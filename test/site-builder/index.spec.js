const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const expect = chai.expect;

describe('index', function() {
  describe('handler', function() {
    let siteBuilder;
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
                {Key: 'originaljohnny/carrotsincuba/carrots.jpg', LastModified: 20180808050000},
                {Key: 'originaljohnny/carrotsincuba/cuba.jpg', LastModified: 20180808020000},
                {Key: 'originaljohnny/carrotsincuba/havana.jpg', LastModified: 20180808090000}
              ]});
            }
            else {
              cb(null, {
                Contents: [
                  {Key: 'originaljohnny/bananasinbahamas/bananas.jpg', LastModified: 20180808080000},
                  {Key: 'originaljohnny/bananasinbahamas/bahamas.jpg', LastModified: 20180808030000}
                ],
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
            '{comment1}\n' +
            '{comment2}\n' +
            '{pictures}\n' +
            '</body>\n' +
            '</html>\n'
          );
        }
        else if (f.includes('album.html')) {
          return (
            '    <article>\n' +
            '      <a href="/{albumName}/index.html">\n' +
            '        <img src="/pics/resized/1200x750/{albumPicture}" />\n' +
            '      </a>\n' +
            '      <h2>{albumTitle}</h2>\n' +
            '    </article>\n'
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
        else {
          return 'lotsatext';
        }
      }});

      clock = sinon.useFakeTimers();

      mock('../../site-builder/lib/cloudfrontUtils', {
        invalidateCloudFront: function() {}
      });

      mock('../../site-builder/lib/delayUtils', {
        delayBlock: function() {}
      });

      mock('../../site-builder/lib/fileUtils', {
        walk: function(dir, done) {
          if (dir === 'homepage') {
            return done(null, [
              'homepage/snippets/album.html',
              'homepage/index.html',
              'homepage/error.html'
            ]);
          }
          else {
            return done(null, [
              'album/index.html',
              'album/snippets/picture.html'
            ]);
          }
        }
      });

      mock.reRequire('../../site-builder/lib/metadataUtils');
      mock.reRequire('../../site-builder/lib/homePage');

      siteBuilder = rewire('../../site-builder/index');

      sinon.stub(console, 'log');

      process.env.SITE_BUCKET = 'johnnyphotos';
      process.env.WEBSITE = "johnnyphotos.com";
      process.env.WEBSITE_TITLE = "Johnny's Awesome Photos";
      process.env.PICS_ORIGINAL_PATH = 'originaljohnny/';
    });

    it('publishes albums site based on pictures in source bucket', function() {
      sinon.resetHistory();
      process.env.PICTURE_SORT = 'asc';

      siteBuilder.handler(null, null);
      clock.tick(2000);

      const album1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/carrotsincuba/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/carrotsincuba/havana.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>carrotsincuba</h2>\n" +
        "\t\t</article>\n"
      );
      const album2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/bananasinbahamas/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/bananasinbahamas/bananas.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>Bananas in Bahamas</h2>\n" +
        "\t\t</article>\n"
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
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/bananasinbahamas/bahamas.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/bananasinbahamas/bahamas.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/originaljohnny/bananasinbahamas/bahamas.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/bananasinbahamas/bananas.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/bananasinbahamas/bananas.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/originaljohnny/bananasinbahamas/bananas.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
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
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/carrotsincuba/carrots.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/carrotsincuba/carrots.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/originaljohnny/carrotsincuba/carrots.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture4Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/carrotsincuba/cuba.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/carrotsincuba/cuba.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/originaljohnny/carrotsincuba/cuba.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture5Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/carrotsincuba/havana.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/carrotsincuba/havana.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/originaljohnny/carrotsincuba/havana.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedAlbum2IndexBody = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>carrotsincuba</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>carrotsincuba</h1>\n\n\n' +
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
          'S3 listing was truncated. Pausing 2 seconds before continuing 999'
        );
      expect(console.log)
        .to.have.been.calledWith('First album: bananasinbahamas');
      expect(console.log)
        .to.have.been.calledWith('Last album: carrotsincuba');
      expect(console.log)
        .to.have.been.calledWith('Writing album bananasinbahamas');
      expect(console.log)
        .to.have.been.calledWith('Writing album carrotsincuba');
    });

    after(function() {
      mock.stop('aws-sdk');
      mock.stop('fs');
      mock.stop('../../site-builder/lib/fileUtils');
      mock.stop('../../site-builder/lib/cloudfrontUtils');
      mock.stop('../../site-builder/lib/delayUtils');

      sinon.restore();
      clock.restore();

      delete process.env.SITE_BUCKET;
      delete process.env.WEBSITE;
      delete process.env.WEBSITE_TITLE;
      delete process.env.PICTURE_SORT;
      delete process.env.PICS_ORIGINAL_PATH;
    });
  });
});
