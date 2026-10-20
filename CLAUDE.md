# todo-app

ビルド不要・依存なしの素の ES Modules 製 ToDo アプリ。バックエンドは Supabase。UI・コメントは日本語。

## 構成 (MVP)
- `model.js` — `TodoModel`。データ保持と操作の窓口。書き込みは成功後に手元へ反映し、失敗は `bindOnError` で通知する。読み込みは `reload()` に集約し、起動時と画面復帰時に呼ぶ。
   - `model/todos.js` / `diaries.js` / `templates.js` — テーブルごとの Supabase 読み書き。`templates` (サジェスト候補) の主キーは `name`。
   - `model/backup.js` — 全テーブルの JSON バックアップと復元。DB の行をそのまま書き出し、スキーマの版 (`SCHEMA_VERSION`) を添える。スキーマを変えたら版を上げ、旧版 → 新版の変換を `MIGRATIONS` に足す (復元時に古い版のファイルを変換して書き込む)。復元は書き込み先のテーブルが全て空のときだけ行う。
- `view.js` — `TodoView`。画面を束ねる窓口。パネル単位の `render*` とイベントの `bind*` メソッド。`view/` の下は層ごとのフォルダに分ける。
   - `view/panels/` — 画面を構成するパネル。各自の要素取得・描画・イベントを持つ。
      - `today.js` / `diary.js` / `backlog.js` — 「本日のタスク」/「Diary」/「今後のタスク」。
      - `statusBanner.js` — 画面上部の通知 (オフライン / 読み込み失敗)。
   - `view/modals/` — モーダル。
      - `template.js` — サジェスト候補の登録画面。
      - `diaryList.js` — 過去の日記の一覧。Diary 欄の見出しのボタンから開き、選んだ日付へ移動する。
      - `heatmap.js` — 日ごとの Done 件数のヒートマップ (GitHub の草ふう、月ごとに区切り、記録のない月は省く)。Done 欄の見出しのボタンから開き、選んだ日付へ移動する。
      - `doneSearch.js` — Done タスクの検索 (タスク名の中間一致、新しい順)。Done 欄の見出しの検索ボタンから開き、行ごとにタスク名をコピーでき、行を選ぶとそのタスクの日付へ移動する。
      - `export.js` — 月ごとのタスクの Markdown 出力 (前月 / 翌月で月を選び、コピーまたは `tasks-YYYY-MM.md` でダウンロード)。画面下部の「Markdown出力」ボタンから開く。
      - `backup.js` — 全データの JSON バックアップと復元 (`todo-backup-YYYY-MM-DD.json`)。画面下部の「バックアップ」ボタンから開く。
      - `split.js` — タスクの分割画面。未完了タスクの行内アクションから開き、OK で元タスクを分割後のタスク群に置き換える (`TodoModel.splitTodo`)。
      - `config.js` — Supabase 接続設定の入力画面。`app.js` とは別の `<script>` で読み込む (Supabase を読み込めなくても動かすため)。`data-open-config` を付けた要素が入口になる。
      - `close.js` — モーダル共通の閉じる操作 (背景クリック / Escape)。
   - `view/parts/` — パネルやモーダルから使う UI 部品。対象の要素は引数で受け取る。
      - `taskList.js` — タスク行の描画と行内アクション。
      - `dragSort.js` / `suggest.js` / `pip.js` / `detailsState.js` — 並び替え / サジェスト / PiP / 折りたたみの開閉状況の保存。
   - `view/util/` — 画面を知らないヘルパ。`html.js` (`escapeHtml` / `parseHtml`)、`clipboard.js`。
- `lib/supabase.js` — Supabase クライアント初期化と、全行取得の `fetchAllRows` (1リクエストの行数上限を超えても取りこぼさない。テーブルを全件読むときは必ずこれを使う)。`lib/date.js` — 日付ヘルパ。`lib/markdown.js` — タスクの Markdown 書き出し (Done / ToDo 見出しのコピーボタンの形式。他の書き出しもこれを使う)。
- `app.js` — `TodoPresenter`。Model と View を接続するエントリポイント。Model の変更種別 (`todos` / `diaries` / `templates` / `date` / `status`) ごとに描き直すパネルを `RENDER_TARGETS` で決める。
- `index.html` / `style.css` — 画面とスタイル。`pip.css` — PiP ウィンドウ用スタイル (`view/parts/pip.js` が読み込む)。
- PWA: `manifest.webmanifest` / `icons/` — ホーム画面に追加したときの名前とアイコン。`sw.js` — サービスワーカー。`offline.html` — オフラインで開いたときに `sw.js` が返すページ。

## 実行・確認
- ビルド・テストなし。ES Modules のため `file://` では動かない。ローカルサーバで配信して確認する (例: `python -m http.server`)。
- Supabase の URL / anon key はブラウザの localStorage `supabaseConfig` (`{SUPABASE_URL, SUPABASE_ANON_KEY}`) から読む。コードやコミットに書かない。

## コード規約
- `view/` の import は `panels` / `modals` → `parts` → `util` の向きだけにする (同じ層どうしは `modals/close.js` のような層内の共通処理に限る)。DOM に触らないヘルパは `lib/` に置く。
- フォルダ名で分かる語はファイル名に含めない (`panels/today.js`、`modals/template.js`)。クラス名は `TodayPanel` / `TemplateModal` のように付ける。
- インデントは半角スペース3つ。既存の書式・コメント密度に合わせる。
- 改行コードは常に CRLF。ファイルを編集・新規作成したら CRLF になっていることを確認する。`sed -i` は CRLF を LF に変えることがあるので、置換はバイト単位 (Python 等) で行う。
- 複数の画面で使うスタイルは、特定の画面名を含まないクラスにする (モーダルの枠 `.modal-dialog` / `.modal-header` / `.modal-list` / 一覧上の行 `.modal-toolbar` / 一覧内の区切り見出し `.modal-list-heading` と横に広い枠 `.modal-dialog-wide`、空のときの案内文 `.empty-text`、折りたたみの見出し `.collapse-title`、見出し内のアイコンボタン `.summary-btn` と右端の文字付きボタン `.summary-action`)。
- スタイルは CSS に書く。インラインスタイルは動的な値 (座標・幅) と、サジェストのアンカー名の対応付けに限る。表示状態の切替は `hidden` 属性か `.is-*` クラスで行う。
- `sw.js` はアプリのファイルをキャッシュしない (古い版が出続けるのを避けるため)。キャッシュするのは `offline.html` だけ。
- 日付は `YYYY-MM-DD` 文字列 (ローカル時間)。`lib/date.js` のヘルパを使う。
- コミットメッセージは日本語の短い要約 (例: `CSS適用漏れ修正`)。

## Git 運用
- 指示された作業の終了時に、変更を現在のブランチへ自動でコミットする。作業指示でブランチの指定がある場合はそちらに従う。
- 禁止: `main` ブランチへのマージ、および `push` (どのブランチでも)。必要な場合はユーザーが手動で行う。
