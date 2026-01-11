# Testing Guide - Auth & RLS Fixes

## What Was Fixed

### 1. RLS Infinite Recursion ✅
- **Issue**: Policies called `is_super_admin()` function which queried profiles table → infinite loop
- **Fix**: All policies now use simple `auth.uid() = id` checks (no function calls)

### 2. Session Token Timing ✅
- **Issue**: Profile queries ran before Supabase client had JWT token attached
- **Fix**: Added 150ms delay + retry logic with exponential backoff

### 3. Enhanced Logging ✅
- **Issue**: Hard to debug what was failing
- **Fix**: Added detailed console logs with emoji indicators

---

## How to Test

### Step 1: Complete Browser Reset (MANDATORY)

```
1. Open DevTools (F12)
2. Application tab
3. Click "Clear site data" button
4. Close ALL browser tabs
5. Close entire browser
6. Reopen browser
7. Open fresh tab to your app
```

**Why this is critical**: Old session tokens cached in cookies/localStorage will interfere with new auth flow.

### Step 2: Test Login Flow

#### Test Case 1: Admin Login

**Credentials**:
- Email: `psainath123@gmail.com`
- Password: (your admin password)
- Expected Role: SUPER_ADMIN
- Expected Phone: 9441414140

**Steps**:
1. Go to `/login`
2. Enter credentials
3. Click "Sign In"
4. Watch the console

**Expected Console Output**:
```
🔐 Starting login process...
📧 Email: psainath123@gmail.com
✅ Login successful!
👤 User ID: fe3ebcdf-a1c4-4557-b135-2e3e8f92f490
🎫 Session token length: 500+ (some number)
⏰ Session expires at: (timestamp)
⏳ Waiting for AuthProvider to load profile...
🚀 AuthProvider: Initializing...
📦 Initial session check: true
👤 User found in initial session: fe3ebcdf-...
🔍 Fetching profile for user: fe3ebcdf-...
📝 Session exists: true Token length: 500+
✅ Profile loaded successfully: {
  id: "fe3ebcdf-...",
  role: "SUPER_ADMIN",
  fullName: "sain",
  phone: "9441414140"
}
🔄 Refreshing router...
🚀 Redirecting to: /
```

**What to Look For**:
- ✅ "Profile loaded successfully" appears
- ✅ NO "Profile not found, creating one..." message
- ✅ NO RLS policy violation errors
- ✅ User is redirected to home page

#### Test Case 2: Create Other User Types

**Setup**:
1. Logout (if logged in)
2. Go to `/create-test-accounts`
3. Create partner and customer accounts
4. Note the credentials shown

**Test Partner Login**:
- Use partner credentials
- Should see role: RESTAURANT_PARTNER
- Should redirect to `/dashboard`

**Test Customer Login**:
- Use customer credentials
- Should see role: CUSTOMER
- Should redirect to `/`

### Step 3: Test Protected Routes

#### Admin Area (requires SUPER_ADMIN)
- Login as admin → Go to `/admin` → ✅ Should work
- Login as partner → Go to `/admin` → ❌ Should redirect to `/`
- Login as customer → Go to `/admin` → ❌ Should redirect to `/`

#### Dashboard (requires RESTAURANT_PARTNER or SUPER_ADMIN)
- Login as admin → Go to `/dashboard` → ✅ Should work
- Login as partner → Go to `/dashboard` → ✅ Should work
- Login as customer → Go to `/dashboard` → ❌ Should redirect to `/`

### Step 4: Debug Page

Go to `/debug-auth` while logged in to see:
- Current user ID
- Session status
- Profile data
- Token information

---

## Console Logs Reference

### Success Indicators ✅
- `✅ Login successful!`
- `✅ Profile loaded successfully:`
- `📝 Session exists: true`
- `👤 User authenticated:`

### Error Indicators ❌
- `❌ Login error:`
- `❌ Error fetching profile:`
- `🚨 RLS POLICY VIOLATION`
- `❌ No session available`

### Warning Indicators ⚠️
- `⚠️ Profile not found, creating one...`
- `Retrying profile fetch...`

---

## Troubleshooting

### Problem: Still seeing "Profile not found, creating one..."

**Possible Causes**:
1. Browser cache not cleared properly
2. Wrong credentials (user doesn't have a profile)
3. RLS policies not applied correctly

**Solutions**:
```bash
# 1. Clear browser completely (see Step 1)

# 2. Verify user has a profile in database
# Run this in Supabase SQL Editor:
SELECT u.id, u.email, p.role, p.full_name, p.phone
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'psainath123@gmail.com';

# 3. Verify RLS policies are correct
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
```

### Problem: RLS Policy Violation

**Check These**:
```javascript
// In console, check:
1. Is session token present?
   - Look for "Session token length" in console
   - Should be 500+ characters

2. Are user IDs matching?
   - Session user ID should match profile ID
   - Both should be the same UUID

3. Is the delay sufficient?
   - Try increasing the delay in auth-provider.tsx line 131
   - Change from 150ms to 300ms
```

### Problem: Redirected to wrong page after login

**Expected Redirects**:
- SUPER_ADMIN → `/admin` (but currently goes to `/`)
- RESTAURANT_PARTNER → `/dashboard` (but currently goes to `/`)
- CUSTOMER → `/`

**To Fix**: Implement role-based routing in login page (see COMPREHENSIVE_AUTH_SOLUTION.md)

---

## Current User Accounts

From database:
1. **Admin**: `psainath123@gmail.com` (id: fe3ebcdf-..., role: SUPER_ADMIN)
2. **Test User**: `abc@gmail.com` (id: 9874ded1-..., may not have profile)

Use `/create-test-accounts` to create more users.

---

## What's Next

If tests pass:
1. Implement role-based routing (see COMPREHENSIVE_AUTH_SOLUTION.md Section 3 Step 3)
2. Add admin-only operations using service role functions
3. Lock down profile creation to signup only
4. Add rate limiting on login

If tests fail:
1. Report exact console logs
2. Check `/debug-auth` page
3. Verify database state (users and profiles tables)
4. Ensure RLS policies match expected values
