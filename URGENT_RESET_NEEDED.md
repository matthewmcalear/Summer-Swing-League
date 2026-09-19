# ⚠️ URGENT: Final Step to Fix Live Scoring Groups

## Status
✅ Code deployed to production  
✅ Static page shows correct tee groups  
❌ **Live API still returns old wrong groups** — needs manual reset

## Current Wrong API Groups
```
Group 1 (13:00): Connor, Tibi Mitran ❌, Shaun, Alex
Group 2 (13:10): Matthew, Thomas, Rachel
Group 3 (13:20): Spence, Nicholas, Dan
```

## Required: Reset the Event NOW

### Option 1: Admin Panel (Easiest)
1. Go to https://sslgolf.com/ssl-open
2. Scroll to bottom → **"Commissioner controls"**
3. Sign in with admin password
4. Click **"Reset the Open"** button
5. Confirm the deletion
6. **Hard refresh the page** (Ctrl+Shift+R or Cmd+Shift+R)

The event will be recreated with the correct groups immediately.

### Option 2: API Call
```bash
# Set your admin session cookie
export ADMIN_COOKIE="your_admin_session_cookie_value"

# Run the reset script
./reset-ssl-open.sh
```

## Verify Success
After reset, check:
```bash
curl https://sslgolf.com/api/ssl-open | jq '.event.groups[] | {name, teeTime, players: [.players[].name]}'
```

**Expected correct groups:**
```
Group 1 (13:00): Matthew McAlear, Dan McAlear, Nicholas Clarke, Spence Goodwin
Group 2 (13:10): Thomas McAlear, Rachel Kuta, Griffin Mason
Group 3 (13:20): Alex Sokaris, Shaun Anderson, Connor Peltz
```

## Time Sensitive
This is Open day — the reset must happen before players start entering scores. Any scores entered before reset will be lost (should be zeros/empty right now).

---

**Matthew**: Please execute the reset via the admin panel now and confirm when done.
