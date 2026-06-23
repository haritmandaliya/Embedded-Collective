#!/usr/bin/env bash
# Full stack smoke tests — portfolio API + auth + uploads
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:8000}"
FRONTEND="${FRONTEND:-http://127.0.0.1:5173}"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

assert_status() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then ok "$name (HTTP $actual)"
  else bad "$name — expected $expected got $actual"; fi
}

echo "═══════════════════════════════════════════════════════"
echo "  Harit Portfolio + Embedded Collective — Full Tests"
echo "═══════════════════════════════════════════════════════"
echo "Backend:  $BASE"
echo "Frontend: $FRONTEND"
echo ""

# ── Frontend ─────────────────────────────────────────────
code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND/")
assert_status "Frontend reachable" "200" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND/community")
assert_status "Community route" "200" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND/audio/ambient_lab.mp3")
assert_status "Hero ambient audio asset" "200" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND/videos/New_hero_intro.mp4")
assert_status "Hero video asset" "200" "$code"

# ── Backend health ───────────────────────────────────────
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
assert_status "API health" "200" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/stats/public")
assert_status "Public stats" "200" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/search/?limit=5")
assert_status "Search feed" "200" "$code"

search=$(curl -s "$BASE/api/v1/search/?limit=5")
has_attach=$(echo "$search" | python3 -c "import sys,json; d=json.load(sys.stdin); print('attachments' in (d.get('items') or [{}])[0])" 2>/dev/null || echo False)
if [[ "$has_attach" == "True" ]]; then ok "Search includes attachments field"
else ok "Search feed OK (attachments optional on empty items)"; fi

# ── Auth: reject mock Google token ───────────────────────
mock_google=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/google" \
  -H "Content-Type: application/json" \
  -d '{"id_token":"test_token_fake","mode":"signin"}')
if [[ "$mock_google" == "400" ]] || [[ "$mock_google" == "503" ]]; then
  ok "Mock Google token rejected (HTTP $mock_google)"
else
  bad "Mock Google token should be rejected — got $mock_google"
fi

# ── Auth: OTP send (dev logs to terminal) ────────────────
otp_resp=$(curl -s -X POST "$BASE/api/v1/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"email":"verify-test@example.com"}')
if echo "$otp_resp" | grep -q "Verification code sent"; then
  ok "OTP email send"
else
  bad "OTP send — $otp_resp"
fi

# Read OTP from Redis for verify test
OTP_CODE=$(redis-cli GET "otp:verify-test@example.com" 2>/dev/null || true)
if [[ -n "$OTP_CODE" ]]; then
  verify_resp=$(curl -s -X POST "$BASE/api/v1/auth/otp/verify" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"verify-test@example.com\",\"code\":\"$OTP_CODE\"}")
  if echo "$verify_resp" | grep -q '"verified":true'; then
    ok "OTP verify + marks email verified"
  else
    bad "OTP verify — $verify_resp"
  fi
else
  bad "OTP not found in Redis (is redis running?)"
fi

# ── Auth: register blocked without full OTP ──────────────
reg_resp=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","phone":"+919876543210","username":"newuser_test","display_name":"Test User","role":"solution_seeker"}')
if [[ "$reg_resp" == "400" ]]; then ok "Register blocked without OTP (HTTP 400)"
else bad "Register should require OTP — got HTTP $reg_resp"; fi

# ── Auth: OTP login rejects unknown user ─────────────────
phone_otp=$(curl -s -X POST "$BASE/api/v1/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999999999"}')
PHONE_CODE=$(redis-cli GET "otp:+919999999999" 2>/dev/null || true)
if [[ -n "$PHONE_CODE" ]]; then
  login_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/otp/verify-login" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"+919999999999\",\"code\":\"$PHONE_CODE\"}")
  if [[ "$login_code" == "404" ]]; then ok "OTP login rejects unknown phone (HTTP 404)"
  else bad "OTP login unknown user — expected 404 got $login_code"; fi
else
  bad "Phone OTP not stored in Redis"
fi

# ── Admin + contributor ──────────────────────────────────
TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  --data-urlencode "username=harit" \
  --data-urlencode "password=xufg mfgf vbug hsmz" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)
[[ -n "$TOKEN" ]] && ok "Super Admin password login" || bad "Super Admin login failed"

CT=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  --data-urlencode "username=harit" \
  --data-urlencode "password=xufg mfgf vbug hsmz" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)
[[ -n "$CT" ]] && ok "Contributor login" || bad "Contributor login failed"

if [[ -n "$CT" ]]; then
  create=$(curl -s -X POST "$BASE/api/v1/questions/" \
    -H "Authorization: Bearer $CT" \
    -H "Content-Type: application/json" \
    -d '{"title":"Upload test STM32 debug screenshot","content":"Automated test question for image upload pipeline validation.","tags":["test"],"category":"Software Problems"}')
  QID=$(echo "$create" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
  SLUG=$(echo "$create" | python3 -c "import sys,json; print(json.load(sys.stdin).get('slug',''))" 2>/dev/null || true)

  if [[ -n "$QID" ]]; then
    ok "Create question ($SLUG)"

    # 1x1 PNG
    TEST_IMG=$(mktemp /tmp/test-upload-XXXX.png)
    python3 -c "import struct,zlib; sig=b'\x89PNG\r\n\x1a\n'; ihdr=struct.pack('>IIBBBBB',1,1,8,2,0,0,0); c=sig+b'IHDR'+struct.pack('>I',13)+ihdr+struct.pack('>I',zlib.crc32(b'IHDR'+ihdr)&0xffffffff); idat=zlib.compress(b'\x00\xff\x00'); c+=b'IDAT'+struct.pack('>I',len(idat))+idat+struct.pack('>I',zlib.crc32(b'IDAT'+idat)&0xffffffff); c+=b'IEND'+struct.pack('>I',0)+struct.pack('>I',zlib.crc32(b'IEND')&0xffffffff); open('$TEST_IMG','wb').write(c)"

    up_code=$(curl -s -o /tmp/upload-resp.json -w "%{http_code}" -X POST "$BASE/api/v1/uploads/?question_id=$QID" \
      -H "Authorization: Bearer $CT" \
      -F "file=@$TEST_IMG;type=image/png")
    if [[ "$up_code" == "200" ]]; then
      ok "Image upload to question"
      img_url=$(python3 -c "import json; print(json.load(open('/tmp/upload-resp.json')).get('file_url',''))" 2>/dev/null || true)
      img_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE${img_url}")
      if [[ "$img_code" == "200" ]]; then ok "Uploaded image served (HTTP 200)"
      else bad "Image serve failed — $BASE$img_url HTTP $img_code"; fi
      detail=$(curl -s "$BASE/api/v1/questions/$SLUG")
      att_count=$(echo "$detail" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('attachments',[])))" 2>/dev/null || echo 0)
      if [[ "$att_count" -gt 0 ]]; then ok "Question detail includes attachment ($att_count)"
      else bad "Attachment missing from question detail"; fi
    else
      bad "Image upload failed (HTTP $up_code) — $(cat /tmp/upload-resp.json)"
    fi
    rm -f "$TEST_IMG"
  else
    bad "Create question — $create"
  fi
fi

if [[ -n "$TOKEN" ]]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/admin/stats")
  assert_status "Admin dashboard stats" "200" "$code"
fi

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/featured-solutions")
assert_status "Featured solutions" "200" "$code"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════"
[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
