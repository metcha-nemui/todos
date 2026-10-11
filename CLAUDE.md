# todo-app

ビルド不要・依存なしの素の ES Modules 製 ToDo アプリ。バックエンドは Supabase。UI・コメントは日本語。

## 構成 (MVP)
- `model.js` — `TodoModel`。Supabase との読み書きとデータ保持 (`todos` テーブル等)。
- `view.js` — `TodoView`。DOM 描画とイベントの `bind*` メソッド。
- `app.js` — `TodoPresenter`。Model と View を接続するエントリポイント。
- `index.html` / `style.css` — 画面とスタイル。

## 実行・確認
- ビルド・テストなし。ES Modules のため `file://` では動かない。ローカルサーバで配信して確認する (例: `python -m http.server`)。
- Supabase の URL / anon key はブラウザの localStorage `supabaseConfig` (`{SUPABASE_URL, SUPABASE_ANON_KEY}`) から読む。コードやコミットに書かない。

## コード規約
- インデントは半角スペース3つ。既存の書式・コメント密度に合わせる。
- 日付は `YYYY-MM-DD` 文字列 (ローカル時間)。`model.js` のヘルパを使う。
- コミットメッセージは日本語の短い要約 (例: `CSS適用漏れ修正`)。

## 既知の暫定事項
- `this.todos` は 1000件ずつ2回の `range` 取得で上限2000件 (暫定)。
- 「先頭5個を残して折りたたむ」は仮実装。
