# todo-app

ビルド不要・依存なしの素の ES Modules 製 ToDo アプリ。バックエンドは Supabase。UI・コメントは日本語。

## 構成 (MVP)
- `model.js` — `TodoModel`。データ保持と操作の窓口。書き込みは成功後に手元へ反映し、失敗は `bindOnError` で通知する。読み込みは `reload()` に集約し、起動時と画面復帰時に呼ぶ。
   - `model/records.js` — このアプリのテーブル `todo_app` の読み書き。1行が1レコードで、列は `kind` / `id` (合わせて主キー) / `data` (jsonb) / `updated_at`。項目の増減は `data` の中で行い、テーブルの列は変えない (Supabase 側を触らずに済ませるため。同じ Supabase の別プロダクトは別テーブルにする)。`data` の更新は丸ごと置き換え。v0 のバックアップから復元すると、版を記録する `kind` `_meta` の行も入る (アプリは読まない)。
   - `model/todos.js` / `diaries.js` / `templates.js` — 種別 (`kind` が `todo` / `diary` / `template`) ごとの読み書き。`records.js` を使い、読み込み時に足りない項目は既定値で補う。`diary` の `id` は日付、`todo` / `template` は uuid (アプリ側で振る)。サジェスト候補はアプリ内では名前で扱う。
   - `model/backup.js` — 全データの JSON バックアップと復元。DB の行をそのまま書き出し、データの形の版 (`SCHEMA_VERSION`、v0 は旧3テーブル、v1 は `todo_app`) を添える。互換のない変更をしたら版を上げ、旧版 → 新版の変換を `MIGRATIONS` に足す (復元時に古い版のファイルを変換して書き込む)。項目の追加だけなら版は上げない。復元はテーブルが空のときだけ行う。
