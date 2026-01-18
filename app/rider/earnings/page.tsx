'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import RiderLayout from '@/components/rider/RiderLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, Package } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';

export default function RiderEarningsPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedDeliveries: 0,
    walletBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuthAndFetchEarnings();
  }, []);

  const checkAuthAndFetchEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to continue');
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'RIDER') {
        toast.error('You are not registered as a rider');
        router.push('/join-rider');
        return;
      }

      setAuthChecked(true);
      fetchEarnings();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('rider_wallet_balance')
        .eq('id', user.id)
        .single();

      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', user.id)
        .eq('status', 'DELIVERED');

      setStats({
        totalEarnings: (count || 0) * 40,
        completedDeliveries: count || 0,
        walletBalance: profile?.rider_wallet_balance || 0,
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <RiderLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Earnings</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.totalEarnings)}</div>
              <p className="text-xs text-gray-500 mt-1">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedDeliveries}</div>
              <p className="text-xs text-gray-500 mt-1">Total deliveries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.walletBalance)}</div>
              <p className="text-xs text-gray-500 mt-1">Available balance</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Earnings Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Per Delivery Rate</span>
                <span className="font-semibold">₹40</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed Deliveries</span>
                <span className="font-semibold">{stats.completedDeliveries}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-semibold">Total Earned</span>
                <span className="font-bold text-lg text-green-600">
                  {formatPrice(stats.totalEarnings)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
}
