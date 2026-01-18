# Comprehensive Authentication & Authorization Solution

## Executive Summary

This document provides a complete analysis and solution for the recurring RLS and authentication issues in the multi-portal Restaurant Digital Storefront system.

---

## 1. ROOT CAUSE ANALYSIS

### Issue 1: RLS Infinite Recursion (FIXED)
**Problem**: Database policies were calling helper functions that queried the same table
```sql
-- BROKEN (caused infinite loop)
CREATE POLICY "view_profile" ON profiles
  FOR SELECT USING ((auth.uid() = id) OR is_super_admin());
```
The `is_super_admin()` function tried to read the profiles table, triggering the same policy again → infinite recursion.

**Solution Applied**: Removed all function calls from RLS policies
```sql
-- FIXED (no recursion)
CREATE POLICY "authenticated_users_select_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
```

### Issue 2: Session Token Not Attached to Queries ⚠️ CRITICAL
**Problem**: When `onAuthStateChange` fires, the profile query executes before the Supabase client has the JWT token attached, causing RLS to reject the query.

**Flow**:
1. User logs in → JWT token created
2. `onAuthStateChange` callback fires immediately
3. `fetchProfile()` queries database
4. ❌ Supabase client doesn't have token yet
5. RLS rejects query (no `auth.uid()`)
6. Code thinks profile doesn't exist
7. Tries to create duplicate profile

### Issue 3: No Actual Admin User in Database
**Current Users**:
- `psainath123@gmail.com` (id: fe3ebcdf-..., role: SUPER_ADMIN, phone: 9441414140)
- `abc@gmail.com` (id: 9874ded1-..., no profile yet)

**Problem**: Documentation references `admin@test.com` which doesn't exist, causing confusion.

### Issue 4: Single Login Endpoint for Multiple User Types
**Current**: Both Partners and Admins use `/login`
**Problem**: No separation of concerns, harder to implement role-specific logic

---

## 2. RECOMMENDED ARCHITECTURE

### Option A: Unified Login with Post-Login Routing (RECOMMENDED)
**Pros**:
- Simpler architecture
- Single authentication flow
- Easier to maintain
- Industry standard (AWS, Azure, Google Cloud all use single login)

**Cons**:
- Requires proper role-based routing after login

### Option B: Separate Login Endpoints
**Pros**:
- Clear separation of concerns
- Can customize UI per portal
- Slightly better security through obscurity

**Cons**:
- Code duplication
- More complex maintenance
- Two authentication flows to test

**RECOMMENDATION**: Use Option A (unified login) with proper post-login routing based on roles.

---

## 3. COMPREHENSIVE SOLUTION

### Step 1: Fix Session Token Timing Issue

The core issue is that the Supabase client needs to have the session established before making RLS-protected queries.

**Current Code (BROKEN)**:
```typescript
supabase.auth.onAuthStateChange((_event, session) => {
  (async () => {
    setUser(session?.user ?? null);
    if (session?.user) {
      await fetchProfile(session.user.id); // ❌ Token not attached yet
    }
  })();
});
```

**Fixed Code**:
```typescript
supabase.auth.onAuthStateChange((_event, session) => {
  (async () => {
    setUser(session?.user ?? null);
    if (session?.user) {
      // ✅ Add delay to ensure token is attached
      await new Promise(resolve => setTimeout(resolve, 100));
      await fetchProfile(session.user.id);
    }
  })();
});
```

### Step 2: Improve Profile Query Error Handling

```typescript
const fetchProfile = async (userId: string) => {
  // ✅ Verify session exists first
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.error('No session available for profile query');
    return;
  }

  console.log('Fetching profile for user:', userId);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    // ✅ Check if it's an RLS error
    if (error.message.includes('RLS') || error.message.includes('policy')) {
      console.error('RLS POLICY VIOLATION - Session token may not be attached');
    }
    return;
  }

  if (data) {
    console.log('✅ Profile loaded successfully:', data);
    setProfile(data);
    return;
  }

  // Only create if truly doesn't exist
  console.log('Profile not found, creating one...');
  // ... creation logic
};
```

### Step 3: Create Role-Based Routing System

```typescript
// lib/auth/routing.ts
export const getRedirectPathForRole = (role: string, intendedPath?: string) => {
  // Admin trying to access admin area
  if (intendedPath?.startsWith('/admin')) {
    return role === 'SUPER_ADMIN' ? intendedPath : '/';
  }

  // Partner trying to access dashboard
  if (intendedPath?.startsWith('/dashboard')) {
    return ['RESTAURANT_PARTNER', 'SUPER_ADMIN'].includes(role) ? intendedPath : '/';
  }

  // Default redirects by role
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin';
    case 'RESTAURANT_PARTNER':
      return '/dashboard';
    case 'CUSTOMER':
      return '/';
    default:
      return '/';
  }
};
```

### Step 4: Update Login Flow

