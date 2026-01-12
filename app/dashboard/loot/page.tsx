'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, MenuItem } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap, Gift, Percent, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';

export default function LootModeManagement() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'RESTAURANT')) {
      router.push('/');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile?.role === 'RESTAURANT') {
      fetchRestaurant();
    }
  }, [profile]);

  const fetchRestaurant = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_phone', profile!.phone)
      .maybeSingle();

    if (data) {
      setRestaurant(data);
      fetchMenuItems(data.id);
    }
    setLoading(false);
  };

  const fetchMenuItems = async (restaurantId: string) => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name', { ascending: true });

    if (data) {
      setMenuItems(data);
    }
  };

  const toggleLootMode = async (itemId: string, currentStatus: boolean, currentStock: number) => {
    if (!currentStatus && currentStock === 0) {
      toast({
        title: 'Error',
        description: 'Please set a stock quantity before enabling Loot Mode',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('menu_items')
      .update({ is_clearance: !currentStatus })
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Loot Mode ${!currentStatus ? 'enabled' : 'disabled'}`,
      });
      fetchMenuItems(restaurant!.id);
    }
  };

  const updateLootSettings = async (itemId: string, discount: number, description: string) => {
    const { error } = await supabase
      .from('menu_items')
      .update({
        loot_discount_percentage: discount,
        loot_description: description || null,
      })
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Loot settings updated',
      });
      fetchMenuItems(restaurant!.id);
    }
  };

  const calculateDiscount = (basePrice: number, sellingPrice: number) => {
    if (basePrice <= sellingPrice) return 0;
    return Math.round(((basePrice - sellingPrice) / basePrice) * 100);
  };

  const updateStock = async (itemId: string, stock: number) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ stock_remaining: stock })
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      fetchMenuItems(restaurant!.id);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const lootItems = menuItems.filter(item => item.is_clearance);
  const availableItems = menuItems.filter(item => !item.is_clearance && item.is_available);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-2">
            <Zap className="h-6 w-6 text-orange-500" />
            Late Night Loot Mode
          </h1>
          <p className="text-gray-600">Create flash sales with limited stock items</p>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-6xl">
        {lootItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Active Loot Items</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {lootItems.map(item => {
                const autoDiscount = calculateDiscount(item.base_price, item.selling_price);
                const displayDiscount = item.loot_discount_percentage || autoDiscount;
                return (
                  <Card key={item.id} className="border-orange-500 border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Zap className="h-5 w-5 text-orange-500" />
                          {item.name}
                          {item.is_mystery && <Gift className="h-4 w-4 text-purple-500" />}
                        </CardTitle>
                        <Badge variant="default" className="bg-orange-500">
                          Loot Active
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <span className="text-lg font-bold text-orange-600">{formatPrice(item.selling_price)}</span>
                        {displayDiscount > 0 && (
                          <>
                            <span className="text-sm line-through text-gray-500">{formatPrice(item.base_price)}</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {displayDiscount}% OFF
                            </Badge>
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Stock Remaining</span>
                          <span className="font-semibold">{item.stock_remaining} left</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((item.stock_remaining / 50) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`stock-${item.id}`}>Update Stock</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`stock-${item.id}`}
                            type="number"
                            min="0"
                            defaultValue={item.stock_remaining}
                            onBlur={(e) => {
                              const newStock = parseInt(e.target.value) || 0;
                              if (newStock !== item.stock_remaining) {
                                updateStock(item.id, newStock);
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            onClick={() => updateStock(item.id, 0)}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`discount-${item.id}`} className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Custom Discount % (0 = Auto: {autoDiscount}%)
                        </Label>
                        <Input
                          id={`discount-${item.id}`}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={item.loot_discount_percentage || 0}
                          onBlur={(e) => {
                            const discount = parseInt(e.target.value) || 0;
                            if (discount !== item.loot_discount_percentage) {
                              updateLootSettings(item.id, discount, item.loot_description || '');
                            }
                          }}
                          placeholder="e.g., 50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`desc-${item.id}`} className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Promo Description (Optional)
                        </Label>
                        <Textarea
                          id={`desc-${item.id}`}
                          defaultValue={item.loot_description || ''}
                          onBlur={(e) => {
                            if (e.target.value !== item.loot_description) {
                              updateLootSettings(item.id, item.loot_discount_percentage || 0, e.target.value);
                            }
                          }}
                          placeholder="e.g., Limited time mystery box! Could be veg or non-veg surprise"
                          rows={2}
                        />
                      </div>

                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => toggleLootMode(item.id, item.is_clearance, item.stock_remaining)}
                      >
                        Disable Loot Mode
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">Available Items</h2>
          <p className="text-gray-600 mb-4">Enable Loot Mode for flash sales with limited stock</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableItems.map(item => (
              <Card key={item.id}>
                <CardHeader>
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                  )}
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <CardDescription>
                    {formatPrice(item.selling_price)} • {item.category}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`loot-stock-${item.id}`}>Set Stock Quantity</Label>
                    <Input
                      id={`loot-stock-${item.id}`}
                      type="number"
                      min="1"
                      placeholder="e.g., 20"
                      defaultValue={item.stock_remaining || ''}
                      onChange={(e) => {
                        const newStock = parseInt(e.target.value) || 0;
                        updateStock(item.id, newStock);
                      }}
                    />
                  </div>
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={() => toggleLootMode(item.id, item.is_clearance, item.stock_remaining)}
                    disabled={item.stock_remaining === 0}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Enable Loot Mode
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {availableItems.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No available items. Add items to your menu first.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
