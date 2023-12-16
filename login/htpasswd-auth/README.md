# htpasswd-auth [![Circle CI](https://circleci.com/gh/dickeyxxx/htpasswd-auth/tree/master.svg?style=svg)](https://circleci.com/gh/dickeyxxx/htpasswd-auth/tree/master)

read/write htpasswd files

## Setup

```js
npm install --save htpasswd-auth
```

## Checking if a password is valid

```js
var htpasswd = require('htpasswd-auth');
var file     = fs.readFileSync('./path-to-htpasswd', 'utf-8');

htpasswd.authenticate('dickeyxxx', 'pass', file)
.then(function (auth) {
  // auth is true if the password is valid
});
```
