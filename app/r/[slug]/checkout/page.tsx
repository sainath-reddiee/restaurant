'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, Coupon } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { VoiceRecorder } from '@/components/voice-recorder';
import { Loader2, MapPin, Tag, CreditCard, Wallet, QrCode, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, generateUPIDeepLink } from '@/lib/format';
import Link from 'next/link';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { items: cartItems, cartTotal, clearCart } = useCart();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState<string | null>(null);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PREPAID_UPI' | 'COD_CASH' | 'COD_UPI_SCAN'>('COD_CASH');

  const slug = params.slug as string;

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'CUSTOMER')) {
      router.push('/login');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile?.role === 'CUSTOMER') {
      if (cartItems.length === 0) {
        toast({
          title: 'Cart is empty',
          description: 'Add items to your cart first',
          variant: 'destructive',
        });
        router.push(`/r/${slug}`);
        return;
      }
      fetchRestaurant();
      getLocation();
    }
  }, [profile, slug, cartItems.length]);

  const fetchRestaurant = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      setRestaurant(data);
    }
    setLoading(false);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoordinates(`${position.coords.latitude},${position.coords.longitude}`);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const applyCoupon = async () => {
    if (!restaurant) return;

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Invalid Coupon',
        description: 'Coupon code not found or expired',
        variant: 'destructive',
      });
      return;
    }

    if (cartTotal < data.min_order_value) {
      toast({
        title: 'Minimum order not met',
        description: `Minimum order value is ${formatPrice(data.min_order_value)}`,
        variant: 'destructive',
      });
      return;
    }

    setAppliedCoupon(data);
    toast({
      title: 'Coupon applied!',
      description: `You saved ${formatPrice(data.discount_value)}`,
    });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const calculateTotal = () => {
    const discount = appliedCoupon?.discount_value || 0;
    const subtotal = cartTotal - discount;

    let deliveryFee = 0;
    if (restaurant?.free_delivery_threshold) {
      deliveryFee = subtotal >= restaurant.free_delivery_threshold ? 0 : restaurant.delivery_fee;
    } else {
      deliveryFee = restaurant?.delivery_fee || 0;
    }

    return {
      subtotal: cartTotal,
      discount,
      deliveryFee,
      total: subtotal + deliveryFee,
    };
  };

  const placeOrder = async () => {
    if (!restaurant || !profile) return;

    if (!deliveryAddress.trim()) {
      toast({
        title: 'Address required',
        description: 'Please enter your delivery address',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { subtotal, discount, deliveryFee, total } = calculateTotal();

      const { data: shortIdData } = await supabase.rpc('generate_short_id');

      const techFee = restaurant.tech_fee * cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const deliveryMargin = deliveryFee > 0 ? deliveryFee - 30 : 0;
      const netProfit = techFee + deliveryMargin;

      const orderItems = cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.selling_price,
        quantity: item.quantity,
        is_mystery: item.is_mystery,
      }));

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          short_id: shortIdData || `ANT-${Date.now()}`,
          restaurant_id: restaurant.id,
          customer_id: profile.id,
          status: 'PENDING',
          payment_method: paymentMethod,
          voice_note_url: voiceNoteUrl || null,
          gps_coordinates: gpsCoordinates,
          delivery_address: deliveryAddress,
          total_amount: total,
          delivery_fee_charged: deliveryFee,
          coupon_code: appliedCoupon?.code || null,
          discount_amount: discount,
          net_profit: netProfit,
          items: orderItems,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      if (paymentMethod === 'PREPAID_UPI') {
        const upiLink = generateUPIDeepLink(
          restaurant.upi_id,
          restaurant.name,
          total,
          order.short_id
        );
        window.location.href = upiLink;
      }

      clearCart();
      toast({
        title: 'Order placed!',
        description: `Your order ${order.short_id} has been placed successfully`,
      });
      router.push(`/orders/${order.id}`);
    } catch (error) {
      console.error('Order placement error:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  const { subtotal, discount, deliveryFee, total } = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href={`/r/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>
          <h1 className="text-2xl font-bold mt-2">Checkout</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cartItems.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>{formatPrice(item.selling_price * item.quantity)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({appliedCoupon.code})</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </CardContent>
        </Card>

        {!appliedCoupon ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Apply Coupon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <Button onClick={applyCoupon} variant="outline">
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">{appliedCoupon.code} applied!</span>
                  <span className="text-green-600">Saved {formatPrice(discount)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={removeCoupon}>
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Delivery Address *</Label>
              <Textarea
                id="address"
                placeholder="Enter your full address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                rows={3}
              />
            </div>
            {gpsCoordinates && (
              <p className="text-xs text-muted-foreground">
                Location captured: {gpsCoordinates}
              </p>
            )}
            <VoiceRecorder onRecordingComplete={setVoiceNoteUrl} />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Choose how you want to pay</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="PREPAID_UPI" id="prepaid" />
                <Label htmlFor="prepaid" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-semibold">Pay Now (UPI)</div>
                    <div className="text-xs text-muted-foreground">Instant payment via UPI</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="COD_CASH" id="cod-cash" />
                <Label htmlFor="cod-cash" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Wallet className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="font-semibold">Cash on Delivery</div>
                    <div className="text-xs text-muted-foreground">Keep exact change ready</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="COD_UPI_SCAN" id="cod-upi" />
                <Label htmlFor="cod-upi" className="flex items-center gap-2 cursor-pointer flex-1">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">UPI on Delivery</div>
                    <div className="text-xs text-muted-foreground">Scan rider's QR at door</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Button
          onClick={placeOrder}
          disabled={submitting || !deliveryAddress.trim()}
          className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>Place Order • {formatPrice(total)}</>
          )}
        </Button>
      </div>
    </div>
  );
}
