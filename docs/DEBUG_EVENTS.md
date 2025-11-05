# Debug: Check Events in Database

## Verify Event Exists

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/syzddihsbyyylxaaztpg/editor

2. Click **Table Editor** in sidebar

3. Click on **events** table

4. Check if your event is there

5. Also check **organizers** table - you should see a record with your user_id and event_id

## If Event Exists but Not Showing

Run this query in SQL Editor to check:

```sql
-- Check your events
SELECT e.*, o.role 
FROM events e
JOIN organizers o ON e.id = o.event_id
WHERE o.user_id = 'YOUR_USER_ID';
```

Replace YOUR_USER_ID with your actual user ID.

## If Organizer Record is Missing

```sql
-- Add yourself as organizer (replace IDs)
INSERT INTO organizers (user_id, event_id, role)
VALUES ('YOUR_USER_ID', 'EVENT_ID', 'owner');
```

