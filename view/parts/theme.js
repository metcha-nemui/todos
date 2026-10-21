// view/parts/theme.js - 配色テーマ (システム / ライト / ダーク) の切り替えと端末への保存
// 描画前の適用は各 HTML の <head> のスクリプトで行う (チラつき防止)。ここは切り替えと追従を受け持つ
// 色そのものは style.css の :root のトークンで決まる

const STORAGE_KEY = "todo_theme";
const THEMES = ["system", "light", "dark"];

const loadTheme = () => {
   const theme = localStorage.getItem(STORAGE_KEY);
   return THEMES.includes(theme) ? theme : "system";
};

// system のときは属性を外し、CSS の color-scheme で端末の設定に合わせる
function applyTheme(theme) {
   if (theme === "system") delete document.documentElement.dataset.theme;
   else                    document.documentElement.dataset.theme = theme;
   syncThemeColor();
}

// ブラウザやインストールしたアプリのタイトルバーの色を、今の背景色に合わせる
function syncThemeColor() {
   const meta = document.querySelector('meta[name="theme-color"]');
   if (meta) meta.content = getComputedStyle(document.body).backgroundColor;
}

// 端末の設定の変化と、他のウィンドウ (本編 / クイック登録) での切り替えに追従する
// onChange は他のウィンドウで切り替わったときに新しいテーマを受け取る
export function watchTheme(onChange = () => {}) {
   window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncThemeColor);
   window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY) return;
      const theme = loadTheme();
      applyTheme(theme);
      onChange(theme);
   });
   syncThemeColor();
}

// container 内の [data-theme-option] のボタンで切り替える。選んでいるボタンに aria-pressed を付ける
export function bindThemeSwitch(container) {
   const buttons = container.querySelectorAll("[data-theme-option]");
   const render = (theme) => {
      buttons.forEach(btn => btn.setAttribute("aria-pressed", String(btn.dataset.themeOption === theme)));
   };

   buttons.forEach(btn => {
      btn.addEventListener("click", () => {
         const theme = btn.dataset.themeOption;
         localStorage.setItem(STORAGE_KEY, theme);
         applyTheme(theme);
         render(theme);
      });
   });

   render(loadTheme());
   watchTheme(render);
}
