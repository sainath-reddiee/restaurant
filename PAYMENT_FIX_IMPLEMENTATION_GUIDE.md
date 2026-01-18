# Payment System Fix Implementation Guide
## Step-by-Step Instructions to Fix Critical Payment Issues

---

## Overview

This guide provides step-by-step instructions to fix the three critical payment issues identified in the debugging report.

---

## Phase 1: Immediate Fixes (Can be implemented now)

### Fix 1: Add QR Code Support for Desktop UPI Payments

**Problem:** Desktop users must manually copy UPI ID and type amount
**Solution:** Display QR code that can be scanned with phone

#### Step 1.1: Install QR Code Library

```bash
npm install qrcode --save
npm install @types/qrcode --save-dev
```

#### Step 1.2: Create QR Code Component

Create file: `/components/upi-qr-code.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2 } from 'lucide-react';

interface UPIQRCodeProps {
  upiLink: string;
  size?: number;
}

export function UPIQRCode({ upiLink, size = 256 }: UPIQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateQRCode();
  }, [upiLink]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError(null);
      const dataUrl = await QRCode.toDataURL(upiLink, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR Code generation error:', err);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-50 rounded-lg" style={{ width: size, height: size }}>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <img src={qrDataUrl} alt="UPI Payment QR Code" className="rounded-lg border-2 border-gray-200" />
      <p className="text-xs text-gray-500 mt-2 text-center">Scan with any UPI app</p>
    </div>
  );
}
```

#### Step 1.3: Update Order Tracking Page

Update `/app/orders/[id]/page.tsx` to show QR code:

```typescript
// Add import at top
import { UPIQRCode } from '@/components/upi-qr-code';

// Replace the payment card section (around line 177) with:
{pendingPayment && (
  <Card className="mb-6 border-2 border-orange-500 bg-orange-50">
    <CardHeader>
      <CardTitle className="text-xl text-orange-900">Complete Payment</CardTitle>
      <CardDescription>Pay {formatPrice(pendingPayment.amount)} to confirm your order</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* QR Code Section */}
      <div className="bg-white rounded-lg p-6 flex flex-col items-center">
        <h3 className="font-semibold text-gray-900 mb-4">Scan QR Code to Pay</h3>
        <UPIQRCode upiLink={pendingPayment.upiLink} size={220} />
        <p className="text-sm text-gray-600 mt-4 text-center">
          Open any UPI app (PhonePe, Google Pay, Paytm) and scan this QR code
        </p>
      </div>

      {/* Manual Payment Details */}
      <div className="bg-white rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Or Pay Manually</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">UPI ID:</span>
            <span className="font-mono font-semibold">{pendingPayment.restaurantUPI}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold">{formatPrice(pendingPayment.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Note:</span>
            <span className="font-semibold">{pendingPayment.orderShortId}</span>
          </div>
        </div>
      </div>

      <Button
        className="w-full bg-orange-600 hover:bg-orange-700"
        onClick={() => {
          navigator.clipboard.writeText(pendingPayment.restaurantUPI);
          toast({
            title: 'Copied!',
            description: 'UPI ID copied to clipboard',
          });
        }}
      >
        Copy UPI ID
      </Button>
    </CardContent>
  </Card>
)}
```

---

### Fix 2: Implement COD_UPI_SCAN Payment Flow

**Problem:** COD_UPI_SCAN has no payment UI
**Solution:** Show restaurant QR code for cash-on-delivery UPI payment

#### Step 2.1: Update Checkout Page

Modify `/app/r/[slug]/checkout/page.tsx`:

