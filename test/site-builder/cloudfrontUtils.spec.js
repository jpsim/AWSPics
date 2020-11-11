const chai = require('chai');
const mock = require('mock-require');
const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const expect = chai.expect;

describe('cloudfrontUtils', function() {
  let createInvalidationFake;
  let cloudfrontUtils;

  before(function() {
    createInvalidationFake = sinon.fake();
    mock('aws-sdk', {
      CloudFront: function() {
        return {
          listDistributions: function(cb) {
            cb(null, {
              Items: [
                {Id: 111, DomainName: 'philharmonicphotos.com'},
                {Id: 222, DomainName: 'johnnyphotos.com'}
              ]
            });
          },
          createInvalidation: createInvalidationFake
        };
      },
      S3: function() {}
    });

    cloudfrontUtils = rewire('../../site-builder/lib/cloudfrontUtils');

    process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = 'johnnyphotos.com';
  });

  it('invalidates the cloudfront distribution for configured domain', function() {
    sinon.resetHistory();
    const originalDateNow = Date.now;
    Date.now = function() {
      return 12345;
    };

    cloudfrontUtils.invalidateCloudFront();

    expect(createInvalidationFake).to.have.callCount(1);

    expect(createInvalidationFake).to.have.been.calledWith({
      DistributionId: 222,
      InvalidationBatch: {
        CallerReference: 'site-builder-12345',
        Paths: {
          Quantity: 1,
          Items: ['/*']
        }
      }
    });

    Date.now = originalDateNow;
  });

  after(function() {
    mock.stop('aws-sdk');

    delete process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN;
  });
});
