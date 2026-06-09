-- ============================================
-- إعداد قاعدة بيانات LCare على Supabase
-- ============================================
-- انسخ هذا كاملاً والصقه في:
--   Supabase → مشروعك → SQL Editor → New query → Run
-- ============================================

-- 1) جدول يحفظ كل بيانات التطبيق (الزبائن + المبيعات) في صف واحد مشترك
create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{"sales": []}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) تفعيل أمان الصفوف (Row Level Security)
alter table public.app_state enable row level security;

-- 3) السماح بالقراءة والكتابة عبر المفتاح العام
--    (مناسب لتطبيق خاص بك وبمريم. البيانات محمية برابط المشروع والمفتاح.)
drop policy if exists "allow read app_state" on public.app_state;
create policy "allow read app_state"
  on public.app_state for select
  using (true);

drop policy if exists "allow write app_state" on public.app_state;
create policy "allow write app_state"
  on public.app_state for insert
  with check (true);

drop policy if exists "allow update app_state" on public.app_state;
create policy "allow update app_state"
  on public.app_state for update
  using (true) with check (true);

-- 4) تفعيل المزامنة الحيّة (Realtime) لهذا الجدول
alter publication supabase_realtime add table public.app_state;

-- تم! ✓ الآن ارجع للتطبيق وأضف رابط المشروع والمفتاح.
