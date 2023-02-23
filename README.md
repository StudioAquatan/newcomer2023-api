# newcomer2023-api

新歓 2023 企画のバックエンド

フロントエンド実装：https://github.com/StudioAquatan/newcomer2023-web

## Requirements

開発環境には以下のものを利用しています。

- Node.js v18.12.1
- NPM
- TypeScript
- [Hono](https://honojs.dev)
- Wrangler V2 / Miniflare
- Jest
- Prettier / ESLint / Husky

推奨エディターは Visual Studio Code です．`.vscode/extensions.json`に示される推奨事項の拡張機能をすべてインストールしてください．

## API 定義

バックエンドは`api-spec.yml`([Swagger UI](https://head.aquatan-newcomer2023-apidocs.pages.dev/#/))に基づく API を提供します．

## ディレクトリ構成

### `src/models`

DB の値を保持し，値についてアプリケーション側で行うような処理を記述するモデルです．
ここでは，DB に書き込まれているかどうか，ある状態であるかどうかをモデルのクラスを複数用意して区別します．
用意されたクラス同士は，幽霊型やそれに類する手法により明確に区別されます．

モデルは **Immutable**であることを前提に記述してください．

#### クラス内で用いるメンバについて

日時を示す場合は`luxon`の`DateTime`クラスを用いてください．タイムゾーンは UTC で統一します．また，`utils/date.ts`も確認してください．

### `src/repositories`

DB や API とやり取りを行い，情報の永続化や取り出しを行います．
利用する DB 等(後述)が変化しても対応できるよう，インターフェースと本体を別で定義しています．

- DB 接続等はコンストラクタで受け取り保持しておきます．
- カスタム例外を定義しても大丈夫です．
- テストは，Miniflare 等でローカル完結するものについて記述します．

### `src/controllers`

API が受けたリクエストをモデルやレポジトリ群を用いて処理します．
Hono の Context を受け取るなど，Hono と密結合しても大丈夫です．
レポジトリ群などは，コンストラクタで受け取ります．

## テスト記述について

- DB を書き換えるレポジトリや値を変更するモデル部分について Jest によるテスト作成を推奨します
  - Read-only の場合はどちらでも大丈夫です
  - DB が WebAPI の場合も書かなくて大丈夫です
- テストは，書き換えを行う関数，読み込む関数に行います
- 例外を出す場合，アプリケーションで特別に処理すべき例外(Fault など)についてはテストを書いてください
  - DB 接続エラー等，想定されないエラー(Failure)については不要です

## npm scripts

開発にあたり利用するスクリプトを用意しています。

| command | description                     |
| ------- | ------------------------------- |
| start   | 開発モードで Wrangler を起動    |
| deploy  | Wrangler によりコードをデプロイ |
| lint    | eslint などの実行               |
| test    | jest などの実行                 |
| schema  | OpenAPI スキーマの型定義生成    |
