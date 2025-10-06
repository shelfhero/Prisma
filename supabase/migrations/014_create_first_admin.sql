-- Create first admin user for office@myshelfhero.com
-- This migration grants super_admin role to the specified email

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find user ID by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'office@myshelfhero.com';

  -- Only proceed if user exists
  IF v_user_id IS NOT NULL THEN
    -- Insert admin role (or update if exists)
    INSERT INTO admin_roles (user_id, role, is_active, granted_at)
    VALUES (v_user_id, 'super_admin', true, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      role = 'super_admin',
      is_active = true,
      granted_at = NOW();

    RAISE NOTICE 'Successfully granted super_admin role to office@myshelfhero.com (ID: %)', v_user_id;
  ELSE
    RAISE WARNING 'User with email office@myshelfhero.com not found. Please register first.';
  END IF;
END $$;
