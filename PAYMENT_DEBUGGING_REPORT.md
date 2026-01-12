# Payment System Debugging Report
## Anantapur OS - Restaurant Ordering System

**Date:** January 12, 2026
**Status:** Critical Issues Identified
**Priority:** HIGH - Core Business Functionality Affected

---

## Executive Summary

Three critical issues identified in the payment and order workflow:

1. ✅ **Amount Calculation** - WORKING CORRECTLY
2. ⚠️ **Payment Flow** - PARTIALLY IMPLEMENTED (Missing payment verification)
3. ❌ **Restaurant Wallet Recharge** - NO PAYMENT GATEWAY (Manual approval only)

---

## Issue #1: Amount Calculation Logic

### Status: ✅ WORKING CORRECTLY

### Analysis:
Location: `/app/r/[slug]/checkout/page.tsx` (Lines 147-172)

```typescript
const calculateTotal = () => {
  const discount = appliedCoupon?.discount_value || 0;
  const subtotal = cartTotal - discount;

  let deliveryFee = 0;
  if (restaurant?.free_delivery_threshold) {
    deliveryFee = subtotal >= restaurant.free_delivery_threshold ? 0 : restaurant.delivery_fee;
  } else {
    deliveryFee = restaurant?.delivery_fee || 0;
  }

  const grandTotal = subtotal + deliveryFee;
  const walletDeduction = useWallet ? Math.min(walletBalance, grandTotal) : 0;
  const amountToPay = grandTotal - walletDeduction;

  return {
    subtotal: cartTotal,
    discount,
    deliveryFee,
    grandTotal,
    walletDeduction,
    amountToPay,
  };
};
```

### Calculation Flow:
1. ✅ Subtotal = Cart Total - Coupon Discount
2. ✅ Delivery Fee = Calculated based on free delivery threshold
3. ✅ Grand Total = Subtotal + Delivery Fee
4. ✅ Wallet Deduction = Min(Wallet Balance, Grand Total)
5. ✅ Amount to Pay = Grand Total - Wallet Deduction

### Test Cases Passed:
- ✅ Basic order without discount
- ✅ Order with coupon discount
- ✅ Free delivery when threshold met
- ✅ Wallet balance deduction
- ✅ Multiple items calculation

### Verdict: NO ISSUES FOUND

---

## Issue #2: Payment Flow & UPI Redirect

### Status: ⚠️ PARTIALLY IMPLEMENTED

### Current Implementation:

#### Location: `/app/r/[slug]/checkout/page.tsx` (Lines 311-338)

```typescript
if (paymentMethod === 'PREPAID_UPI' && amountToPay > 0) {
  const upiLink = generateUPIDeepLink(
    restaurant.upi_id,
    restaurant.name,
    amountToPay,
    order.short_id
  );

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // MOBILE: Opens UPI app directly
    setTimeout(() => {
      window.location.href = upiLink;
    }, 1000);
  } else {
    // DESKTOP: Stores payment info and redirects to order page
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
}
```

### UPI Deep Link Generation:
Location: `/lib/format.ts` (Lines 28-42)

```typescript
export function generateUPIDeepLink(
  upiId: string,
  restaurantName: string,
  amount: number,
  orderId: string
): string {
  const params = new URLSearchParams({
    pa: upiId,      // Payee Address (UPI ID)
    pn: restaurantName,  // Payee Name
    am: amount.toString(),  // Amount
    tn: `Order-${orderId}`,  // Transaction Note
    cu: 'INR',      // Currency
  });
  return `upi://pay?${params.toString()}`;
}
```

### Critical Issues Identified:

#### 🔴 Issue 2.1: No Payment Verification
**Severity:** CRITICAL

**Problem:**
- System creates order immediately BEFORE payment is made
- No webhook or callback to verify payment status
- User can close UPI app without paying
- Order status remains "PENDING" even if payment fails
- No payment confirmation flow

**Impact:**
- Restaurant prepares food but customer hasn't paid
- Lost revenue due to unpaid orders
- Inventory mismatch
- Customer support overhead

#### 🔴 Issue 2.2: COD_UPI_SCAN Has No Flow
**Severity:** HIGH

**Problem:**
- When `paymentMethod === 'COD_UPI_SCAN'`, the code just redirects to order page
- No QR code displayed
- No payment instructions
- Customer doesn't know how to pay

**Code Analysis:**
```typescript
// Only handles PREPAID_UPI
if (paymentMethod === 'PREPAID_UPI' && amountToPay > 0) {
  // ... payment flow
} else {
  // COD_CASH and COD_UPI_SCAN just redirect - NO PAYMENT FLOW!
  router.push(`/orders/${order.id}`);
}
```

#### 🟡 Issue 2.3: Desktop Experience Poor
**Severity:** MEDIUM

**Problem:**
- Desktop users see manual instructions to copy UPI ID
- No QR code for scanning with phone
- Requires manual typing of UPI ID
- Error-prone process

**Current Desktop Flow:**
1. User clicks "Place Order"
2. Redirected to order tracking page
3. Sees manual instructions: "Open UPI app, type UPI ID, enter amount..."
4. No QR code to scan
5. Must manually copy-paste

### Root Cause Analysis:

**Architecture Flaw:**
The system follows a "Create Order First, Pay Later" approach which is fundamentally flawed for prepaid orders.

**Industry Standard (Swiggy/Zomato):**
1. User clicks "Place Order"
2. Redirect to payment gateway
3. Payment gateway processes payment
4. On success callback, create order
5. On failure, show error and retry

**Current Implementation:**
1. User clicks "Place Order"
2. ✅ Order created in database
3. 🔴 Redirect to UPI (user may or may not pay)
4. 🔴 No verification
5. 🔴 No status update

### Recommended Fixes:

#### Fix 2.1: Implement Payment Verification

**Option A: UPI Payment Gateway Integration (Recommended)**
- Integrate Razorpay/PayU/Cashfree UPI Gateway
- Get payment confirmation callback
- Update order status after successful payment
- Handle payment failures gracefully

**Option B: Manual Verification with Admin Approval**
- Keep current UPI deep link flow
- Add payment proof upload
- Restaurant/Admin verifies payment manually
- Update order status after verification

#### Fix 2.2: Implement COD_UPI_SCAN Flow

**For COD with UPI QR:**
1. Generate QR code with restaurant UPI details
2. Display QR code on order page
3. Add "I have paid" button
4. Send notification to restaurant to verify
5. Restaurant confirms payment and updates order

#### Fix 2.3: Improve Desktop UPI Experience

**Add QR Code Generation:**
```typescript
// Use qrcode library to generate QR from UPI deep link
import QRCode from 'qrcode';

