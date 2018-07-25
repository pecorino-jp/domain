# Pecorino Domain Library for Node.js

[![CircleCI](https://circleci.com/gh/pecorino-jp/domain.svg?style=svg)](https://circleci.com/gh/pecorino-jp/domain)

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
