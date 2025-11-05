# Deployment Guide

## Prerequisites

- Supabase account
- Vercel account (or preferred hosting platform)
- Node.js 18+ installed locally

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - Name: `ntu-sports`
   - Database Password: (save this securely)
   - Region: Choose closest to Taiwan
4. Wait for project to initialize

### 2. Get API Credentials

1. Go to Settings > API
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Run Migrations

1. Go to SQL Editor in Supabase Dashboard
2. Create new query
3. Copy and paste `supabase/migrations/001_initial_schema.sql`
4. Click "Run"
5. Verify tables created in Table Editor

### 4. Create First User

1. Run app locally: `npm run dev`
2. Visit `http://localhost:3000/admin/login`
3. Sign up with your email
4. Go to Supabase Dashboard > Authentication > Users
5. Copy your user ID

### 5. Seed Event Data

1. Open `supabase/migrations/002_seed_tennis_event.sql`
2. Replace `YOUR_USER_ID_HERE` with your user ID (2 places)
3. Run in SQL Editor
4. Verify event created in Table Editor > events

## Vercel Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click "Deploy"

### 3. Update Supabase Auth Settings

1. In Supabase Dashboard > Authentication > URL Configuration
2. Add your Vercel URL to:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

### 4. Test Deployment

1. Visit your deployed site
2. Login at `/admin/login`
3. Verify admin dashboard works
4. Check public pages display data

## Post-Deployment

### Add More Organizers

1. Have them sign up at `/admin/login`
2. Get their user ID from Supabase Auth
3. Run in SQL Editor:

```sql
INSERT INTO organizers (user_id, event_id, role)
VALUES ('their-user-id', 'event-id', 'organizer');
```

### Add Players

Use the admin dashboard at `/admin/[eventId]/players`

### Create Matches

Create matches via SQL or programmatically:

```sql
INSERT INTO matches (event_id, round, match_number, player1_id, player2_id, status)
VALUES (
  'event-id',
  1, -- Round 1
  1, -- Match 1
  'player1-id',
  'player2-id',
  'upcoming'
);
```

## Monitoring

### Supabase Dashboard

- **Table Editor**: View all data
- **Authentication**: Manage users
- **Logs**: Check for errors
- **API**: Monitor usage

### Vercel Dashboard

- **Deployments**: View deployment history
- **Analytics**: Track page views
- **Logs**: Debug errors

## Updating

### Database Changes

1. Create new migration file
2. Run in Supabase SQL Editor
3. Document changes

### Code Changes

1. Make changes locally
2. Test thoroughly
3. Push to GitHub
4. Vercel auto-deploys

## Backup

### Database Backup

In Supabase Dashboard:
1. Go to Database > Backups
2. Enable automatic backups
3. Download manual backups regularly

### Code Backup

- Keep GitHub repository updated
- Tag releases: `git tag v1.0.0`

## Troubleshooting

### RLS Errors

- Check policies in Supabase Table Editor
- Verify organizer records exist
- Test with Supabase Policy Editor

### Auth Errors

- Clear cookies and retry
- Check URL configuration
- Verify environment variables

### Deployment Errors

- Check Vercel logs
- Verify all environment variables set
- Ensure Node.js version compatibility

