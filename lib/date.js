// lib/date.js - 日付ヘルパ (YYYY-MM-DD 文字列、ローカル時間)

const toDateString = (date) => {
   const yyyy = date.getFullYear();
   const mm = String(date.getMonth() + 1).padStart(2, '0');
   const dd = String(date.getDate()).padStart(2, '0');
   return `${yyyy}-${mm}-${dd}`;
};

export const getTodayDateString = () => toDateString(new Date());

export const getTomorrowDateString = () => {
   const now = new Date();
   return toDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
};

// 日付文字列を days 日ずらす (負数で過去へ)
export const shiftDateString = (dateString, days) => {
   const [yyyy, mm, dd] = dateString.split('-').map(Number);
   return toDateString(new Date(yyyy, mm - 1, dd + days));
};
