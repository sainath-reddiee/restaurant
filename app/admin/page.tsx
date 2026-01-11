'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, Order } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Store, DollarSign, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    owner_phone: '',
    upi_id: '',
    tech_fee: 10,
    delivery_fee: 40,
    free_delivery_threshold: '',
    slug: '',
  });

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'SUPER_ADMIN')) {
      router.push('/');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN') {
      fetchRestaurants();
      fetchStats();
    }
  }, [profile]);

  const fetchRestaurants = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setRestaurants(data);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const { data: orders } = await supabase
      .from('orders')
      .select('net_profit')
      .returns<Array<{ net_profit: number }>>();

    if (orders) {
      const revenue = orders.reduce((sum, order) => sum + order.net_profit, 0);
      setTotalRevenue(revenue);
      setTotalOrders(orders.length);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const insertData = {
      name: formData.name,
      owner_phone: formData.owner_phone.startsWith('+91') ? formData.owner_phone : `+91${formData.owner_phone}`,
      upi_id: formData.upi_id,
      tech_fee: formData.tech_fee,
      delivery_fee: formData.delivery_fee,
      free_delivery_threshold: formData.free_delivery_threshold ? parseInt(formData.free_delivery_threshold) : null,
      slug: formData.slug,
      is_active: true,
    };

    // @ts-ignore
    const { data, error } = await supabase
      .from('restaurants')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Restaurant onboarded successfully!',
      });
      setDialogOpen(false);
      setFormData({
        name: '',
        owner_phone: '',
        upi_id: '',
        tech_fee: 10,
        delivery_fee: 40,
        free_delivery_threshold: '',
        slug: '',
      });
      fetchRestaurants();
      fetchStats();
    }
  };

  const toggleRestaurantStatus = async (id: string, currentStatus: boolean) => {
    // @ts-ignore
    const { error } = await supabase
      .from('restaurants')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Restaurant ${!currentStatus ? 'activated' : 'deactivated'}`,
      });
      fetchRestaurants();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Concierge Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage restaurants and track platform revenue</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="mr-2 h-4 w-4" />
                Onboard Restaurant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Onboard New Restaurant</DialogTitle>
                <DialogDescription>
                  Add a new restaurant to the platform with custom configuration
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    placeholder="raju-biryani"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_phone">Owner Phone</Label>
                  <Input
                    id="owner_phone"
                    type="tel"
                    placeholder="9876543210"
                    value={formData.owner_phone}
                    onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Critical for WhatsApp notifications</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upi_id">UPI ID</Label>
                  <Input
                    id="upi_id"
                    placeholder="raju@oksbi"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">For UPI payment deep links</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tech_fee">Tech Fee (₹)</Label>
                    <Input
                      id="tech_fee"
                      type="number"
                      value={formData.tech_fee}
                      onChange={(e) => setFormData({ ...formData, tech_fee: parseInt(e.target.value) })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Platform fee per order</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_fee">Delivery Fee (₹)</Label>
                    <Input
                      id="delivery_fee"
                      type="number"
                      value={formData.delivery_fee}
                      onChange={(e) => setFormData({ ...formData, delivery_fee: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="free_delivery_threshold">Free Delivery Threshold (₹)</Label>
                  <Input
                    id="free_delivery_threshold"
                    type="number"
                    placeholder="Leave empty for no free delivery"
                    value={formData.free_delivery_threshold}
                    onChange={(e) => setFormData({ ...formData, free_delivery_threshold: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Minimum order for free delivery</p>
                </div>
                <Button type="submit" className="w-full">Create Restaurant</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPrice(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Tech Fee + Delivery Margin
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Across all restaurants
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Restaurants</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{restaurants.filter(r => r.is_active).length}</div>
              <p className="text-xs text-muted-foreground">
                Out of {restaurants.length} total
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Restaurants</CardTitle>
            <CardDescription>Manage all onboarded restaurants</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner Phone</TableHead>
                  <TableHead>Tech Fee</TableHead>
                  <TableHead>Delivery Fee</TableHead>
                  <TableHead>Free Delivery</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((restaurant) => (
                  <TableRow key={restaurant.id}>
                    <TableCell className="font-medium">{restaurant.name}</TableCell>
                    <TableCell>{restaurant.owner_phone}</TableCell>
                    <TableCell>{formatPrice(restaurant.tech_fee)}</TableCell>
                    <TableCell>{formatPrice(restaurant.delivery_fee)}</TableCell>
                    <TableCell>
                      {restaurant.free_delivery_threshold ? formatPrice(restaurant.free_delivery_threshold) : 'None'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={restaurant.is_active}
                          onCheckedChange={() => toggleRestaurantStatus(restaurant.id, restaurant.is_active)}
                        />
                        <Badge variant={restaurant.is_active ? 'default' : 'secondary'}>
                          {restaurant.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
