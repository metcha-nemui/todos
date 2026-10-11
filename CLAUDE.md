# todo-app

ビルド不要・依存なしの素の ES Modules 製 ToDo アプリ。バックエンドは Supabase。UI・コメントは日本語。

## 構成 (MVP)
- `model.js` — `TodoModel`。データ保持と操作の窓口。書き込みは成功後に手元へ反映し、失敗は `bindOnError` で通知する。
   - `model/todos.js` / `diaries.js` / `templates.js` — テーブルごとの Supabase 読み書き。
- `view.js` — `TodoView`。パネルを束ねる窓口。パネル単位の `render*` とイベントの `bind*` メソッド。
   - `view/todayPanel.js` / `diaryPanel.js` / `backlogPanel.js` — 画面を構成するパネル。各自の要素取得・描画・イベントを持つ。
   - `view/taskList.js` — タスク行の描画と行内アクション。
   - `view/dragSort.js` / `suggest.js` / `clipboard.js` / `pip.js` / `detailsState.js` — 独立した UI 部品。
- `lib/supabase.js` — Supabase クライアント初期化。`lib/date.js` — 日付ヘルパ。
- `app.js` — `TodoPresenter`。Model と View を接続するエントリポイント。Model の変更種別 (`todos` / `diaries` / `templates` / `date`) ごとに描き直すパネルを `RENDER_TARGETS` で決める。
- `index.html` / `style.css` — 画面とスタイル。

## 実行・確認
- ビルド・テストなし。ES Modules のため `file://` では動かない。ローカルサーバで配信して確認する (例: `python -m http.server`)。
- Supabase の URL / anon key はブラウザの localStorage `supabaseConfig` (`{SUPABASE_URL, SUPABASE_ANON_KEY}`) から読む。コードやコミットに書かない。

## コード規約
- インデントは半角スペース3つ。既存の書式・コメント密度に合わせる。
- 改行コードは常に CRLF。ファイルを編集・新規作成したら CRLF になっていることを確認する。`sed -i` は CRLF を LF に変えることがあるので、置換はバイト単位 (Python 等) で行う。
- 日付は `YYYY-MM-DD` 文字列 (ローカル時間)。`lib/date.js` のヘルパを使う。
- コミットメッセージは日本語の短い要約 (例: `CSS適用漏れ修正`)。

## Git 運用
- 指示された作業の終了時に、変更を現在のブランチへ自動でコミットする。作業指示でブランチの指定がある場合はそちらに従う。
- 禁止: `main` ブランチへのマージ、および `push` (どのブランチでも)。必要な場合はユーザーが手動で行う。
