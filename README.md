# lambda-cloudfront-cookies

> AWS Lambda to protect your CloudFront content with username/passwords

## How it works

The first step is to have CloudFront in front of your S3 bucket.

```
Browser ----> CloudFront ----> S3 bucket
```

We then add a Lambda function responsible for logging-in.
When given valid credentials, this function creates signed session cookies.
CloudFront will verify every request has valid cookies before forwarding them.

```
Browser                   CloudFront             Lambda              S3
  |                           |                    |                 |
  | ---------- get ---------> |                    |                 |
  |                           |                    |                 |
  |                      [no cookie]               |                 |
  |                           |                    |                 |
  |                           |                    |                 |
  |                           |                    |                 |
  | <------ error page ------ |                    |                 |
  |                                                |                 |
  | -------------------- login ------------------> |                 |
  | <------------------- cookies ----------------- |                 |
  |                                                                  |
  | ---------- get ---------> |                                      |
  |                           |                                      |
  |                      [has cookie]                                |
  |                           |                                      |
  |                           | -----------------------------------> |
  |                           | <------------ html page ------------ |
  | <------ html page ------- |
```

## Pre-requisites

### 1. Encryption key

- Create an encryption key in KMS, or choose one that you already have. Note that each KMS key costs $1/month.
- Take note of the key ID.

### 2. CloudFront key pair

- Logging in with your AWS **root** account, generate a CloudFront key pair
- Take note of the key pair ID
- Download the private key, and encrypt it with KMS using

```bash
aws kms encrypt --key-id $KMS_KEY_ID --plaintext "$(cat pk-000000.pem)" --query CiphertextBlob --output text
```

- Write down the encrypted value, then secure the private key or delete it

### 3. Htpasswd

- Create a local `htpasswd` file with your usernames and passwords. You can generate the hashes from the command-line:

```
$ htpasswd -nB username
New password: **********
Re-type new password: **********
username:$2a$08$eTTe9DM5N0w50CxL5OL0D.ToMtpAuip/4TCSWCSDJddoIW9gaQIym
```

- Encrypt your `htpasswd` file using KMS again

```bash
aws kms encrypt --key-id $KMS_KEY_ID --plaintext "$(cat htpasswd)" --query CiphertextBlob --output text
```

## Deployment

Create a configuration file called `dist/config.json`, based on [config.example.json](config.example.json).
Make sure you don't commit this file to source control (the `dist` folder is ignored).

It should contain the following info - minus the comments:

```js
[
  // the website domain, as seen by the users
  "websiteDomain=website.com",
  // how long the CloudFront cookies are valid for, in seconds
  "sessionDuration=86400",
  // KMS key ID created in step 1
  "kmsKeyId=00000000-0000-0000-0000-000000000000",
  // CloudFront key pair ID from step 2
  // This is not sensitive, and will be one of the cookie values
  "cloudFrontKeypairId=APK...",
  "encryptedCloudFrontPrivateKey=AQECAH...",
  "encryptedHtpasswd=AQECAH..."
]
```

You can then deploy the full stack using:

```bash
export AWS_PROFILE="your-profile"
export AWS_REGION="ap-southeast-2"

# name of an S3 bucket for storing the Lambda code
./deploy s3://my-lambda-storage
```

The output should end with the AWS API Gateway endpoint:

```
Endpoint URL: https://0000000000.execute-api.ap-southeast-2.amazonaws.com/Prod/login"
```

Take note of that URL, and test it out!

```bash
curl -X POST -d "{\"username\":\"hello\", \"password\":\"world\"}" -H "Content-Type: application/json" -i "https://0000000000.execute-api.ap-southeast-2.amazonaws.com/Prod/login"
```

You can optionally setup CloudFront in front of this URL so you can use a custom domain, like `https://website.com/login`.
Once everything is working, change your CloudFront distribution to require signed cookies,
and it will return `HTTP 403` for users who aren't logged in.
