-- ============================================================
-- vibeProfileit — Supabase Schema
-- Supabase SQL Editor'da çalıştır (service role ile)
-- ============================================================

-- UUID desteği (Supabase'de zaten aktif, yine de güvende)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLOLAR
-- ============================================================

-- profiles
-- next-auth'un "User" tablosuna (TEXT id) bağlanır.
-- token_balance: Seçenek A — denormalize bakiye.
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL UNIQUE,   -- next-auth User.id
  steam_id      TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  token_balance INTEGER     NOT NULL DEFAULT 0 CHECK (token_balance >= 0),
  is_admin      BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- assets
-- Her AI üretimi veya yüklenen dosya bir satır.
CREATE TABLE IF NOT EXISTS public.assets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  r2_key      TEXT        NOT NULL,
  r2_url      TEXT        NOT NULL,
  prompt      TEXT,
  model_used  TEXT,
  category    TEXT,
  mime_type   TEXT,
  file_size   INTEGER,
  is_premium  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- transactions
-- Token satın alma kayıtları. INSERT sadece backend'den.
CREATE TABLE IF NOT EXISTS public.transactions (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2)  NOT NULL CHECK (amount > 0),
  token_count    INTEGER        NOT NULL CHECK (token_count > 0),
  payment_method TEXT,
  status         TEXT           NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','completed','failed')),
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- token_usage
-- Her AI üretimi bu tabloya kaydedilir, bakiye buradan düşer.
-- asset_id nullable: token hediyesi / manuel düzeltme senaryoları için.
CREATE TABLE IF NOT EXISTS public.token_usage (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id        UUID        REFERENCES public.assets(id) ON DELETE SET NULL,
  model_used      TEXT,
  tokens_consumed INTEGER     NOT NULL DEFAULT 1 CHECK (tokens_consumed > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- İNDEKSLER
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id      ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id        ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at     ON public.assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id  ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id   ON public.token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_asset_id  ON public.token_usage(asset_id);

-- ============================================================
-- TRIGGER — updated_at otomatik güncelleme
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TRIGGER — next-auth User INSERT → otomatik profil oluştur
-- next-auth Prisma adapter "User" tablosunu (public şeması)
-- string id ile yönetir. Aşağıdaki trigger onu dinler.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.name,
    NEW.image
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- next-auth Prisma adapter tablosu: public."User"
-- Bu trigger, next-auth bir kullanıcı kaydı oluşturduğunda tetiklenir.
CREATE OR REPLACE TRIGGER trg_handle_new_user
  AFTER INSERT ON public."User"
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Not: Tüm backend işlemleri Prisma service-role ile çalışır
-- ve RLS'yi bypass eder. RLS doğrudan istemci erişimine karşı
-- savunma katmanıdır.
--
-- next-auth oturumu Supabase Auth'tan bağımsızdır.
-- current_setting('app.current_user_id') mekanizması kullanılır:
-- Backend, sorgu öncesi SET LOCAL app.current_user_id = '<user_id>'
-- çağırır — bu sayede RLS kendi user_id'sini doğrular.
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage   ENABLE ROW LEVEL SECURITY;

-- Yardımcı fonksiyon: mevcut kullanıcının profil UUID'sini döner
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE user_id = current_setting('app.current_user_id', true)
  LIMIT 1;
$$;

-- -------------------------------------------------------
-- profiles RLS
-- -------------------------------------------------------
CREATE POLICY "profiles: kendi satırını oku"
  ON public.profiles FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "profiles: kendi satırını güncelle"
  ON public.profiles FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true));

-- INSERT: sadece trigger (SECURITY DEFINER) veya service role
-- DELETE: yasak — policy yok = erişim yok

-- -------------------------------------------------------
-- assets RLS
-- -------------------------------------------------------
CREATE POLICY "assets: kendi satırlarını oku"
  ON public.assets FOR SELECT
  USING (user_id = public.current_profile_id());

CREATE POLICY "assets: kendi satırına ekle"
  ON public.assets FOR INSERT
  WITH CHECK (user_id = public.current_profile_id());

CREATE POLICY "assets: kendi satırını sil"
  ON public.assets FOR DELETE
  USING (user_id = public.current_profile_id());

-- UPDATE: yasak — asset oluşturulduktan sonra değişmez

-- -------------------------------------------------------
-- transactions RLS
-- -------------------------------------------------------
CREATE POLICY "transactions: kendi satırlarını oku"
  ON public.transactions FOR SELECT
  USING (user_id = public.current_profile_id());

-- INSERT/UPDATE/DELETE: sadece service role (backend)

-- -------------------------------------------------------
-- token_usage RLS
-- -------------------------------------------------------
CREATE POLICY "token_usage: kendi satırlarını oku"
  ON public.token_usage FOR SELECT
  USING (user_id = public.current_profile_id());

-- INSERT/UPDATE/DELETE: sadece service role (backend)

-- ============================================================
-- FONKSİYON ERİŞİM KISITLAMALARI
-- Supabase REST API (PostgREST) public şemadaki tüm fonksiyonları
-- anon/authenticated rollere açar — bu satırlar bunu kapatır.
-- ============================================================

-- Tüm fonksiyonlardan PUBLIC, anon, authenticated erişimini kapat
REVOKE EXECUTE ON FUNCTION public.set_updated_at()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM PUBLIC, anon, authenticated;

-- Sadece service_role ve postgres kullanabilir
GRANT EXECUTE ON FUNCTION public.set_updated_at()      TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user()     TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.current_profile_id()  TO service_role, postgres;

-- rls_auto_enable: Supabase dahili — uyarı gelirse bu bloğu çalıştır
-- REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
-- GRANT  EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role, postgres;
