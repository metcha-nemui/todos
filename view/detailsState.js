// view/detailsState.js - <details> の開閉状況を localStorage に保存・復元

const STORAGE_KEY = "todo_group_open_states";

// 保存対象の要素ID → 保存キー
const DETAILS_KEYS = {
   "details-todo"  : "TODO",
   "details-done"  : "DONE",
   "details-nodate": "NODATE",
};

const loadStates = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

export function bindDetailsStateSave() {
   document.addEventListener("toggle", (e) => {
      const key = DETAILS_KEYS[e.target.id] || "";
      if(!key) return;

      const states = loadStates();
      states[key] = e.target.open;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
   }, { capture: true });
}

export function restoreDetailsState() {
   const states = loadStates();
   for(const element of document.querySelectorAll("details")) {
      const key = DETAILS_KEYS[element.id];
      if(!key) continue;

      if(key in states) element.open = states[key];
   }
}