- `view.js` — `TodoView`。画面を束ねる窓口。パネル単位の `render*` とイベントの `bind*` メソッド。`view/` の下は層ごとのフォルダに分ける。
   - `view/panels/` — 画面を構成するパネル。各自の要素取得・描画・イベントを持つ。
      - `today.js` / `diary.js` / `backlog.js` — 「本日のタスク」/「Diary」/「今後のタスク」。画面ではタブ (Done (Done と Diary) / ToDo / 今後) で出し分ける。画面上部 (`.app-header`、スクロールしても上に残す) に日付の見出し (全タブ共通、中央)・設定メニュー (右端。配色の切り替えとたまに使う操作をまとめる)・タブを置き、中身は外枠のカードなしで並べる。起動時は毎回 Done タブ (`index.html` の初期状態、前回のタブは覚えない)。ToDo を完了にするとトースト「タスクを完了しました」を出す。
      - ToDo は Must (その日に絶対やるもの) と Want (やりたい・やったほうがいい) に分ける (タスクの `must`。Done は区別しないので、完了にしたら false にする)。追加時にタスク名の先頭に `!` (全角も可) を付けると Must (`TodoModel.addTodo` で解釈するのでクイック登録でも効く)。Must は日付ごとに未完了 `MUST_LIMIT` (2) 件までで、日付なしにはできない。上限を超える操作 (追加・日付変更・未完了に戻す・分割) は Want にして知らせ、Want → Must のドラッグ移動は上限に達していればできない。今後タブでは Must のタスクに札 `Must` を付ける。
      - 期限を過ぎた Must は今日を表示しているとき「期限切れ」として Must の上に出す (`getOverdueMusts`)。期限を過ぎた Want は読み込み時 (`reload`) に日付なしへ戻す (`_releaseOverdueWants`)。
      - `statusBanner.js` — 画面上部の通知 (オフライン / 未ログイン / 読み込み失敗)。
   - `view/modals/` — モーダル。
      - `template.js` — サジェスト候補の登録画面。画面上部の設定メニューの「サジェスト候補」と、サジェスト末尾の「候補を編集…」から開く。
      - `diaryList.js` — 過去の日記の一覧。Diary 欄の見出しのボタンから開き、選んだ日付へ移動する。
      - `heatmap.js` — 日ごとの Done 件数のヒートマップ (GitHub の草ふう、直近12か月を月ごとに区切り、記録のない月は省く)。Done 欄の見出しのボタンから開き、選んだ日付へ移動する。
      - `doneSearch.js` — Done タスクの検索 (タスク名の中間一致、新しい順)。Done 欄の見出しの検索ボタンから開き、行ごとにタスク名をコピーでき、行を選ぶとそのタスクの日付へ移動する。
      - `export.js` — 月ごとのタスクの Markdown 出力 (前月 / 翌月で月を選び、コピーまたは `tasks-YYYY-MM.md` でダウンロード)。画面上部の設定メニューの「Markdown出力」から開く。
      - `backup.js` — 全データの JSON バックアップと復元 (`todo-backup-YYYY-MM-DD.json`)。画面上部の設定メニューの「バックアップ」から開く。
      - `login.js` — ログイン画面 (メールアドレスとパスワード)。未ログインになると自動で開き、画面上部の通知の「ログイン」からも開く。ログアウトは画面上部の設定メニュー。
      - `split.js` — タスクの分割画面。未完了タスクの行内アクションから開き、OK で元タスクを分割後のタスク群に置き換える (`TodoModel.splitTodo`)。
      - `edit.js` — タスク名の編集画面。行内アクションの「編集」から開き、保存で `TodoModel.editTodo` を呼ぶ。
      - `config.js` — Supabase 接続設定の入力画面。`app.js` とは別の `<script>` で読み込む (Supabase を読み込めなくても動かすため)。`data-open-config` を付けた要素が入口になる。
      - `close.js` — モーダル共通の閉じる操作 (背景クリック / Escape)。
   - `view/parts/` — パネルやモーダルから使う UI 部品。対象の要素は引数で受け取る。
      - `taskList.js` — タスク行の描画と行内アクション。
      - `datePicker.js` — 日付を選ぶカレンダー (端末の `<input type="date">` は使わない。端末ごとに動きが違うため)。`openDatePicker` は要素の下に開き、日を選ぶまで確定しない (`allowEmpty` で「日付なし」も選べる)。入力欄の代わりは `DateField` (ボタンに日付を出し、`value` で読み書きする)。
      - `dragSort.js` / `suggest.js` / `detailsState.js` — 並び替え (`bindLinkedDragAndDrop` はリスト間の移動もできる。Must / Want 用) / サジェスト (入力欄が空のときは出さない) / 折りたたみの開閉状況の保存。
      - `pip.js` — Document Picture-in-Picture ウィンドウを開く共通処理。中身は `index.html` の `<template>` から流し込む。
      - `pipSplit.js` — Split: 今日のToDoを一覧で出し、クリックで次へ進めて経過時間を記録する。行ごとに一覧から外せる。一覧だけスクロールし、下のタイマーは固定。
      - `pipFocus.js` — Focus: 開始画面で対象のToDoと1タスクあたりの持ち時間 (既定10分、前回値を localStorage `todo_focus_minutes` に保存) を選び、1つずつ表示する。持ち時間が過ぎると次へ強制的に進む。「スキップ」(次へ、時間はリセット) と「完了」(`TodoModel.completeTodo`) だけを持つ。メイン画面で完了・削除・日付変更されたタスクは、`todos` の変更時 (`renderFocus`) に対象から外す。
      - `tabs.js` — タブの切り替え (`role="tab"` のボタンと `aria-controls` で指す中身を `hidden` で出し分ける)。`bindTabSwipe` は本文 (`main`) を指で横にはらうと隣のタブへ切り替える (入力欄・浮き出す面の上で始めた操作は除く)。
      - `toast.js` — 画面下部に一時的に出す通知 (`showToast`)。要素は自分で作るので HTML 側の用意はいらない。
      - `theme.js` — 配色テーマ (システム / ライト / ダーク) の切り替え。localStorage `todo_theme` に保存し、`<html data-theme>` を付け外しする (システムは属性なし)。画面上部の設定メニュー内の切り替えボタン (`bindThemeSwitch`) と、他のウィンドウでの切り替え・端末の設定への追従 (`watchTheme`、クイック登録はこちらだけ使う)。描画前の適用は各 HTML の `<head>` の小さなスクリプトで行う (チラつき防止)。
   - `view/util/` — 画面を知らないヘルパ。`html.js` (`escapeHtml` / `parseHtml`)、`clipboard.js`。
