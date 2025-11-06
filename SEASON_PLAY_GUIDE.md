# 🏀 Season Play Feature - Testing Guide

## ✅ What's New

You can now create two types of tournaments:
1. **Single Elimination** (existing): Traditional knockout bracket
2. **Season Play** (NEW): Round-robin regular season followed by playoff bracket

---

## 🧪 Local Testing Steps

### **Step 1: Run Database Migration**

First, apply the new migration to add the `tournament_type` field:

```bash
# If using Supabase CLI
supabase db push

# OR manually run the SQL in Supabase Dashboard:
# Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
# Copy and paste the content of: supabase/migrations/011_add_tournament_type.sql
```

### **Step 2: Start Local Development Server**

```bash
npm run dev
```

Your app will be available at `http://localhost:3000`

### **Step 3: Test the Feature**

#### A. Create a Test Season Play Event

1. Go to `http://localhost:3000/admin/login`
2. Log in with your admin credentials
3. Click **"+ Create Event"**
4. Fill in the form:
   - **Sport**: Any (e.g., Basketball)
   - **Tournament Type**: **Season Play (Regular Season + Playoffs)** ← NEW!
   - **Event Name**: "TEST - Basketball League 2024"
   - **Start Date**: Any date
   - **End Date**: Any date
   - **Venue**: "Test Venue"
5. Click **"Create Event"**

#### B. Add Test Players

1. Go to the **Players** tab
2. Add at least 5-6 players:
   - TEST Player 1
   - TEST Player 2
   - TEST Player 3
   - TEST Player 4
   - TEST Player 5
   - TEST Player 6

#### C. Generate Regular Season

1. On the **Players** page, you'll see **"🏀 Season Play - Generate Matches"** (instead of the bracket generator)
2. Select **"Number of Playoff Teams"**: Choose "Top 4"
3. Click **"🏁 Generate Regular Season"**
4. Confirm the popup
5. **Result**: All round-robin matches will be created (each player plays every other player once)

#### D. View Regular Season

1. Go to the **Draw** tab
2. You'll see 3 tabs:
   - **🏀 Regular Season**: Shows all matches in a table
   - **📊 Standings**: Shows current standings (wins/losses/points)
   - **🏆 Playoffs**: (Will be empty until you generate playoffs)

#### E. Simulate Regular Season Completion

1. Go to **Matches** tab
2. Complete a few regular season matches (Round 0):
   - Set scores (e.g., "6-3, 6-4")
   - Select winner
   - Save match
3. Go back to **Draw** tab → **Standings** to see updated rankings

#### F. Generate Playoffs

1. After completing ALL regular season matches, go back to **Players** tab
2. Click **"🏆 Generate Playoffs (Top 4)"**
3. Confirm the popup
4. **Result**: A single-elimination playoff bracket is created with the top 4 players

#### G. View Playoffs

1. Go to **Draw** tab → **🏆 Playoffs**
2. You'll see a traditional bracket with the top 4 players
3. Complete playoff matches in the **Matches** tab to advance players

---

## 🔒 Backward Compatibility

### **Your Existing Tournament is SAFE**

- ✅ All existing events are automatically set to `tournament_type = 'single_elimination'`
- ✅ Your current bracket continues to work exactly as before
- ✅ No data loss or changes to existing matches/players
- ✅ Single elimination events still use the same bracket generator

### **How to Verify**

1. Go to `http://localhost:3000/admin/dashboard`
2. Click on your existing event (e.g., "114 Freshman Cup")
3. Go to **Players** tab
4. You should see the **normal bracket generator** (not season play)
5. Go to **Draw** tab
6. You should see your **existing bracket** (not season play tabs)

---

## 📋 Feature Comparison

| Feature | Single Elimination | Season Play |
|---------|-------------------|-------------|
| **Match Generation** | Generate bracket button | Generate regular season → Generate playoffs |
| **Draw Display** | Single bracket view | Tabbed view (Regular Season / Standings / Playoffs) |
| **Rounds** | Round 1, 2, 3... Final | Round 0 (Regular) + Round 1+ (Playoffs) |
| **Advancement** | Win once → advance | Accumulate wins → top N advance to playoffs |
| **Admin UI** | `GenerateBracket` component | `GenerateSeasonPlay` component |

---

## 🧹 Cleanup Test Data

After testing, you can delete test events:

1. ⚠️ There's currently no delete button in the UI
2. Delete directly from Supabase:
   - Go to Supabase Dashboard → Table Editor
   - Select `events` table
   - Find "TEST - Basketball League 2024"
   - Click delete (this will cascade delete all related data)

---

## 🚀 Deploy After Testing

**After your weekend tournament:**

1. Make sure all local tests pass
2. Push to GitHub:
   ```bash
   git push origin main
   ```
3. Vercel will automatically deploy the new version
4. The migration will automatically run on Vercel's first build

---

## 🐛 Troubleshooting

### Issue: "Column tournament_type does not exist"

**Solution**: Run the migration:
```sql
-- In Supabase SQL Editor
ALTER TABLE events 
ADD COLUMN tournament_type TEXT DEFAULT 'single_elimination' 
CHECK (tournament_type IN ('single_elimination', 'season_play'));
```

### Issue: Can't see season play options

**Solution**: Make sure you:
1. Ran the migration
2. Created a NEW event (not viewing an existing one)
3. Selected "Season Play" as the tournament type

### Issue: Regular season matches not showing

**Solution**: 
- Check that you clicked "Generate Regular Season"
- Go to Matches tab and verify Round 0 matches exist

---

## 📞 Need Help?

If you encounter any issues:
1. Check browser console for errors (F12)
2. Check that the migration ran successfully
3. Verify you're testing with a NEW event (not your existing tournament)

---

## ✨ Summary

**What you can test locally:**
- ✅ Create season play events
- ✅ Generate round-robin regular season
- ✅ View matches in table format
- ✅ View live standings
- ✅ Generate playoff bracket from top teams
- ✅ Complete matches and see bracket updates
- ✅ Verify existing tournaments still work

**What's protected:**
- ✅ Your live tournament data
- ✅ Existing events (remain single elimination)
- ✅ All current functionality

**Ready to deploy:**
- 🕐 After your weekend tournament
- ✅ Once you've verified everything works locally

