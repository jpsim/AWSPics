// Note: no need to bundle <aws-sdk>, it's provided by Lambda
const AWS = require('aws-sdk')
const async = require('async')
const htpasswd = require('htpasswd-auth')
const cloudfront = require('aws-cloudfront-sign')

// --------------
// Lambda function parameters, as environment variables
// --------------

const CONFIG_KEYS = {
  websiteDomain: 'WEBSITE_DOMAIN',
  cookieExpiryInSeconds: 'SESSION_DURATION',
  cloudFrontKeypairId: 'CLOUDFRONT_KEYPAIR_ID',
  cloudFrontPrivateKey: 'ENCRYPTED_CLOUDFRONT_PRIVATE_KEY',
  htpasswd: 'ENCRYPTED_HTPASSWD'
}

// --------------
// Main function exported to Lambda
// Checks username/password against the <htaccess> entries
// --------------

exports.handler = (event, context, callback) => {
  // try to parse the request payload
  var body = {}
  try {
    body = JSON.parse(event.body)
    if (!body) throw new Error('Empty request body')
    console.log('Valid JSON payload')
  } catch (e) {
    console.log('Failed to parse JSON payload')
    return callback(null, {
      statusCode: 400,
      body: 'Bad request'
    })
  }
  // get and decrypt config values
  async.mapValues(CONFIG_KEYS, getConfigValue, function (err, config) {
    console.log('Read ' + Object.keys(config).length + ' config settings')
    if (err) {
      callback(null, {
        statusCode: 500,
        body: 'Server error'
      })
    } else {
      // validate username and password
      console.log('Read <htpasswd> successfully')
      htpasswd.authenticate(body.username, body.password, config.htpasswd).then((authenticated) => {
        if (authenticated) {
          console.log('User login is valid')
          var headers = cookiesHeaders(config)
          // console.log('Prepared ' + Object.keys(headers).length + ' cookies')
          headers['Location'] = 'index.html'
          callback(null, {
            statusCode: 302,
            body: 'Authentication successful',
            headers: headers
          })
        } else {
          console.log('User login is invalid')
          callback(null, {
            statusCode: 403,
            body: 'Authentication failed'
          })
        }
      })
    }
  })
}

// --------------
// Returns the corresponding config value
// After decrypting it with KMS if required
// --------------

function getConfigValue (configName, target, done) {
  if (/^ENCRYPTED/.test(configName)) {
    const kms = new AWS.KMS()
    const encrypted = process.env[configName]
    console.log('Decrypting ' + configName + ' with KMS')
    kms.decrypt({ CiphertextBlob: new Buffer(encrypted, 'base64') }, (err, data) => {
      if (err) done(err)
      else done(null, data.Plaintext.toString('ascii'))
    })
  } else {
    console.log('Reading ' + configName + ' (plain text)')
    done(null, process.env[configName])
  }
}

// --------------
// Creates 3 CloudFront signed cookies
// They're effectively an IAM policy, and a private signature to prove it's valid
// --------------

function cookiesHeaders (config) {
  // create signed cookies
  const signedCookies = cloudfront.getSignedCookies('https://' + config.websiteDomain + '/*', {
    expireTime: new Date().getTime() + (config.cookieExpiryInSeconds * 1000),
    keypairId: config.cloudFrontKeypairId,
    privateKeyString: config.cloudFrontPrivateKey
  })
  console.log('Generated ' + Object.keys(signedCookies).length + ' cookies')
  // extra options for all cookies we write
  // var date = new Date()
  // date.setTime(date + (config.cookieExpiryInSeconds * 1000))
  const options = '; Domain=https://' + config.websiteDomain + '; Secure; HttpOnly'
  // we use a combination of lower/upper case
  // because we need to send multiple cookies
  // but the AWS API requires all headers in a single object!
  return {
    'Set-Cookie': 'CloudFront-Policy=' + signedCookies['CloudFront-Policy'] + options,
    'SEt-Cookie': 'CloudFront-Signature=' + signedCookies['CloudFront-Signature'] + options,
    'SET-Cookie': 'CloudFront-Key-Pair-Id=' + signedCookies['CloudFront-Key-Pair-Id'] + options
  }
}
