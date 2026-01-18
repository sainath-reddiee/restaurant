'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Home, Briefcase, Wallet, User, Bike } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RiderLayoutProps {
  children: React.ReactNode;
}

export default function RiderLayout({ children }: RiderLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiderStatus();
  }, []);

  const fetchRiderStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_rider_online')
        .eq('id', user.id)
        .single();

      if (profile) {
        setIsOnline(profile.is_rider_online || false);
      }
    } catch (error) {
      console.error('Error fetching rider status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ is_rider_online: checked })
        .eq('id', user.id);

      if (error) throw error;

      setIsOnline(checked);
      toast.success(checked ? 'You are now online and visible to restaurants' : 'You are now offline');
    } catch (error) {
      console.error('Error toggling online status:', error);
      toast.error('Failed to update status');
    }
  };

  const navItems = [
    { icon: Home, label: 'Feed', href: '/rider/dashboard', match: '/rider/dashboard' },
    { icon: Briefcase, label: 'Active', href: '/rider/active', match: '/rider/active' },
    { icon: Wallet, label: 'Earnings', href: '/rider/earnings', match: '/rider/earnings' },
    { icon: User, label: 'Profile', href: '/rider/profile', match: '/rider/profile' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <Bike className="w-6 h-6 text-orange-500" />
            <span className="font-bold text-lg">GO515 Partner</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className={cn(
              "text-sm font-medium",
              isOnline ? "text-green-600" : "text-gray-500"
            )}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <Switch
              checked={isOnline}
              onCheckedChange={toggleOnlineStatus}
              disabled={loading}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around items-center max-w-7xl mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.match;
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center space-y-1 py-2 px-3 rounded-lg transition-colors",
                  isActive
                    ? "text-orange-500"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
