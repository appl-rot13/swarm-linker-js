[English](README.md) | [日本語](README.ja.md)

# Swarm Linker

SwarmでのチェックインをX(Twitter)に投稿するアプリケーション。

## 概要

Swarmでのチェックイン時にWebhookを受け取り、X(Twitter)に投稿します。  
投稿されるテキストは以下の通りです。なお、コメントや画像は投稿されません。

```
I'm at [場所名] in [住所]
[共有URL]
```

## APIエンドポイント

- `GET /oauth` - アクセストークンを取得するための認可(認証)を開始します。
- `GET /oauth/callback` - 認証後にFoursquareからリダイレクトされ、アクセストークンを取得します。
- `POST /webhook` - Swarmでのチェックイン時にWebhookを受け取り、X(Twitter)に投稿します。

## 動作環境

- Cloudflare Workers
- [Node.js](https://nodejs.org/)

## 依存関係

- Cloudflare WorkersのNode.js互換
  - [node:crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)
- [oauth-1.0a](https://github.com/ddo/oauth-1.0a)

## 使い方

### 0. 事前準備

以下のコマンドを実行し、Cloudflareにログインします。

```sh
npx wrangler login
```

### 1. デプロイ

以下のコマンドを実行し、Cloudflareにデプロイします。

```sh
npx wrangler deploy
```

表示されたURL `https://***.workers.dev` がAPIのベースURLとなります。

### 2. Secretsの設定

> [!TIP]
> ローカルで動作させる場合、Secretsの代わりに `.env` ファイルを使用します。  
> `.env.example` ファイルを参考に `.env` ファイルを作成してください。

#### Foursquare関係の設定

Foursquare APIのバージョンを設定します。特に理由がない場合、`20240601` を設定してください。

```sh
npx wrangler secret put FOURSQUARE_API_VERSION
```

[Foursquare Developer Console](https://location.foursquare.com/developer/)から以下の認証情報を取得し、設定します。

```sh
npx wrangler secret put FOURSQUARE_API_KEY
npx wrangler secret put FOURSQUARE_API_KEY_SECRET
npx wrangler secret put FOURSQUARE_PUSH_SECRET
```

`/oauth/callback` にアクセスするURLを設定します。 (例: `https://***.workers.dev/oauth/callback` )

```sh
npx wrangler secret put FOURSQUARE_REDIRECT_URI
```

#### X(Twitter)関係の設定

[X(Twitter) Developer Console](https://console.x.com/)から以下の認証情報を取得し、設定します。

```sh
npx wrangler secret put TWITTER_API_KEY
npx wrangler secret put TWITTER_API_KEY_SECRET
npx wrangler secret put TWITTER_ACCESS_TOKEN
npx wrangler secret put TWITTER_ACCESS_TOKEN_SECRET
```

### 3. Foursquare Developer Consoleの設定

[Foursquare Developer Console](https://location.foursquare.com/developer/)にアクセスし、以下を設定します。

#### OAuth Authenticationの設定

- `Redirect URL` - `/oauth/callback` にアクセスするURLを設定します。 (例: `https://***.workers.dev/oauth/callback` )

![OAuth Authentication Settings](img/OAuthAuthenticationSettings.png)

#### Push APIの設定

- `Push Notifications` - `Push checkins by this project's users` を選択します。
- `Push URL` - `/webhook` にアクセスするURLを設定します。 (例: `https://***.workers.dev/webhook` )
- `Push Version` - Push APIのバージョンを設定します。特に理由がない場合、`20240601` を設定してください。

![Push API Settings](img/PushAPISettings.png)

### 4. Foursquareとの認証

ブラウザから `https://***.workers.dev/oauth` にアクセスし、Foursquareと認証します。  
認証後、ブラウザに表示されたアクセストークンをSecretsに設定します。

```sh
npx wrangler secret put FOURSQUARE_ACCESS_TOKEN
```

## ライセンス

このソフトウェアは[Unlicense](LICENSE)に基づいてライセンスされています。

## 関連項目

- https://appl-rot13.hatenablog.jp/entry/2024/07/02/000417
