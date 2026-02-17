
-- =============================================
-- SECURITY FIX: Seed Recovery Admin (recovery_admin@sector91.com)
-- =============================================

DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    user_email TEXT := 'recovery_admin@sector91.com';
    user_password TEXT := 'SECTOR91';
    hashed_password TEXT;
BEGIN
    -- 1. Ensure pgcrypto exists
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 2. Generate Hash (Robust Schema Detection)
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'gen_salt' AND nspname = 'public') THEN
        hashed_password := public.crypt(user_password, public.gen_salt('bf'));
    ELSIF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'gen_salt' AND nspname = 'extensions') THEN
        hashed_password := extensions.crypt(user_password, extensions.gen_salt('bf'));
    ELSE
        PERFORM set_config('search_path', 'public,extensions', true);
        hashed_password := crypt(user_password, gen_salt('bf'));
    END IF;

    -- 3. Insert into auth.users if not exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token,
            is_super_admin
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id,
            'authenticated',
            'authenticated',
            user_email,
            hashed_password,
            now(),
            NULL,
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            '',
            '',
            '',
            '',
            FALSE
        );

        -- 4. Insert into auth.identities
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            new_user_id,
            format('{"sub":"%s","email":"%s"}', new_user_id::text, user_email)::jsonb,
            'email',
            user_email, -- Used to be user_id, now email often used as provider_id for email provider
            now(),
            now(),
            now()
        );
        
        RAISE NOTICE 'Created recovery admin: % with ID: %', user_email, new_user_id;
    ELSE
         -- Update existing just in case
         UPDATE auth.users
         SET encrypted_password = hashed_password,
             email_confirmed_at = now()
         WHERE email = user_email;
         
         RAISE NOTICE 'Updated existing recovery admin: %', user_email;
    END IF;
END
$$;
