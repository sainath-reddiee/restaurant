# Login Troubleshooting Guide

## Problem Overview

Users experiencing:
1. **Login Loop**: Credentials accepted, "signed in redirecting" message appears, but user is redirected back to login page
2. **Unexpected Authentication Prompts**: Being prompted for login while browsing as a guest

---

## ✅ FIXES APPLIED

The following technical fixes have been implemented to resolve these issues:

### 1. Improved Supabase Client Configuration
- Configured proper session persistence
- Enabled auto-refresh tokens
- Set up PKCE flow for better security
- Configured localStorage for session storage

### 2. Fixed Login Redirect Logic
- Changed from `window.location.href` to `router.push()` for client-side navigation
- Added sufficient delay to ensure session is fully established before redirecting
- Prevents race conditions between session creation and middleware checks

### 3. Enhanced Middleware Protection
- Added early return for auth-related paths (`/login`, `/callback`, `/partner`)
- Prevents redirect loops
- Added redirect parameter to preserve intended destination
- Better error handling and logging

---

## 🔧 IMMEDIATE STEPS FOR USERS

### Quick Fix 1: Clear Browser Data (Most Effective)

1. **Open Browser Developer Tools**
   - Windows/Linux: Press `F12` or `Ctrl + Shift + I`
   - Mac: Press `Cmd + Option + I`

2. **Clear Site Data**
   - Go to "Application" tab (Chrome/Edge) or "Storage" tab (Firefox)
   - Click "Clear site data" or "Clear All"
   - Alternatively, right-click reload button → "Empty Cache and Hard Reload"

3. **Close All Tabs** for this website

4. **Open Fresh Tab** and try login again

### Quick Fix 2: Incognito/Private Window

1. Open incognito/private browsing window
2. Navigate to the login page
3. Try logging in
4. This helps identify if cookies/cache are the issue

### Quick Fix 3: Different Browser

Try logging in using a different browser entirely:
- If using Chrome, try Firefox or Edge
- If using Safari, try Chrome
- This confirms if the issue is browser-specific

---

## 🔍 TECHNICAL DIAGNOSIS

### Issue 1: Login Loop - Root Causes

#### A. Race Condition (Primary Cause - FIXED ✅)
**What Was Happening:**
1. User enters credentials and clicks "Sign In"
2. Supabase authenticates successfully
3. Login page tries to redirect immediately using `window.location.href`
4. Browser performs full page reload
5. Session cookie not yet fully written to browser storage
6. Middleware runs and can't find auth token
7. Middleware redirects back to `/login` → LOOP!

**The Fix:**
- Changed redirect from `window.location.href` to `router.push()`
- Added 1.5 second delay total to ensure session is established
- Session now persists properly before navigation

#### B. Cookie Storage Issues
**Symptoms:**
- Cookies not being set correctly
- Third-party cookie restrictions
- Browser privacy settings blocking auth cookies

**Solutions:**
- Enabled explicit `persistSession: true` in Supabase config
- Using localStorage as primary storage
- PKCE flow for better security and compatibility

#### C. Middleware Running Too Early
**What Was Happening:**
- Middleware checks for auth on every request
- On page reload after login, middleware runs before session fully loads
- Redirects user back to login

**The Fix:**
- Added early return for auth paths to prevent loops
- Better auth token detection and validation
- Redirect parameter preserves intended destination

### Issue 2: Unexpected Login Prompts - Analysis

#### Possible Causes:

**A. Misinterpreting Login Loop**
- User thinks they're being prompted while scrolling
- Actually experiencing the login loop issue described above
- **Fixed** with the login loop fixes

**B. Clicking Protected Links**
- User clicks on "Partner Login" or profile buttons
- These legitimately require authentication
- **This is expected behavior**

**C. Session Expiry**
- User was logged in, session expired while browsing
- Tries to access protected content
- Gets prompted to login again
- **This is expected behavior**

**D. Browser Extensions**
- Ad blockers or privacy extensions blocking auth cookies
- Extensions interfering with JavaScript
- **User should disable extensions temporarily**

---

## 🌐 BROWSER-RELATED SOLUTIONS

### Chrome / Edge

**Clear Cookies and Cache:**
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "All time" from time range
3. Check: "Cookies and other site data" AND "Cached images and files"
4. Click "Clear data"

**Check Third-Party Cookies:**
1. Go to Settings → Privacy and security
2. Click "Cookies and other site data"
3. Ensure "Block third-party cookies" is OFF
4. Or add the website to allowed sites

**Disable Extensions:**
1. Go to `chrome://extensions`
2. Toggle off all extensions temporarily
3. Try logging in again

### Firefox

**Clear Cookies and Cache:**
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Everything" from time range
3. Check: "Cookies" AND "Cache"
4. Click "OK"

**Check Enhanced Tracking Protection:**
1. Click shield icon in address bar
2. Turn off "Enhanced Tracking Protection" for this site
3. Refresh page and try again

### Safari

**Clear Website Data:**
1. Safari menu → Preferences → Privacy
2. Click "Manage Website Data"
3. Find the website and remove
4. Or click "Remove All"

