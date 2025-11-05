# Supabase Configuration Checklist

## Important: Disable Email Confirmation for Development

By default, Supabase requires email confirmation for new signups. For development/testing, you should disable this:

### Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/syzddihsbyyylxaaztpg

2. Click **Authentication** in the sidebar

3. Click **Providers** tab

4. Scroll down to **Email** section

5. Find **"Confirm email"** setting

6. **UNCHECK** "Enable email confirmations"

7. Click **Save**

This allows instant signup without needing to confirm email first.

## Alternative: Configure Email Provider

If you want to keep email confirmations enabled, you need to configure an email provider:

1. In Supabase Dashboard > **Project Settings** > **Auth**
2. Scroll to **SMTP Settings**
3. Configure your email provider (Gmail, SendGrid, etc.)

## For Production

- Re-enable email confirmations
- Set up proper SMTP provider
- Configure proper redirect URLs

