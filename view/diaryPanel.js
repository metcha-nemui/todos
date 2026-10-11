// view/diaryPanel.js - 「Diary」パネル

export class DiaryPanel {
   constructor() {
      this.inputDiary = document.getElementById('input-diary');
      this.counter = document.getElementById('diary-counter');
      this.details = this.inputDiary.closest("details");

      // 最後に描画した日付 (保存時に使う)
      this._currentDate = null;

      this.inputDiary.addEventListener("input", () => {
         this._updateCounter();
      });
   }

   // diary: { date, content } または undefined
   render({ currentDate, diary }) {
      this._currentDate = currentDate;
      this.inputDiary.value = diary?.content || "";
      this._updateCounter();

      // 本文がある日は開いておく
      this.details.open = this.inputDiary.value !== "";
   }

   _updateCounter() {
      this.counter.textContent = this.inputDiary.value.length;
   }

   bindUpdateDiary(handler) {
      this.inputDiary.addEventListener("blur", () => {
         handler(this._currentDate, this.inputDiary.value.trim());
      });
   }
}
