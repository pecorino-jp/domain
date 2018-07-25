# Pecorino Domain Library for Node.js

[![npm (scoped)](https://img.shields.io/npm/v/@pecorino/domain.svg)](https://www.npmjs.com/package/@pecorino/domain)
[![CircleCI](https://circleci.com/gh/pecorino-jp/domain.svg?style=svg)](https://circleci.com/gh/pecorino-jp/domain)
[![Coverage Status](https://coveralls.io/repos/github/pecorino-jp/domain/badge.svg?branch=master)](https://coveralls.io/github/pecorino-jp/domain?branch=master)
[![Dependency Status](https://img.shields.io/david/pecorino/domain.svg)](https://david-dm.org/pecorino/domain)
[![Known Vulnerabilities](https://snyk.io/test/github/pecorino-jp/domain/badge.svg?targetFile=package.json)](https://snyk.io/test/github/pecorino-jp/domain?targetFile=package.json)
[![npm](https://img.shields.io/npm/dm/@pecorino/domain.svg)](https://nodei.co/npm/@pecorino/domain/)

PecorinoサービスをNode.jsで簡単に使用するためのパッケージを提供します。

## Table of contents

* [Usage](#usage)
* [Code Samples](#code-samples)
* [License](#license)

## Usage

```shell
npm install @pecorino/domain
```

### Environment variables

| Name                                 | Required | Value             | Purpose           |
|--------------------------------------|----------|-------------------|-------------------|
| `DEBUG`                              | false    | pecorino-domain:* | Debug             |
| `NPM_TOKEN`                          | true     |                   | NPM auth token    |
| `NODE_ENV`                           | true     |                   | environment name  |
| `SENDGRID_API_KEY`                   | false    |                   | SendGridAPIキー     |
| `DEVELOPER_LINE_NOTIFY_ACCESS_TOKEN` | false    |                   | 開発者LINE通知アクセストークン |

## Code Samples

Code sample are [here](https://github.com/pecorino-jp/domain/tree/master/example).

## License

UNLICENSED