- `sql/` — Supabase の SQL Editor に貼って実行する SQL。`create_v1.sql` (`todo_app` テーブルと RLS ポリシーの作成)、`auth_v1.sql` (anon で読み書きしていた既存テーブルを本人だけに切り替える)、`drop_v0.sql` (v0 の旧3テーブルの削除)。
- `lib/supabase.js` — Supabase クライアント初期化、ログイン (`getSignedIn` / `signInWithPassword` / `signOutUser` / `onAuthChange`) と、全行取得の `fetchAllRows` (1リクエストの行数上限を超えても取りこぼさない。テーブルを全件読むときは必ずこれを使う)。`lib/date.js` — 日付ヘルパ。`lib/markdown.js` — タスクの Markdown 書き出し (Done / ToDo 見出しのコピーボタンの形式。他の書き出しもこれを使う)。
- `app.js` — `TodoPresenter`。Model と View を接続するエントリポイント。Model の変更種別 (`todos` / `diaries` / `templates` / `date` / `status`) ごとに描き直すパネルを `RENDER_TARGETS` で決める。
- `index.html` / `style.css` — 画面とスタイル。モーダルは `id="<名前>-modal"` (`view/modals/` の同名のファイルが動かす)、PiP の中身は `<template id="pip-split-content">` / `pip-focus-content`。`pip.css` — PiP ウィンドウ用スタイル (`view/parts/pip.js` が読み込む)。
- `quick/` — タスクを追加するだけのクイック登録画面。本編とは別の PWA としてインストールし、OS のショートカットキーで呼び出して使う。上部のタブで ToDo / Done を切り替え、入力はタスク名と日付だけ (サジェストなし。日付は今日 / 明日 / 日付なし のボタンでも選べる)。Done では日付を必須にする (ボタンは今日だけ)。インストールしたアプリとして開くと、ウィンドウを中身の大きさにして画面右下へ置き、Escape で閉じる。本編の `TodoModel` をそのまま使い、データの読み書きを別に書かない。
   - `index.html` / `app.js` (`QuickPresenter`) / `view.js` (`QuickView`) / `style.css` (本編の `style.css` に重ねる) / `manifest.webmanifest` (スコープ `quick/`、`launch_handler` で既存ウィンドウを前面に出す)。
   - 接続設定とログインのセッションは同じオリジンの localStorage を共有するので、本編で設定・ログインすれば使える (設定画面・ログイン画面は持たず、未設定・未ログインなら本編への案内を出す)。
- PWA: `manifest.webmanifest` / `icons/` — ホーム画面に追加したときの名前とアイコン。スコープは `index.html` だけにする (`./` にすると `quick/` を内包し、本編を入れた状態でクイック登録をインストールできなくなる)。`id` は書かない (`id` はオリジンのルート基準で解決されるため、相対で書くと本編とクイック登録が同じアプリとみなされ上書きし合う。省略時は `start_url` で区別される)。`sw.js` — サービスワーカー。`offline.html` — オフラインで開いたときに `sw.js` が返すページ。

## 実行・確認
- ビルド・テストなし。ES Modules のため `file://` では動かない。ローカルサーバで配信して確認する (例: `python -m http.server`)。
- Supabase の URL / anon key はブラウザの localStorage `supabaseConfig` (`{SUPABASE_URL, SUPABASE_ANON_KEY}`) から読む。コードやコミットに書かない。
- 認証は Supabase Auth のメールアドレスとパスワード。anon key は公開される前提の値なので、守りは RLS で行う (`todo_app` は自分の User UID の `authenticated` だけが読み書きでき、サインアップは無効)。ユーザーと UID は Supabase のダッシュボードで管理し、コードやコミットに書かない。
- RLS で弾かれた読み込みはエラーにならず空で返る。データが消えたように見えたりバックアップの「テーブルが空」判定を誤ったりしないよう、`TodoModel` は未ログイン (`needLogin`) の間は読み込まない。セッションは同じオリジンの本編とクイック登録で共有する。

