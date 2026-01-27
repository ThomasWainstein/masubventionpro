-- Migration: Auto-send welcome email on new user signup
-- Uses pg_net to call the msp-send-email Edge Function

-- Enable pg_net extension for HTTP calls from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to send welcome email via Edge Function
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_function_url TEXT;
  service_role_key TEXT;
  user_email TEXT;
  user_name TEXT;
  request_id BIGINT;
BEGIN
  -- Get the Edge Function URL and service role key from vault (or hardcode for now)
  edge_function_url := 'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/msp-send-email';

  -- Get the service role key from vault secrets
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  -- If no service role key in vault, use the anon key (less secure but works)
  IF service_role_key IS NULL THEN
    service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDgxNzMsImV4cCI6MjA2NDI4NDE3M30.DLtvrw9I0nboGZiZQnGkszDTFHh4vDbpiA1do2J6rcI';
  END IF;

  -- Extract user info
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Make async HTTP request to Edge Function
  SELECT net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'type', 'welcome',
      'to', user_email,
      'userName', user_name
    )
  ) INTO request_id;

  -- Log the request (optional, for debugging)
  RAISE LOG 'Welcome email request sent for user % (request_id: %)', user_email, request_id;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_send_welcome ON auth.users;

CREATE TRIGGER on_auth_user_created_send_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.send_welcome_email() IS
  'Sends a welcome email via msp-send-email Edge Function when a new user signs up';
