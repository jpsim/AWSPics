const AWS = require("aws-sdk");
const async = require('async');
const fs = require('fs');
const mime = require('mime');
const path = require('path');

const album = require('./album');
const fileUtils = require('./fileUtils');
const miscUtils = require('./miscUtils');


const s3 = new AWS.S3({signatureVersion: 'v4'});


function getErrorPageBody(data, ga) {
  let body = data.toString().replace(/\{website\}/g, process.env.WEBSITE);

  // Test if "googleanalytics" is set or not
  if (!miscUtils.isEmpty(process.env.GOOGLEANALYTICS)) {
    body = body
      .replace(/\{googletracking\}/g, ga)
      .replace(/\{gtag\}/g, process.env.GOOGLEANALYTICS);
  } else {
    body = body.replace(/\{googletracking\}/g, '');
  }

  if (!process.env.SPACES_INSTEAD_OF_TABS) {
    body = miscUtils.spacesToTabs(body);
  }

  return body;
}

const getHomePageBody = exports.getHomePageBody = function(
  data,
  albums,
  pictures,
  metadata,
  albumMarkup,
  ga,
  nav,
  footer,
  title,
  comment1,
  comment2
) {
  let picturesHTML = '';
  const albumsPicturesMetadata = albums.map(function(album, i) {
    return {album: album, pictures: pictures[i], metadata: metadata[i]};
  });

  const sorter = album.getAlbumSorter(title);

  if (sorter) {
    albumsPicturesMetadata.sort(sorter);
  }

  for (let i = 0; i < albumsPicturesMetadata.length; i++) {
    picturesHTML += album.getAlbumMarkup(
      albumsPicturesMetadata[i].album,
      albumsPicturesMetadata[i].pictures,
      albumsPicturesMetadata[i].metadata,
      albumMarkup
    );
  }

  const pageTitle = title ? title : process.env.WEBSITE_TITLE;
  let navMarkup, footerMarkup;

  if (title) {
    if (comment1 || comment2) {
      navMarkup = nav.replace(
        /\{navLink\}/g,
        '<a href="#footer" class="icon solid fa-info-circle"></a>'
      );
    }
    else {
      navMarkup = nav.replace(
        /\{navLink\}/g,
        '<a href="/">Back to ' + process.env.WEBSITE_TITLE + '</a>'
      );
    }
  }
  else if (process.env.HOME_PAGE_CREDITS_OVERRIDE) {
    navMarkup = nav.replace(
      /\{navLink\}/g,
      process.env.HOME_PAGE_CREDITS_OVERRIDE
    );
  }
  else if (!process.env.HIDE_HOME_PAGE_CREDITS) {
    navMarkup = nav.replace(
      /\{navLink\}/g,
      '<a href="https://html5up.net">Design: HTML5 UP</a>'
    );
  }
  else {
    navMarkup = '';
  }

  if (comment1 || comment2) {
    let footerContent = '';

    if (comment1) {
      footerContent += '<p>' + comment1 + '</p>\n';
    }
    if (comment2) {
      footerContent += '<p>' + comment2 + '</p>\n';
    }

    footerContent += (
      '<p><a href="/">Back to ' + process.env.WEBSITE_TITLE + '</a></p>\n'
    );

    footerMarkup = footer.replace(/\{footerContent\}/g, footerContent);
  }
  else {
    footerMarkup = '';
  }

  let body = data
    .toString()
    .replace(/\{title\}/g, pageTitle)
    .replace(/\{pictures\}/g, picturesHTML)
    .replace(/\{nav\}/g, navMarkup)
    .replace(/\{footer\}/g, footerMarkup);

  // Test if "googleanalytics" is set or not
  if (!miscUtils.isEmpty(process.env.GOOGLEANALYTICS)) {
    body = body
      .replace(/\{googletracking\}/g, ga)
      .replace(/\{gtag\}/g, process.env.GOOGLEANALYTICS);
  } else {
    body = body.replace(/\{googletracking\}/g, '');
  }

  if (!process.env.SPACES_INSTEAD_OF_TABS) {
    body = miscUtils.spacesToTabs(body);
  }

  return body;
};

exports.uploadHomePage = function(albums, pictures, metadata) {
  const dir = 'homepage';

  fileUtils.walk(dir, function(err, files) {
    /* istanbul ignore next */
    if (err) {
      throw err;
    }

    // Google Analytics gtag code
    const ga = fs.readFileSync('shared/snippets/ga.html').toString();

    const albumMarkup = fs.readFileSync('homepage/snippets/album.html').toString();
    const nav = fs.readFileSync('homepage/snippets/nav.html').toString();

    async.map(files, function(f, cb) {
      if (!f.includes('snippets')) {
        let data = fs.readFileSync(f),
            body;

        if (path.basename(f) === 'error.html') {
          body = getErrorPageBody(data, ga);
        } else if (path.basename(f) === 'index.html') {
          body = getHomePageBody(
            data,
            albums,
            pictures,
            metadata,
            albumMarkup,
            ga,
            nav,
            null,
            null,
            null,
            null
          );
        }
        else {
          body = data;
        }

        const filePath = path.relative(dir, f);
        let fileKey;

        if (filePath.includes('assets/')) {
          fileKey = filePath.replace(/assets\//g, 'assets/homepage/');
        }
        else {
          fileKey = filePath;
        }

        const options = {
          Bucket: process.env.SITE_BUCKET,
          Key: fileKey,
          Body: body,
          ContentType: mime.getType(path.extname(f))
        };

        s3.putObject(options, cb);
      }
    },
    /* istanbul ignore next */
    function(err, results) {
      if (err) {
        console.log(err, err.stack);
      }
    });
  });
};
