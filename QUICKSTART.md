# Quick Start Guide

## Installation

```bash
npm install
```

## Environment Setup

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Setup

1. **Create Supabase project** at supabase.com
2. **Run migration** `001_initial_schema.sql` in SQL Editor
3. **Create user** at `/admin/login`
4. **Get user ID** from Supabase Auth dashboard
5. **Update and run** `002_seed_tennis_event.sql` with your user ID

## Admin Access

1. Login at `/admin/login`
2. View dashboard at `/admin/dashboard`
3. Manage your event:
   - `/admin/{eventId}/players` - Add/edit players
   - `/admin/{eventId}/matches` - Update match results
   - `/admin/{eventId}/announcements` - Post announcements

## Public Pages

- `/` - Homepage
- `/sports/tennis` - Tennis tournament page
- `/sports/tennis/draw` - Bracket view
- `/sports/tennis/announcements` - Public announcements

## Features

✅ Supabase authentication (email/password + magic links)
✅ Row-Level Security (RLS) for data protection
✅ Admin dashboard for organizers
✅ CRUD operations for players, matches, announcements
✅ Real-time bracket updates
✅ Winner/loser animations
✅ NTU theme (#00694E green)
✅ Responsive design

## Development

```bash
npm run dev
```

## Key Files

- `lib/supabase/` - Supabase client setup
- `supabase/migrations/` - Database schema
- `app/admin/` - Admin dashboard
- `app/sports/tennis/` - Public tennis pages
- `components/admin/` - Admin components
- `types/database.ts` - Database types

## Security

- All admin routes protected by middleware
- RLS policies enforce organizer-only modifications
- Public can view, only organizers can edit
- User authentication required for admin access

