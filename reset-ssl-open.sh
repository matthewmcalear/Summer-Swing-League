#!/bin/bash

# SSL Open Event Reset Script
# Run this after the code has been deployed to Heroku to reset the live event.
# The next API call will recreate it with the correct groups.

set -e

echo "🏌️  SSL Open 2026 Event Reset Script"
echo "======================================"
echo ""
echo "This will delete the current SSL Open event and all entered scores."
echo "The event will be recreated with the correct groups on the next visit."
echo ""

# Check if we're resetting production or local
BASE_URL="${SSL_BASE_URL:-https://sslgolf.com}"
echo "Target: $BASE_URL"
echo ""

# Check current state
echo "📊 Current groups (BEFORE reset):"
curl -s "$BASE_URL/api/ssl-open" | jq '.event.groups[] | {name, teeTime, players: [.players[].name]}'
echo ""

# Confirm
read -p "⚠️  Are you sure you want to reset the event? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

# Check if admin session cookie is provided
if [ -z "$ADMIN_COOKIE" ]; then
  echo ""
  echo "❌ ADMIN_COOKIE environment variable not set."
  echo ""
  echo "To use this script, you need to:"
  echo "1. Go to $BASE_URL/ssl-open in your browser"
  echo "2. Open DevTools (F12) → Application/Storage → Cookies"
  echo "3. Copy the 'admin_session' cookie value"
  echo "4. Run: export ADMIN_COOKIE='your_cookie_value'"
  echo "5. Run this script again"
  echo ""
  echo "Or use the admin panel:"
  echo "1. Go to $BASE_URL/ssl-open"
  echo "2. Scroll to 'Commissioner controls' and sign in"
  echo "3. Click 'Reset the Open' button"
  exit 1
fi

# Delete the event
echo ""
echo "🗑️  Deleting event..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/ssl-open" \
  -H "Cookie: admin_session=$ADMIN_COOKIE")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Event deleted successfully!"
else
  echo "❌ Failed to delete event (HTTP $HTTP_CODE)"
  echo "   Make sure your admin cookie is valid."
  exit 1
fi

# Wait a moment, then verify
echo ""
echo "⏳ Waiting 2 seconds for recreation..."
sleep 2

echo ""
echo "📊 New groups (AFTER reset):"
curl -s "$BASE_URL/api/ssl-open" | jq '.event.groups[] | {name, teeTime, players: [.players[].name]}'

echo ""
echo "✅ Done! Verify the groups are correct above."
echo "   Expected:"
echo "   - Group 1 (13:00): Matthew McAlear, Dan McAlear, Nicholas Clarke, Spence Goodwin"
echo "   - Group 2 (13:10): Thomas McAlear, Rachel Kuta, Griffin Mason"
echo "   - Group 3 (13:20): Alex Sokaris, Shaun Anderson, Connor Peltz"
