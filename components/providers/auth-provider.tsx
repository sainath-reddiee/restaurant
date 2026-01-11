'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, retryCount = 0): Promise<void> => {
    // Verify session exists before querying
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('❌ No session available for profile query');
      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 100; // 100ms, 200ms, 400ms
        console.log(`Retrying profile fetch in ${delay}ms... (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchProfile(userId, retryCount + 1);
      }
      return;
    }

    console.log('🔍 Fetching profile for user:', userId);
    console.log('📝 Session exists:', !!session, 'Token length:', session.access_token?.length);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // Check for RLS errors specifically
    if (error) {
      console.error('❌ Error fetching profile:', error);

      if (error.message?.includes('RLS') || error.message?.includes('policy') || error.code === 'PGRST301') {
        console.error('🚨 RLS POLICY VIOLATION - Session token may not be attached properly');
        console.error('Session user ID:', session.user?.id);
        console.error('Querying for ID:', userId);
        console.error('IDs match:', session.user?.id === userId);
      }

      return;
    }

    if (data) {
      console.log('✅ Profile loaded successfully:', {
        id: data.id,
        role: data.role,
        fullName: data.full_name,
        phone: data.phone
      });
      setProfile(data);
      return;
    }

    // Only create profile if there's NO error AND NO data (profile truly doesn't exist)
    console.log('⚠️ Profile not found, creating one...');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const phone = user.phone || user.user_metadata?.phone || user.email || '';
      const fullName = user.user_metadata?.full_name || '';

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          phone,
          full_name: fullName,
          role: 'CUSTOMER',
          wallet_balance: 0,
        })
        .select()
        .maybeSingle();

      if (newProfile) {
        console.log('✅ Profile created successfully');
        setProfile(newProfile);
      } else {
        console.error('❌ Error creating profile:', createError);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider: Initializing...');

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📦 Initial session check:', !!session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('👤 User found in initial session:', session.user.id);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event, 'Session exists:', !!session);

      (async () => {
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('👤 User authenticated:', session.user.id);

          // Give Supabase client time to attach the session token
          // This is critical for RLS policies to work
          await new Promise(resolve => setTimeout(resolve, 150));

          await fetchProfile(session.user.id);
        } else {
          console.log('👋 User signed out or session expired');
          setProfile(null);
        }

        setLoading(false);
      })();
    });

    return () => {
      console.log('🛑 AuthProvider: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut: handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
