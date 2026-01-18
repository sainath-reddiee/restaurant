'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import RiderLayout from '@/components/rider/RiderLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/format';

interface ActiveOrder {
  id: string;
  short_id: string;
  restaurant_id: string;
  customer_id: string;
  total_amount: number;
  delivery_address: string;
  status: string;
  restaurant?: {
    name: string;
    address: string;
    phone: string;
  };
  customer?: {
    name: string;
    phone: string;
  };
}

export default function RiderActivePage() {
  const router = useRouter();
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuthAndFetchOrders();
  }, []);

  const checkAuthAndFetchOrders = async () => {
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
      fetchActiveOrders();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurants(name, address, phone),
          customer:profiles!orders_customer_id_fkey(name, phone)
        `)
        .eq('rider_id', user.id)
        .in('status', ['RIDER_ASSIGNED', 'OUT_FOR_DELIVERY'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActiveOrders(data || []);
    } catch (error) {
      console.error('Error fetching active orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Order ${newStatus === 'OUT_FOR_DELIVERY' ? 'picked up' : 'delivered'} successfully`);
      fetchActiveOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <RiderLayout>
        <div className="flex items-center justify-center h-full px-4">
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Deliveries</h2>
            <p className="text-gray-600">Go to Feed to accept delivery requests</p>
          </div>
        </div>
      </RiderLayout>
    );
  }

  return (
    <RiderLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Active Deliveries</h1>

        <div className="space-y-4">
          {activeOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{order.restaurant?.name || 'Restaurant'}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      order.status === 'RIDER_ASSIGNED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {order.status === 'RIDER_ASSIGNED' ? 'Assigned' : 'Out for Delivery'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Order #{order.short_id}</p>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Pickup</p>
                      <p className="text-sm text-gray-600">{order.restaurant?.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Delivery</p>
                      <p className="text-sm text-gray-600">{order.delivery_address}</p>
                    </div>
                  </div>

                  {order.customer?.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-500 mr-2" />
                      <a href={`tel:${order.customer.phone}`} className="text-sm text-blue-600 hover:underline">
                        {order.customer.phone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm">
                    <strong>Customer:</strong> {order.customer?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Order Value: {formatPrice(order.total_amount)}
                  </p>
                </div>

                {order.status === 'RIDER_ASSIGNED' ? (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'OUT_FOR_DELIVERY')}
                    disabled={updating}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Mark as Picked Up
                  </Button>
                ) : (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                    disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Mark as Delivered
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RiderLayout>
  );
}