## コード規約
- `view/` の import は `panels` / `modals` → `parts` → `util` の向きだけにする (同じ層どうしは `modals/close.js` のような層内の共通処理に限る)。DOM に触らないヘルパは `lib/` に置く。
- フォルダ名で分かる語はファイル名に含めない (`panels/today.js`、`modals/template.js`)。クラス名は `TodayPanel` / `TemplateModal` のように付ける。
- インデントは半角スペース3つ。既存の書式・コメント密度に合わせる。
- 改行コードは常に CRLF。ファイルを編集・新規作成したら CRLF になっていることを確認する。`sed -i` は CRLF を LF に変えることがあるので、置換はバイト単位 (Python 等) で行う。
- `style.css` は shadcn/ui ふう。Tokens (変数) → Base → Parts (使い回す部品) → Layout → Screens (画面ごと) の順に並べ、部品の見た目は Parts にまとめる (ボタンは既定が主ボタン、`.secondary` が枠なし、`.danger` が押すと赤い枠なし、`.outline` が枠付き。入力欄・カード `.collapse`・切り替え `.tabs` / `.theme-switch`・札・浮き出す面 (サジェスト / メニュー / カレンダー / 通知)・メニューの項目・モーダル)。クイック登録の `quick/style.css` も本編のトークンを使う。
- 複数の画面で使うスタイルは、特定の画面名を含まないクラスにする (モーダルの枠 `.modal-dialog` / `.modal-header` / `.modal-list` / 一覧上の行 `.modal-toolbar` / 一覧内の区切り見出し `.modal-list-heading` / 下部のボタン行 `.modal-footer` と横に広い枠 `.modal-dialog-wide`、空のときの案内文 `.empty-text`、通知 `.toast` (一時的なものは下端に出す `.toast-bottom`) と中のボタン群 `.toast-actions`、折りたたみの見出し `.collapse-title`、タブ `.tabs` / `.tab` (本編とクイック登録で共用)、タスク一覧内の小見出し `.list-heading` とタスク名の後ろの札 `.task-badge`、見出し内の件数 `.list-count`、見出し内のアイコンボタン `.summary-btn` と右端の文字付きボタン `.summary-action`)。
- 色は `style.css` の `:root` のトークン (shadcn/ui ふうの名前: `--background` / `--card` / `--popover` / `--muted` / `--hover` / `--selected` / `--foreground` / `--muted-foreground` / `--border` / `--primary` / `--primary-text` / `--primary-subtle` / `--ring` / `--destructive` など) で決め、各所では `var(--*)` だけを使う (色の値を直接書かない)。余白・大きさ・文字・角丸・影も同じくトークンを使う (Tailwind ふう: 余白は基準値 `--space` (0.25rem = 4px) を `calc(var(--space) * N)` で N 倍する、部品の高さ `--control-h` / `--control-h-sm` / `--control-h-xs`、アイコン `--icon-size`、文字 `--text-xs` 〜 `--text-xl` と `--font-*`、角丸 `--radius-sm` 〜 `--radius-xl`、影 `--shadow-xs` 〜 `--shadow-lg`、重なり `--z-*`)。トークンは `light-dark(ライト, ダーク)` で両テーマの値を並べる。`pip.css` は常にダーク、`offline.html` は外部ファイルを読めないので自前で同じ値を持つ。
- HTML のコメントは最低限にする (描画前の配色の適用など、見ただけでは分からないものだけ)。各部分の役割はこのファイルに書く。
- 文字は英数字が Segoe UI、日本語が Noto Sans JP (Web フォントは読み込まない。Windows には入っている。Android では端末の Roboto / Noto Sans CJK)。太さは 400 / 600 / 700 だけを使う (Segoe UI に 500 がなく、日本語と太さがずれるため)。`html` の `font-size` は変えず、1rem = 16px のまま使う。
- スタイルは CSS に書く。インラインスタイルは動的な値 (座標・幅) と、サジェストのアンカー名の対応付けに限る。表示状態の切替は `hidden` 属性か `.is-*` クラスで行う。
- `sw.js` はアプリのファイルをキャッシュしない (古い版が出続けるのを避けるため)。キャッシュするのは `offline.html` だけ。
- 日付は `YYYY-MM-DD` 文字列 (ローカル時間)。`lib/date.js` のヘルパを使う。
- コミットメッセージは日本語の短い要約 (例: `CSS適用漏れ修正`)。

## Git 運用
- 指示された作業の終了時に、変更を現在のブランチへ自動でコミットする。作業指示でブランチの指定がある場合はそちらに従う。
- 禁止: `main` ブランチへのマージ、および `push` (どのブランチでも)。必要な場合はユーザーが手動で行う。
