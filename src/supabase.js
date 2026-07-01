// ============ التخزين السحابي (Supabase) ============
// لتفعيل المزامنة بين الأجهزة، ضع رابط المشروع والمفتاح العام هنا.
// تحصل عليهما من: supabase.com → مشروعك → Settings → API
//   - SUPABASE_URL: مثل https://xxxxx.supabase.co
//   - SUPABASE_ANON_KEY: المفتاح العام (publishable / anon) — آمن للمتصفح
//
// يمكن أيضاً ضبطهما كمتغيرات بيئة في Netlify باسم:
//   VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'PUT_YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'PUT_YOUR_SUPABASE_ANON_KEY_HERE';

// مُعرّف مساحة العمل المشتركة — كل الأجهزة التي تستخدم نفس القيمة تتشارك نفس البيانات.
export const WORKSPACE_ID = 'lcare-main';

// هل الإعدادات مضبوطة؟ (إن لم تكن، يعمل التطبيق محلياً فقط)
export const cloudEnabled =
  SUPABASE_URL && !SUPABASE_URL.startsWith('PUT_YOUR') &&
  SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('PUT_YOUR');

export const supabase = cloudEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null;

// جلب البيانات من السحابة. يُرجع { sales: [...] } أو null إذا لم تتوفر.
// مع مهلة زمنية (٨ ثوانٍ) حتى لا يتعلّق التطبيق إذا تأخرت أو تعطّلت Supabase.
export async function cloudLoad() {
  if (!supabase) return null;
  try {
    const query = supabase
      .from('app_state')
      .select('data')
      .eq('id', WORKSPACE_ID)
      .maybeSingle();
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ __timeout: true }), 8000)
    );
    const result = await Promise.race([query, timeout]);
    if (result && result.__timeout) {
      console.warn('cloudLoad: تجاوز المهلة — سيتم استخدام النسخة المحلية');
      return null;
    }
    const { data, error } = result;
    if (error) { console.error('cloudLoad error:', error.message); return null; }
    return data?.data || null;
  } catch (e) {
    console.error('cloudLoad exception:', e);
    return null;
  }
}

// حفظ البيانات في السحابة (upsert على نفس الصف المشترك).
export async function cloudSave(payload) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({ id: WORKSPACE_ID, data: payload, updated_at: new Date().toISOString() });
    if (error) { console.error('cloudSave error:', error.message); return false; }
    return true;
  } catch (e) {
    console.error('cloudSave exception:', e);
    return false;
  }
}

// الاشتراك في التغييرات الحيّة (عند تعديل جهاز آخر للبيانات).
export function cloudSubscribe(onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('app_state_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state', filter: `id=eq.${WORKSPACE_ID}` },
      (payload) => {
        const next = payload?.new?.data;
        if (next) onChange(next);
      }
    )
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch (e) {} };
}