```typescript
// In placeOrder function, after order is created (around line 305), update:

clearCart();
toast({
  title: 'Order placed!',
  description: `Your order ${order.short_id} has been placed successfully`,
});

// Handle different payment methods
if (paymentMethod === 'PREPAID_UPI' && amountToPay > 0) {
  const upiLink = generateUPIDeepLink(
    restaurant.upi_id,
    restaurant.name,
    amountToPay,
    order.short_id
  );

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    setTimeout(() => {
      window.location.href = upiLink;
    }, 1000);
  } else {
    localStorage.setItem('pending_payment', JSON.stringify({
      orderId: order.id,
      upiLink,
      amount: amountToPay,
      restaurantUPI: restaurant.upi_id,
      restaurantName: restaurant.name,
      orderShortId: order.short_id
    }));
    router.push(`/orders/${order.id}`);
  }
} else if (paymentMethod === 'COD_UPI_SCAN' && amountToPay > 0) {
  // NEW: Handle COD with UPI scan
  const upiLink = generateUPIDeepLink(
    restaurant.upi_id,
    restaurant.name,
    amountToPay,
    order.short_id
  );

  localStorage.setItem('cod_upi_payment', JSON.stringify({
    orderId: order.id,
    upiLink,
    amount: amountToPay,
    restaurantUPI: restaurant.upi_id,
    restaurantName: restaurant.name,
    orderShortId: order.short_id
  }));
  router.push(`/orders/${order.id}`);
} else {
  // COD_CASH or fully paid with wallet
  router.push(`/orders/${order.id}`);
}
```

#### Step 2.2: Update Order Page for COD_UPI_SCAN

Update `/app/orders/[id]/page.tsx`:

```typescript
// Add new state for COD UPI payment
const [codUpiPayment, setCodUpiPayment] = useState<any>(null);

// In useEffect (around line 30), add:
useEffect(() => {
  const paymentData = localStorage.getItem('pending_payment');
  if (paymentData) {
    const payment = JSON.parse(paymentData);
    if (payment.orderId === orderId) {
      setPendingPayment(payment);
      localStorage.removeItem('pending_payment');
    }
  }

  // NEW: Handle COD UPI
  const codPaymentData = localStorage.getItem('cod_upi_payment');
  if (codPaymentData) {
    const payment = JSON.parse(codPaymentData);
    if (payment.orderId === orderId) {
      setCodUpiPayment(payment);
      localStorage.removeItem('cod_upi_payment');
    }
  }
}, [orderId]);

// Add this card AFTER the pending payment card:
{codUpiPayment && (
  <Card className="mb-6 border-2 border-blue-500 bg-blue-50">
    <CardHeader>
      <CardTitle className="text-xl text-blue-900">Pay on Delivery with UPI</CardTitle>
      <CardDescription>Scan QR code when delivery arrives to pay {formatPrice(codUpiPayment.amount)}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center">
        <h3 className="font-semibold text-gray-900 mb-4">Show this QR to Delivery Person</h3>
        <UPIQRCode upiLink={codUpiPayment.upiLink} size={220} />
        <p className="text-sm text-gray-600 mt-4 text-center">
          The delivery person will help you scan this code with their device
        </p>
      </div>

      <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Payment Instructions:</h4>
        <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
          <li>Wait for your order to arrive</li>
          <li>Show this QR code to the delivery person</li>
          <li>They will scan it with their device</li>
          <li>Confirm payment on your UPI app</li>
          <li>Collect your order</li>
        </ol>
      </div>
    </CardContent>
  </Card>
)}
```

---

## Phase 2: Payment Gateway Integration (Requires Payment Gateway Account)

### Option A: Razorpay Integration (Recommended)

#### Step 1: Sign up for Razorpay
1. Visit https://dashboard.razorpay.com/signup
2. Complete KYC verification
3. Get API Keys from Dashboard > Settings > API Keys
4. Note down `key_id` and `key_secret`

#### Step 2: Install Razorpay SDK

```bash
npm install razorpay --save
```

#### Step 3: Add Environment Variables

Add to `.env`:
```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

#### Step 4: Create Razorpay Payment Gateway Component

Create `/lib/razorpay.ts`:

```typescript
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

export function openRazorpay(options: RazorpayOptions) {
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.onload = () => {
    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  };
  document.body.appendChild(script);
}
```

#### Step 5: Create Razorpay Order API

Create `/app/api/razorpay/create-order/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId } = await request.json();

    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: orderId,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
