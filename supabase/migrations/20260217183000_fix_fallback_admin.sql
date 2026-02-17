
-- =============================================
-- SECURITY FIX: Fix Fallback Admin (admin@sector91.com)
-- =============================================

DO $$
BEGIN
    -- 1. Ensure pgcrypto exists
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 2. Update Password & Confirm Email for admin@sector91.com
    -- Using the robust schema detection logic
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'gen_salt' AND nspname = 'public') THEN
        UPDATE auth.users
        SET encrypted_password = public.crypt('SECTOR91', public.gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'
        WHERE email = 'admin@sector91.com';
    ELSIF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'gen_salt' AND nspname = 'extensions') THEN
        UPDATE auth.users
        SET encrypted_password = extensions.crypt('SECTOR91', extensions.gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'
        WHERE email = 'admin@sector91.com';
    ELSE
        -- Fallback
        PERFORM set_config('search_path', 'public,extensions', true);
        UPDATE auth.users
        SET encrypted_password = crypt('SECTOR91', gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'
        WHERE email = 'admin@sector91.com';
    END IF;

    RAISE NOTICE 'Fixed admin@sector91.com credentials';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error fixing fallback admin: %', SQLERRM;
END
$$;
