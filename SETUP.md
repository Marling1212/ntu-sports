# Setup Guide for NTU Sports

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish setup
3. Copy your project URL and anon key from Settings > API

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Run Database Migrations

In Supabase Dashboard:

1. Go to **SQL Editor**
2. Click **+ New Query**
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run** to execute
5. Verify tables were created in **Table Editor**

### 5. Create Your First User

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/admin/login`

3. Enter your email (e.g., `admin@ntu.edu.tw`) and create a password

4. Go to Supabase Dashboard > **Authentication** > **Users**

5. Copy your user ID (looks like `a1b2c3d4-...`)

### 6. Seed Initial Data

1. Open `supabase/migrations/002_seed_tennis_event.sql`

2. Replace both instances of `YOUR_USER_ID_HERE` with your actual user ID

3. In Supabase Dashboard > **SQL Editor**, paste and run the updated SQL

4. Verify the event was created in **Table Editor** > `events`

### 7. Add Players and Matches

1. Go to `http://localhost:3000/admin/dashboard`

2. Click on your tennis event

3. Navigate to **Players** tab

4. Add players one by one (or bulk import via SQL)

5. Navigate to **Matches** tab

6. Matches are created via SQL or you can create them programmatically

### 8. Test Public Pages

Visit these pages to see the data:

- `http://localhost:3000/sports/tennis` - Tournament homepage
- `http://localhost:3000/sports/tennis/draw` - Bracket view
- `http://localhost:3000/sports/tennis/announcements` - View announcements

## Creating Matches Programmatically

You can create matches via SQL:

```sql
-- Example: Create Round 1 matches
INSERT INTO matches (event_id, round, match_number, player1_id, player2_id, status)
SELECT 
  '00000000-0000-0000-0000-000000000001', -- event_id
  1, -- round
  ROW_NUMBER() OVER (ORDER BY p1.seed NULLS LAST, p1.name), -- match_number
  p1.id, -- player1_id
  p2.id, -- player2_id
  'upcoming' -- status
FROM 
  (SELECT *, ROW_NUMBER() OVER (ORDER BY seed NULLS LAST, name) as rn FROM players WHERE event_id = '00000000-0000-0000-0000-000000000001') p1
JOIN 
  (SELECT *, ROW_NUMBER() OVER (ORDER BY seed NULLS LAST, name) as rn FROM players WHERE event_id = '00000000-0000-0000-0000-000000000001') p2
ON p1.rn = (p2.rn - 1)
WHERE p1.rn % 2 = 1;
```

## Troubleshooting

### "Access Denied" on Admin Dashboard

- Make sure you've run the seed migration with your user ID
- Check that the organizer record was created in Supabase

### Players Not Showing in Bracket

- Verify players exist in the database
- Check that matches reference the correct player IDs
- Ensure event_id matches across tables

### Authentication Issues

- Clear cookies and try logging in again
- Check Supabase auth settings
- Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

## Next Steps

- Customize the UI to match your branding
- Add more sports under `/sports/`
- Implement bulk player import
- Add real-time updates with Supabase Realtime
- Deploy to Vercel or your preferred hosting

