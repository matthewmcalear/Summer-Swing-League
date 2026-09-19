# SSL Open 2026 Group Fix - Deployment Instructions

## Problem Fixed
- Removed Tibi Mitran from the field
- Added Griffin Mason to Group 2
- Corrected group assignments to match the official tee sheet
- Added Griffin's girlfriend as guest (display only, not in live scoring)

## Changes Made
1. Updated `OPEN_FIELD_PLAYERS` to have 10 members in correct order
2. Added `OPEN_GROUP_SIZES = [4, 3, 3]` to ensure proper distribution
3. Updated `distributeGroups()` to respect defined group sizes
4. Added Tee Groups card to display official tee sheet with guest notation
5. Updated tests

## Correct Groups (Live Scoring)
**Group 1 @ 1:00 PM (13:00)**
- Matthew McAlear
- Dan McAlear
- Nicholas Clarke
- Spence Goodwin

**Group 2 @ 1:10 PM (13:10)**
- Thomas McAlear
- Rachel Kuta
- Griffin Mason
- *(Griffin's girlfriend shown on tee sheet only, not in live scoring DB)*

**Group 3 @ 1:20 PM (13:20)**
- Alex Sokaris
- Shaun Anderson
- Connor Peltz

## Deployment Steps

### 1. Merge to Main
This branch auto-deploys to Heroku from main.

### 2. Reset the Live Event (REQUIRED)
After Heroku finishes deploying, the persisted event in the database still has the old wrong groups. You MUST reset it:

**Option A: Admin Panel (Recommended)**
1. Go to https://sslgolf.com/ssl-open
2. Scroll to bottom and click "Commissioner controls"
3. Sign in with admin password
4. Click "Reset the Open"
5. Confirm the deletion
6. Reload the page — the event will be recreated with the correct groups

**Option B: API Call**
```bash
# Delete the event (requires admin cookie)
curl -X DELETE https://sslgolf.com/api/ssl-open \
  -H "Cookie: admin_session=YOUR_ADMIN_SESSION_COOKIE"

# Next visit to /ssl-open or /api/ssl-open will recreate it with correct groups
```

### 3. Verify
After reset, check:
```bash
# Should show 3 groups with correct players and no Tibi Mitran
curl https://sslgolf.com/api/ssl-open | jq '.event.groups[] | {name, teeTime, players: [.players[].name]}'
```

Expected output:
- Group 1 (13:00): Matthew McAlear, Dan McAlear, Nicholas Clarke, Spence Goodwin
- Group 2 (13:10): Thomas McAlear, Rachel Kuta, Griffin Mason
- Group 3 (13:20): Alex Sokaris, Shaun Anderson, Connor Peltz

## Important Notes
- Any hole scores entered before the reset will be lost (should be zeros/empty on Open day)
- Handicaps will be refrozen at current values when event is recreated
- Griffin's girlfriend is display-only (guest) — she appears on the Tee Groups card but not in live scoring
- The schema requires `member_id`, so guests cannot be tracked in live scoring
