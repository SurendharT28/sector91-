
-- =============================================
-- SEED DATA: Create Admin User (Bypassing API Rate Limits)
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    user_email TEXT := 'sector91trading@gmail.com';
    user_password TEXT := 'SECTOR91';
BEGIN
    -- Only insert if user doesn't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        
        -- Insert into auth.users
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
            crypt(user_password, gen_salt('bf')),
            now(), -- email_confirmed_at (Bypass confirmation)
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

        -- Insert into auth.identities (Required for some auth flows)
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
            user_email, -- provider_id for email is usually the email itself in older versions or user_id in newer? It varies. Safe bet for email provider.
            now(),
            now(),
            now()
        );
        
        RAISE NOTICE 'Admin user created: %', user_email;
    ELSE
        RAISE NOTICE 'Admin user already exists: %', user_email;
    END IF;
END
$$;
