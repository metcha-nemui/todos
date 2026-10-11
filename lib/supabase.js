// lib/supabase.js - Supabase クライアントの初期化
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Load Supabase configuration from localStorage
let cfg = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };
const stored = localStorage.getItem('supabaseConfig');
if (stored) {
   try { cfg = JSON.parse(stored); } catch(e) { console.error('Failed to parse Supabase config:', e); }
}
const { SUPABASE_URL, SUPABASE_ANON_KEY } = cfg;

// 設定が無い場合は null のまま
export let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
   supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
   console.warn('Supabase configuration missing; client not initialized.');
}