```

#### Step 6: Create Payment Verification API

Create `/app/api/razorpay/verify-payment/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
    } = await request.json();

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Payment verified, update order status
      const { error } = await supabase
        .from('orders')
        .update({
          payment_verified: true,
          payment_id: razorpay_payment_id,
          status: 'CONFIRMED',
        })
        .eq('id', order_id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
```

#### Step 7: Update Database Schema

Add new columns to `orders` table:

```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
```

#### Step 8: Update Checkout to Use Razorpay

Modify `/app/r/[slug]/checkout/page.tsx`:

```typescript
// Add import
import { openRazorpay } from '@/lib/razorpay';

// Replace the PREPAID_UPI section in placeOrder function:
if (paymentMethod === 'PREPAID_UPI' && amountToPay > 0) {
  try {
    // Create Razorpay order
    const response = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountToPay,
        orderId: order.short_id,
      }),
    });

    const { order_id: razorpayOrderId } = await response.json();

    // Update order with razorpay order ID
    await supabase
      .from('orders')
      .update({ razorpay_order_id: razorpayOrderId })
      .eq('id', order.id);

    // Open Razorpay checkout
    openRazorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: amountToPay * 100,
      currency: 'INR',
      name: restaurant.name,
      description: `Order ${order.short_id}`,
      order_id: razorpayOrderId,
      handler: async (response) => {
        // Verify payment
        const verifyResponse = await fetch('/api/razorpay/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            order_id: order.id,
          }),
        });

        const result = await verifyResponse.json();

        if (result.success) {
          toast({
            title: 'Payment Successful!',
            description: 'Your order has been confirmed',
          });
          router.push(`/orders/${order.id}`);
        } else {
          toast({
            title: 'Payment Verification Failed',
            description: 'Please contact support',
            variant: 'destructive',
          });
        }
      },
      prefill: {
        name: profile?.full_name || guestName,
        contact: profile?.phone || guestPhone,
      },
      theme: {
        color: '#f97316',
      },
    });
  } catch (error) {
    console.error('Payment error:', error);
    toast({
      title: 'Payment Error',
      description: 'Failed to initiate payment. Please try again.',
      variant: 'destructive',
    });
  }
}
```

---

### Wallet Recharge with Razorpay

#### Update `/app/partner/wallet/page.tsx`:

Replace the `handleRecharge` function:

```typescript
const handleRecharge = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!restaurant) return;

  const amount = parseInt(rechargeAmount);
  if (isNaN(amount) || amount <= 0) {
    toast({
      title: 'Invalid Amount',
      description: 'Please enter a valid amount',
      variant: 'destructive',
    });
    return;
  }

  setSubmitting(true);

  try {
    // Create Razorpay order
    const response = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        orderId: `wallet_${restaurant.id}_${Date.now()}`,
      }),
    });

    const { order_id: razorpayOrderId } = await response.json();

    // Open Razorpay checkout
    openRazorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: amount * 100,
      currency: 'INR',
      name: 'Wallet Recharge',
      description: `Recharge wallet for ${restaurant.name}`,
      order_id: razorpayOrderId,
      handler: async (response) => {
        // Create transaction and update wallet
        const { error } = await supabase.rpc('process_wallet_recharge', {
          p_restaurant_id: restaurant.id,
          p_amount: amount,
          p_payment_id: response.razorpay_payment_id,
        });

        if (!error) {
          toast({
            title: 'Recharge Successful!',
            description: `₹${amount} has been added to your wallet`,
          });
          setRechargeDialogOpen(false);
          setRechargeAmount('');
          fetchData();
        } else {
          throw error;
        }
      },
      prefill: {
        name: profile?.full_name,
        contact: profile?.phone,
      },
      theme: {
        color: '#f97316',
      },
    });
  } catch (error) {
    console.error('Recharge error:', error);
    toast({
      title: 'Recharge Failed',
      description: 'Failed to process recharge. Please try again.',
      variant: 'destructive',
    });
  } finally {
    setSubmitting(false);
  }
};
```

#### Create Database Function for Wallet Recharge

Run this migration:

```sql
CREATE OR REPLACE FUNCTION process_wallet_recharge(
  p_restaurant_id UUID,
  p_amount INTEGER,
  p_payment_id TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update restaurant wallet balance
  UPDATE restaurants
  SET credit_balance = credit_balance + p_amount
  WHERE id = p_restaurant_id;

  -- Create transaction record
  INSERT INTO wallet_transactions (
    restaurant_id,
    amount,
    type,
    status,
    payment_id,
    notes
  ) VALUES (
    p_restaurant_id,
    p_amount,
    'WALLET_RECHARGE',
    'APPROVED',
    p_payment_id,
    'Automated payment gateway recharge'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 3: Testing

### Test Checklist:

#### QR Code Testing:
- [ ] Test QR code generation on desktop
- [ ] Test QR code scanning with GPay
- [ ] Test QR code scanning with PhonePe
- [ ] Test QR code scanning with Paytm
- [ ] Test fallback to manual UPI ID

#### COD_UPI_SCAN Testing:
- [ ] Test order placement with COD_UPI_SCAN
- [ ] Test QR code display on order page
- [ ] Test payment instructions clarity
- [ ] Test actual scanning by delivery person

#### Razorpay Testing:
- [ ] Test Razorpay checkout opening
- [ ] Test successful payment flow
- [ ] Test payment failure handling
- [ ] Test payment verification
- [ ] Test order status update
- [ ] Test wallet recharge with Razorpay
- [ ] Test transaction history

---

## Deployment Checklist:

### Before Going Live:
1. [ ] Switch from Razorpay Test Mode to Live Mode
2. [ ] Update API keys in environment variables
3. [ ] Complete Razorpay KYC verification
4. [ ] Set up webhook endpoints for payment notifications
5. [ ] Add error monitoring (Sentry recommended)
6. [ ] Test with real money (small amounts first)
7. [ ] Set up payment reconciliation reports
8. [ ] Add refund handling mechanism
9. [ ] Update terms and conditions
10. [ ] Test all payment methods end-to-end

---

## Support & Troubleshooting:

### Common Issues:

**QR Code not generating:**
- Check if qrcode library is installed
- Verify UPI link format is correct
- Check browser console for errors

**Razorpay not opening:**
- Verify API keys are correct
- Check if script is loaded (look for Razorpay object in console)
- Ensure HTTPS is enabled (required for payment gateway)

**Payment verification failing:**
- Check signature calculation
- Verify webhook secret is correct
- Check server logs for detailed errors

**Wallet not updating:**
- Verify database function is created
- Check RLS policies allow update
- Look for transaction errors in logs

---

## Next Steps:

1. Implement Phase 1 (QR Code + COD_UPI_SCAN) immediately
2. Sign up for Razorpay account
3. Complete KYC verification (takes 2-3 days)
4. Implement Phase 2 (Razorpay integration)
5. Test thoroughly in test mode
6. Switch to live mode after testing

---

## Additional Recommendations:

1. **Add Payment Timeout:** Cancel unpaid orders after 30 minutes
2. **Add Payment Reminders:** Send WhatsApp/SMS reminder for pending payments
3. **Add Payment History:** Show customer their payment history
4. **Add Refund System:** Implement refund handling for cancelled orders
5. **Add Analytics:** Track payment success rate, failure reasons, etc.
6. **Add Retry Logic:** Allow customers to retry failed payments
7. **Add Multi-currency Support:** If expanding beyond India

---

For any questions or issues during implementation, refer to:
- Razorpay Documentation: https://razorpay.com/docs/
- QRCode Library: https://github.com/soldair/node-qrcode
- UPI Deep Links: https://developer.paytm.com/docs/upi-deep-linking/

Good luck with the implementation!
