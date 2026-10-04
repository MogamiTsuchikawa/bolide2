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
検証用のユーザーデータは一時ディレクトリに保存し、画像は `output/playwright/` に出力します。
macOS / Windows の PR CI でも型チェック、回帰テスト、脆弱性監査、
配布ファイルのビルド、Electron の動作確認を実行します。

### 構成

- `main/main.ts`: Electron の画面と開始・停止処理
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
