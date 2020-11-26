const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const expect = chai.expect;

describe('homePage', function() {
  describe('uploadHomePage', function() {
    let putObjectFake;
    let homePage;

    const indexMarkup = (
      '<html>\n' +
      '  <head>\n' +
      '{googletracking}\n' +
      '    <title>{title}</title>\n' +
      '  </head>\n' +
      '  <body>\n' +
      '    <h1>{title}</h1>\n' +
      '{nav}\n' +
      '{pictures}\n' +
      '  </body>\n' +
      '</html>\n'
    );

    const albumMarkup = (
      '    <article>\n' +
      '      <a href="/{albumName}/index.html">\n' +
      '        <img src="/pics/resized/1200x750/{albumPicture}" />\n' +
      '      </a>\n' +
      '      <h2>{albumTitle}</h2>\n' +
      '    </article>\n'
    );

    const gaMarkup = "    <script>gtag('config', '{gtag}');</script>\n";

    const navMarkup = '{navLink}\n';

    const footerMarkup = (
      '<footer>\n' +
      '{footerContent}\n' +
      '</footer>\n'
    );

    before(function() {
      putObjectFake = sinon.fake();
      mock('aws-sdk', {
        CloudFront: function() {},
        S3: function() { return {putObject: putObjectFake}; }
      });

      mock('fs', {readFileSync: function(f) {
        if (f.includes('index.html')) {
          return indexMarkup;
        }
        else if (f.includes('error.html')) {
          return (
            '<html>\n' +
            '  <head>\n' +
            '{googletracking}\n' +
            '    <title>Error</title>\n' +
            '  </head>\n' +
            '  <body>\n' +
            '    <h1>Error</h1>\n' +
            '    <form action="https://{website}/Prod/login"></form>\n' +
            '  </body>\n' +
            '</html>\n'
          );
        }
        else if (f.includes('album.html')) {
          return albumMarkup;
        }
        else if (f.includes('ga.html')) {
          return gaMarkup;
        }
        else if (f.includes('nav.html')) {
          return navMarkup;
        }
        else {
          return 'lotsatext';
        }
      }});

      mock('../../site-builder/lib/fileUtils', {walk: function(dir, done) {
        return done(null, [
          'homepage/foo/hoo.txt',
          'homepage/snippets/album.html',
          'homepage/index.html',
          'homepage/error.html'
        ]);
      }});

      homePage = rewire('../../site-builder/lib/homePage');

      process.env.GOOGLEANALYTICS = 'googleanalyticsfunkycode';
      process.env.SITE_BUCKET = 'johnnyphotos';
      process.env.WEBSITE = "johnnyphotos.com";
      process.env.WEBSITE_TITLE = "Johnny's Awesome Photos";
    });

    it('gets home page body', function() {
      sinon.resetHistory();

      body = homePage.getHomePageBody(
        indexMarkup,
        [
          'california2020',
          'bluemtns2020',
          'queenstown2020'
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
          ],
          ['queenstown2020/rafting.jpg']
        ],
        [
          {title: 'California 2020'},
          {cover_image: 'blackheath.jpg'}
        ],
        albumMarkup,
        gaMarkup,
        navMarkup,
        footerMarkup,
        'Woo hoo',
        null,
        null
      );

      const expectedIndexBody = (
        '<html>\n' +
        '\t<head>\n' +
        "\t\t<script>gtag('config', 'googleanalyticsfunkycode');</script>\n\n" +
        '\t\t<title>Woo hoo</title>\n' +
        '\t</head>\n' +
        '\t<body>\n' +
        '\t\t<h1>Woo hoo</h1>\n' +
        '<a href="/">Back to Johnny\'s Awesome Photos</a>\n\n' +
        '\t\t<article>\n' +
        '\t\t\t<a href="/california2020/index.html">\n' +
        '\t\t\t\t<img src="/pics/resized/1200x750/california2020/disneyland.jpg" />\n' +
        '\t\t\t</a>\n' +
        '\t\t\t<h2>California 2020</h2>\n' +
        '\t\t</article>\n' +
        '\t\t<article>\n' +
        '\t\t\t<a href="/bluemtns2020/index.html">\n' +
        '\t\t\t\t<img src="/pics/resized/1200x750/bluemtns2020/blackheath.jpg" />\n' +
        '\t\t\t</a>\n' +
        '\t\t\t<h2>bluemtns2020</h2>\n' +
        '\t\t</article>\n' +
        '\t\t<article>\n' +
        '\t\t\t<a href="/queenstown2020/index.html">\n' +
        '\t\t\t\t<img src="/pics/resized/1200x750/queenstown2020/rafting.jpg" />\n' +
        '\t\t\t</a>\n' +
        '\t\t\t<h2>queenstown2020</h2>\n' +
        '\t\t</article>\n\n' +
        '\t</body>\n' +
        '</html>\n'
      );

      expect(body).to.equal(expectedIndexBody);
    });

    it('uploads homepage files to s3', function() {
      sinon.resetHistory();
      process.env.ALBUM_SORT = 'bygiraffe';

      homePage.uploadHomePage(
        [
          'california2020',
          'bluemtns2020',
          'queenstown2020'
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
          ],
          ['queenstown2020/rafting.jpg']
        ],
        [
          {title: 'California 2020'},
          {cover_image: 'blackheath.jpg'}
        ]
      );

      const album1Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/california2020/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/california2020/disneyland.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>California 2020</h2>\n" +
        "\t\t</article>\n"
      );
      const album2Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/bluemtns2020/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/bluemtns2020/blackheath.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>bluemtns2020</h2>\n" +
        "\t\t</article>\n"
      );
      const album3Markup = (
        "\t\t<article>\n" +
        "\t\t\t<a href=\"/queenstown2020/index.html\">\n" +
        "\t\t\t\t<img src=\"/pics/resized/1200x750/queenstown2020/rafting.jpg\" />\n" +
        "\t\t\t</a>\n" +
        "\t\t\t<h2>queenstown2020</h2>\n" +
        "\t\t</article>\n"
      );

      const expectedIndexBody = (
        '<html>\n' +
        '\t<head>\n' +
        "\t\t<script>gtag('config', 'googleanalyticsfunkycode');</script>\n\n" +
        "\t\t<title>Johnny's Awesome Photos</title>\n" +
        '\t</head>\n' +
        '\t<body>\n' +
        "\t\t<h1>Johnny's Awesome Photos</h1>\n" +
        '<a href="https://html5up.net">Design: HTML5 UP</a>\n\n' +
        album1Markup +
        album2Markup +
        album3Markup + "\n" +
        '\t</body>\n' +
        '</html>\n'
      );

      const expectedErrorBody = (
        '<html>\n' +
        '\t<head>\n' +
        "\t\t<script>gtag('config', 'googleanalyticsfunkycode');</script>\n\n" +
        '\t\t<title>Error</title>\n' +
        '\t</head>\n' +
        '\t<body>\n' +
        '\t\t<h1>Error</h1>\n' +
        '\t\t<form action="https://johnnyphotos.com/Prod/login"></form>\n' +
        '\t</body>\n' +
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

      delete process.env.ALBUM_SORT;
    });

    it('omits google analytics markup if no tracking code configured', function() {
      sinon.resetHistory();
      delete process.env.GOOGLEANALYTICS;
      process.env.SPACES_INSTEAD_OF_TABS = true;

      homePage.uploadHomePage(
        ['bluemtns2020'],
        [['bluemtns2020/jenolancaves.jpg']],
        [{cover_image: 'hydromajestic.jpg'}]
      );

      const albumMarkup = (
        "    <article>\n" +
        "      <a href=\"/bluemtns2020/index.html\">\n" +
        "        <img src=\"/pics/resized/1200x750/bluemtns2020/jenolancaves.jpg\" />\n" +
        "      </a>\n" +
        "      <h2>bluemtns2020</h2>\n" +
        "    </article>\n"
      );

      const expectedIndexBody = (
        '<html>\n' +
        '  <head>\n\n' +
        "    <title>Johnny's Awesome Photos</title>\n" +
        '  </head>\n' +
        '  <body>\n' +
        "    <h1>Johnny's Awesome Photos</h1>\n" +
        '<a href="https://html5up.net">Design: HTML5 UP</a>\n\n' +
        albumMarkup + "\n" +
        '  </body>\n' +
        '</html>\n'
      );

      const expectedErrorBody = (
        '<html>\n' +
        '  <head>\n\n' +
        '    <title>Error</title>\n' +
        '  </head>\n' +
        '  <body>\n' +
        '    <h1>Error</h1>\n' +
        '    <form action="https://johnnyphotos.com/Prod/login"></form>\n' +
        '  </body>\n' +
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
      delete process.env.SPACES_INSTEAD_OF_TABS;
    });

    it('lists albums in ascending order if configured to do so', function() {
      sinon.resetHistory();
      process.env.SPACES_INSTEAD_OF_TABS = true;
      process.env.ALBUM_SORT = 'asc';
      process.env.HOME_PAGE_CREDITS_OVERRIDE = (
        '<a href="https://johnnyisawesome.com">Johnny is Awesome</a>')
      ;

      homePage.uploadHomePage(
        [
          'california2020',
          'bluemtns2020',
          'queenstown2020'
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
          ],
          ['queenstown2020/rafting.jpg']
        ],
        [
          {title: 'California 2020'},
          {cover_image: 'blackheath.jpg'}
        ]
      );

      const album1Markup = (
        "    <article>\n" +
        "      <a href=\"/bluemtns2020/index.html\">\n" +
        "        <img src=\"/pics/resized/1200x750/bluemtns2020/blackheath.jpg\" />\n" +
        "      </a>\n" +
        "      <h2>bluemtns2020</h2>\n" +
        "    </article>\n"
      );
      const album2Markup = (
        "    <article>\n" +
        "      <a href=\"/california2020/index.html\">\n" +
        "        <img src=\"/pics/resized/1200x750/california2020/disneyland.jpg\" />\n" +
        "      </a>\n" +
        "      <h2>California 2020</h2>\n" +
        "    </article>\n"
      );
      const album3Markup = (
        "    <article>\n" +
        "      <a href=\"/queenstown2020/index.html\">\n" +
        "        <img src=\"/pics/resized/1200x750/queenstown2020/rafting.jpg\" />\n" +
        "      </a>\n" +
        "      <h2>queenstown2020</h2>\n" +
        "    </article>\n"
      );

      const expectedIndexBody = (
        '<html>\n' +
        '  <head>\n' +
        "    <script>gtag('config', 'googleanalyticsfunkycode');</script>\n\n" +
        "    <title>Johnny's Awesome Photos</title>\n" +
        '  </head>\n' +
        '  <body>\n' +
        "    <h1>Johnny's Awesome Photos</h1>\n" +
        '<a href="https://johnnyisawesome.com">Johnny is Awesome</a>\n\n' +
        album1Markup +
        album2Markup +
        album3Markup + "\n" +
        '  </body>\n' +
        '</html>\n'
      );

      const expectedErrorBody = (
        '<html>\n' +
        '  <head>\n' +
        "    <script>gtag('config', 'googleanalyticsfunkycode');</script>\n\n" +
        '    <title>Error</title>\n' +
        '  </head>\n' +
        '  <body>\n' +
        '    <h1>Error</h1>\n' +
        '    <form action="https://johnnyphotos.com/Prod/login"></form>\n' +
        '  </body>\n' +
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

      delete process.env.SPACES_INSTEAD_OF_TABS;
      delete process.env.ALBUM_SORT;
      delete process.env.HOME_PAGE_CREDITS_OVERRIDE;
    });

    it('lists albums in descending order if configured to do so', function() {
      sinon.resetHistory();
      process.env.SPACES_INSTEAD_OF_TABS = true;
      process.env.ALBUM_SORT = 'desc';
      process.env.HIDE_HOME_PAGE_CREDITS = true;

      homePage.uploadHomePage(
        [
          'california2020',
          'bluemtns2020',
          'queenstown2020'
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
          ],
          ['queenstown2020/rafting.jpg']
        ],
        [
          {title: 'California 2020'},
          {cover_image: 'blackheath.jpg'}
        ]
      );

      const album1Markup = (
        "    <article>\n" +
        "      <a href=\"/queenstown2020/index.html\">\n" +
        "        <img src=\"/pics/resized/1200x750/queenstown2020/rafting.jpg\" />\n" +
        "      </a>\n" +
        "      <h2>queenstown2020</h2>\n" +
        "    </article>\n"
      );
      const album2Markup = (
        "    <article>\n" +
        "      <a href=\"/california2020/index.html\">\n" +
        "        <img src=\"/pics/resized/1200x750/california2020/disneyland.jpg\" />\n" +
        "      </a>\n" +
        "      <h2>California 2020</h2>\n" +
        "    </article>\n"
      );
      const album3Markup = (
        "    <article>\n" +
        "      <a href=\"/bluemtns2020/index.html\">\n" +
        "        <img src=\"/pics/resized/1200x750/bluemtns2020/blackheath.jpg\" />\n" +
        "      </a>\n" +
        "      <h2>bluemtns2020</h2>\n" +
        "    </article>\n"
      );

      const expectedIndexBody = (
        '<html>\n' +
        '  <head>\n' +
        "    <script>gtag('config', 'googleanalyticsfunkycode');</script>\n\n" +
        "    <title>Johnny's Awesome Photos</title>\n" +
        '  </head>\n' +
        '  <body>\n' +
        "    <h1>Johnny's Awesome Photos</h1>\n\n" +
        album1Markup +
        album2Markup +
        album3Markup + "\n" +
        '  </body>\n' +
        '</html>\n'
      );

      const expectedErrorBody = (
        '<html>\n' +
        '  <head>\n' +
        "    <script>gtag('config', 'googleanalyticsfunkycode');</script>\n\n" +
        '    <title>Error</title>\n' +
        '  </head>\n' +
        '  <body>\n' +
        '    <h1>Error</h1>\n' +
        '    <form action="https://johnnyphotos.com/Prod/login"></form>\n' +
        '  </body>\n' +
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

      delete process.env.SPACES_INSTEAD_OF_TABS;
      delete process.env.ALBUM_SORT;
    });

    it('raises error if albums is null', function() {
      expect(function() {
        homePage.uploadHomePage(
          null, [['bluemtns2020/jenolancaves.jpg']], []
        );
      }).to.throw(TypeError);
    });

    it('raises error if pictures is null', function() {
      expect(function() {
        homePage.uploadHomePage(
          ['bluemtns2020'], null, []
        );
      }).to.throw(TypeError);
    });

    it('raises error if metadata is null', function() {
      expect(function() {
        homePage.uploadHomePage(
          ['bluemtns2020'], [['bluemtns2020/jenolancaves.jpg']], null
        );
      }).to.throw(TypeError);
    });

    after(function() {
      mock.stop('aws-sdk');
      mock.stop('fs');
      mock.stop('../../site-builder/lib/fileUtils');

      delete process.env.GOOGLEANALYTICS;
      delete process.env.SITE_BUCKET;
      delete process.env.WEBSITE;
      delete process.env.WEBSITE_TITLE;
      delete process.env.HIDE_HOME_PAGE_CREDITS;
    });
  });
});