**Disable Intelligent Tracking Prevention:**
1. Safari menu → Preferences → Privacy
2. Uncheck "Prevent cross-site tracking" (temporarily)
3. Try logging in

---

## 🔐 ACCOUNT-RELATED CHECKS

### Verify Account Status

**Check if Account Exists:**
```sql
-- Run in Supabase SQL Editor
SELECT u.email, p.role, p.full_name, u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';
```

**Check Email Confirmation Status:**
```sql
-- Run in Supabase SQL Editor
SELECT email, email_confirmed_at, confirmed_at
FROM auth.users
WHERE email = 'your-email@example.com';
```

### Fix Account Issues

**If No Profile Exists:**
```sql
-- Create profile manually
INSERT INTO profiles (id, phone, full_name, role, wallet_balance)
SELECT
  id,
  COALESCE(phone, ''),
  COALESCE(raw_user_metadata->>'full_name', ''),
  'CUSTOMER',
  0
FROM auth.users
WHERE email = 'your-email@example.com'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.users.id);
```

**If Wrong Role:**
```sql
-- Update role
UPDATE profiles
SET role = 'SUPER_ADMIN' -- or 'RESTAURANT' or 'CUSTOMER'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

### Password Issues

**Forgot Password:**
1. Go to `/login`
2. Click "Forgot password?"
3. Enter email
4. Check email for reset link
5. Click link and set new password
6. Return to login page

**Password Not Working:**
- Passwords are case-sensitive
- Check for accidental spaces
- Try copy-pasting password
- Use password reset if unsure

---

## 🔴 APPLICATION-LEVEL ISSUES

### Server-Side Problems

#### Issue: Supabase Connection Error

**Symptoms:**
- Login button does nothing
- Console shows connection errors
- "Failed to fetch" errors

**Solutions:**
1. Check `.env` file has correct values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Verify Supabase project is active
3. Check Supabase dashboard for outages
4. Restart development server

#### Issue: CORS Errors

**Symptoms:**
- Console shows "CORS policy" errors
- Requests being blocked

**Solutions:**
1. Check Supabase URL configuration
2. Verify allowed origins in Supabase dashboard
3. Restart development server

#### Issue: Session Not Persisting

**Symptoms:**
- Login works but session lost on refresh
- Logged out immediately after login

**Solutions:**
1. Check browser localStorage is enabled
2. Verify cookies are not being blocked
3. Check browser privacy settings
4. Disable "Clear cookies on close" setting

---

## 🛡️ PREVENTION MEASURES

### For Users

1. **Keep Browser Updated**
   - Update to latest browser version
   - Old browsers may have compatibility issues

2. **Configure Privacy Settings Appropriately**
   - Allow cookies for trusted sites
   - Don't use "strict" privacy mode for this site
   - Whitelist the domain in ad blockers

3. **Use Supported Browsers**
   - Chrome 90+
   - Firefox 88+
   - Safari 14+
   - Edge 90+

4. **Maintain Good Account Security**
   - Use strong, unique passwords
   - Don't share credentials
   - Log out when using shared computers

### For Developers

1. **Session Management**
   - Always configure session persistence
   - Use appropriate storage (localStorage for SPA)
   - Implement proper PKCE flow

2. **Redirect Handling**
   - Use client-side navigation (`router.push`) in React/Next.js
   - Avoid `window.location.href` after auth operations
   - Add delays to ensure session establishment

3. **Middleware Configuration**
   - Exclude auth paths from middleware checks
   - Add early returns to prevent loops
   - Log errors for debugging

4. **Error Handling**
   - Show clear error messages to users
   - Log authentication errors
   - Provide recovery options

---

## 📋 STEP-BY-STEP TESTING PROTOCOL

### Test Login Flow

**For Admin/Restaurant Accounts:**

1. Open browser developer console (F12)
2. Go to `/login` or `/partner`
3. Enter credentials
4. Click "Sign In"
5. Watch console for errors
6. Should see "Signed in successfully! Redirecting..."
7. Should be redirected to appropriate dashboard
8. Refresh page - should stay logged in

**For Customer Accounts:**

1. Browse site without logging in (should work)
2. Add items to cart (should work)
3. Go to checkout
4. Click "Sign in with Google" or use email/password
5. Complete authentication
6. Should return to checkout
7. Complete order

### Test Different Scenarios

**Scenario 1: Fresh Login**
1. Clear all cookies and cache
2. Close browser completely
3. Open fresh browser window
4. Navigate to site
5. Login with valid credentials
6. **Expected**: Successful login, redirected to dashboard

**Scenario 2: Session Persistence**
1. Login successfully
2. Refresh page multiple times
3. **Expected**: Stay logged in, no prompts

**Scenario 3: Protected Routes**
1. Without logging in, try to access `/admin`
2. **Expected**: Redirected to `/login` with redirect parameter
3. After login, should go to `/admin`

**Scenario 4: Wrong Role**
1. Login as CUSTOMER
2. Try to access `/dashboard`
3. **Expected**: Redirected to `/` (home)

---

## 🔍 DEBUGGING CHECKLIST

Use this checklist to diagnose issues:

### Browser Console Checks

- [ ] Open Developer Tools (F12)
- [ ] Check Console tab for JavaScript errors
- [ ] Look for "Failed to fetch" or CORS errors
- [ ] Check Network tab for failed requests
- [ ] Verify auth token in Application → Storage → localStorage

### Cookie Checks

- [ ] Open Developer Tools → Application → Cookies
- [ ] Look for cookies with "auth-token" in name
- [ ] Verify cookies are not expiring immediately
- [ ] Check cookie domain matches your URL

### Network Checks

- [ ] Open Developer Tools → Network tab
- [ ] Filter by "Fetch/XHR"
- [ ] Look for requests to Supabase
- [ ] Check for 401 (Unauthorized) or 403 (Forbidden) responses
- [ ] Verify request headers include Authorization

### Database Checks

- [ ] User exists in auth.users table
- [ ] Profile exists in profiles table
- [ ] Role is correct
- [ ] Email is confirmed (if required)

---

## 💡 COMMON ERROR MESSAGES

### "Invalid email or password"

**Causes:**
- Wrong credentials
- Account doesn't exist
- Password was changed

**Solutions:**
- Double-check email and password
- Use "Forgot password?" feature
- Check if account exists in database

### "Failed to complete login"

**Causes:**
- Network error
- Profile fetch error
- Database connection issue

**Solutions:**
- Check internet connection
- Verify Supabase project is active
- Check browser console for specific error
- Try again in a few moments

### "Unable to sign in"

**Causes:**
- No user data returned from Supabase
- Session creation failed
- Server error

**Solutions:**
- Clear browser cache and cookies
- Try different browser
- Check Supabase dashboard for issues
- Contact support if persists

---

## 🆘 STILL HAVING ISSUES?

### Collect Debug Information

Before contacting support, gather:

1. **Browser Information:**
   - Browser name and version
   - Operating system
   - Extensions installed

2. **Error Details:**
   - Exact error message
   - Screenshot of browser console
   - Network tab screenshot
   - Steps to reproduce

3. **Account Information:**
   - Email address (don't share password!)
   - User role
   - When account was created

4. **Environment:**
   - Using HTTP or HTTPS?
   - Local development or production?
   - Any VPN or proxy?

### Contact Support

Provide the above information along with:
- What you've already tried
- When the issue started
- Whether it works on other devices/browsers

---

## 📚 TECHNICAL REFERENCE

### Authentication Flow

```
1. User enters credentials
   ↓