const qrCodeDataUrl = await QRCode.toDataURL(upiLink);
// Display QR code for user to scan with phone
```

---

## Issue #3: Restaurant Wallet Recharge System

### Status: ❌ NO PAYMENT GATEWAY INTEGRATION

### Current Implementation:

#### Location: `/app/partner/wallet/page.tsx` (Lines 77-146)

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
    let proofUrl = null;

    // Upload payment proof image
    if (proofImage) {
      const fileExt = proofImage.name.split('.').pop();
      const fileName = `${restaurant.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, proofImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      proofUrl = publicUrl;
    }

    // 🔴 ISSUE: Just inserts a record - NO ACTUAL PAYMENT!
    const { error } = await supabase
      .from('wallet_transactions')
      .insert({
        restaurant_id: restaurant.id,
        amount,
        type: 'WALLET_RECHARGE',
        status: 'PENDING',  // ⚠️ Pending admin approval
        proof_image_url: proofUrl,
        notes,
      });

    if (error) throw error;

    toast({
      title: 'Recharge Request Submitted',
      description: 'Your recharge request has been submitted for admin approval',
    });

    // No money transferred!
  } catch (error) {
    console.error('Error submitting recharge:', error);
  }
};
```

### Critical Issues:

#### 🔴 Issue 3.1: No Payment Processing
**Severity:** CRITICAL

**Problem:**
- Function creates a "PENDING" transaction record
- No payment gateway called
- No money actually transferred
- Requires manual admin approval
- Admin has to verify bank transfer manually

**Impact:**
- Not a real-time recharge system
- Manual verification required
- Delays in wallet top-up
- Poor user experience
- Admin overhead

#### 🔴 Issue 3.2: Trust-Based System
**Severity:** HIGH

**Problem:**
- Restaurant uploads "payment proof"
- Admin must manually verify the screenshot
- Prone to fraud (fake screenshots)
- Time-consuming manual process
- No automated reconciliation

### Current Workflow:

```
Restaurant Side:
1. Click "Recharge"
2. Enter amount
3. Upload payment proof screenshot
4. Submit request
5. Wait for admin approval ⏳

Admin Side:
1. Check finance dashboard
2. See pending recharge request
3. Manually verify payment proof
4. Check bank account for actual transfer
5. Approve/Reject in database
6. Wallet updated manually
```

### Industry Standard (Should Be):

```
Restaurant Side:
1. Click "Recharge"
2. Enter amount
3. Redirect to payment gateway
4. Complete payment in app
5. Instant wallet credit ✅

Backend:
1. Payment gateway webhook received
2. Verify payment signature
3. Update wallet balance automatically
4. Send confirmation notification
```

### Root Cause:

**Missing Payment Gateway Integration**

The system was built with a manual verification process instead of integrating a payment gateway. This is NOT scalable and NOT secure.

### Recommended Solution:

#### Integrate Razorpay/Cashfree Payment Gateway

**Step 1: Create Payment Order**
```typescript
// Backend: Create Razorpay Order
const order = await razorpay.orders.create({
  amount: rechargeAmount * 100, // in paise
  currency: 'INR',
  receipt: `wallet_recharge_${restaurant.id}_${Date.now()}`,
});
```

**Step 2: Open Payment Gateway**
```typescript
// Frontend: Open Razorpay Checkout
const options = {
  key: process.env.RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: 'INR',
  name: 'Anantapur OS',
  description: 'Wallet Recharge',
  order_id: order.id,
  handler: function (response) {
    // Payment successful, verify on backend
    verifyPayment(response.razorpay_payment_id);
  },
};
const razorpay = new Razorpay(options);
razorpay.open();
```

**Step 3: Verify Payment & Update Wallet**
```typescript
// Backend: Verify payment signature and update wallet
const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

