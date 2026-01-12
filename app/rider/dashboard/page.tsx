'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import RiderLayout from '@/components/rider/RiderLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, MapPin, Navigation, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/format';

interface AvailableOrder {
  id: string;
  short_id: string;
  restaurant_id: string;
  total_amount: number;
  delivery_address: string;
  restaurant?: {
    name: string;
    address: string;
  };
}

export default function RiderDashboardPage() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    checkRiderStatus();

    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBClx0fPTgjMGHGq+7+OZURE');
    }
  }, []);

  useEffect(() => {
    if (isOnline) {
      fetchAvailableOrders();
      subscribeToOrders();
    }
  }, [isOnline]);

  const checkRiderStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_rider_online, role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'RIDER') {
        toast.error('You are not registered as a rider');
        router.push('/join-rider');
        return;
      }

      setIsOnline(profile.is_rider_online || false);
    } catch (error) {
      console.error('Error checking rider status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurants(name, address)
        `)
        .eq('status', 'SEARCHING_FOR_RIDER')
        .is('rider_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setAvailableOrders(data || []);
    } catch (error) {
      console.error('Error fetching available orders:', error);
    }
  };

  const subscribeToOrders = () => {
    const channel = supabase
      .channel('rider-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.SEARCHING_FOR_RIDER',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            playAlert();
            fetchAvailableOrders();
          } else if (payload.eventType === 'DELETE') {
            fetchAvailableOrders();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const playAlert = () => {
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(err => console.log('Audio play error:', err));

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.loop = false;
        }
      }, 5000);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    setAccepting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('orders')
        .update({
          rider_id: user.id,
          status: 'RIDER_ASSIGNED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('status', 'SEARCHING_FOR_RIDER');

      if (error) throw error;

      toast.success('Order accepted! Check Active tab for details');
      router.push('/rider/active');
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order. It may have been taken by another rider.');
      fetchAvailableOrders();
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <RiderLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </RiderLayout>
    );
  }

  if (!isOnline) {
    return (
      <RiderLayout>
        <div className="flex items-center justify-center h-full px-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
              <Power className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You are Offline</h2>
            <p className="text-gray-600 mb-6">Toggle the switch in the header to go online and start earning</p>
            <p className="text-sm text-gray-500">You will receive notifications for nearby delivery requests</p>
          </div>
        </div>
      </RiderLayout>
    );
  }

  if (availableOrders.length === 0) {
    return (
      <RiderLayout>
        <div className="flex items-center justify-center h-full px-4">
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></div>
              <div className="relative inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-full">
                <Navigation className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Scanning for orders...</h2>
            <p className="text-gray-600">Stay tuned! You'll be notified when a delivery request comes in</p>
          </div>
        </div>
      </RiderLayout>
    );
  }

  return (
    <RiderLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Available Deliveries</h1>

        <div className="space-y-4">
          {availableOrders.map((order) => (
            <Card key={order.id} className="border-orange-200 border-2 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{order.restaurant?.name || 'Restaurant'}</h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{order.restaurant?.address || 'Address not available'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-green-600 font-bold text-xl">
                      <DollarSign className="w-5 h-5" />
                      <span>₹40</span>
                    </div>
                    <p className="text-xs text-gray-500">Earning</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>Delivery to:</strong> {order.delivery_address}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Order Value: {formatPrice(order.total_amount)}
                  </p>
                </div>

                <Button
                  onClick={() => handleAcceptOrder(order.id)}
                  disabled={accepting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                  size="lg"
                >
                  {accepting ? 'Accepting...' : 'ACCEPT JOB'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RiderLayout>
  );
}