2. Supabase validates credentials
   ↓
3. Session created with access_token and refresh_token
   ↓
4. Session stored in localStorage
   ↓
5. Auth cookie set for middleware
   ↓
6. Profile fetched from database
   ↓
7. User redirected based on role
   ↓
8. Middleware validates on protected routes
```

### Session Storage

- **Primary**: localStorage (`sb-<project-id>-auth-token`)
- **Format**: JSON object with access_token, refresh_token, user
- **Expiry**: 1 hour (auto-refreshed)
- **Cookie**: Set for middleware SSR checks

### Protected Routes

- `/admin/*` → Requires SUPER_ADMIN role
- `/dashboard/*` → Requires RESTAURANT or SUPER_ADMIN role
- `/profile/*` → Requires any authenticated user
- All other routes → Public (no auth required)

### Role-Based Access

| Route | Customer | Restaurant | Admin |
|-------|----------|------------|-------|
| `/` (Home) | ✅ | ➡️ Dashboard | ➡️ Admin |
| `/r/:slug` | ✅ | ✅ | ✅ |
| `/dashboard` | ❌ Redirect to / | ✅ | ✅ |
| `/admin` | ❌ Redirect to / | ❌ Redirect to / | ✅ |
| `/profile` | ✅ | ✅ | ✅ |

---

## ✅ SUMMARY

**The login loop issue has been fixed through:**
1. Improved session persistence configuration
2. Better redirect handling (client-side navigation)
3. Enhanced middleware with loop prevention
4. Proper timing to ensure session establishment

**For unexpected login prompts:**
- Most likely caused by the login loop (now fixed)
- Or clicking on links that require authentication
- Public browsing should work without prompts

**Users should:**
1. Clear browser cache and cookies
2. Try the updated application
3. Use incognito mode if issues persist
4. Contact support with debug information if needed

**The application now has:**
- Robust authentication flow
- Better error handling
- Improved user experience
- Protected against common auth issues

---

## 🔄 CHANGELOG

**2026-01-11 - Authentication Fixes**
- ✅ Fixed login loop issue
- ✅ Configured proper session persistence
- ✅ Enhanced middleware redirect logic
- ✅ Added redirect parameter preservation
- ✅ Improved error handling and logging
- ✅ Changed from window.location to router.push
- ✅ Added appropriate delays for session establishment

---

**Last Updated:** January 11, 2026
**Version:** 1.0
**Status:** Issues Fixed ✅