if (isValid) {
  // Update wallet balance
  await supabase
    .from('restaurants')
    .update({ credit_balance: currentBalance + amount })
    .eq('id', restaurant_id);

  // Create transaction record
  await supabase
    .from('wallet_transactions')
    .insert({
      restaurant_id,
      amount,
      type: 'WALLET_RECHARGE',
      status: 'APPROVED',
      payment_id: razorpay_payment_id,
    });
}
```

---

## Summary of Findings

### ✅ Working Correctly:
1. Order amount calculation logic
2. Cart total computation
3. Discount application
4. Delivery fee calculation
5. Wallet balance deduction

### ⚠️ Needs Improvement:
1. Payment verification flow
2. Desktop UPI experience
3. COD_UPI_SCAN implementation
4. Payment status tracking

### ❌ Critical Missing Features:
1. Payment gateway integration for customer orders
2. Payment gateway integration for wallet recharge
3. Payment confirmation webhooks
4. Automated payment verification
5. Real-time order status updates based on payment

---

## Implementation Priority

### Phase 1: CRITICAL (Immediate)
1. Add payment verification for PREPAID_UPI orders
2. Implement COD_UPI_SCAN flow with QR code
3. Add "Payment Pending" status for unverified payments

### Phase 2: HIGH (Within 1 week)
1. Integrate Razorpay/Cashfree for wallet recharge
2. Add QR code display for desktop users
3. Implement payment proof verification for COD

### Phase 3: MEDIUM (Within 2 weeks)
1. Add automated payment reminders
2. Implement payment retry mechanism
3. Add payment analytics dashboard
4. Create reconciliation reports

---

## Testing Checklist

### Amount Calculation Testing:
- [x] Test basic order calculation
- [x] Test with coupon discount
- [x] Test free delivery threshold
- [x] Test wallet deduction
- [x] Test zero delivery fee

### Payment Flow Testing:
- [ ] Test PREPAID_UPI on mobile (GPay, PhonePe, Paytm)
- [ ] Test PREPAID_UPI on desktop
- [ ] Test COD_CASH flow
- [ ] Test COD_UPI_SCAN flow
- [ ] Test payment failure scenarios
- [ ] Test payment timeout scenarios
- [ ] Test partial wallet payment

### Wallet Recharge Testing:
- [ ] Test recharge with payment gateway
- [ ] Test payment success callback
- [ ] Test payment failure handling
- [ ] Test wallet balance update
- [ ] Test transaction history
- [ ] Test concurrent recharge requests

---

## Code Locations Reference

| Component | File Path | Lines |
|-----------|-----------|-------|
| Checkout Page | `/app/r/[slug]/checkout/page.tsx` | 1-600+ |
| Calculate Total | `/app/r/[slug]/checkout/page.tsx` | 147-172 |
| Place Order | `/app/r/[slug]/checkout/page.tsx` | 174-348 |
| Payment Flow | `/app/r/[slug]/checkout/page.tsx` | 311-338 |
| UPI Deep Link | `/lib/format.ts` | 28-42 |
| Order Tracking | `/app/orders/[id]/page.tsx` | 1-350+ |
| Payment Instructions | `/app/orders/[id]/page.tsx` | 177-230 |
| Wallet Recharge | `/app/partner/wallet/page.tsx` | 77-146 |
| Wallet Transactions | `/app/partner/wallet/page.tsx` | 65-75 |

---

## Recommended Immediate Actions

### For Restaurant Owners (Temporary Workaround):
1. Use COD_CASH for now until payment gateway is integrated
2. Manually verify UPI payments through transaction ID
3. Contact admin for wallet recharge with bank transfer proof

### For Developers:
1. Implement payment verification webhook endpoint
2. Add QR code generation for UPI payments
3. Integrate payment gateway (Razorpay recommended)
4. Add payment status tracking in orders table
5. Create automated reconciliation system

### For Admin:
1. Monitor pending wallet recharge requests
2. Verify bank transfers manually (temporary)
3. Approve legitimate transactions
4. Track payment failures and issues

---

## Conclusion

The payment system has critical gaps that need immediate attention:

1. **Orders are created before payment confirmation** - This is the biggest risk
2. **Wallet recharge is manual** - Not scalable
3. **No payment gateway integration** - Missing core functionality

**Recommendation:** Integrate a payment gateway (Razorpay/Cashfree) as the highest priority to ensure proper payment verification and automated processing.
