# gens

Web記事のURLを保存し、読みやすい本文にハイライトとメモを残す個人用ReaderのMVPです。

**Hono × Inertia × React** を使用します。ルーティングとページデータの取得はHonoが担当し、`c.render()` のpropsをReactへ渡します。TanStack Routerは使用しません。

## 起動

Node.js 24以上、npmを使用します。ローカル開発にCloudflareアカウントは不要です。

```sh
npm ci
npm run typegen
npm run db:migrate
npm run dev
```

[http://127.0.0.1:5173](http://127.0.0.1:5173) を開きます。D1・R2はローカルエミュレーターを利用し、データは `.wrangler/state` に保持されます。記事取得にはインターネット接続が必要です。

1. 記事URLを入力して保存します。
2. 記事の本文で文章をドラッグ、またはキーボードで選択します。
3. 下部のツールバーから「ハイライト」または「メモを追加」を選びます。
4. メモは本文の近くに開く小さなポップオーバーで保存します。
5. 記事を開き直すとハイライトが復元されます。PCではhover、スマホではタップでメモを開きます。記事全体のメモは右上の「メモ」から開けます。Escape・閉じるボタン・外側のタップで閉じられます。

## 実装済み

- URL検証 → HTML取得 → Defuddle本文抽出 → Markdown → R2保存
- D1の記事一覧・メタデータ・processing / ready / failed状態
- 正規化したURLの重複排除。同時保存もDBのUNIQUE制約で予約し、重複取得を防止
- 取得失敗の表示と、同じ記事IDでの再試行
- React Markdown + remark-gfmによる読み取り専用Reader
- Selection APIによる位置・引用文・前後文脈の取得
- 位置 → 完全一致の引用文 → 文脈でハイライトを復元。曖昧な候補には誤適用しない
- CSS Custom Highlight APIで、Reactが管理する本文DOMを書き換えずにハイライト描画
- 本文一列のReader、ハイライトへのhover / タップで開くメモ、再訪時の復元
- キーボードでもハイライトのメモを開閉可能。記事全体へのメモはヘッダーからアクセス
- 自分で書いた記事。Markdownの本文にコードブロックとMermaidの図を書ける
- 共通Zodスキーマ、Inertiaの入力保持とエラー表示、ページ名・propsの型生成

## 構成

```text
src/
  client.tsx                 Inertiaの起動
  pages/                     一覧・Reader・エラーページ
  pages.gen.ts               InertiaのViteプラグインによる自動生成
  features/article/          Markdown Reader
  features/markdown/         自分で書いた記事の表示（コード・Mermaid）
  features/highlight/        選択・復元アルゴリズム
  components/                共通レイアウト
shared/contracts.ts          Zodスキーマ・データ型
worker/src/
  index.ts                   Honoのページ・更新ルート
  root-view.tsx              初回HTMLとViteアセット
  services/                  記事取得・重複・メモの業務処理
  repositories/              DrizzleによるD1アクセス
  infrastructure/            HTTP取得・Defuddle・R2・DBスキーマ
  domain/                    Fetcher / Extractorインターフェース・エラー
migrations/                  D1マイグレーション
```

記事本文は `articles/{articleId}/article.md` に保存します。`ArticleFetcher` と `ArticleExtractor` を分離しているため、Browser Rendering等を後から追加できます。Fetcherはリダイレクト後のURLも返し、相対リンクの解決に使います。

## ルート

| メソッド | URL                        | 内容                   |
| -------- | -------------------------- | ---------------------- |
| GET      | `/`                        | 残したものと書いたもの |
| POST     | `/articles`                | URLから記事を保存      |
| GET      | `/articles/:id`            | 本文・ハイライト・メモ |
| GET      | `/posts`                   | 一覧へ戻す             |
| GET      | `/posts/new`               | 新しい記事のエディタ   |
| POST     | `/posts`                   | 記事を保存             |
| GET      | `/posts/:id`               | エディタへ戻す         |
| GET      | `/posts/:id/edit`          | 書いている画面         |
| POST     | `/posts/:id`               | 記事を更新             |
| POST     | `/posts/:id/delete`        | 記事を削除             |
| POST     | `/articles/:id/highlights` | ハイライト保存         |
| POST     | `/articles/:id/memos`      | メモ保存               |
| GET      | `/api/health`              | 起動確認               |

更新時はJSONを送信し、成功時は303リダイレクトします。フォームエラーはInertiaページの `errors` propsで返します。設計たたきの個別REST APIは、指定されたInertia構成に合わせてページルートへ変更しました。

## 検証

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

単体・結合テストは本文抽出、URL制限、引用の復元、D1・R2への永続化、URL重複・同時保存、失敗からの再試行、別記事のハイライトへのメモ拒否を検証します。結合テストのD1・R2は開発用データと独立した一時ストレージです。

実ブラウザテストは、別のターミナルで `npm run dev` を起動し、Google Chromeをインストールした状態で実行します。

```sh
npm run test:e2e
```

E2Eは参考のZenn記事を実際に取得するため、外部サイトの可用性に依存します。開発用DBへ記事と `E2E ...` で始まるメモを作成します。デスクトップ・モバイルの画像は `test-results/` に出力します。

## 現時点の制約

- 個人利用のローカルMVPです。認証・複数ユーザーの権限管理は未実装です。外部公開前にCloudflare Access等でアプリ全体へのアクセスを制限してください。
- JavaScript実行が必要なページ、ログイン・有料購読・Bot対策で保護されたページは取得できない場合があります。Browser Rendering fallbackは未実装です。
- ハイライトの描画はCSS Custom Highlight API対応ブラウザを前提とします。復元できない引用の本文上での表示には対応していません。保存データは保持されます。
- SSRF対策として内部・予約IP、ローカルホスト、認証情報付きURL、非標準ポートを拒否し、DNSのA/AAAA応答と全リダイレクト先を検査します。IPv6リテラルは保守的に拒否します。DNS検証とfetchの接続先を固定する実装ではないため、DNS rebindingへの完全な保証はありません。
- 外部HTMLは最大2MB、最大5リダイレクト、HTTP取得は20秒のタイムアウトです。Defuddleの外部API取得は無効にしています。Markdown内の生HTMLは描画しません。
- 記事取得は同期処理です。Workerが強制終了した場合のprocessing状態の自動回復や、キューでのバックグラウンド処理は未実装です。
- 取り込んだWeb記事の編集・削除、タグ・検索・AI機能は未実装です。自分で書いた記事は編集・削除できます。

## Cloudflareへの配置（未実施）

`wrangler.jsonc` のD1 IDはローカル用プレースホルダーです。本番D1とR2を作成し、ID・バケット名を置き換えてからデプロイします。認証を整え、本文抽出に必要なWorker CPU時間も対象プランで確認してください。

```sh
npx wrangler login
npx wrangler d1 create gens-knowledge
npx wrangler r2 bucket create gens-knowledge-articles
# wrangler.jsoncのdatabase_idを作成したDBのIDに変更
npx wrangler d1 migrations apply gens-knowledge --remote
npm run deploy
```

## 参考

- [Hono公式の Inertia アダプタが来た！Hono × Inertia × React によるSPA新体験](https://zenn.dev/ashunar0/articles/cc351badf8681c)
- [@hono/inertia 公式](https://github.com/honojs/middleware/tree/main/packages/inertia)
- [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/get-started/)
- [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Defuddle](https://github.com/kepano/defuddle)
