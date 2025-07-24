# @node-oauth/formats

Minimal, [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#appendix-A)
compliant ascii and unicode validator.

This package is intended to be used with a OAuth2 server, like 
[@node-oauth/node-oauth2-server](https://github.com/node-oauth/node-oauth2-server)
, but can also be used with any other project, that shares the same 
requirements.

## Install

```bash
$ npm install @node-oauth/formats
```

## Usage

```js
const isFormat = require('@node-oauth/formats')

isFormat.nchar('Hello, World!') // false
isFormat.nqchar('Hello, World!') // true
```

For detailed usage see the [API docs](./API.md)

## Test

```sh
npm install
npm run lint            # run esline in check mode
npm run lint:fix        # run esline in check mode
npm run test            # run test once
npm run test:coverage   # run tests with coverage report
```

## License

This project has been outsourced from 
[@node-oauth/node-oauth2-server](https://github.com/node-oauth/node-oauth2-server)
, which is a fork from [oauth2-server](https://github.com/oauthjs/node-oauth2-server)
. The licence remains MIT, see [our license file](./LICENSE).
