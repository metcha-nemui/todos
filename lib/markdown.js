// lib/markdown.js - タスクの Markdown 書き出し (「Done」「ToDo」見出しのコピーボタンと同じ形式)
import { formatDateWithWeekday } from './date.js';

// 1日分。'MM/DD(曜)' の行に続けて、Done は '- [x] '、ToDo は '- [ ] ' の行を並べる
export const formatDayMarkdown = ({ date, dones = [], todos = [] }) => {
   const lines = [
      ...dones.map(t => `- [x] ${t.title}`),
      ...todos.map(t => `- [ ] ${t.title}`),
   ];
   return `${formatDateWithWeekday(date) || '日付なし'}\n${lines.join('\n')}`;
};

// 複数日分。days は { date, dones, todos } の配列で、日ごとに空行で区切る
export const formatDaysMarkdown = (days) => days.map(formatDayMarkdown).join('\n\n');

// tasks を日付 (due_date) の続くかたまりごとに { date, dones: tasks } へまとめる。並び順は保つ
export const groupDonesByDate = (tasks) => {
   const days = [];
   tasks.forEach(task => {
      const last = days[days.length - 1];
      if (last && last.date === task.due_date) last.dones.push(task);
      else days.push({ date: task.due_date, dones: [task] });
   });
   return days;
};
