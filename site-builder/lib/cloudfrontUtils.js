const AWS = require("aws-sdk");


const cloudfront = new AWS.CloudFront();


exports.invalidateCloudFront = function() {
  cloudfront.listDistributions(function(err, data) {
    /* istanbul ignore next */
    if (err) {
      console.log(err, err.stack);
      return;
    }

    // Get distribution ID from domain name
    const distributionID = data.Items.find(function (d) {
      return d.DomainName === process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN;
    }).Id;

    // Create invalidation
    cloudfront.createInvalidation({
      DistributionId: distributionID,
      InvalidationBatch: {
        CallerReference: 'site-builder-' + Date.now(),
        Paths: {
          Quantity: 1,
          Items: [
            '/*'
          ]
        }
      }
    },
    /* istanbul ignore next */
    function(err, data) {
      if (err) {
        console.log(err, err.stack);
      }
    });
  });
};
