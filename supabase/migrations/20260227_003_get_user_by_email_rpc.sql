-- RPC function to look up a user ID by email
-- Used by the sharing flow to find users by email address.
-- This runs with SECURITY DEFINER so it can access auth.users,
-- but only returns the user ID (not sensitive data).

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(target_email text)
RETURNS TABLE(id uuid) AS $$
BEGIN
  RETURN QUERY
    SELECT au.id
    FROM auth.users au
    WHERE au.email = target_email
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;