```typescript
// app/(auth)/login/page.tsx
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError(null);

  try {
    const { data, error } = await signInWithEmail(email, password);

    if (error) throw error;

    if (data.user) {
      console.log('✅ Login successful:', data.user.id);

      // ✅ Wait for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 200));

      // ✅ Fetch profile to determine routing
      const profile = await getUserProfile();

      if (profile) {
        const redirectPath = getRedirectPathForRole(profile.role);
        router.push(redirectPath);
      } else {
        // Profile doesn't exist, stay on login
        setError('Profile not found. Please contact support.');
      }
    }
  } catch (error: any) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Step 5: Database Schema Verification

```sql
-- Verify profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Verify RLS policies are correct
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Verify all users have profiles
SELECT
  u.id,
  u.email,
  u.phone,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;
```

---

## 4. SECURITY CONSIDERATIONS

### Current Security Model
✅ **Correct**:
- RLS enabled on all tables
- Policies use `auth.uid()` directly (no recursion)
- JWT tokens stored in HTTP-only cookies
- PKCE flow enabled for OAuth

⚠️ **Needs Improvement**:
- Super admin checks should be at application level, not RLS
- Profile creation should be restricted to signup flow only
- Need rate limiting on login attempts

### Recommended Security Enhancements

1. **Add Service Role Functions for Admin Operations**
```sql
-- Create admin-only operations using service role
CREATE OR REPLACE FUNCTION admin_delete_profile(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with postgres privileges
AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM profiles WHERE id = target_user_id;
END;
$$;
```

2. **Lock Down Profile Creation**
```sql
-- Only allow profile creation during signup (not after)
CREATE OR REPLACE FUNCTION is_new_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid()
  );
$$;

-- Update INSERT policy
DROP POLICY IF EXISTS "authenticated_users_insert_own_profile" ON profiles;

CREATE POLICY "new_users_insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND is_new_user());
```

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Immediate Fixes (DO NOW)
1. ✅ Fix RLS recursion (COMPLETED)
2. ⚠️ Fix session token timing in AuthProvider
3. ⚠️ Add proper error logging to identify exact failure point
4. ⚠️ Create correct admin test account

### Phase 2: Enhanced Error Handling (NEXT)
1. Add detailed console logging for auth flow
2. Implement retry logic for profile queries
3. Add user-friendly error messages
4. Create `/debug-auth` page to diagnose issues

### Phase 3: Role-Based Routing (THEN)
1. Implement `getRedirectPathForRole()` function
2. Update login page to use role-based routing
3. Update middleware to enforce role boundaries
4. Add role checks to page components

### Phase 4: Security Hardening (FINALLY)
1. Add service role functions for admin operations
2. Lock down profile creation to signup only
3. Implement rate limiting
4. Add audit logging for sensitive operations

---

## 6. TESTING STRATEGY

### Unit Tests
```typescript
describe('AuthProvider', () => {
  it('should fetch profile after successful login', async () => {
    // Mock successful login
    // Verify profile is fetched
    // Verify no duplicate creation attempts
  });

  it('should handle RLS policy errors gracefully', async () => {
    // Mock RLS rejection
    // Verify error is logged
    // Verify user is notified
  });
});
```

### Integration Tests
```typescript
describe('Login Flow', () => {
  it('should redirect SUPER_ADMIN to /admin', async () => {
    await loginAs('superadmin@example.com', 'password');
    expect(window.location.pathname).toBe('/admin');
  });

  it('should redirect RESTAURANT_PARTNER to /dashboard', async () => {
    await loginAs('partner@example.com', 'password');
    expect(window.location.pathname).toBe('/dashboard');
  });

  it('should redirect CUSTOMER to /', async () => {
    await loginAs('customer@example.com', 'password');
    expect(window.location.pathname).toBe('/');
  });
});
```

### Manual Testing Checklist
- [ ] Clear browser cache and cookies
- [ ] Login as SUPER_ADMIN → verify redirect to /admin
- [ ] Login as RESTAURANT_PARTNER → verify redirect to /dashboard
- [ ] Login as CUSTOMER → verify redirect to /
- [ ] Check console for "Profile loaded successfully" message
- [ ] Check console for NO "Profile not found, creating one" message
- [ ] Verify profile data is displayed correctly
- [ ] Logout and login again → verify same behavior
- [ ] Try to access /admin as CUSTOMER → verify redirect to /
- [ ] Try to access /dashboard as CUSTOMER → verify redirect to /

---

## 7. CURRENT STATE SUMMARY

### What's Fixed ✅
- RLS infinite recursion removed
- Policies simplified to use only `auth.uid()`
- Build is successful

### What's Still Broken ⚠️
- Session token not attached before profile query
- Profile fetch happens too early in auth lifecycle
- No proper error differentiation (RLS vs not found)

### Correct Login Credentials
- **Admin**: `psainath123@gmail.com` / password (role: SUPER_ADMIN)
- **Partner**: Create via `/create-test-accounts`
- **Customer**: Create via `/create-test-accounts`

---

## 8. NEXT STEPS (IMMEDIATE ACTION REQUIRED)

1. **Apply the AuthProvider Fix** (highest priority)
2. **Clear browser cache completely**
3. **Test with correct admin credentials**: `psainath123@gmail.com`
4. **Check console for detailed logging**
5. **Report back with exact error messages from console**

The solution is clear - we need to ensure the Supabase client has the JWT token attached before making RLS-protected queries. The current implementation fires the profile query too early in the auth lifecycle.
