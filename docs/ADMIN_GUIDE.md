# Admin Guide - NTU Sports Tournament Management

## Overview

The admin dashboard allows tournament organizers to manage events, players, matches, and announcements through a secure web interface.

## Getting Started

### 1. Login

Navigate to `/admin/login` and sign in with your credentials:
- Email + Password
- Magic Link (passwordless)

### 2. Dashboard

After login, you'll see all events where you're an organizer at `/admin/dashboard`.

## Managing Your Event

### Players Management (`/admin/[eventId]/players`)

**Adding Players:**
1. Click "+ Add Player"
2. Enter:
   - Player Name (required)
   - Department (optional)
   - Seed (optional, 1-8 for seeded players)
3. Click "Add Player"

**Deleting Players:**
- Click "Delete" next to any player
- Confirm deletion

**Best Practices:**
- Add seeded players first (seeds 1-8)
- Use consistent department naming
- Verify all names before creating matches

### Matches Management (`/admin/[eventId]/matches`)

**Updating Match Results:**
1. Click "Edit" on any match row
2. Update:
   - Score (Player 1 vs Player 2)
   - Winner (select from dropdown)
   - Court (optional)
   - Scheduled Time (optional)
   - Status (Upcoming/Live/Completed)
3. Click "Save"

**Match Statuses:**
- **Upcoming**: Match hasn't started
- **Live**: Match in progress (shows animated indicator on public pages)
- **Completed**: Match finished

**Tips:**
- Set status to "Live" for real-time updates on public pages
- Always select a winner when marking as "Completed"
- Use court field to help players find their match location

### Announcements (`/admin/[eventId]/announcements`)

**Creating Announcements:**
1. Click "+ New Announcement"
2. Enter:
   - Title (brief headline)
   - Content (full message)
3. Click "Publish"

**Deleting Announcements:**
- Click "Delete" on any announcement
- Confirm deletion

**Use Cases:**
- Schedule changes
- Weather updates
- Tournament rules clarifications
- Results highlights
- Important notices

## Permissions

**What You Can Do:**
- Add/edit/delete players for your events
- Update match results and schedules
- Post and delete announcements
- View all event data

**What You Cannot Do:**
- Modify other organizers' events
- Delete events (contact owner)
- Change event basic information (contact owner)

## Real-Time Updates

Changes you make in the admin panel are immediately reflected on public pages:
- `/sports/tennis/draw` - Updated brackets and results
- `/sports/tennis/announcements` - New announcements appear

## Tips & Best Practices

1. **Before Tournament:**
   - Add all players with correct seeds
   - Create Round 1 matches
   - Post tournament rules announcement

2. **During Tournament:**
   - Set matches to "Live" as they start
   - Update scores in real-time
   - Post schedule updates if needed

3. **After Tournament:**
   - Mark all matches as "Completed"
   - Post final results announcement
   - Verify all winner records

## Troubleshooting

**Can't access dashboard?**
- Verify you're logged in
- Check with event owner that you're added as organizer

**Changes not appearing?**
- Click "Save" after editing
- Refresh the public page
- Check browser console for errors

**Players missing from match dropdown?**
- Verify players are added to the event
- Check that event_id matches

## Support

For technical issues or questions, contact the platform administrator.

