# bolide2

bolide2 は Zoom などのビデオ会議中に共有画面にて投稿されたコメントを流すデスクトップアプリケーションです。

## 対応環境

- Windows x64
- Windows arm64
- MacOS universal(x64 + arm64)

## インストール

[リリースページ](https://github.com/bolide2/bolide2/releases)からダウンロードしてください。

## 開発ロードマップ

- [x] 初版リリース
- [ ] スタンプ機能
- [ ] bolide2 専用サーバーリリースと対応

## 発表で使う

1. Desktopの「ルームを作成・管理」からブラウザを開き、Googleでログインしてルームを作ります。
2. 主催者管理画面の「bolide2 Desktopで開く」を押します。開けない場合は参加URLをコピーし、Desktopの「参加URL」に貼り付けて「このルームを使う」を押します。
3. QR・参加URLを参加者に提示します。参加者はスマートフォンやPCのブラウザから匿名でコメントできます。
4. 色・文字サイズ・表示位置・速度を設定し、「コメント表示を開始」を押します。資料やアプリの上にコメントが流れます。
5. 「コメント表示を停止」で設定画面へ戻ります。ルームの投稿受付と保存履歴は続きます。投稿受付を終了する場合はブラウザの主催者管理画面で操作します。

専用サーバーは[bolide2-server](https://bolide2-server.mogami.dev)です。
Google認証はブラウザで行い、DesktopにGoogleの秘密値やWebセッションを保存しません。
主催者管理・履歴画面を開く操作も同じブラウザを使います。

配布版は`bolide2://rooms/<ID>?server=<origin>`からルーム設定を受け取れます。
リンクを受け取っても表示は自動開始しません。表示中は現在のコメント接続を維持し、停止後の設定に反映します。
開発版・未インストールなどの場合は通常の参加URLを貼り付けて使えます。
従来のサーバーURL・ルームID・デジクリ・カスタム接続は「その他の接続先・詳細設定」にあります。

## 開発

Node.js 22.12 以上と npm を使用してください。

環境構築（ロックファイルに固定された依存関係をインストール）

```bash
npm ci
```

アプリケーションの起動

```bash
npm run dev
```

アプリケーションのビルド

```bash
npm run build
```

型チェック、回帰テスト、パッケージ化を省いた本番ビルドをまとめて実行できます。

```bash
npm run check
```

個別に実行する場合は `npm run typecheck`、`npm test`、`npm run build:check` を使用します。
`npm run build` は現在の OS 向けの配布ファイルも生成します。

ビルド後は Electron を実際に起動する動作確認も実行できます。

```bash
npm run build:check
npm run test:electron
```

ローカルの WebSocket サーバーを使い、接続、コメント表示、アニメーション終了後の削除、
開始・停止、テスト表示からの復帰、読み込み失敗時の復帰を確認します。
参加URLの取り込み、不正なリンクの拒否、起動前・起動後・表示中のルームリンク受信、
表示の自動開始防止、設定の再読み込み、外部ブラウザ用IPC、速度のキー入力も確認します。
OSによるプロトコルの登録・ブラウザからの起動は、このスモークの対象外です。
検証用のユーザーデータは一時ディレクトリに保存し、画像は `output/playwright/` に出力します。
macOS / Windows の PR CI でも型チェック、回帰テスト、脆弱性監査、
配布ファイルのビルド、Electron の動作確認を実行します。

### 構成

- `main/main.ts`: Electron の画面と開始・停止処理
- `main/helpers/room-connection.ts`: 参加URL・アプリリンクの検証、ブラウザ用URLの生成
- `main/preload.ts`: 許可した IPC チャンネルを renderer に公開
- `renderer/app`: 設定画面、停止画面、コメント表示
- `renderer/lib`: 接続 URL、コメントの解析・表示オプション
- `tests`: 接続や表示、ウィンドウ状態の回帰テスト
- `scripts/electron-smoke.mjs`: Electron の動作確認

Nextron 10 / Next.js 16 / React 19 / Electron 44 を使用しています。
[Nextron の移行ガイド](https://github.com/saltyshiomix/nextron#nextron-v10)に合わせ、
main プロセスは ES Modules、preload は sandbox で動く CommonJS としています。
TypeScript は Nextron のビルド用コンパイラと合わせて 6 系を使用します。

Tailwind CSS 4 のテーマは `renderer/styles/globals.css`、PostCSS 設定は
`renderer/postcss.config.js` にあります。
