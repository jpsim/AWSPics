const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const expect = chai.expect;

describe('uploadContents', function() {
  describe('uploadAllContentsByCollection', function() {
    let uploadContents;
    let putObjectFake;

    before(function() {
      putObjectFake = sinon.fake();
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() { return {
          getObject: function(params, cb) {
            const key = params.Key;

            if (key === 'pics/original/whitewinter/soggysundays/metadata.yml') {
              cb(null, {Body: (
                'title: Soggy Sundays\n'
              )});
            }
            else if (key === 'pics/original/whitewinter/metadata.yml') {
              cb(null, {Body: (
                'title: White Winter\n' +
                'comment1: Oh it was so white\n' +
                'comment2: So very whitey white\n' +
                'cover_image: soggysundays/rainy.jpg\n'
              )});
            }
            else if (key === 'pics/original/artyautumn/metadata.yml') {
              cb(null, {Body: 'comment2: All the leaves are brown\n'});
            }
            else if (key === 'pics/original/moo/metadata.yml') {
              cb(null, {Body: 'comment1: Said the cow\n'});
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
            '{nav}\n' +
            '{pictures}\n' +
            '{footer}\n' +
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
        else if (f.includes('nav.html')) {
          return '{navLink}\n';
        }
        else if (f.includes('footer.html')) {
          return (
            '<footer>\n' +
            '{footerContent}\n' +
            '</footer>\n'
          );
        }
        else if (f.includes('main.css')) {
          return 'cssgoeshere';
        }
        else if (f.includes('album.css')) {
          return 'albumcssgoeshere';
        }
        else {
          return 'lotsatext';
        }
      }});

      mock('../../site-builder/lib/fileUtils', {
        walk: function(dir, done) {
          if (dir === 'homepage') {
            return done(null, [
              'homepage/snippets/album.html',
              'homepage/index.html',
              'homepage/error.html',
              'homepage/foo/shoo.txt',
              'homepage/assets/css/main.css'
            ]);
          }
          else {
            return done(null, [
              'album/index.html',
              'album/snippets/picture.html',
              'album/assets/css/album.css'
            ]);
          }
        }
      });

      mock('../../site-builder/lib/cloudfrontUtils', {
        invalidateCloudFront: function() {}
      });

      mock('../../site-builder/lib/delayUtils', {
        delayBlock: function() {}
      });

      mock.reRequire('../../site-builder/lib/metadataUtils');
      mock.reRequire('../../site-builder/lib/homePage');
      mock.reRequire('../../site-builder/lib/albumPage');
      mock.reRequire('../../site-builder/lib/collectionPage');

      uploadContents = rewire('../../site-builder/lib/uploadContents');

      sinon.stub(console, 'log');

      process.env.SITE_BUCKET = 'johnnyphotos';
      process.env.WEBSITE = "johnnyphotos.com";
      process.env.WEBSITE_TITLE = "Johnny's Awesome Photos";
      process.env.GROUP_ALBUMS_INTO_COLLECTIONS = true;
    });

    it('publishes albums grouped into collections', function() {
      sinon.resetHistory();

      const allContents = [
        {Key: 'pics/original/whitewinter/metadata.yml'},
        {
          Key: 'pics/original/whitewinter/muggymondays/mist.jpg',
          LastModified: 20180404000000
        },
        {
          Key: 'pics/original/whitewinter/muggymondays/fog.jpg',
          LastModified: 20180403000000
        },
        {Key: 'pics/original/whitewinter/soggysundays/metadata.yml'},
        {
          Key: 'pics/original/whitewinter/soggysundays/wet.jpg',
          LastModified: 20180406000000
        },
        {
          Key: 'pics/original/whitewinter/soggysundays/rainy.jpg',
          LastModified: 20180402000000
        },
        {
          Key: 'pics/original/whitewinter/soggysundays/dreary.jpg',
          LastModified: 20180401000000
        },
        {Key: 'pics/original/artyautumn/terrifictrees/oak.jpg'},
        {Key: 'pics/original/artyautumn/terrifictrees/birch.jpg'},
        {Key: 'pics/original/artyautumn/boisterousbirds/galah.jpg'},
        {Key: 'pics/original/moo/metadata.yml'},
        {Key: 'pics/original/moo/boo/zoo.jpg'}
      ];

      uploadContents.uploadAllContents(allContents);

      const coll1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/whitewinter/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/whitewinter/soggysundays/rainy.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>White Winter</h2>\n" +
        "\t\t</article>\n"
      );
      const coll2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/artyautumn/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/artyautumn/terrifictrees/oak.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>artyautumn</h2>\n" +
        "\t\t</article>\n"
      );
      const coll3Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/moo/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/moo/boo/zoo.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>moo</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedIndexBody = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>Johnny's Awesome Photos</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>Johnny's Awesome Photos</h1>\n" +
        '<a href="https://html5up.net">Design: HTML5 UP</a>\n\n' +
        coll1Markup +
        coll2Markup +
        coll3Markup + "\n\n" +
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

      const coll1album1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/artyautumn/terrifictrees/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/artyautumn/terrifictrees/oak.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>terrifictrees</h2>\n" +
        "\t\t</article>\n"
      );
      const coll1album2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/artyautumn/boisterousbirds/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/artyautumn/boisterousbirds/galah.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>boisterousbirds</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedColl1Body = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>artyautumn</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>artyautumn</h1>\n" +
        '<a href="#footer" class="icon solid fa-info-circle"></a>\n\n' +
        coll1album1Markup +
        coll1album2Markup + "\n" +
        "<footer>\n" +
        "<p>All the leaves are brown</p>\n" +
        '<p><a href="/">Back to Johnny\'s Awesome Photos</a></p>\n\n' +
        "</footer>\n\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/artyautumn/boisterousbirds/galah.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/artyautumn/boisterousbirds/galah.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/artyautumn/boisterousbirds/galah.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl1Album1Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>boisterousbirds</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>boisterousbirds</h1>\n\n\n' +
        picture1Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/artyautumn/terrifictrees/birch.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/artyautumn/terrifictrees/birch.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/artyautumn/terrifictrees/birch.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture3Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/artyautumn/terrifictrees/oak.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/artyautumn/terrifictrees/oak.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/artyautumn/terrifictrees/oak.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl1Album2Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>terrifictrees</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>terrifictrees</h1>\n\n\n' +
        picture2Markup +
        picture3Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const coll2album1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/whitewinter/muggymondays/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/whitewinter/muggymondays/mist.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>muggymondays</h2>\n" +
        "\t\t</article>\n"
      );
      const coll2album2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/whitewinter/soggysundays/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/whitewinter/soggysundays/wet.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>Soggy Sundays</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedColl2Body = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>White Winter</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>White Winter</h1>\n" +
        '<a href="#footer" class="icon solid fa-info-circle"></a>\n\n' +
        coll2album1Markup +
        coll2album2Markup + "\n" +
        "<footer>\n" +
        "<p>Oh it was so white</p>\n" +
        "<p>So very whitey white</p>\n" +
        '<p><a href="/">Back to Johnny\'s Awesome Photos</a></p>\n\n' +
        "</footer>\n\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture4Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/soggysundays/dreary.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/soggysundays/dreary.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/soggysundays/dreary.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture5Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/soggysundays/rainy.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/soggysundays/rainy.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/soggysundays/rainy.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture6Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/soggysundays/wet.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/soggysundays/wet.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/soggysundays/wet.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl2Album1Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>Soggy Sundays</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>Soggy Sundays</h1>\n\n\n' +
        picture4Markup +
        picture5Markup +
        picture6Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture7Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/muggymondays/fog.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/muggymondays/fog.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/muggymondays/fog.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture8Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/muggymondays/mist.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/muggymondays/mist.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/muggymondays/mist.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl2Album2Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>muggymondays</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>muggymondays</h1>\n\n\n' +
        picture7Markup +
        picture8Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const coll3album1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/moo/boo/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/moo/boo/zoo.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>boo</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedColl3Body = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>moo</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>moo</h1>\n" +
        '<a href="#footer" class="icon solid fa-info-circle"></a>\n\n' +
        coll3album1Markup + "\n" +
        "<footer>\n" +
        "<p>Said the cow</p>\n" +
        '<p><a href="/">Back to Johnny\'s Awesome Photos</a></p>\n\n' +
        "</footer>\n\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture9Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/moo/boo/zoo.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/moo/boo/zoo.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/moo/boo/zoo.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl3Album1Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>boo</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>boo</h1>\n\n\n' +
        picture9Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      expect(putObjectFake).to.have.callCount(13);

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
        Body: 'lotsatext',
        Bucket: 'johnnyphotos',
        ContentType: 'text/plain',
        Key: 'foo/shoo.txt'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: 'cssgoeshere',
        Bucket: 'johnnyphotos',
        ContentType: 'text/css',
        Key: 'assets/homepage/css/main.css'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: 'albumcssgoeshere',
        Bucket: 'johnnyphotos',
        ContentType: 'text/css',
        Key: 'assets/album/css/album.css'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'artyautumn/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl1Album1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'artyautumn/boisterousbirds/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl1Album2Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'artyautumn/terrifictrees/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl2Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'whitewinter/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl2Album1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'whitewinter/soggysundays/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl2Album2Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'whitewinter/muggymondays/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl3Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'moo/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl3Album1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'moo/boo/index.html'
      });

      expect(console.log).to.have.callCount(16);

      expect(console.log)
        .to.have.been.calledWith('First collection: moo');
      expect(console.log)
        .to.have.been.calledWith('Last collection: whitewinter');
      expect(console.log)
        .to.have.been.calledWith('First album in moo: boo');
      expect(console.log)
        .to.have.been.calledWith('Last album in moo: boo');
      expect(console.log)
        .to.have.been.calledWith('Writing collection moo');
      expect(console.log)
        .to.have.been.calledWith('Writing album boo');
      expect(console.log)
        .to.have.been.calledWith('First album in artyautumn: boisterousbirds');
      expect(console.log)
        .to.have.been.calledWith('Last album in artyautumn: terrifictrees');
      expect(console.log)
        .to.have.been.calledWith('Writing collection artyautumn');
      expect(console.log)
        .to.have.been.calledWith('Writing album boisterousbirds');
      expect(console.log)
        .to.have.been.calledWith('Writing album terrifictrees');
      expect(console.log)
        .to.have.been.calledWith('First album in whitewinter: soggysundays');
      expect(console.log)
        .to.have.been.calledWith('Last album in whitewinter: muggymondays');
      expect(console.log)
        .to.have.been.calledWith('Writing collection whitewinter');
      expect(console.log)
        .to.have.been.calledWith('Writing album soggysundays');
      expect(console.log)
        .to.have.been.calledWith('Writing album muggymondays');
    });

    it('publishes albums grouped into collections descending', function() {
      sinon.resetHistory();

      process.env.COLLECTION_SORT = 'desc';
      process.env.ALBUM_SORT = 'asc';

      const allContents = [
        {Key: 'pics/original/whitewinter/metadata.yml'},
        {
          Key: 'pics/original/whitewinter/muggymondays/mist.jpg',
          LastModified: 20180404000000
        },
        {
          Key: 'pics/original/whitewinter/muggymondays/fog.jpg',
          LastModified: 20180403000000
        },
        {Key: 'pics/original/whitewinter/soggysundays/metadata.yml'},
        {
          Key: 'pics/original/whitewinter/soggysundays/wet.jpg',
          LastModified: 20180406000000
        },
        {
          Key: 'pics/original/whitewinter/soggysundays/rainy.jpg',
          LastModified: 20180402000000
        },
        {
          Key: 'pics/original/whitewinter/soggysundays/dreary.jpg',
          LastModified: 20180401000000
        },
        {Key: 'pics/original/artyautumn/terrifictrees/oak.jpg'},
        {Key: 'pics/original/artyautumn/terrifictrees/birch.jpg'},
        {Key: 'pics/original/artyautumn/boisterousbirds/galah.jpg'},
      ];

      uploadContents.uploadAllContents(allContents);

      const coll1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/whitewinter/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/whitewinter/soggysundays/rainy.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>White Winter</h2>\n" +
        "\t\t</article>\n"
      );
      const coll2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/artyautumn/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/artyautumn/terrifictrees/oak.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>artyautumn</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedIndexBody = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>Johnny's Awesome Photos</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>Johnny's Awesome Photos</h1>\n" +
        '<a href="https://html5up.net">Design: HTML5 UP</a>\n\n' +
        coll1Markup +
        coll2Markup + "\n\n" +
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

      const coll1album1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/artyautumn/boisterousbirds/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/artyautumn/boisterousbirds/galah.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>boisterousbirds</h2>\n" +
        "\t\t</article>\n"
      );
      const coll1album2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/artyautumn/terrifictrees/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/artyautumn/terrifictrees/oak.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>terrifictrees</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedColl1Body = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>artyautumn</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>artyautumn</h1>\n" +
        '<a href="#footer" class="icon solid fa-info-circle"></a>\n\n' +
        coll1album1Markup +
        coll1album2Markup + "\n" +
        "<footer>\n" +
        "<p>All the leaves are brown</p>\n" +
        '<p><a href="/">Back to Johnny\'s Awesome Photos</a></p>\n\n' +
        "</footer>\n\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/artyautumn/boisterousbirds/galah.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/artyautumn/boisterousbirds/galah.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/artyautumn/boisterousbirds/galah.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl1Album1Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>boisterousbirds</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>boisterousbirds</h1>\n\n\n' +
        picture1Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/artyautumn/terrifictrees/birch.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/artyautumn/terrifictrees/birch.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/artyautumn/terrifictrees/birch.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture3Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/artyautumn/terrifictrees/oak.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/artyautumn/terrifictrees/oak.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/artyautumn/terrifictrees/oak.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl1Album2Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>terrifictrees</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>terrifictrees</h1>\n\n\n' +
        picture2Markup +
        picture3Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const coll2album1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/whitewinter/muggymondays/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/whitewinter/muggymondays/mist.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>muggymondays</h2>\n" +
        "\t\t</article>\n"
      );
      const coll2album2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/whitewinter/soggysundays/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/whitewinter/soggysundays/wet.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>Soggy Sundays</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedColl2Body = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>White Winter</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>White Winter</h1>\n" +
        '<a href="#footer" class="icon solid fa-info-circle"></a>\n\n' +
        coll2album1Markup +
        coll2album2Markup + "\n" +
        "<footer>\n" +
        "<p>Oh it was so white</p>\n" +
        "<p>So very whitey white</p>\n" +
        '<p><a href="/">Back to Johnny\'s Awesome Photos</a></p>\n\n' +
        "</footer>\n\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture4Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/soggysundays/dreary.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/soggysundays/dreary.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/soggysundays/dreary.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture5Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/soggysundays/rainy.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/soggysundays/rainy.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/soggysundays/rainy.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture6Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/soggysundays/wet.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/soggysundays/wet.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/soggysundays/wet.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl2Album1Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>Soggy Sundays</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>Soggy Sundays</h1>\n\n\n' +
        picture4Markup +
        picture5Markup +
        picture6Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture7Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/muggymondays/fog.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/muggymondays/fog.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/muggymondays/fog.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture8Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/muggymondays/mist.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/muggymondays/mist.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/muggymondays/mist.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl2Album2Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>muggymondays</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>muggymondays</h1>\n\n\n' +
        picture7Markup +
        picture8Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      expect(putObjectFake).to.have.callCount(11);

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
        Body: 'lotsatext',
        Bucket: 'johnnyphotos',
        ContentType: 'text/plain',
        Key: 'foo/shoo.txt'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: 'cssgoeshere',
        Bucket: 'johnnyphotos',
        ContentType: 'text/css',
        Key: 'assets/homepage/css/main.css'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: 'albumcssgoeshere',
        Bucket: 'johnnyphotos',
        ContentType: 'text/css',
        Key: 'assets/album/css/album.css'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'artyautumn/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl1Album1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'artyautumn/boisterousbirds/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl1Album2Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'artyautumn/terrifictrees/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl2Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'whitewinter/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl2Album1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'whitewinter/soggysundays/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl2Album2Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'whitewinter/muggymondays/index.html'
      });

      expect(console.log).to.have.callCount(12);

      expect(console.log)
        .to.have.been.calledWith('First collection: artyautumn');
      expect(console.log)
        .to.have.been.calledWith('Last collection: whitewinter');
      expect(console.log)
        .to.have.been.calledWith('First album in artyautumn: boisterousbirds');
      expect(console.log)
        .to.have.been.calledWith('Last album in artyautumn: terrifictrees');
      expect(console.log)
        .to.have.been.calledWith('Writing collection artyautumn');
      expect(console.log)
        .to.have.been.calledWith('Writing album boisterousbirds');
      expect(console.log)
        .to.have.been.calledWith('Writing album terrifictrees');
      expect(console.log)
        .to.have.been.calledWith('First album in whitewinter: soggysundays');
      expect(console.log)
        .to.have.been.calledWith('Last album in whitewinter: muggymondays');
      expect(console.log)
        .to.have.been.calledWith('Writing collection whitewinter');
      expect(console.log)
        .to.have.been.calledWith('Writing album soggysundays');
      expect(console.log)
        .to.have.been.calledWith('Writing album muggymondays');

      delete process.env.COLLECTION_SORT;
      delete process.env.ALBUM_SORT;
    });

    it('publishes albums grouped into collections ascending', function() {
      sinon.resetHistory();

      process.env.COLLECTION_SORT = 'asc';
      process.env.ALBUM_SORT = 'desc';

      const allContents = [
        {Key: 'pics/original/whitewinter/metadata.yml'},
        {
          Key: 'pics/original/whitewinter/muggymondays/mist.jpg',
          LastModified: 20180404000000
        },
        {
          Key: 'pics/original/whitewinter/muggymondays/fog.jpg',
          LastModified: 20180403000000
        },
        {Key: 'pics/original/whitewinter/soggysundays/metadata.yml'},
        {
          Key: 'pics/original/whitewinter/soggysundays/wet.jpg',
          LastModified: 20180406000000
        },
        {
          Key: 'pics/original/whitewinter/soggysundays/rainy.jpg',
          LastModified: 20180402000000
        },
        {
          Key: 'pics/original/whitewinter/soggysundays/dreary.jpg',
          LastModified: 20180401000000
        },
        {Key: 'pics/original/artyautumn/terrifictrees/oak.jpg'},
        {Key: 'pics/original/artyautumn/terrifictrees/birch.jpg'},
        {Key: 'pics/original/artyautumn/boisterousbirds/galah.jpg'},
      ];

      uploadContents.uploadAllContents(allContents);

      const coll1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/artyautumn/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/artyautumn/terrifictrees/oak.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>artyautumn</h2>\n" +
        "\t\t</article>\n"
      );
      const coll2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/whitewinter/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/whitewinter/soggysundays/rainy.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>White Winter</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedIndexBody = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>Johnny's Awesome Photos</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>Johnny's Awesome Photos</h1>\n" +
        '<a href="https://html5up.net">Design: HTML5 UP</a>\n\n' +
        coll1Markup +
        coll2Markup + "\n\n" +
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

      const coll1album1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/artyautumn/terrifictrees/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/artyautumn/terrifictrees/oak.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>terrifictrees</h2>\n" +
        "\t\t</article>\n"
      );
      const coll1album2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/artyautumn/boisterousbirds/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/artyautumn/boisterousbirds/galah.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>boisterousbirds</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedColl1Body = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>artyautumn</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>artyautumn</h1>\n" +
        '<a href="#footer" class="icon solid fa-info-circle"></a>\n\n' +
        coll1album1Markup +
        coll1album2Markup + "\n" +
        "<footer>\n" +
        "<p>All the leaves are brown</p>\n" +
        '<p><a href="/">Back to Johnny\'s Awesome Photos</a></p>\n\n' +
        "</footer>\n\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/artyautumn/boisterousbirds/galah.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/artyautumn/boisterousbirds/galah.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/artyautumn/boisterousbirds/galah.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl1Album1Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>boisterousbirds</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>boisterousbirds</h1>\n\n\n' +
        picture1Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/artyautumn/terrifictrees/birch.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/artyautumn/terrifictrees/birch.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/artyautumn/terrifictrees/birch.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture3Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/artyautumn/terrifictrees/oak.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/artyautumn/terrifictrees/oak.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/artyautumn/terrifictrees/oak.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl1Album2Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>terrifictrees</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>terrifictrees</h1>\n\n\n' +
        picture2Markup +
        picture3Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const coll2album1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/whitewinter/soggysundays/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/whitewinter/soggysundays/wet.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>Soggy Sundays</h2>\n" +
        "\t\t</article>\n"
      );
      const coll2album2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/whitewinter/muggymondays/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/whitewinter/muggymondays/mist.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>muggymondays</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedColl2Body = (
        '<html>\n' +
        '<head>\n\n' +
        "<title>White Winter</title>\n" +
        '</head>\n' +
        '<body>\n' +
        "<h1>White Winter</h1>\n" +
        '<a href="#footer" class="icon solid fa-info-circle"></a>\n\n' +
        coll2album1Markup +
        coll2album2Markup + "\n" +
        "<footer>\n" +
        "<p>Oh it was so white</p>\n" +
        "<p>So very whitey white</p>\n" +
        '<p><a href="/">Back to Johnny\'s Awesome Photos</a></p>\n\n' +
        "</footer>\n\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture4Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/soggysundays/dreary.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/soggysundays/dreary.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/soggysundays/dreary.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture5Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/soggysundays/rainy.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/soggysundays/rainy.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/soggysundays/rainy.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture6Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/soggysundays/wet.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/soggysundays/wet.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/soggysundays/wet.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl2Album1Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>Soggy Sundays</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>Soggy Sundays</h1>\n\n\n' +
        picture4Markup +
        picture5Markup +
        picture6Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      const picture7Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/muggymondays/fog.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/muggymondays/fog.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/muggymondays/fog.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );
      const picture8Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/pics/resized/1200x750/whitewinter/muggymondays/mist.jpg\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/360x225/whitewinter/muggymondays/mist.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<p><a href=\"/pics/original/whitewinter/muggymondays/mist.jpg\">DL</a></p>\n" +
        "\t\t</article>\n"
      );

      const expectedColl2Album2Body = (
        '<html>\n' +
        '<head>\n\n' +
        '<title>muggymondays</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>muggymondays</h1>\n\n\n' +
        picture7Markup +
        picture8Markup + "\n" +
        '</body>\n' +
        '</html>\n'
      );

      expect(putObjectFake).to.have.callCount(11);

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
        Body: 'lotsatext',
        Bucket: 'johnnyphotos',
        ContentType: 'text/plain',
        Key: 'foo/shoo.txt'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: 'cssgoeshere',
        Bucket: 'johnnyphotos',
        ContentType: 'text/css',
        Key: 'assets/homepage/css/main.css'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: 'albumcssgoeshere',
        Bucket: 'johnnyphotos',
        ContentType: 'text/css',
        Key: 'assets/album/css/album.css'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'artyautumn/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl1Album1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'artyautumn/boisterousbirds/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl1Album2Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'artyautumn/terrifictrees/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl2Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'whitewinter/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl2Album1Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'whitewinter/soggysundays/index.html'
      });

      expect(putObjectFake).to.have.been.calledWith({
        Body: expectedColl2Album2Body,
        Bucket: 'johnnyphotos',
        ContentType: 'text/html',
        Key: 'whitewinter/muggymondays/index.html'
      });

      expect(console.log).to.have.callCount(12);

      expect(console.log)
        .to.have.been.calledWith('First collection: artyautumn');
      expect(console.log)
        .to.have.been.calledWith('Last collection: whitewinter');
      expect(console.log)
        .to.have.been.calledWith('First album in artyautumn: boisterousbirds');
      expect(console.log)
        .to.have.been.calledWith('Last album in artyautumn: terrifictrees');
      expect(console.log)
        .to.have.been.calledWith('Writing collection artyautumn');
      expect(console.log)
        .to.have.been.calledWith('Writing album boisterousbirds');
      expect(console.log)
        .to.have.been.calledWith('Writing album terrifictrees');
      expect(console.log)
        .to.have.been.calledWith('First album in whitewinter: soggysundays');
      expect(console.log)
        .to.have.been.calledWith('Last album in whitewinter: muggymondays');
      expect(console.log)
        .to.have.been.calledWith('Writing collection whitewinter');
      expect(console.log)
        .to.have.been.calledWith('Writing album soggysundays');
      expect(console.log)
        .to.have.been.calledWith('Writing album muggymondays');

      delete process.env.COLLECTION_SORT;
      delete process.env.ALBUM_SORT;
    });

    after(function() {
      mock.stop('aws-sdk');
      mock.stop('fs');
      mock.stop('../../site-builder/lib/fileUtils');
      mock.stop('../../site-builder/lib/cloudfrontUtils');
      mock.stop('../../site-builder/lib/delayUtils');

      sinon.restore();

      delete process.env.SITE_BUCKET;
      delete process.env.WEBSITE;
      delete process.env.WEBSITE_TITLE;
      delete process.env.GROUP_ALBUMS_INTO_COLLECTIONS;
    });
  });
});
