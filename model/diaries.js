// model/diaries.js - 日記 (kind 'diary'、id は日付) の読み書き
import * as records from './records.js';

const KIND = 'diary';

export async function fetchDiaries() {
   const { data, error } = await records.fetchRecords(KIND);
   if (error) return { data: null, error };

   return {
      data: data.map(({ id, data }) => ({
         date: id,
         content: data.content ?? '',
      })),
      error: null
   };
}

export const upsertDiary = (date, content) => records.upsertRecord(KIND, date, { content });

export const deleteDiary = (date) => records.deleteRecord(KIND, date);
