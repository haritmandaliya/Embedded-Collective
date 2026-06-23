#!/usr/bin/env bash
# Comprehensive community platform API smoke tests
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:8000}"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

assert_status() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then ok "$name (HTTP $actual)"
  else bad "$name — expected $expected got $actual"; fi
}

echo "=== Embedded Collective API Tests ==="
echo "Base: $BASE"
echo ""

# Health
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
assert_status "Health check" "200" "$code"

# Public stats
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/stats/public")
assert_status "Public stats" "200" "$code"

stats=$(curl -s "$BASE/api/stats/public")
echo "  Stats: $stats"

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/stats/categories")
assert_status "Category stats" "200" "$code"

# Search feed
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/search/?limit=5")
assert_status "Search feed" "200" "$code"

search=$(curl -s "$BASE/api/v1/search/?limit=5")
count=$(echo "$search" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('items',[])))" 2>/dev/null || echo 0)
if [[ "$count" -gt 0 ]]; then ok "Search returns $count questions"
else bad "Search returned no questions"; fi

# Tags
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/tags/?limit=5")
assert_status "Tags list" "200" "$code"

# Leaderboard
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/users/leaderboard?limit=5")
assert_status "Leaderboard" "200" "$code"

# Auth login
TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  --data-urlencode "username=harit" \
  --data-urlencode "password=xufg mfgf vbug hsmz" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)

if [[ -n "$TOKEN" ]]; then
  ok "Super Admin login"
else
  bad "Super Admin login failed"
fi

if [[ -n "$TOKEN" ]]; then
  AUTH="Authorization: Bearer $TOKEN"

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/v1/auth/me")
  assert_status "Auth me" "200" "$code"

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/v1/admin/stats")
  assert_status "Admin stats" "200" "$code"

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/v1/admin/users")
  assert_status "Admin users" "200" "$code"

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/v1/admin/reports")
  assert_status "Admin reports" "200" "$code"

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/v1/admin/questions")
  assert_status "Admin questions" "200" "$code"

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/v1/admin/tags")
  assert_status "Admin tags" "200" "$code"

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/v1/admin/settings")
  assert_status "Admin settings GET" "200" "$code"

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/v1/admin/activity")
  assert_status "Admin activity" "200" "$code"

  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/v1/users/me/notifications")
  assert_status "Notifications" "200" "$code"

  # OTP send
  otp_resp=$(curl -s -X POST "$BASE/api/v1/auth/otp/send" \
    -H "Content-Type: application/json" \
    -d '{"email":"engineer@example.com"}')
  if echo "$otp_resp" | grep -q "Verification code sent"; then
    ok "OTP send"
  else
    bad "OTP send — $otp_resp"
  fi

  # Reject fake disposable email
  fake_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/otp/send" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@mailinator.com"}')
  if [[ "$fake_code" == "400" ]]; then ok "Fake/disposable email rejected"
  else bad "Fake email should be rejected — got $fake_code"; fi

  # Auth config endpoint
  cfg=$(curl -s "$BASE/api/v1/auth/config")
  if echo "$cfg" | grep -q "google_enabled"; then ok "Auth config endpoint"
  else bad "Auth config — $cfg"; fi

  # Contributor login
  CT=$(curl -s -X POST "$BASE/api/v1/auth/login" \
    --data-urlencode "username=harit" \
    --data-urlencode "password=xufg mfgf vbug hsmz" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)
  if [[ -n "$CT" ]]; then ok "Contributor login"; else bad "Contributor login"; fi

  if [[ -n "$CT" ]]; then
    # Create question
    create=$(curl -s -X POST "$BASE/api/v1/questions/" \
      -H "Authorization: Bearer $CT" \
      -H "Content-Type: application/json" \
      -d '{"title":"Test UART framing issue on STM32","content":"Testing automated question creation with enough content for validation.","tags":["uart","stm32"],"category":"Software Problems"}')
    slug=$(echo "$create" | python3 -c "import sys,json; print(json.load(sys.stdin).get('slug',''))" 2>/dev/null || true)
    if [[ -n "$slug" ]]; then
      ok "Create question ($slug)"
      code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/questions/$slug")
      assert_status "Get question detail" "200" "$code"
    else
      bad "Create question — $create"
    fi
  fi
fi

# Featured solutions
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/featured-solutions")
assert_status "Featured solutions" "200" "$code"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
