
-- =============================================
-- SECURITY FIX: Force Update Admin Password (Robust Retry)
-- =============================================

DO $$
BEGIN
    -- 1. Ensure pgcrypto exists (try public, then extensions)
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if exists
    END;

    -- 2. Update Password handling namespace dynamically
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'gen_salt' AND nspname = 'public') THEN
        -- pgcrypto is in public
        UPDATE auth.users
        SET encrypted_password = public.crypt('SECTOR91', public.gen_salt('bf'))
        WHERE email = 'sector91trading@gmail.com';
        RAISE NOTICE 'Updated using PUBLIC schema';
    ELSIF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'gen_salt' AND nspname = 'extensions') THEN
        -- pgcrypto is in extensions
        UPDATE auth.users
        SET encrypted_password = extensions.crypt('SECTOR91', extensions.gen_salt('bf'))
        WHERE email = 'sector91trading@gmail.com';
        RAISE NOTICE 'Updated using EXTENSIONS schema';
    ELSE
        -- Fallback: try to set search path and just call it
        PERFORM set_config('search_path', 'public,extensions', true);
        UPDATE auth.users
        SET encrypted_password = crypt('SECTOR91', gen_salt('bf'))
        WHERE email = 'sector91trading@gmail.com';
        RAISE NOTICE 'Updated using Search Path';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'CRITICAL ERROR updating password: %', SQLERRM;
END
$$;
